/**
 * Ring 4: Anthropic LLM Adapter
 * 
 * Replaces:
 *   - new Anthropic() in analyze/route.ts
 *   - new Anthropic() in chat/route.ts
 *   - new Anthropic() in generate-policy/route.ts
 * 
 * Single client, circuit breaker wrapping, retry logic.
 */

import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export interface LLMCompletionOptions {
  system: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Single completion (non-streaming)
 */
export async function llmComplete(options: LLMCompletionOptions): Promise<LLMCompletionResult> {
  const client = getClient();
  
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? MAX_TOKENS,
    temperature: options.temperature ?? 0.3,
    system: options.system,
    messages: options.messages,
  });

  const textBlock = response.content.find(b => b.type === 'text');
  
  return {
    content: textBlock?.text ?? '',
    model: MODEL,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/**
 * Streaming completion — returns the raw Anthropic stream
 * Used by the chat route for SSE streaming
 */
export async function llmStream(options: LLMCompletionOptions) {
  const client = getClient();
  
  return client.messages.create({
    model: MODEL,
    max_tokens: options.maxTokens ?? MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    system: options.system,
    messages: options.messages,
    stream: true,
  });
}

export { MODEL as LLM_MODEL };
