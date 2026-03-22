// ============================================================================
// TESTS: Immutable Document Versioning Engine
// Pure logic tests — no external services
// Run: npx vitest run tests/versioning.test.ts
// ============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createVersionedDocument,
  addVersion,
  getVersionAtDate,
  getCurrentVersion,
  getHistory,
  canDelete,
  getVersionDiff,
} from "../src/lib/versioning";

describe("Versioning Engine", () => {
  describe("createVersionedDocument", () => {
    it("creates document with initial version", () => {
      const doc = createVersionedDocument({
        id: "doc_1",
        title: "WHS Policy",
        content: "Initial content",
        createdBy: "user_1",
      });

      expect(doc.id).toBe("doc_1");
      expect(doc.title).toBe("WHS Policy");
      expect(doc.currentVersion).toBe(1);
      expect(doc.versions).toHaveLength(1);
      expect(doc.versions[0]!.version).toBe(1);
      expect(doc.versions[0]!.content).toBe("Initial content");
      expect(doc.versions[0]!.createdBy).toBe("user_1");
      expect(doc.versions[0]!.changeNote).toBe("Initial version");
    });

    it("accepts custom changeNote", () => {
      const doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "Content",
        createdBy: "user_1",
        changeNote: "Imported from legacy system",
      });

      expect(doc.versions[0]!.changeNote).toBe("Imported from legacy system");
    });

    it("sets createdAt timestamp", () => {
      const doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "Content",
        createdBy: "user_1",
      });

      expect(doc.versions[0]!.createdAt).toBeTruthy();
      // Should be a valid ISO date
      expect(new Date(doc.versions[0]!.createdAt).getTime()).not.toBeNaN();
    });
  });

  describe("addVersion", () => {
    it("creates new version without mutating original", () => {
      const v1 = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "Version 1",
        createdBy: "user_1",
      });

      const v2 = addVersion(v1, "Version 2 content", "user_2", "Updated section 3");

      // Original unchanged
      expect(v1.currentVersion).toBe(1);
      expect(v1.versions).toHaveLength(1);

      // New version
      expect(v2.currentVersion).toBe(2);
      expect(v2.versions).toHaveLength(2);
      expect(v2.versions[1]!.content).toBe("Version 2 content");
      expect(v2.versions[1]!.createdBy).toBe("user_2");
      expect(v2.versions[1]!.changeNote).toBe("Updated section 3");
    });

    it("preserves all previous versions", () => {
      let doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });
      doc = addVersion(doc, "V2", "user_1", "Second");
      doc = addVersion(doc, "V3", "user_2", "Third");

      expect(doc.currentVersion).toBe(3);
      expect(doc.versions).toHaveLength(3);
      expect(doc.versions[0]!.content).toBe("V1");
      expect(doc.versions[1]!.content).toBe("V2");
      expect(doc.versions[2]!.content).toBe("V3");
    });

    it("increments version numbers sequentially", () => {
      let doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });

      for (let i = 2; i <= 5; i++) {
        doc = addVersion(doc, `V${i}`, "user_1");
      }

      expect(doc.versions.map((v) => v.version)).toEqual([1, 2, 3, 4, 5]);
    });

    it("sets null changeNote when omitted", () => {
      const v1 = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });
      const v2 = addVersion(v1, "V2", "user_1");

      expect(v2.versions[1]!.changeNote).toBeNull();
    });
  });

  describe("getCurrentVersion", () => {
    it("returns latest version", () => {
      let doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "First",
        createdBy: "user_1",
      });
      doc = addVersion(doc, "Second", "user_1");
      doc = addVersion(doc, "Third", "user_1");

      const current = getCurrentVersion(doc);
      expect(current!.version).toBe(3);
      expect(current!.content).toBe("Third");
    });

    it("returns null for empty versions array", () => {
      const doc = { id: "doc_1", title: "Empty", versions: [], currentVersion: 0 };
      expect(getCurrentVersion(doc)).toBeNull();
    });
  });

  describe("getVersionAtDate", () => {
    it("returns version that was current at given date", () => {
      const now = Date.now();

      const doc = {
        id: "doc_1",
        title: "Policy",
        currentVersion: 3,
        versions: [
          { version: 1, content: "V1", createdBy: "u1", createdAt: new Date(now - 3000).toISOString(), changeNote: null },
          { version: 2, content: "V2", createdBy: "u1", createdAt: new Date(now - 2000).toISOString(), changeNote: null },
          { version: 3, content: "V3", createdBy: "u1", createdAt: new Date(now - 1000).toISOString(), changeNote: null },
        ],
      };

      // Date between V1 and V2 → should return V1
      const result = getVersionAtDate(doc, new Date(now - 2500).toISOString());
      expect(result!.version).toBe(1);
    });

    it("returns latest when date is after all versions", () => {
      const now = Date.now();
      const doc = {
        id: "doc_1",
        title: "Policy",
        currentVersion: 2,
        versions: [
          { version: 1, content: "V1", createdBy: "u1", createdAt: new Date(now - 2000).toISOString(), changeNote: null },
          { version: 2, content: "V2", createdBy: "u1", createdAt: new Date(now - 1000).toISOString(), changeNote: null },
        ],
      };

      const result = getVersionAtDate(doc, new Date(now + 1000).toISOString());
      expect(result!.version).toBe(2);
    });

    it("returns null when date is before all versions", () => {
      const now = Date.now();
      const doc = {
        id: "doc_1",
        title: "Policy",
        currentVersion: 1,
        versions: [
          { version: 1, content: "V1", createdBy: "u1", createdAt: new Date(now).toISOString(), changeNote: null },
        ],
      };

      const result = getVersionAtDate(doc, new Date(now - 10000).toISOString());
      expect(result).toBeNull();
    });
  });

  describe("getHistory", () => {
    it("returns versions in reverse chronological order", () => {
      let doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });
      doc = addVersion(doc, "V2", "user_1");
      doc = addVersion(doc, "V3", "user_1");

      const history = getHistory(doc);
      expect(history).toHaveLength(3);
      expect(history[0]!.version).toBe(3);
      expect(history[1]!.version).toBe(2);
      expect(history[2]!.version).toBe(1);
    });

    it("does not mutate the original versions array", () => {
      const doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });

      const history = getHistory(doc);
      expect(doc.versions[0]!.version).toBe(1); // still V1 first
      expect(history[0]!.version).toBe(1); // reversed copy
    });
  });

  describe("canDelete", () => {
    it("allows deletion when retention period has passed", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString(); // yesterday
      expect(canDelete(pastDate)).toBe(true);
    });

    it("blocks deletion when retention period is active", () => {
      const futureDate = new Date(Date.now() + 86400000 * 365).toISOString(); // 1 year from now
      expect(canDelete(futureDate)).toBe(false);
    });
  });

  describe("getVersionDiff", () => {
    it("returns diff summary between two versions", () => {
      let doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });
      doc = addVersion(doc, "V2", "user_1", "Fixed section 3");
      doc = addVersion(doc, "V3", "user_1", "Added appendix");

      const diff = getVersionDiff(doc, 1, 3);
      expect(diff).not.toBeNull();
      expect(diff!.fromVersion).toBe(1);
      expect(diff!.toVersion).toBe(3);
      expect(diff!.changeNote).toBe("Added appendix");
    });

    it("returns null for non-existent version", () => {
      const doc = createVersionedDocument({
        id: "doc_1",
        title: "Policy",
        content: "V1",
        createdBy: "user_1",
      });

      expect(getVersionDiff(doc, 1, 99)).toBeNull();
      expect(getVersionDiff(doc, 99, 1)).toBeNull();
    });
  });
});
