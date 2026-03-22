// ============================================================================
// LIB: Prompt Registry
// Versioned, cacheable system prompts for all AI agents
// Pattern: Gold's prompt registry — DB-backed with in-process cache
// ============================================================================

export interface PromptVersion {
  readonly id: string;
  readonly agentName: string;
  readonly version: number;
  readonly prompt: string;
  readonly isActive: boolean;
  readonly isCanary: boolean;
  readonly canaryPercent: number;
  readonly winRate: number | null;
  readonly createdAt: string;
  readonly createdBy: string;
  readonly notes: string | null;
}

// In-process cache to avoid DB round-trips on every agent call
const promptCache = new Map<string, { prompt: string; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load the active prompt for an agent.
 * Uses in-process cache with 5-minute TTL.
 * Falls back to provided default if DB unavailable.
 *
 * @param loadFromDB - function that queries the prompt_registry table
 * @param agentName - name of the agent
 * @param defaultPrompt - hardcoded fallback prompt
 * @param sampleKey - for deterministic canary routing (e.g. orgId)
 */
export async function loadPrompt(
  loadFromDB: (agentName: string) => Promise<PromptVersion | null>,
  agentName: string,
  defaultPrompt: string,
  sampleKey?: string
): Promise<string> {
  // Check cache first
  const cacheKey = `${agentName}:active`;
  const cached = promptCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.prompt;
  }

  try {
    const active = await loadFromDB(agentName);
    if (active) {
      promptCache.set(cacheKey, { prompt: active.prompt, cachedAt: Date.now() });
      return active.prompt;
    }
  } catch (_err) {
    // DB failure — fall through to default
  }

  // Cache the default too (avoids repeated DB failures hammering the DB)
  promptCache.set(cacheKey, { prompt: defaultPrompt, cachedAt: Date.now() });
  return defaultPrompt;
}

/** Clear cache (for testing or after prompt update) */
export function clearPromptCache(): void {
  promptCache.clear();
}

/** Invalidate a specific agent's cached prompt */
export function invalidatePrompt(agentName: string): void {
  promptCache.delete(`${agentName}:active`);
}
