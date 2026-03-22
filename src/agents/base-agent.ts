// ============================================================================
// RING 5: BASE AGENT
// Abstract class — all 8 compliance agents inherit from this
// Handles: LLM calls, guardrails, reflection, audit trail
// Pattern: Gold's BaseAgent (most sophisticated across all Kwooka platforms)
// ============================================================================
import type { ILLMPort, LLMMessage, LLMResponse } from "@/ports/outbound";
import type { OrgId } from "@/core/value-objects";
import type { AnyDomainEvent } from "@/events/types";
import type { EventBus } from "@/events/bus";
import type { IAgentMemory, AgentMemoryEntry } from "@/memory/agent-memory";
import { formatMemoryContext } from "@/memory/agent-memory";

export interface GuardrailResult {
  passed: boolean;
  layer: string;
  reason: string;
}

export interface ReflectionResult {
  score: number; // 0–1
  feedback: string;
  passed: boolean;
}

export interface AgentConfig {
  name: string;
  model: "sonnet" | "haiku";
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  maxRetries?: number;
  reflectionEnabled?: boolean;
}

export interface AgentInput {
  orgId: OrgId;
  data: Record<string, unknown>;
  correlationId?: string;
}

export interface AgentOutput<T = unknown> {
  agentRunId: string;
  agentName: string;
  success: boolean;
  result: T | null;
  error: string | null;
  tokensUsed: number;
  durationMs: number;
  guardrailsPassed: boolean;
  reflectionScore: number | null;
  raw: string;
}

export abstract class BaseAgent<TInput extends AgentInput = AgentInput, TOutput = unknown> {
  protected readonly config: Required<AgentConfig>;

  constructor(
    config: AgentConfig,
    protected readonly llm: ILLMPort,
    protected readonly guardrails: (raw: string, context: Record<string, unknown>) => Promise<GuardrailResult>,
    protected readonly reflect: ((raw: string, context: Record<string, unknown>) => Promise<ReflectionResult>) | null = null,
    protected readonly eventBus: EventBus | null = null,
    protected readonly memory: IAgentMemory | null = null,
  ) {
    this.config = {
      maxTokens: 4096,
      temperature: 0.3,
      maxRetries: 2,
      reflectionEnabled: true,
      ...config,
    };
  }

  /** Subclasses implement: build the LLM messages from input */
  protected abstract buildMessages(input: TInput, pastRuns?: AgentMemoryEntry[]): LLMMessage[];

  /** Subclasses implement: parse LLM response into typed output */
  protected abstract parseOutput(raw: string, input: TInput): TOutput;

  /** Subclasses may override: summarise input for memory storage */
  protected summariseInput(input: TInput): string {
    const data = { ...input.data };
    // Truncate long fields for storage
    for (const key of Object.keys(data)) {
      if (typeof data[key] === "string" && (data[key] as string).length > 200) {
        data[key] = (data[key] as string).slice(0, 200) + "…";
      }
    }
    return JSON.stringify(data);
  }

  /** Subclasses may override: summarise output for memory storage */
  protected summariseOutput(raw: string): string {
    return raw.length > 500 ? raw.slice(0, 500) + "…" : raw;
  }

  /** Main execution — orchestrates LLM call → guardrails → reflection → audit */
  async run(input: TInput): Promise<AgentOutput<TOutput>> {
    const startTime = Date.now();
    const agentRunId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      // Recall past high-scoring runs for context (non-fatal)
      let pastRuns: AgentMemoryEntry[] = [];
      if (this.memory) {
        try {
          pastRuns = await this.memory.recall({
            agentName: this.config.name,
            orgId: input.orgId,
            limit: 3,
          });
        } catch (_err) {
          // Memory recall failure is non-fatal
        }
      }

      const messages = this.buildMessages(input, pastRuns);

      // Inject memory context into messages if we have past runs
      if (pastRuns.length > 0) {
        const memoryContext = formatMemoryContext(pastRuns);
        // Prepend memory context as a system message after the first message
        const insertIdx = messages[0]?.role === "system" ? 1 : 0;
        messages.splice(insertIdx, 0, {
          role: "user" as const,
          content: memoryContext,
        });
      }

      // LLM call (with retry)
      let llmResponse: LLMResponse | null = null;
      let lastError: string | null = null;

      for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
        try {
          llmResponse = await this.llm.complete({
            model: this.config.model,
            systemPrompt: this.config.systemPrompt,
            messages,
            maxTokens: this.config.maxTokens,
            temperature: this.config.temperature,
          });
          break;
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          if (attempt === this.config.maxRetries) break;
          // Brief backoff
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        }
      }

      if (!llmResponse) {
        return this.failureOutput(
          agentRunId, startTime, 0,
          `LLM call failed after ${this.config.maxRetries + 1} attempts: ${lastError}`
        );
      }

      const raw = llmResponse.content;
      const tokensUsed = llmResponse.tokensUsed.input + llmResponse.tokensUsed.output;

      // Guardrails check
      const guardrailResult = await this.guardrails(raw, {
        agentName: this.config.name,
        orgId: input.orgId,
        ...input.data,
      });

      if (!guardrailResult.passed) {
        // Emit guardrail rejection event
        await this.emitEvent("GuardrailRejection", input.orgId, {
          layer: guardrailResult.layer,
          reason: guardrailResult.reason,
          agentRunId,
        });

        return {
          agentRunId,
          agentName: this.config.name,
          success: false,
          result: null,
          error: `Guardrail rejection (${guardrailResult.layer}): ${guardrailResult.reason}`,
          tokensUsed,
          durationMs: Date.now() - startTime,
          guardrailsPassed: false,
          reflectionScore: null,
          raw,
        };
      }

      // Parse output
      const result = this.parseOutput(raw, input);

      // Reflection (Ring 5.5)
      let reflectionScore: number | null = null;
      if (this.config.reflectionEnabled && this.reflect) {
        try {
          const reflection = await this.reflect(raw, {
            agentName: this.config.name,
            orgId: input.orgId,
            ...input.data,
          });
          reflectionScore = reflection.score;

          // If reflection score is too low, retry once with feedback
          if (reflection.score < 0.6 && this.config.maxRetries > 0) {
            const retryMessages: LLMMessage[] = [
              ...messages,
              { role: "assistant", content: raw },
              {
                role: "user",
                content: `Quality review feedback: ${reflection.feedback}. Please revise your response to address these issues.`,
              },
            ];
            const retryResponse = await this.llm.complete({
              model: this.config.model,
              systemPrompt: this.config.systemPrompt,
              messages: retryMessages,
              maxTokens: this.config.maxTokens,
              temperature: this.config.temperature,
            });
            const retryResult = this.parseOutput(retryResponse.content, input);

            // Emit completion event
            const totalTokens = tokensUsed + retryResponse.tokensUsed.input + retryResponse.tokensUsed.output;
            await this.emitAgentRunEvent(agentRunId, input.orgId, true, totalTokens, Date.now() - startTime, reflectionScore);

            // Store revised output to memory
            await this.storeToMemory(agentRunId, input, retryResponse.content, reflectionScore);

            return {
              agentRunId,
              agentName: this.config.name,
              success: true,
              result: retryResult,
              error: null,
              tokensUsed: totalTokens,
              durationMs: Date.now() - startTime,
              guardrailsPassed: true,
              reflectionScore: reflection.score,
              raw: retryResponse.content,
            };
          }
        } catch (_err) {
          // Reflection failure is non-fatal
        }
      }

      // Emit completion event
      await this.emitAgentRunEvent(agentRunId, input.orgId, true, tokensUsed, Date.now() - startTime, reflectionScore);

      // Store to memory (non-fatal)
      await this.storeToMemory(agentRunId, input, raw, reflectionScore);

      return {
        agentRunId,
        agentName: this.config.name,
        success: true,
        result,
        error: null,
        tokensUsed,
        durationMs: Date.now() - startTime,
        guardrailsPassed: true,
        reflectionScore,
        raw,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      return this.failureOutput(agentRunId, startTime, 0, error);
    }
  }

  private async storeToMemory(
    agentRunId: string,
    input: TInput,
    raw: string,
    reflectionScore: number | null,
  ): Promise<void> {
    if (!this.memory || reflectionScore === null) return;
    try {
      await this.memory.store({
        agentRunId,
        agentName: this.config.name,
        orgId: input.orgId,
        inputSummary: this.summariseInput(input),
        outputSummary: this.summariseOutput(raw),
        reflectionScore,
      });
    } catch (_err) {
      // Memory storage failure is non-fatal
    }
  }

  private failureOutput(
    agentRunId: string,
    startTime: number,
    tokensUsed: number,
    error: string
  ): AgentOutput<TOutput> {
    return {
      agentRunId,
      agentName: this.config.name,
      success: false,
      result: null,
      error,
      tokensUsed,
      durationMs: Date.now() - startTime,
      guardrailsPassed: false,
      reflectionScore: null,
      raw: "",
    };
  }

  private async emitEvent(
    eventType: string,
    orgId: OrgId,
    payload: Record<string, unknown>
  ): Promise<void> {
    if (!this.eventBus) return;
    try {
      await this.eventBus.publish({
        eventId: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        eventType,
        orgId,
        occurredAt: new Date().toISOString(),
        correlationId: `cor_${Date.now()}`,
        payload,
      } as AnyDomainEvent);
    } catch (_err) {
      // Event emission failure is non-fatal
    }
  }

  private async emitAgentRunEvent(
    agentRunId: string,
    orgId: OrgId,
    success: boolean,
    tokensUsed: number,
    durationMs: number,
    reflectionScore: number | null
  ): Promise<void> {
    await this.emitEvent("AgentRunCompleted", orgId, {
      agentRunId,
      agentName: this.config.name,
      success,
      tokensUsed,
      durationMs,
      reflectionScore,
    });
  }
}
