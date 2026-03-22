// ============================================================================
// LIB: Immutable Document Versioning Engine
// Every change = new version, old never overwritten
// Answer "what was in effect on date X?" instantly
// Pattern: Gold's versioning engine
// ============================================================================
import type { DocumentVersion } from "@/core/value-objects";

export interface VersionedDocument {
  readonly id: string;
  readonly title: string;
  readonly versions: readonly DocumentVersion[];
  readonly currentVersion: number;
}

/** Create a new versioned document with its first version */
export function createVersionedDocument(params: {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  changeNote?: string;
}): VersionedDocument {
  return {
    id: params.id,
    title: params.title,
    currentVersion: 1,
    versions: [{
      version: 1,
      content: params.content,
      createdBy: params.createdBy,
      createdAt: new Date().toISOString(),
      changeNote: params.changeNote ?? "Initial version",
    }],
  };
}

/** Add a new version (immutable — returns new document) */
export function addVersion(
  doc: VersionedDocument,
  content: string,
  createdBy: string,
  changeNote?: string
): VersionedDocument {
  const nextVersion = doc.currentVersion + 1;
  return {
    ...doc,
    currentVersion: nextVersion,
    versions: [
      ...doc.versions,
      {
        version: nextVersion,
        content,
        createdBy,
        createdAt: new Date().toISOString(),
        changeNote: changeNote ?? null,
      },
    ],
  };
}

/** Get the version that was current at a specific date */
export function getVersionAtDate(
  doc: VersionedDocument,
  date: string
): DocumentVersion | null {
  const targetTime = new Date(date).getTime();
  const validVersions = doc.versions.filter(
    v => new Date(v.createdAt).getTime() <= targetTime
  );
  return validVersions.length > 0
    ? validVersions[validVersions.length - 1]!
    : null;
}

/** Get the current (latest) version */
export function getCurrentVersion(doc: VersionedDocument): DocumentVersion | null {
  return doc.versions.length > 0
    ? doc.versions[doc.versions.length - 1]!
    : null;
}

/** Get full version history (newest first) */
export function getHistory(doc: VersionedDocument): readonly DocumentVersion[] {
  return [...doc.versions].reverse();
}

/** Can this document be deleted? (retention check) */
export function canDelete(retentionUntil: string): boolean {
  return new Date() >= new Date(retentionUntil);
}

/** Compute diff summary between two versions */
export function getVersionDiff(
  doc: VersionedDocument,
  fromVersion: number,
  toVersion: number
): { fromVersion: number; toVersion: number; changeNote: string | null } | null {
  const from = doc.versions.find(v => v.version === fromVersion);
  const to = doc.versions.find(v => v.version === toVersion);
  if (!from || !to) return null;

  return {
    fromVersion,
    toVersion,
    changeNote: to.changeNote,
  };
}
