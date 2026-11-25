import { createHash } from "node:crypto";
import type { MasterOutcome } from "./model";

/** JSON with object keys sorted at every level, so equal content always hashes equally. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

export function contentHash(content: unknown): string {
  return sha256Hex(canonicalJson(content));
}

/** Fingerprint of an English row, recorded with each translation to detect outdated translations. */
export function masterRowFingerprint(outcome: MasterOutcome): string {
  return sha256Hex(
    canonicalJson([
      outcome.category,
      outcome.groupDomain,
      outcome.outcomeDomain,
      outcome.definition,
      outcome.experience,
      outcome.verbatims,
    ])
  ).slice(0, 16);
}
