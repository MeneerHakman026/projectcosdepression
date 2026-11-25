import "server-only";
import { diffContents, needsAcknowledgement, reviewAlerts, type DatasetDiff, type ReviewAlert } from "./diff";
import { contentHash, sha256Hex } from "./hash";
import { analyzeImport, type ImportIssue, type SheetPlan } from "./import";
import type { DictionaryContent } from "./model";
import { readWorkbook } from "./xlsx-read";

/**
 * Upload → validate → compare, as one deterministic function of (file,
 * chosen language, current dictionary). The preview and the save both run
 * it, so what's saved is exactly what was previewed: the save is refused if
 * the file's hash or the dictionary's state version differ from the preview.
 */

export type ImportPreview = {
  ok: boolean;
  file: { name: string; size: number; sha256: string };
  issues: ImportIssue[];
  sheets: SheetPlan[];
  replaces: string[];
  /** Compared with the live (published) dictionary. */
  diff: DatasetDiff | null;
  alerts: ReviewAlert[];
  needsAcknowledgement: boolean;
  /** The import changes nothing compared with what it builds on. */
  unchanged: boolean;
  basedOn: { kind: "draft" | "live" | "empty"; releaseNumber: number | null };
  stateVersion: number;
};

export type PreparedImport = { preview: ImportPreview; proposed: DictionaryContent | null };

export type ImportBase = {
  version: number;
  draftNumber: number | null;
  liveNumber: number | null;
  /** The draft, or the live dictionary when there's no draft. */
  content: DictionaryContent;
  live: DictionaryContent;
};

export async function prepareImport(
  bytes: Uint8Array,
  options: { fileName: string; language: string; roleCodes: readonly string[] },
  base: ImportBase
): Promise<PreparedImport> {
  const file = { name: options.fileName, size: bytes.length, sha256: sha256Hex(bytes) };
  const basedOn: ImportPreview["basedOn"] =
    base.draftNumber != null
      ? { kind: "draft", releaseNumber: base.draftNumber }
      : base.liveNumber != null
        ? { kind: "live", releaseNumber: base.liveNumber }
        : { kind: "empty", releaseNumber: null };
  const empty = {
    file,
    sheets: [] as SheetPlan[],
    replaces: [] as string[],
    diff: null,
    alerts: [] as ReviewAlert[],
    needsAcknowledgement: false,
    unchanged: false,
    basedOn,
    stateVersion: base.version,
  };

  const read = await readWorkbook(bytes);
  if (!read.ok) {
    return { preview: { ...empty, ok: false, issues: [{ level: "error", message: read.message }] }, proposed: null };
  }

  const analysis = analyzeImport(read.sheets, { language: options.language, roleCodes: options.roleCodes }, base.content);
  if (!analysis.ok || !analysis.proposed) {
    return {
      preview: { ...empty, ok: false, issues: analysis.issues, sheets: analysis.sheets, replaces: analysis.replaces },
      proposed: null,
    };
  }

  const diff = diffContents(base.live, analysis.proposed);
  return {
    preview: {
      ...empty,
      ok: true,
      issues: analysis.issues,
      sheets: analysis.sheets,
      replaces: analysis.replaces,
      diff,
      alerts: reviewAlerts(diff),
      needsAcknowledgement: needsAcknowledgement(diff),
      unchanged: contentHash(analysis.proposed) === contentHash(base.content),
    },
    proposed: analysis.proposed,
  };
}
