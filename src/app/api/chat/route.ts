import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, AI_CONFIG } from "@/lib/ai/config";
import { searchLegislation } from "@/lib/enhanced-rag-search";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const maxDuration = 60;

interface ChatRequest {
  message: string;
  sector?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  useRAG?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const body: ChatRequest = await request.json();
    const { message, sector, conversationHistory = [], useRAG = true } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Search for relevant context using BM25
    let ragContext = "";
    let citations: any[] = [];
    
    if (useRAG) {
      try {
        const searchResults = await searchLegislation(message, {
          topK: 5,
          expandQuery: true,
          searchMethod: 'bm25',
          minScore: 0.1,
          sector,
        });

        if (searchResults.length > 0) {
          ragContext = `\n\nRELEVANT LEGISLATION & STANDARDS (cite these in your response):\n${searchResults.map((r, i) => 
            `[${i + 1}] ${r.source.title}${r.sectionNumber ? ` - Section ${r.sectionNumber}` : ''}${r.sectionTitle ? ` (${r.sectionTitle})` : ''}\n${r.content}`
          ).join('\n\n---\n\n')}`;
          
          citations = searchResults.map(r => ({
            source: r.source.title,
            section: r.sectionNumber || r.sectionTitle,
            score: r.score
          }));
        }
      } catch (ragError) {
        console.error("RAG search error:", ragError);
        // Continue without RAG if it fails
      }
    }

    const systemPrompt = buildSystemPrompt(sector) + ragContext;
    const messages: Anthropic.MessageParam[] = [
      ...conversationHistory.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: AI_CONFIG.model,
            max_tokens: AI_CONFIG.maxTokens,
            temperature: AI_CONFIG.temperature,
            system: systemPrompt,
            messages,
            stream: true,
          });

          let fullContent = "";

          for await (const event of response) {
            if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
              const text = event.delta.text;
              fullContent += text;
              const data = JSON.stringify({ type: "delta", content: text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            if (event.type === "message_stop") {
              const metadata = extractMetadata(fullContent, sector);
              // Add citations to metadata
              if (citations.length > 0) {
                metadata.citations = citations;
              }
              const doneData = JSON.stringify({ type: "done", content: fullContent, metadata });
              controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
            }
          }

          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          const errorData = JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Unknown error" });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process message", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

function extractMetadata(content: string, sector?: string) {
  const metadata: { 
    riskLevel?: string; 
    regulationRefs?: Array<{ id: string; name: string; section: string }>; 
    confidence?: number;
    citations?: any[];
  } = {};

  const riskPatterns = {
    critical: /\b(critical|severe|immediate action required)\b/i,
    high: /\b(high risk|significant risk|urgent)\b/i,
    medium: /\b(medium risk|moderate|should address)\b/i,
    low: /\b(low risk|minor|consider)\b/i,
  };

  for (const [level, pattern] of Object.entries(riskPatterns)) {
    if (pattern.test(content)) {
      metadata.riskLevel = level;
      break;
    }
  }

  const refs: Array<{ id: string; name: string; section: string }> = [];
  const patterns = [
    /HVNL\s+(?:Section\s+)?(\d+[A-Z]?)/gi, 
    /NDIS\s+(?:Practice\s+)?Standard(?:s)?\s+(\d+(?:\.\d+)?)?/gi, 
    /WHS\s+(?:Act|Regulations?)(?:\s+Section\s+)?(\d+)?/gi,
    /Quality\s+Indicator(?:s)?\s+(\d+(?:\.\d+)*)/gi,
    /Section\s+(\d+(?:\.\d+)*)/gi
  ];
  
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      refs.push({ id: `ref-${refs.length}`, name: match[0], section: match[1] || match[0] });
    }
  }

  if (refs.length > 0) {
    metadata.regulationRefs = refs.slice(0, 10);
    metadata.confidence = Math.min(0.85 + refs.length * 0.02, 0.95);
  }

  return metadata;
}
