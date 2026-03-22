/**
 * Ring 4: Anthropic LLM Adapter
 *
 * Implements ILLMPort from outbound ports.
 * Wraps all calls with the circuit breaker from lib/circuit-breaker.
 *
 * Backward-compatible: still exports llmComplete, llmStream, LLM_MODEL
 * so existing routes (analyze, chat, generate-policy) keep working.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { ILLMPort, LLMMessage, LLMResponse } from "@/ports/outbound";
import { llmBreaker } from "@/lib/circuit-breaker";

const MODELS = {
  sonnet: "claude-sonnet-4-20250514",
  haiku: "claude-haiku-4-5-20251001",
} as const;

const DEFAULT_MODEL: keyof typeof MODELS = "sonnet";
const MAX_TOKENS = 4096;

// ---------------------------------------------------------------------------
// Singleton Anthropic client
// ---------------------------------------------------------------------------
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// ILLMPort implementation
// ---------------------------------------------------------------------------
export class AnthropicLLMAdapter implements ILLMPort {
  async complete(params: {
    model: "sonnet" | "haiku";
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
  }): Promise<LLMResponse> {
    const client = getClient();
    const modelId = MODELS[params.model];
    const start = Date.now();

    const response = await llmBreaker.execute(() =>
      client.messages.create({
        model: modelId,
        max_tokens: params.maxTokens ?? MAX_TOKENS,
        temperature: params.temperature ?? 0.3,
        system: params.systemPrompt,
        messages: params.messages.filter((m) => m.role !== "system") as Array<{
          role: "user" | "assistant";
          content: string;
        }>,
      })
    );

    const textBlock = response.content.find((b) => b.type === "text");

    return {
      content: textBlock?.text ?? "",
      model: modelId,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      durationMs: Date.now() - start,
    };
  }

  async *stream(params: {
    model: "sonnet" | "haiku";
    systemPrompt: string;
    messages: LLMMessage[];
    maxTokens?: number;
    temperature?: number;
  }): AsyncIterable<string> {
    const client = getClient();
    const modelId = MODELS[params.model];

    const rawStream = await llmBreaker.execute(() =>
      client.messages.create({
        model: modelId,
        max_tokens: params.maxTokens ?? MAX_TOKENS,
        temperature: params.temperature ?? 0.7,
        system: params.systemPrompt,
        messages: params.messages.filter((m) => m.role !== "system") as Array<{
          role: "user" | "assistant";
          content: string;
        }>,
        stream: true,
      })
    );

    for await (const event of rawStream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}

// Singleton adapter instance
let _adapter: AnthropicLLMAdapter | null = null;

export function getAnthropicAdapter(): AnthropicLLMAdapter {
  if (!_adapter) {
    _adapter = new AnthropicLLMAdapter();
  }
  return _adapter;
}

// ---------------------------------------------------------------------------
// Backward-compatible exports (used by existing routes)
// ---------------------------------------------------------------------------
export interface LLMCompletionOptions {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export async function llmComplete(
  options: LLMCompletionOptions
): Promise<LLMCompletionResult> {
  const adapter = getAnthropicAdapter();
  const result = await adapter.complete({
    model: DEFAULT_MODEL,
    systemPrompt: options.system,
    messages: options.messages,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  });

  return {
    content: result.content,
    model: result.model,
    inputTokens: result.tokensUsed.input,
    outputTokens: result.tokensUsed.output,
  };
}

export async function llmStream(options: LLMCompletionOptions) {
  const client = getClient();

  return llmBreaker.execute(() =>
    client.messages.create({
      model: MODELS[DEFAULT_MODEL],
      max_tokens: options.maxTokens ?? MAX_TOKENS,
      temperature: options.temperature ?? 0.7,
      system: options.system,
      messages: options.messages,
      stream: true,
    })
  );
}

export const LLM_MODEL = MODELS[DEFAULT_MODEL];
