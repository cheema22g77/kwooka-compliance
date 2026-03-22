// ============================================================================
// RING 5: PLAYBOOK ADVISOR AGENT
// Generates sector-specific compliance checklists and advises on progress
// ============================================================================
import { BaseAgent, type AgentInput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { SectorId } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

export interface PlaybookAdvisorInput extends AgentInput {
  data: {
    sector: SectorId;
    mode: "generate" | "advise";
    existingProgress?: Array<{
      requirement: string;
      completed: boolean;
    }>;
    orgContext?: string;
  };
}

export interface PlaybookItem {
  requirement: string;
  regulation: string;
  description: string;
  priority: number;
  category: string;
}

export interface PlaybookAdvisorResult {
  items: PlaybookItem[];
  nextSteps: string[];
  estimatedCompletionWeeks: number;
  focusAreas: string[];
}

export class PlaybookAdvisor extends BaseAgent<PlaybookAdvisorInput, PlaybookAdvisorResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "playbook-advisor",
        model: "sonnet",
        systemPrompt: "",
        maxTokens: 4096,
        temperature: 0.3,
      },
      llm,
      guardrails,
      reflect,
      eventBus,
    );
  }

  protected buildMessages(input: PlaybookAdvisorInput): LLMMessage[] {
    const sector = SECTORS[input.data.sector];
    if (!sector) throw new Error(`Unknown sector: ${input.data.sector}`);

    const systemPrompt = `You are an Australian compliance playbook specialist for the ${sector.fullName} sector.

AUTHORITY: ${sector.authority}
KEY REGULATIONS: ${sector.regulations.join(", ")}
KEY COMPLIANCE AREAS: ${sector.keyAreas.join(", ")}

${input.data.mode === "generate"
  ? "TASK: Generate a comprehensive compliance checklist for this sector. Each item must reference a real regulation."
  : "TASK: Review the organisation's progress and advise on next steps. Prioritise by risk."
}

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "items": [
    {
      "requirement": "What must be done",
      "regulation": "Specific regulation reference",
      "description": "Detailed explanation",
      "priority": 1,
      "category": "Compliance area"
    }
  ],
  "nextSteps": ["Most important action", "Second action"],
  "estimatedCompletionWeeks": 8,
  "focusAreas": ["Area requiring most attention"]
}`;

    let userMessage: string;
    if (input.data.mode === "generate") {
      userMessage = `Generate a complete compliance playbook for a ${sector.fullName} provider.`;
    } else {
      const completed = (input.data.existingProgress ?? []).filter((p) => p.completed).length;
      const total = (input.data.existingProgress ?? []).length;
      userMessage = `Review compliance progress (${completed}/${total} items complete) and advise on priorities:\n\n`;
      userMessage += (input.data.existingProgress ?? [])
        .map((p) => `- [${p.completed ? "DONE" : "TODO"}] ${p.requirement}`)
        .join("\n");
    }

    if (input.data.orgContext) {
      userMessage += `\n\nOrganisation context: ${input.data.orgContext}`;
    }

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
  }

  protected parseOutput(raw: string, _input: PlaybookAdvisorInput): PlaybookAdvisorResult {
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

    try {
      const parsed = JSON.parse(jsonText.trim());

      return {
        items: Array.isArray(parsed.items)
          ? parsed.items.map((item: any, i: number) => ({
              requirement: String(item.requirement ?? ""),
              regulation: String(item.regulation ?? ""),
              description: String(item.description ?? ""),
              priority: Number(item.priority) || i + 1,
              category: String(item.category ?? "General"),
            }))
          : [],
        nextSteps: Array.isArray(parsed.nextSteps)
          ? parsed.nextSteps.map(String)
          : [],
        estimatedCompletionWeeks: Number(parsed.estimatedCompletionWeeks) || 8,
        focusAreas: Array.isArray(parsed.focusAreas)
          ? parsed.focusAreas.map(String)
          : [],
      };
    } catch {
      return {
        items: [],
        nextSteps: ["Manual playbook review required"],
        estimatedCompletionWeeks: 0,
        focusAreas: [],
      };
    }
  }
}
