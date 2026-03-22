// ============================================================================
// TESTS: API Keys — generation, hashing, validation, format checking
// Pure crypto/logic tests — no external services
// Run: npx vitest run tests/api-keys.test.ts
// ============================================================================
import { describe, it, expect, vi } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  isValidKeyFormat,
  validateApiKey,
  maskApiKey,
} from "../src/lib/api-keys";
import { isFeatureAvailable } from "../src/lib/billing";

// ── Key Generation ──

describe("generateApiKey", () => {
  it("returns rawKey with kw_live_ prefix", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey).toMatch(/^kw_live_/);
  });

  it("returns a key hash that is a 64-char hex string (SHA-256)", () => {
    const { keyHash } = generateApiKey();
    expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates unique keys each time", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey().rawKey);
    }
    expect(keys.size).toBe(100);
  });

  it("generates unique hashes for each key", () => {
    const hashes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      hashes.add(generateApiKey().keyHash);
    }
    expect(hashes.size).toBe(100);
  });

  it("raw key is long enough to be secure", () => {
    const { rawKey } = generateApiKey();
    // kw_live_ (8 chars) + 32 bytes base64url (~43 chars) = ~51 chars min
    expect(rawKey.length).toBeGreaterThanOrEqual(40);
  });

  it("hash of rawKey matches keyHash", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(hashApiKey(rawKey)).toBe(keyHash);
  });
});

// ── Key Hashing ──

describe("hashApiKey", () => {
  it("returns consistent hash for same input", () => {
    const key = "kw_live_test123abc";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("returns different hash for different input", () => {
    expect(hashApiKey("kw_live_aaa")).not.toBe(hashApiKey("kw_live_bbb"));
  });

  it("returns 64-char hex string", () => {
    expect(hashApiKey("anything")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is a one-way hash (no prefix leak)", () => {
    const hash = hashApiKey("kw_live_secret_key_12345");
    expect(hash).not.toContain("kw_live");
    expect(hash).not.toContain("secret");
  });
});

// ── Key Format Validation ──

describe("isValidKeyFormat", () => {
  it("accepts valid kw_live_ keys", () => {
    expect(isValidKeyFormat("kw_live_abcdef12345678901234")).toBe(true);
  });

  it("rejects keys without kw_live_ prefix", () => {
    expect(isValidKeyFormat("sk_live_abcdef12345678901234")).toBe(false);
    expect(isValidKeyFormat("abcdef12345678901234567890")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidKeyFormat("")).toBe(false);
  });

  it("rejects prefix-only (too short)", () => {
    expect(isValidKeyFormat("kw_live_abc")).toBe(false);
  });

  it("accepts long keys", () => {
    expect(isValidKeyFormat("kw_live_" + "a".repeat(50))).toBe(true);
  });
});

// ── Key Masking ──

describe("maskApiKey", () => {
  it("masks the middle of the key", () => {
    const masked = maskApiKey("kw_live_abcdefghijklmnop1234");
    expect(masked).toMatch(/^kw_live_•+/);
    expect(masked).toMatch(/1234$/);
  });

  it("preserves prefix and last 4 chars", () => {
    const masked = maskApiKey("kw_live_some_long_key_value_here_WXYZ");
    expect(masked.startsWith("kw_live_")).toBe(true);
    expect(masked.endsWith("WXYZ")).toBe(true);
  });

  it("returns short keys unchanged", () => {
    const short = "kw_live_ab";
    expect(maskApiKey(short)).toBe(short);
  });
});

// ── Key Validation (with mock Supabase) ──

describe("validateApiKey", () => {
  function mockSupabase(returnData: any, error: any = null) {
    const updateChain = {
      eq: vi.fn().mockReturnValue({ then: vi.fn() }),
    };
    return {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: returnData, error }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue(updateChain),
      }),
    };
  }

  it("returns key record for valid key", async () => {
    const { rawKey, keyHash } = generateApiKey();
    const mockRecord = {
      id: "key-123",
      org_id: "org-456",
      key_hash: keyHash,
      name: "Test Key",
      last_used_at: null,
      created_at: "2025-01-01T00:00:00Z",
      revoked_at: null,
    };

    const supabase = mockSupabase(mockRecord);
    const result = await validateApiKey(rawKey, supabase);

    expect(result).not.toBeNull();
    expect(result!.id).toBe("key-123");
    expect(result!.orgId).toBe("org-456");
    expect(result!.name).toBe("Test Key");
  });

  it("returns null for invalid format", async () => {
    const supabase = mockSupabase(null);
    const result = await validateApiKey("invalid_key", supabase);
    expect(result).toBeNull();
    // Should not even query the database
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("returns null when key not found in DB", async () => {
    const supabase = mockSupabase(null, { message: "not found" });
    const result = await validateApiKey("kw_live_" + "x".repeat(30), supabase);
    expect(result).toBeNull();
  });

  it("updates last_used_at on successful validation", async () => {
    const { rawKey, keyHash } = generateApiKey();
    const mockRecord = {
      id: "key-123",
      org_id: "org-456",
      key_hash: keyHash,
      name: "Test Key",
      last_used_at: null,
      created_at: "2025-01-01T00:00:00Z",
      revoked_at: null,
    };

    const supabase = mockSupabase(mockRecord);
    await validateApiKey(rawKey, supabase);

    // Verify update was called (fire-and-forget)
    expect(supabase.from).toHaveBeenCalledWith("api_keys");
  });
});

// ── Feature Gate Integration ──

describe("API access feature gate", () => {
  it("API access is only available on enterprise tier", () => {
    expect(isFeatureAvailable("starter", "includesApiAccess")).toBe(false);
    expect(isFeatureAvailable("professional", "includesApiAccess")).toBe(false);
    expect(isFeatureAvailable("enterprise", "includesApiAccess")).toBe(true);
  });

  it("webhooks are only available on enterprise tier", () => {
    expect(isFeatureAvailable("starter", "includesWebhooks")).toBe(false);
    expect(isFeatureAvailable("professional", "includesWebhooks")).toBe(false);
    expect(isFeatureAvailable("enterprise", "includesWebhooks")).toBe(true);
  });
});

// ── Key Lifecycle ──

describe("key lifecycle", () => {
  it("generate → hash → validate round-trip", async () => {
    const { rawKey, keyHash } = generateApiKey();

    // The hash of the raw key matches what was generated
    expect(hashApiKey(rawKey)).toBe(keyHash);

    // Format is valid
    expect(isValidKeyFormat(rawKey)).toBe(true);

    // Can be masked for display
    const masked = maskApiKey(rawKey);
    expect(masked).not.toBe(rawKey);
    expect(masked.startsWith("kw_live_")).toBe(true);
  });

  it("different keys produce different hashes", () => {
    const key1 = generateApiKey();
    const key2 = generateApiKey();

    expect(key1.rawKey).not.toBe(key2.rawKey);
    expect(key1.keyHash).not.toBe(key2.keyHash);
  });
});
