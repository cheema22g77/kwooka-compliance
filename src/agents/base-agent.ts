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
  protected abstract buildMessages(input: TInput): LLMMessage[];

  /** Subclasses implement: parse LLM response into typed output */
  protected abstract parseOutput(raw: string, input: TInput): TOutput;

  /** Main execution — orchestrates LLM call → guardrails → reflection → audit */
  async run(input: TInput): Promise<AgentOutput<TOutput>> {
    const startTime = Date.now();
    const agentRunId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const messages = this.buildMessages(input);

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
