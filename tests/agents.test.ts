// ============================================================================
// TESTS: Agent Architecture — BaseAgent, guardrails integration, reflection
// Tests core agent logic without external services (mock LLM + guardrails)
// Run: npx vitest run tests/agents.test.ts
// ============================================================================
import { describe, it, expect, vi } from "vitest";
import { BaseAgent } from "../src/agents/base-agent";
import type { AgentInput, AgentOutput, AgentConfig } from "../src/agents/base-agent";
import type { ILLMPort, LLMMessage, LLMResponse } from "../src/ports/outbound";
import type { OrgId } from "../src/core/value-objects";
import { EventBus } from "../src/events/bus";

// ── Test doubles ──

function mockLLM(content: string, opts?: { failFirst?: number }): ILLMPort {
  let callCount = 0;
  return {
    complete: vi.fn(async () => {
      callCount++;
      if (opts?.failFirst && callCount <= opts.failFirst) {
        throw new Error("LLM overloaded");
      }
      return {
        content,
        model: "haiku",
        tokensUsed: { input: 100, output: 50 },
        durationMs: 200,
      } as LLMResponse;
    }),
    stream: vi.fn(),
  } as unknown as ILLMPort;
}

function passingGuardrails() {
  return async () => ({ passed: true, layer: "all", reason: "ok" });
}

function failingGuardrails(layer: string, reason: string) {
  return async () => ({ passed: false, layer, reason });
}

// Concrete test agent
class TestAgent extends BaseAgent<AgentInput, { summary: string }> {
  protected buildMessages(input: AgentInput): LLMMessage[] {
    return [{ role: "user", content: JSON.stringify(input.data) }];
  }
  protected parseOutput(raw: string): { summary: string } {
    try {
      return JSON.parse(raw);
    } catch {
      return { summary: raw };
    }
  }
}

function createAgent(
  llm: ILLMPort,
  guardrails = passingGuardrails(),
  reflect: ((raw: string, ctx: Record<string, unknown>) => Promise<{ score: number; feedback: string; passed: boolean }>) | null = null,
  eventBus: EventBus | null = null,
  configOverrides?: Partial<AgentConfig>
) {
  return new TestAgent(
    {
      name: "test-agent",
      model: "haiku",
      systemPrompt: "You are a test agent.",
      maxRetries: 1,
      ...configOverrides,
    },
    llm,
    guardrails,
    reflect,
    eventBus,
  );
}

const ORG = "org_test" as OrgId;

// ── Tests ──

describe("BaseAgent", () => {
  describe("successful execution", () => {
    it("returns success with parsed output", async () => {
      const llm = mockLLM('{"summary":"all good"}');
      const agent = createAgent(llm);

      const result = await agent.run({ orgId: ORG, data: { text: "hello" } });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ summary: "all good" });
      expect(result.agentName).toBe("test-agent");
      expect(result.guardrailsPassed).toBe(true);
      expect(result.tokensUsed).toBe(150);
      expect(result.error).toBeNull();
    });

    it("populates agentRunId with run_ prefix", async () => {
      const agent = createAgent(mockLLM('{"summary":"ok"}'));
      const result = await agent.run({ orgId: ORG, data: {} });
      expect(result.agentRunId).toMatch(/^run_/);
    });

    it("tracks duration", async () => {
      const agent = createAgent(mockLLM('{"summary":"ok"}'));
      const result = await agent.run({ orgId: ORG, data: {} });
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("LLM retries", () => {
    it("retries on LLM failure and succeeds", async () => {
      const llm = mockLLM('{"summary":"recovered"}', { failFirst: 1 });
      const agent = createAgent(llm);

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ summary: "recovered" });
      expect(llm.complete).toHaveBeenCalledTimes(2);
    });

    it("fails after exhausting all retries", async () => {
      const llm = mockLLM("unused", { failFirst: 10 });
      const agent = createAgent(llm);

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(false);
      expect(result.error).toContain("LLM call failed");
      expect(result.error).toContain("LLM overloaded");
    });
  });

  describe("guardrails", () => {
    it("rejects when guardrails fail", async () => {
      const agent = createAgent(
        mockLLM("bad output"),
        failingGuardrails("schema", "Invalid JSON in agent response"),
      );

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(false);
      expect(result.guardrailsPassed).toBe(false);
      expect(result.error).toContain("Guardrail rejection");
      expect(result.error).toContain("schema");
    });

    it("emits GuardrailRejection event when bus is provided", async () => {
      const bus = new EventBus();
      const events: any[] = [];
      bus.on("GuardrailRejection", async (e) => { events.push(e); });

      const agent = createAgent(
        mockLLM("bad"),
        failingGuardrails("safety", "legal advice detected"),
        null,
        bus,
      );

      await agent.run({ orgId: ORG, data: {} });

      expect(events).toHaveLength(1);
      expect(events[0].payload.layer).toBe("safety");
    });
  });

  describe("reflection", () => {
    it("passes when reflection score >= 0.6", async () => {
      const reflect = vi.fn(async () => ({
        score: 0.8,
        feedback: "Good quality",
        passed: true,
      }));

      const agent = createAgent(
        mockLLM('{"summary":"good"}'),
        passingGuardrails(),
        reflect,
      );

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(true);
      expect(result.reflectionScore).toBe(0.8);
    });

    it("retries with feedback when reflection score < 0.6", async () => {
      const reflect = vi.fn(async () => ({
        score: 0.3,
        feedback: "Needs more detail",
        passed: false,
      }));

      const llm = mockLLM('{"summary":"improved"}');
      const agent = createAgent(llm, passingGuardrails(), reflect);

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(true);
      // LLM called twice: initial + reflection retry
      expect(llm.complete).toHaveBeenCalledTimes(2);
    });

    it("continues successfully when reflection throws", async () => {
      const reflect = vi.fn(async () => {
        throw new Error("reflection service down");
      });

      const agent = createAgent(
        mockLLM('{"summary":"ok"}'),
        passingGuardrails(),
        reflect,
      );

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(true);
      expect(result.reflectionScore).toBeNull();
    });

    it("skips reflection when disabled", async () => {
      const reflect = vi.fn(async () => ({
        score: 0.9,
        feedback: "",
        passed: true,
      }));

      const agent = createAgent(
        mockLLM('{"summary":"ok"}'),
        passingGuardrails(),
        reflect,
        null,
        { reflectionEnabled: false },
      );

      const result = await agent.run({ orgId: ORG, data: {} });
      expect(reflect).not.toHaveBeenCalled();
      expect(result.reflectionScore).toBeNull();
    });
  });

  describe("event emission", () => {
    it("emits AgentRunCompleted on success", async () => {
      const bus = new EventBus();
      const events: any[] = [];
      bus.on("AgentRunCompleted", async (e) => { events.push(e); });

      const agent = createAgent(
        mockLLM('{"summary":"ok"}'),
        passingGuardrails(),
        null,
        bus,
      );

      await agent.run({ orgId: ORG, data: {} });

      expect(events).toHaveLength(1);
      expect(events[0].payload.agentName).toBe("test-agent");
      expect(events[0].payload.success).toBe(true);
      expect(events[0].payload.tokensUsed).toBe(150);
    });

    it("works without event bus", async () => {
      const agent = createAgent(mockLLM('{"summary":"ok"}'));
      const result = await agent.run({ orgId: ORG, data: {} });
      expect(result.success).toBe(true);
    });
  });

  describe("error handling", () => {
    it("catches parse errors and wraps in failure output", async () => {
      class BadParseAgent extends BaseAgent<AgentInput, never> {
        protected buildMessages(): LLMMessage[] {
          return [{ role: "user", content: "test" }];
        }
        protected parseOutput(): never {
          throw new Error("Cannot parse this format");
        }
      }

      const agent = new BadParseAgent(
        { name: "bad-parse", model: "haiku", systemPrompt: "test" },
        mockLLM("some output"),
        passingGuardrails(),
      );

      const result = await agent.run({ orgId: ORG, data: {} });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Cannot parse this format");
    });
  });
});
