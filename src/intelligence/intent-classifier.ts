// ============================================================================
// INTELLIGENCE: Intent Classifier — Haiku call to classify user message
// Extracted from CopilotAgent.classifyIntent()
// Pattern: Immigration's fast-classify stage (~100ms with Haiku)
// ============================================================================
import type { ILLMPort } from "@/ports/outbound";
import { INTENTS, type CopilotIntent } from "./types";

const CLASSIFICATION_PROMPT =
  "Classify the user message into exactly one intent. Reply with ONLY the intent word, nothing else.\n" +
  "Intents:\n" +
  "- analysis: user wants a document or policy analysed for compliance\n" +
  "- explanation: user wants a regulation, standard, or concept explained\n" +
  "- recommendation: user wants advice on what to do, next steps, or remediation\n" +
  "- general: greeting, off-topic, or general compliance chat\n";

/**
 * Classify a user message into one of 4 intents using a fast Haiku call.
 * Falls back to "general" on any error.
 */
export async function classifyIntent(
  message: string,
  llm: ILLMPort,
): Promise<CopilotIntent> {
  try {
    const response = await llm.complete({
      model: "haiku",
      systemPrompt: CLASSIFICATION_PROMPT,
      messages: [{ role: "user", content: message }],
      maxTokens: 16,
      temperature: 0,
    });

    const raw = response.content.trim().toLowerCase();

    // Exact match
    if (INTENTS.includes(raw as CopilotIntent)) {
      return raw as CopilotIntent;
    }

    // Fuzzy match — take the first intent word found in the response
    for (const intent of INTENTS) {
      if (raw.includes(intent)) return intent;
    }

    return "general";
  } catch {
    // Classification failure is non-fatal — default to general
    return "general";
  }
}

/**
 * Classify intent without an LLM call using keyword heuristics.
 * Useful for testing or when the LLM is unavailable.
 */
export function classifyIntentLocal(message: string): CopilotIntent {
  const lower = message.toLowerCase();

  // Analysis patterns
  const analysisPatterns = [
    "analyse", "analyze", "review this", "check this",
    "compliance score", "audit this", "assess this",
    "is this compliant", "gaps in this",
  ];
  if (analysisPatterns.some((p) => lower.includes(p))) return "analysis";

  // Recommendation patterns (checked before explanation because phrases
  // like "what are the next steps" overlap with explanation's "what are")
  const recommendationPatterns = [
    "what should", "how to", "how do i", "recommend",
    "next steps", "advice", "suggest", "best practice",
    "what can i do", "how can i",
  ];
  if (recommendationPatterns.some((p) => lower.includes(p))) return "recommendation";

  // Explanation patterns
  const explanationPatterns = [
    "what is", "what are", "explain", "how does",
    "tell me about", "what does", "define",
    "meaning of", "difference between",
  ];
  if (explanationPatterns.some((p) => lower.includes(p))) return "explanation";

  return "general";
}
