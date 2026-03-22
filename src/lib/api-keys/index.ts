// ============================================================================
// LIB: API Keys — generate, hash, validate
// Keys use kw_live_ prefix for easy identification in logs/configs
// SHA-256 hash stored in DB — raw key is never persisted
// ============================================================================
import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "kw_live_";
const KEY_BYTE_LENGTH = 32;

export interface GeneratedKey {
  /** Raw key to show the user ONCE — never stored */
  rawKey: string;
  /** SHA-256 hash for database storage */
  keyHash: string;
}

export interface ApiKeyRecord {
  id: string;
  orgId: string;
  keyHash: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

/**
 * Generate a new API key with kw_live_ prefix.
 * Returns the raw key (show once) and hash (store in DB).
 */
export function generateApiKey(): GeneratedKey {
  const raw = randomBytes(KEY_BYTE_LENGTH).toString("base64url");
  const rawKey = `${KEY_PREFIX}${raw}`;
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyHash };
}

/**
 * SHA-256 hash of a raw API key.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Check if a string looks like a valid Kwooka API key format.
 */
export function isValidKeyFormat(key: string): boolean {
  return key.startsWith(KEY_PREFIX) && key.length > KEY_PREFIX.length + 10;
}

/**
 * Validate an API key against the database.
 * Returns the matching key record or null if invalid/revoked.
 */
export async function validateApiKey(
  rawKey: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<ApiKeyRecord | null> {
  if (!isValidKeyFormat(rawKey)) return null;

  const hash = hashApiKey(rawKey);

  const { data, error } = await supabase
    .from("api_keys")
    .select("id, org_id, key_hash, name, last_used_at, created_at, revoked_at")
    .eq("key_hash", hash)
    .is("revoked_at", null)
    .single();

  if (error || !data) return null;

  // Update last_used_at (fire-and-forget)
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => {});

  return {
    id: data.id,
    orgId: data.org_id,
    keyHash: data.key_hash,
    name: data.name,
    lastUsedAt: data.last_used_at,
    createdAt: data.created_at,
    revokedAt: data.revoked_at,
  };
}

/**
 * Mask an API key for display: kw_live_abc...xyz
 */
export function maskApiKey(rawKey: string): string {
  if (rawKey.length < KEY_PREFIX.length + 8) return rawKey;
  const suffix = rawKey.slice(-4);
  return `${KEY_PREFIX}${"•".repeat(8)}${suffix}`;
}
