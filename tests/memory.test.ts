// ============================================================================
// TESTS: Agent Memory — store, recall, deduplication, score-based ranking
// Uses InMemoryAgentMemory — no external services needed
// Run: npx vitest run tests/memory.test.ts
// ============================================================================
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  InMemoryAgentMemory,
  formatMemoryContext,
  type IAgentMemory,
  type AgentMemoryEntry,
} from "../src/memory/agent-memory";
import { BaseAgent } from "../src/agents/base-agent";
import type { AgentInput, AgentOutput } from "../src/agents/base-agent";
import type { ILLMPort, LLMMessage, LLMResponse } from "../src/ports/outbound";
import type { OrgId } from "../src/core/value-objects";

const ORG = "org_test" as OrgId;
const OTHER_ORG = "org_other" as OrgId;

// ── InMemoryAgentMemory ──

describe("InMemoryAgentMemory", () => {
  let memory: InMemoryAgentMemory;

  beforeEach(() => {
    memory = new InMemoryAgentMemory();
  });

  describe("store", () => {
    it("stores an agent run entry", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "NDIS policy document",
        outputSummary: "Score 85, 3 findings",
        reflectionScore: 0.9,
      });

      const all = memory.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.agentRunId).toBe("run_1");
      expect(all[0]!.agentName).toBe("compliance-analyser");
      expect(all[0]!.orgId).toBe(ORG);
      expect(all[0]!.inputSummary).toBe("NDIS policy document");
      expect(all[0]!.outputSummary).toBe("Score 85, 3 findings");
      expect(all[0]!.reflectionScore).toBe(0.9);
      expect(all[0]!.createdAt).toBeTruthy();
    });

    it("stores multiple entries", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Doc 1",
        outputSummary: "Result 1",
        reflectionScore: 0.8,
      });
      await memory.store({
        agentRunId: "run_2",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Doc 2",
        outputSummary: "Result 2",
        reflectionScore: 0.7,
      });

      expect(memory.getAll()).toHaveLength(2);
    });
  });

  describe("deduplication", () => {
    it("updates existing entry with same agentRunId", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Original input",
        outputSummary: "Original output",
        reflectionScore: 0.5,
      });

      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Updated input",
        outputSummary: "Updated output",
        reflectionScore: 0.9,
      });

      const all = memory.getAll();
      expect(all).toHaveLength(1);
      expect(all[0]!.inputSummary).toBe("Updated input");
      expect(all[0]!.reflectionScore).toBe(0.9);
    });

    it("stores separately for different agentRunIds", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Doc A",
        outputSummary: "Result A",
        reflectionScore: 0.8,
      });
      await memory.store({
        agentRunId: "run_2",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Doc B",
        outputSummary: "Result B",
        reflectionScore: 0.9,
      });

      expect(memory.getAll()).toHaveLength(2);
    });
  });

  describe("recall", () => {
    it("returns entries for matching agent+org", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Doc 1",
        outputSummary: "Result 1",
        reflectionScore: 0.8,
      });
      await memory.store({
        agentRunId: "run_2",
        agentName: "policy-generator",
        orgId: ORG,
        inputSummary: "Doc 2",
        outputSummary: "Result 2",
        reflectionScore: 0.9,
      });

      const results = await memory.recall({
        agentName: "compliance-analyser",
        orgId: ORG,
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.agentName).toBe("compliance-analyser");
    });

    it("filters by orgId", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Doc 1",
        outputSummary: "Result 1",
        reflectionScore: 0.8,
      });
      await memory.store({
        agentRunId: "run_2",
        agentName: "compliance-analyser",
        orgId: OTHER_ORG,
        inputSummary: "Doc 2",
        outputSummary: "Result 2",
        reflectionScore: 0.9,
      });

      const results = await memory.recall({
        agentName: "compliance-analyser",
        orgId: ORG,
      });

      expect(results).toHaveLength(1);
      expect(results[0]!.orgId).toBe(ORG);
    });

    it("returns empty array when no matches", async () => {
      const results = await memory.recall({
        agentName: "nonexistent-agent",
        orgId: ORG,
      });
      expect(results).toEqual([]);
    });
  });

  describe("score-based ranking", () => {
    it("returns entries sorted by reflectionScore descending", async () => {
      await memory.store({
        agentRunId: "run_low",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Low quality",
        outputSummary: "Low result",
        reflectionScore: 0.5,
      });
      await memory.store({
        agentRunId: "run_high",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "High quality",
        outputSummary: "High result",
        reflectionScore: 0.95,
      });
      await memory.store({
        agentRunId: "run_mid",
        agentName: "compliance-analyser",
        orgId: ORG,
        inputSummary: "Mid quality",
        outputSummary: "Mid result",
        reflectionScore: 0.7,
      });

      const results = await memory.recall({
        agentName: "compliance-analyser",
        orgId: ORG,
      });

      expect(results).toHaveLength(3);
      expect(results[0]!.reflectionScore).toBe(0.95);
      expect(results[1]!.reflectionScore).toBe(0.7);
      expect(results[2]!.reflectionScore).toBe(0.5);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        await memory.store({
          agentRunId: `run_${i}`,
          agentName: "compliance-analyser",
          orgId: ORG,
          inputSummary: `Doc ${i}`,
          outputSummary: `Result ${i}`,
          reflectionScore: i * 0.1,
        });
      }

      const results = await memory.recall({
        agentName: "compliance-analyser",
        orgId: ORG,
        limit: 3,
      });

      expect(results).toHaveLength(3);
      // Top 3 scores: 0.9, 0.8, 0.7
      expect(results[0]!.reflectionScore).toBeCloseTo(0.9);
      expect(results[1]!.reflectionScore).toBeCloseTo(0.8);
      expect(results[2]!.reflectionScore).toBeCloseTo(0.7);
    });

    it("defaults to limit of 3", async () => {
      for (let i = 0; i < 5; i++) {
        await memory.store({
          agentRunId: `run_${i}`,
          agentName: "compliance-analyser",
          orgId: ORG,
          inputSummary: `Doc ${i}`,
          outputSummary: `Result ${i}`,
          reflectionScore: 0.6 + i * 0.05,
        });
      }

      const results = await memory.recall({
        agentName: "compliance-analyser",
        orgId: ORG,
      });

      expect(results).toHaveLength(3);
    });
  });

  describe("clear", () => {
    it("removes all entries", async () => {
      await memory.store({
        agentRunId: "run_1",
        agentName: "test",
        orgId: ORG,
        inputSummary: "in",
        outputSummary: "out",
        reflectionScore: 0.8,
      });

      memory.clear();
      expect(memory.getAll()).toHaveLength(0);
    });
  });
});

// ── formatMemoryContext ──

describe("formatMemoryContext", () => {
  it("returns empty string for no memories", () => {
    expect(formatMemoryContext([])).toBe("");
  });

  it("formats single memory entry", () => {
    const memories: AgentMemoryEntry[] = [
      {
        agentRunId: "run_1",
        agentName: "test",
        orgId: "org_1",
        inputSummary: "Test input",
        outputSummary: "Test output",
        reflectionScore: 0.85,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const result = formatMemoryContext(memories);
    expect(result).toContain("CONTEXT FROM PAST SUCCESSFUL RUNS");
    expect(result).toContain("Past Run 1");
    expect(result).toContain("score: 0.85");
    expect(result).toContain("Input: Test input");
    expect(result).toContain("Output: Test output");
  });

  it("formats multiple entries with numbering", () => {
    const memories: AgentMemoryEntry[] = [
      {
        agentRunId: "run_1",
        agentName: "test",
        orgId: "org_1",
        inputSummary: "First",
        outputSummary: "First result",
        reflectionScore: 0.9,
        createdAt: "2025-01-01T00:00:00Z",
      },
      {
        agentRunId: "run_2",
        agentName: "test",
        orgId: "org_1",
        inputSummary: "Second",
        outputSummary: "Second result",
        reflectionScore: 0.8,
        createdAt: "2025-01-01T00:00:00Z",
      },
    ];

    const result = formatMemoryContext(memories);
    expect(result).toContain("Past Run 1");
    expect(result).toContain("Past Run 2");
    expect(result).toContain("score: 0.90");
    expect(result).toContain("score: 0.80");
  });
});

// ── BaseAgent + Memory Integration ──

function mockLLM(content: string): ILLMPort {
  return {
    complete: vi.fn(async () => ({
      content,
      model: "haiku",
      tokensUsed: { input: 100, output: 50 },
      durationMs: 200,
    } as LLMResponse)),
    stream: vi.fn(),
  } as unknown as ILLMPort;
}

function passingGuardrails() {
  return async () => ({ passed: true, layer: "all", reason: "ok" });
}

class MemoryTestAgent extends BaseAgent<AgentInput, { summary: string }> {
  public lastPastRuns: AgentMemoryEntry[] = [];

  protected buildMessages(input: AgentInput, pastRuns?: AgentMemoryEntry[]): LLMMessage[] {
    this.lastPastRuns = pastRuns ?? [];
    return [{ role: "user", content: JSON.stringify(input.data) }];
  }

  protected parseOutput(raw: string): { summary: string } {
    return { summary: raw };
  }
}

describe("BaseAgent + IAgentMemory integration", () => {
  it("recalls past runs and passes them to buildMessages", async () => {
    const memory = new InMemoryAgentMemory();

    // Pre-populate memory
    await memory.store({
      agentRunId: "past_1",
      agentName: "memory-test",
      orgId: ORG,
      inputSummary: "Past input",
      outputSummary: "Past output",
      reflectionScore: 0.9,
    });

    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      mockLLM("test response"),
      passingGuardrails(),
      null, // no reflection
      null, // no event bus
      memory,
    );

    await agent.run({ orgId: ORG, data: {} });

    expect(agent.lastPastRuns).toHaveLength(1);
    expect(agent.lastPastRuns[0]!.agentRunId).toBe("past_1");
  });

  it("injects memory context into LLM messages", async () => {
    const memory = new InMemoryAgentMemory();
    await memory.store({
      agentRunId: "past_1",
      agentName: "memory-test",
      orgId: ORG,
      inputSummary: "Past input",
      outputSummary: "Past output",
      reflectionScore: 0.85,
    });

    const llm = mockLLM("response with memory");
    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      llm,
      passingGuardrails(),
      null,
      null,
      memory,
    );

    await agent.run({ orgId: ORG, data: {} });

    // Verify the LLM received a message with memory context
    const callArgs = (llm.complete as any).mock.calls[0][0];
    const allContent = callArgs.messages.map((m: any) => m.content).join("\n");
    expect(allContent).toContain("CONTEXT FROM PAST SUCCESSFUL RUNS");
    expect(allContent).toContain("Past output");
  });

  it("stores successful run to memory when reflection score is available", async () => {
    const memory = new InMemoryAgentMemory();
    const reflect = vi.fn(async () => ({
      score: 0.85,
      feedback: "Good",
      passed: true,
    }));

    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      mockLLM("good output"),
      passingGuardrails(),
      reflect,
      null,
      memory,
    );

    const result = await agent.run({
      orgId: ORG,
      data: { text: "some document" },
    });

    expect(result.success).toBe(true);

    const stored = memory.getAll();
    expect(stored).toHaveLength(1);
    expect(stored[0]!.agentName).toBe("memory-test");
    expect(stored[0]!.reflectionScore).toBe(0.85);
    expect(stored[0]!.outputSummary).toContain("good output");
  });

  it("does not store to memory when reflection is disabled", async () => {
    const memory = new InMemoryAgentMemory();

    const agent = new MemoryTestAgent(
      {
        name: "memory-test",
        model: "haiku",
        systemPrompt: "test",
        reflectionEnabled: false,
      },
      mockLLM("output"),
      passingGuardrails(),
      null,
      null,
      memory,
    );

    await agent.run({ orgId: ORG, data: {} });

    // No reflection score → no memory storage
    expect(memory.getAll()).toHaveLength(0);
  });

  it("does not store failed runs to memory", async () => {
    const memory = new InMemoryAgentMemory();

    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      mockLLM("bad output"),
      async () => ({ passed: false, layer: "schema", reason: "invalid" }),
      null,
      null,
      memory,
    );

    const result = await agent.run({ orgId: ORG, data: {} });

    expect(result.success).toBe(false);
    expect(memory.getAll()).toHaveLength(0);
  });

  it("works without memory (backward compatible)", async () => {
    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      mockLLM("response"),
      passingGuardrails(),
    );

    const result = await agent.run({ orgId: ORG, data: {} });

    expect(result.success).toBe(true);
    expect(agent.lastPastRuns).toHaveLength(0);
  });

  it("continues if memory recall fails", async () => {
    const brokenMemory: IAgentMemory = {
      store: vi.fn(async () => {}),
      recall: vi.fn(async () => { throw new Error("DB down"); }),
    };

    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      mockLLM("response"),
      passingGuardrails(),
      null,
      null,
      brokenMemory,
    );

    const result = await agent.run({ orgId: ORG, data: {} });

    expect(result.success).toBe(true);
    expect(agent.lastPastRuns).toHaveLength(0);
  });

  it("continues if memory store fails", async () => {
    const brokenMemory: IAgentMemory = {
      store: vi.fn(async () => { throw new Error("DB down"); }),
      recall: vi.fn(async () => []),
    };

    const reflect = vi.fn(async () => ({
      score: 0.9,
      feedback: "Good",
      passed: true,
    }));

    const agent = new MemoryTestAgent(
      { name: "memory-test", model: "haiku", systemPrompt: "test" },
      mockLLM("response"),
      passingGuardrails(),
      reflect,
      null,
      brokenMemory,
    );

    const result = await agent.run({ orgId: ORG, data: {} });

    expect(result.success).toBe(true);
    expect(brokenMemory.store).toHaveBeenCalled();
  });
});
