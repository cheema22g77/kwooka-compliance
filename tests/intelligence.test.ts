// ============================================================================
// TESTS: Intelligence Layer — Intent Classification, Context Assembly,
//        Quality Monitoring, Orchestrator Pipeline
// Pure logic tests — no external services
// Run: npx vitest run tests/intelligence.test.ts
// ============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { classifyIntent, classifyIntentLocal } from "../src/intelligence/intent-classifier";
import { gatherContext, buildSystemPrompt } from "../src/intelligence/context-gatherer";
import { QualityMonitor } from "../src/intelligence/quality-monitor";
import { orchestrate } from "../src/intelligence/orchestrator";
import { INTENTS } from "../src/intelligence/types";
import type { ILLMPort, LLMResponse } from "../src/ports/outbound";
import type { SectorId } from "../src/core/value-objects";

// ── Test Helpers ──

function mockLLM(intentResponse: string): ILLMPort {
  return {
    complete: vi.fn(async () => ({
      content: intentResponse,
      model: "haiku",
      tokensUsed: { input: 20, output: 5 },
      durationMs: 80,
    } as LLMResponse)),
    stream: vi.fn(),
  } as unknown as ILLMPort;
}

function failingLLM(): ILLMPort {
  return {
    complete: vi.fn(async () => { throw new Error("LLM unavailable"); }),
    stream: vi.fn(),
  } as unknown as ILLMPort;
}

// ── Intent Classification (LLM-based) ──

describe("classifyIntent (LLM)", () => {
  it("classifies exact intent response", async () => {
    expect(await classifyIntent("Review my WHS policy", mockLLM("analysis"))).toBe("analysis");
    expect(await classifyIntent("What is NDIS?", mockLLM("explanation"))).toBe("explanation");
    expect(await classifyIntent("What should I do?", mockLLM("recommendation"))).toBe("recommendation");
    expect(await classifyIntent("Hello!", mockLLM("general"))).toBe("general");
  });

  it("handles response with extra whitespace", async () => {
    expect(await classifyIntent("test", mockLLM("  analysis  "))).toBe("analysis");
  });

  it("handles response with extra text (fuzzy match)", async () => {
    expect(await classifyIntent("test", mockLLM("The intent is analysis."))).toBe("analysis");
    expect(await classifyIntent("test", mockLLM("I'd classify this as explanation"))).toBe("explanation");
  });

  it("falls back to general for unrecognised response", async () => {
    expect(await classifyIntent("test", mockLLM("something_unknown"))).toBe("general");
  });

  it("falls back to general on LLM failure", async () => {
    expect(await classifyIntent("test", failingLLM())).toBe("general");
  });

  it("uses haiku model with low maxTokens", async () => {
    const llm = mockLLM("analysis");
    await classifyIntent("Review my policy", llm);

    const call = (llm.complete as any).mock.calls[0][0];
    expect(call.model).toBe("haiku");
    expect(call.maxTokens).toBeLessThanOrEqual(16);
    expect(call.temperature).toBe(0);
  });
});

// ── Intent Classification (Local/Heuristic) ──

describe("classifyIntentLocal", () => {
  it("classifies analysis patterns", () => {
    expect(classifyIntentLocal("Analyse this document")).toBe("analysis");
    expect(classifyIntentLocal("Can you review this policy?")).toBe("analysis");
    expect(classifyIntentLocal("Check this for compliance")).toBe("analysis");
    expect(classifyIntentLocal("What's the compliance score?")).toBe("analysis");
  });

  it("classifies explanation patterns", () => {
    expect(classifyIntentLocal("What is the NDIS Practice Standards?")).toBe("explanation");
    expect(classifyIntentLocal("Explain worker screening requirements")).toBe("explanation");
    expect(classifyIntentLocal("What are the WHS Act obligations?")).toBe("explanation");
    expect(classifyIntentLocal("Tell me about Chain of Responsibility")).toBe("explanation");
  });

  it("classifies recommendation patterns", () => {
    expect(classifyIntentLocal("What should I do about this finding?")).toBe("recommendation");
    expect(classifyIntentLocal("How to fix incident management gaps?")).toBe("recommendation");
    expect(classifyIntentLocal("What are the next steps?")).toBe("recommendation");
    expect(classifyIntentLocal("Can you recommend a best practice?")).toBe("recommendation");
  });

  it("falls back to general for ambiguous messages", () => {
    expect(classifyIntentLocal("Hello")).toBe("general");
    expect(classifyIntentLocal("Thanks")).toBe("general");
    expect(classifyIntentLocal("Kwooka is great")).toBe("general");
  });
});

// ── Context Gatherer ──

describe("gatherContext", () => {
  it("assembles basic context with intent only", () => {
    const ctx = gatherContext({ intent: "analysis" });

    expect(ctx.intent).toBe("analysis");
    expect(ctx.sector).toBeNull();
    expect(ctx.ragContext).toBeNull();
    expect(ctx.userContext).toBeNull();
    expect(ctx.conversationHistory).toEqual([]);
  });

  it("includes sector config when sector is provided", () => {
    const ctx = gatherContext({ intent: "explanation", sector: "ndis" });

    expect(ctx.sector).not.toBeNull();
    expect(ctx.sector!.id).toBe("ndis");
    expect(ctx.sector!.fullName).toBe("NDIS Practice Standards");
    expect(ctx.sector!.regulations.length).toBeGreaterThan(0);
  });

  it("returns null sector for invalid sector", () => {
    const ctx = gatherContext({ intent: "general", sector: "invalid" as SectorId });
    expect(ctx.sector).toBeNull();
  });

  it("includes RAG context", () => {
    const ctx = gatherContext({
      intent: "analysis",
      ragContext: "Relevant legislation: NDIS Act 2013 Section 73",
    });
    expect(ctx.ragContext).toBe("Relevant legislation: NDIS Act 2013 Section 73");
  });

  it("includes user context", () => {
    const ctx = gatherContext({
      intent: "recommendation",
      userContext: "User has 3 critical findings",
    });
    expect(ctx.userContext).toBe("User has 3 critical findings");
  });

  it("preserves conversation history", () => {
    const history = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi, how can I help?" },
    ];
    const ctx = gatherContext({
      intent: "general",
      conversationHistory: history,
    });
    expect(ctx.conversationHistory).toHaveLength(2);
    expect(ctx.conversationHistory[0]!.content).toBe("Hello");
  });
});

// ── System Prompt Building ──

describe("buildSystemPrompt", () => {
  it("includes base copilot principles", () => {
    const ctx = gatherContext({ intent: "general" });
    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Kwooka Compliance Copilot");
    expect(prompt).toContain("Australian");
    expect(prompt).toContain("Accuracy First");
  });

  it("includes intent-specific directive", () => {
    const analysisCtx = gatherContext({ intent: "analysis" });
    const analysisPrompt = buildSystemPrompt(analysisCtx);
    expect(analysisPrompt).toContain("identifying gaps");

    const explanationCtx = gatherContext({ intent: "explanation" });
    const explanationPrompt = buildSystemPrompt(explanationCtx);
    expect(explanationPrompt).toContain("educational");

    const recommendationCtx = gatherContext({ intent: "recommendation" });
    const recommendationPrompt = buildSystemPrompt(recommendationCtx);
    expect(recommendationPrompt).toContain("step-by-step");

    const generalCtx = gatherContext({ intent: "general" });
    const generalPrompt = buildSystemPrompt(generalCtx);
    expect(generalPrompt).toContain("helpful and professional");
  });

  it("includes sector information when sector is set", () => {
    const ctx = gatherContext({ intent: "analysis", sector: "ndis" });
    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("NDIS Practice Standards");
    expect(prompt).toContain("NDIS Act 2013");
    expect(prompt).toContain("NDIS Quality and Safeguards Commission");
    expect(prompt).toContain("Worker Screening");
  });

  it("includes transport sector details", () => {
    const ctx = gatherContext({ intent: "explanation", sector: "transport" });
    const prompt = buildSystemPrompt(ctx);

    expect(prompt).toContain("Heavy Vehicle National Law");
    expect(prompt).toContain("Chain of Responsibility");
    expect(prompt).toContain("NHVR");
  });

  it("omits sector section when no sector", () => {
    const ctx = gatherContext({ intent: "general" });
    const prompt = buildSystemPrompt(ctx);

    expect(prompt).not.toContain("CURRENT FOCUS");
    expect(prompt).not.toContain("KEY REGULATIONS");
  });

  it("appends user context", () => {
    const ctx = gatherContext({
      intent: "recommendation",
      userContext: "\n\nUSER HAS 5 OVERDUE FINDINGS",
    });
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("USER HAS 5 OVERDUE FINDINGS");
  });

  it("appends RAG context", () => {
    const ctx = gatherContext({
      intent: "explanation",
      ragContext: "\n\nRELEVANT: Section 47 of the WHS Act",
    });
    const prompt = buildSystemPrompt(ctx);
    expect(prompt).toContain("Section 47 of the WHS Act");
  });

  it("includes both user and RAG context in correct order", () => {
    const ctx = gatherContext({
      intent: "analysis",
      userContext: "\n\nUSER_CONTEXT_MARKER",
      ragContext: "\n\nRAG_CONTEXT_MARKER",
    });
    const prompt = buildSystemPrompt(ctx);

    const userIdx = prompt.indexOf("USER_CONTEXT_MARKER");
    const ragIdx = prompt.indexOf("RAG_CONTEXT_MARKER");
    expect(userIdx).toBeGreaterThan(-1);
    expect(ragIdx).toBeGreaterThan(-1);
    // User context before RAG context (so RAG is closest to the generation point)
    expect(userIdx).toBeLessThan(ragIdx);
  });
});

// ── Quality Monitor ──

describe("QualityMonitor", () => {
  let monitor: QualityMonitor;

  beforeEach(() => {
    monitor = new QualityMonitor();
  });

  it("returns null for unknown org", () => {
    expect(monitor.getMetrics("org_unknown")).toBeNull();
  });

  it("tracks response count", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_1", intent: "general", responseLength: 200, guardrailsPassed: true });

    const metrics = monitor.getMetrics("org_1");
    expect(metrics!.totalResponses).toBe(2);
  });

  it("calculates guardrail pass rate", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 400, guardrailsPassed: false });
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 600, guardrailsPassed: true });

    const metrics = monitor.getMetrics("org_1");
    expect(metrics!.guardrailPassRate).toBeCloseTo(2 / 3);
  });

  it("calculates average response length", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "general", responseLength: 100, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_1", intent: "general", responseLength: 300, guardrailsPassed: true });

    const metrics = monitor.getMetrics("org_1");
    expect(metrics!.avgResponseLength).toBe(200);
  });

  it("tracks intent distribution", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_1", intent: "explanation", responseLength: 300, guardrailsPassed: true });

    const metrics = monitor.getMetrics("org_1");
    expect(metrics!.intentDistribution.analysis).toBe(2);
    expect(metrics!.intentDistribution.explanation).toBe(1);
    expect(metrics!.intentDistribution.recommendation).toBe(0);
    expect(metrics!.intentDistribution.general).toBe(0);
  });

  it("tracks orgs independently", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_2", intent: "general", responseLength: 200, guardrailsPassed: true });

    expect(monitor.getMetrics("org_1")!.totalResponses).toBe(1);
    expect(monitor.getMetrics("org_2")!.totalResponses).toBe(1);
  });

  describe("isQualityDegraded", () => {
    it("returns false when insufficient data", () => {
      monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: false });
      expect(monitor.isQualityDegraded("org_1")).toBe(false); // Only 1 response, need 5
    });

    it("returns false when pass rate is above threshold", () => {
      for (let i = 0; i < 10; i++) {
        monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
      }
      expect(monitor.isQualityDegraded("org_1")).toBe(false);
    });

    it("returns true when pass rate drops below threshold", () => {
      // 3 pass, 7 fail = 30% pass rate
      for (let i = 0; i < 3; i++) {
        monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
      }
      for (let i = 0; i < 7; i++) {
        monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: false });
      }
      expect(monitor.isQualityDegraded("org_1")).toBe(true);
    });

    it("respects custom threshold", () => {
      for (let i = 0; i < 5; i++) {
        monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
      }
      for (let i = 0; i < 5; i++) {
        monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: false });
      }
      // 50% pass rate — degraded at 0.8 threshold, not at 0.3
      expect(monitor.isQualityDegraded("org_1", 0.8)).toBe(true);
      expect(monitor.isQualityDegraded("org_1", 0.3)).toBe(false);
    });
  });

  it("resets metrics for specific org", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_2", intent: "general", responseLength: 200, guardrailsPassed: true });

    monitor.reset("org_1");

    expect(monitor.getMetrics("org_1")).toBeNull();
    expect(monitor.getMetrics("org_2")).not.toBeNull();
  });

  it("resets all metrics", () => {
    monitor.recordResponse({ orgId: "org_1", intent: "analysis", responseLength: 500, guardrailsPassed: true });
    monitor.recordResponse({ orgId: "org_2", intent: "general", responseLength: 200, guardrailsPassed: true });

    monitor.reset();

    expect(monitor.getMetrics("org_1")).toBeNull();
    expect(monitor.getMetrics("org_2")).toBeNull();
  });
});

// ── Orchestrator Pipeline ──

describe("orchestrate", () => {
  it("returns classified intent from LLM", async () => {
    const result = await orchestrate(
      { message: "Review my WHS policy" },
      mockLLM("analysis"),
    );
    expect(result.intent).toBe("analysis");
  });

  it("builds system prompt with intent directive", async () => {
    const result = await orchestrate(
      { message: "What is NDIS?" },
      mockLLM("explanation"),
    );
    expect(result.systemPrompt).toContain("educational");
    expect(result.systemPrompt).toContain("Kwooka Compliance Copilot");
  });

  it("includes sector in system prompt when provided", async () => {
    const result = await orchestrate(
      { message: "Review policy", sector: "ndis" },
      mockLLM("analysis"),
    );
    expect(result.systemPrompt).toContain("NDIS Practice Standards");
    expect(result.systemPrompt).toContain("NDIS Act 2013");
  });

  it("includes RAG context in system prompt", async () => {
    const result = await orchestrate(
      { message: "test", ragContext: "\n\nRAG_MARKER_TEXT" },
      mockLLM("general"),
    );
    expect(result.systemPrompt).toContain("RAG_MARKER_TEXT");
  });

  it("includes user context in system prompt", async () => {
    const result = await orchestrate(
      { message: "test", userContext: "\n\nUSER_MARKER_TEXT" },
      mockLLM("general"),
    );
    expect(result.systemPrompt).toContain("USER_MARKER_TEXT");
  });

  it("assembles messages with conversation history + current message", async () => {
    const result = await orchestrate(
      {
        message: "Follow up question",
        conversationHistory: [
          { role: "user", content: "First message" },
          { role: "assistant", content: "First response" },
        ],
      },
      mockLLM("general"),
    );

    expect(result.messages).toHaveLength(3);
    expect(result.messages[0]!.content).toBe("First message");
    expect(result.messages[1]!.content).toBe("First response");
    expect(result.messages[2]!.content).toBe("Follow up question");
  });

  it("works with no optional fields", async () => {
    const result = await orchestrate(
      { message: "Hello" },
      mockLLM("general"),
    );

    expect(result.intent).toBe("general");
    expect(result.messages).toHaveLength(1);
    expect(result.context.sector).toBeNull();
    expect(result.context.ragContext).toBeNull();
    expect(result.context.userContext).toBeNull();
  });

  it("falls back to general on LLM failure", async () => {
    const result = await orchestrate(
      { message: "test" },
      failingLLM(),
    );
    expect(result.intent).toBe("general");
  });
});

// ── INTENTS constant ──

describe("INTENTS", () => {
  it("has exactly 4 intents", () => {
    expect(INTENTS).toHaveLength(4);
  });

  it("includes all expected values", () => {
    expect(INTENTS).toContain("analysis");
    expect(INTENTS).toContain("explanation");
    expect(INTENTS).toContain("recommendation");
    expect(INTENTS).toContain("general");
  });
});
