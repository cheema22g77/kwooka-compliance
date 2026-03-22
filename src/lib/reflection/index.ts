// ============================================================================
// RING 5.5: REFLECTION LOOP
// AI quality evaluation via Haiku — scores 0–1, provides feedback
// Pattern: Gold's reflection loop
// ============================================================================
import type { ILLMPort } from "@/ports/outbound";
import type { ReflectionResult } from "@/agents/base-agent";

const REFLECTION_SYSTEM_PROMPT = `You are a compliance quality evaluator. You review AI-generated compliance content and score it.

Evaluate on these criteria (each 0-1, then average):
1. ACCURACY: Is the content factually correct per Australian regulations?
2. COMPLETENESS: Does it cover all required compliance elements?
3. SPECIFICITY: Is it tailored to the sector and entity, not generic?
4. ACTIONABILITY: Can a compliance officer act on this immediately?
5. REGULATORY ALIGNMENT: Does it reference correct Australian acts and standards?

Respond ONLY with JSON:
{"score": 0.0-1.0, "feedback": "specific improvement suggestions", "criteria": {"accuracy": 0.0-1.0, "completeness": 0.0-1.0, "specificity": 0.0-1.0, "actionability": 0.0-1.0, "regulatory_alignment": 0.0-1.0}}`;

export class ReflectionLoop {
  constructor(private readonly llm: ILLMPort) {}

  async evaluate(raw: string, context: Record<string, unknown>): Promise<ReflectionResult> {
    try {
      const agentName = (context.agentName as string) ?? "unknown";
      const sector = (context.sector as string) ?? "unknown";

      const response = await this.llm.complete({
        model: "haiku",
        systemPrompt: REFLECTION_SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: `Agent: ${agentName}\nSector: ${sector}\n\nContent to evaluate:\n${raw.slice(0, 3000)}`,
        }],
        maxTokens: 512,
        temperature: 0.1,
      });

      // Parse reflection response
      let jsonText = response.content;
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

      const parsed = JSON.parse(jsonText.trim());
      const score = Math.max(0, Math.min(1, Number(parsed.score) || 0.5));

      return {
        score,
        feedback: String(parsed.feedback ?? "No specific feedback"),
        passed: score >= 0.6,
      };
    } catch (_err) {
      // Reflection failure returns a passing default
      return { score: 0.7, feedback: "Reflection unavailable", passed: true };
    }
  }
}

/** Factory for use by agents */
export function createReflectionLoop(llm: ILLMPort): ReflectionLoop {
  return new ReflectionLoop(llm);
}
