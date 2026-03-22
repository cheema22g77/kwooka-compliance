// ============================================================================
// RING 5: ONBOARDING AGENT
// Guides new organisations through sector selection and initial assessment
// Conversational — produces structured onboarding recommendations
// ============================================================================
import { BaseAgent, type AgentInput } from "./base-agent";
import type { ILLMPort, LLMMessage } from "@/ports/outbound";
import type { GuardrailResult, ReflectionResult } from "./base-agent";
import type { EventBus } from "@/events/bus";
import type { SectorId } from "@/core/value-objects";
import { SECTORS } from "@/core/value-objects";

export interface OnboardingInput extends AgentInput {
  data: {
    orgName: string;
    orgDescription: string;
    selectedSectors?: SectorId[];
    indigenousOwned?: boolean;
    employeeCount?: number;
    currentComplianceState?: string;
  };
}

export interface OnboardingRecommendation {
  sector: SectorId;
  reason: string;
  priority: number;
  keyRequirements: string[];
  estimatedSetupWeeks: number;
}

export interface OnboardingResult {
  recommendedSectors: OnboardingRecommendation[];
  immediateActions: string[];
  complianceRoadmap: Array<{
    week: number;
    milestone: string;
    sector: SectorId;
  }>;
  welcomeMessage: string;
}

export class OnboardingAgent extends BaseAgent<OnboardingInput, OnboardingResult> {
  constructor(
    llm: ILLMPort,
    guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    eventBus: EventBus | null = null,
  ) {
    super(
      {
        name: "onboarding",
        model: "sonnet",
        systemPrompt: "",
        maxTokens: 4096,
        temperature: 0.5,
      },
      llm,
      guardrails,
      reflect,
      eventBus,
    );
  }

  protected buildMessages(input: OnboardingInput): LLMMessage[] {
    const allSectors = Object.entries(SECTORS)
      .map(([id, s]) => `- ${id}: ${s.fullName} (Authority: ${s.authority})`)
      .join("\n");

    const systemPrompt = `You are the Kwooka onboarding specialist. Kwooka is an Aboriginal-owned (Supply Nation certified) compliance platform based in Western Australia.

AVAILABLE SECTORS:
${allSectors}

TASK: Analyse the organisation and recommend which compliance sectors apply,
what immediate actions are needed, and provide a compliance roadmap.

RESPONSE FORMAT — respond ONLY with valid JSON:
{
  "recommendedSectors": [
    {
      "sector": "sector_id",
      "reason": "Why this sector applies",
      "priority": 1,
      "keyRequirements": ["Requirement 1"],
      "estimatedSetupWeeks": 4
    }
  ],
  "immediateActions": ["Action 1", "Action 2"],
  "complianceRoadmap": [
    { "week": 1, "milestone": "Complete X", "sector": "sector_id" }
  ],
  "welcomeMessage": "Personalised welcome message"
}`;

    let userMessage = `New organisation onboarding:

Organisation: ${input.data.orgName}
Description: ${input.data.orgDescription}`;

    if (input.data.indigenousOwned) {
      userMessage += "\nIndigenous-owned: Yes (Supply Nation eligible)";
    }
    if (input.data.employeeCount) {
      userMessage += `\nEmployees: ${input.data.employeeCount}`;
    }
    if (input.data.selectedSectors && input.data.selectedSectors.length > 0) {
      userMessage += `\nSectors they've selected: ${input.data.selectedSectors.join(", ")}`;
    }
    if (input.data.currentComplianceState) {
      userMessage += `\nCurrent compliance state: ${input.data.currentComplianceState}`;
    }

    return [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ];
  }

  protected parseOutput(raw: string, _input: OnboardingInput): OnboardingResult {
    let jsonText = raw;
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1]!;

    try {
      const parsed = JSON.parse(jsonText.trim());

      return {
        recommendedSectors: Array.isArray(parsed.recommendedSectors)
          ? parsed.recommendedSectors.map((r: any, i: number) => ({
              sector: r.sector ?? "ndis",
              reason: String(r.reason ?? ""),
              priority: Number(r.priority) || i + 1,
              keyRequirements: Array.isArray(r.keyRequirements)
                ? r.keyRequirements.map(String)
                : [],
              estimatedSetupWeeks: Number(r.estimatedSetupWeeks) || 4,
            }))
          : [],
        immediateActions: Array.isArray(parsed.immediateActions)
          ? parsed.immediateActions.map(String)
          : [],
        complianceRoadmap: Array.isArray(parsed.complianceRoadmap)
          ? parsed.complianceRoadmap.map((m: any) => ({
              week: Number(m.week) || 1,
              milestone: String(m.milestone ?? ""),
              sector: m.sector ?? "ndis",
            }))
          : [],
        welcomeMessage: String(
          parsed.welcomeMessage ?? "Welcome to Kwooka Compliance."
        ),
      };
    } catch {
      return {
        recommendedSectors: [],
        immediateActions: ["Contact Kwooka support for onboarding assistance"],
        complianceRoadmap: [],
        welcomeMessage: "Welcome to Kwooka Compliance.",
      };
    }
  }
}
