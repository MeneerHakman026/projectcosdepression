import type { Db } from "@/lib/cms/service";
import { summarize } from "./content";
import { contentHash } from "./hash";
import type { SheetPlan } from "./import";
import {
  CONTENT_FORMAT,
  MASTER_LANGUAGE,
  dictionaryContentSchema,
  emptyContent,
  type ContentSummary,
  type DictionaryContent,
} from "./model";

/**
 * Storage and the Import → Draft → Preview → Publish workflow for the
 * Outcome Dictionary (tables from db/migrations/003_create_dictionary.sql).
 *
 * Like the page CMS, every write is ONE SQL statement — atomic without an
 * interactive transaction, which Neon's HTTP driver doesn't offer — and is
 * guarded by dictionary_state.version: if anyone imported, published or
 * restored in between, the statement matches nothing and is reported as a
 * conflict instead of overwriting their work.
 */

export type ReleaseKind = "import" | "restore" | "language_removed";

export type ImportMeta = {
  fileName: string;
  fileSize: number;
  fileSha256: string;
  sheets: SheetPlan[];
  replaces: string[];
  warnings: number;
};

export type ReleaseSummary = {
  number: number;
  kind: ReleaseKind;
  summary: ContentSummary;
  importMeta: ImportMeta | null;
  removedLanguage: string | null;
  parent: number | null;
  restoredFrom: number | null;
  contentHash: string;
  createdBy: string;
  createdAt: string;
  publishedAt: string | null;
  publishedBy: string | null;
};

export type DictionaryState = {
  version: number;
  draft: ReleaseSummary | null;
  published: ReleaseSummary | null;
};

export type Failure =
  | { ok: false; reason: "conflict"; message: string }
  | { ok: false; reason: "unchanged"; message: string }
  | { ok: false; reason: "not_found"; message: string }
  | { ok: false; reason: "invalid"; message: string };

export type WriteResult = { ok: true; releaseNumber: number; version: number } | Failure;

export class DictionaryNotInstalledError extends Error {
  constructor() {
    super("The dictionary tables don't exist yet. Apply db/migrations/003_create_dictionary.sql.");
    this.name = "DictionaryNotInstalledError";
  }
}

export const CONFLICT_MESSAGE =
  "Someone else changed the dictionary after you opened this page (an import, publish or restore). Nothing was changed — reload to see the latest state, then try again.";

const SUMMARY_COLUMNS = `release_number, kind, summary, import_meta, parent_release_number, restored_from_release_number,
  content_hash, created_by, created_at, published_at, published_by`;

function toIso(value: unknown): string | null {
  if (value == null) return null;
  return (value instanceof Date ? value : new Date(String(value))).toISOString();
}

function asJson<T>(value: unknown): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function toSummary(row: Record<string, unknown>): ReleaseSummary {
  const meta = asJson<(ImportMeta & { removedLanguage?: string }) | null>(row.import_meta);
  return {
    number: Number(row.release_number),
    kind: row.kind as ReleaseKind,
    summary: asJson<ContentSummary>(row.summary),
    importMeta: meta && "fileName" in meta ? meta : null,
    removedLanguage: meta?.removedLanguage ?? null,
    parent: row.parent_release_number == null ? null : Number(row.parent_release_number),
    restoredFrom: row.restored_from_release_number == null ? null : Number(row.restored_from_release_number),
    contentHash: String(row.content_hash),
    createdBy: String(row.created_by),
    createdAt: toIso(row.created_at)!,
    publishedAt: toIso(row.published_at),
    publishedBy: row.published_by == null ? null : String(row.published_by),
  };
}

/** Validates stored content; throws rather than serving something malformed. */
export function parseStoredContent(raw: unknown, releaseNumber: number): DictionaryContent {
  const result = dictionaryContentSchema.safeParse(asJson(raw));
  if (!result.success) {
    throw new Error(`Dictionary release ${releaseNumber} is invalid: ${result.error.issues[0]?.message ?? "unknown"}`);
  }
  return result.data;
}

function isUndefinedTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "42P01";
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}

const conflict = (): Failure => ({ ok: false, reason: "conflict", message: CONFLICT_MESSAGE });

export function createDictionaryService(db: Db) {
  async function run(text: string, params: unknown[] = []) {
    try {
      return await db.query(text, params);
    } catch (error) {
      if (isUndefinedTable(error)) throw new DictionaryNotInstalledError();
      throw error;
    }
  }

  async function getState(): Promise<DictionaryState> {
    const rows = await run(
      `SELECT s.version,
              to_jsonb(d) - 'content' AS draft,
              to_jsonb(p) - 'content' AS published
       FROM dictionary_state s
       LEFT JOIN dictionary_releases d ON d.release_number = s.draft_release_number
       LEFT JOIN dictionary_releases p ON p.release_number = s.published_release_number
       WHERE s.id = 1`
    );
    const row = rows[0];
    if (!row) throw new DictionaryNotInstalledError();
    const draft = asJson<Record<string, unknown> | null>(row.draft);
    const published = asJson<Record<string, unknown> | null>(row.published);
    return {
      version: Number(row.version),
      draft: draft ? toSummary(draft) : null,
      published: published ? toSummary(published) : null,
    };
  }

  async function getRelease(releaseNumber: number): Promise<{ release: ReleaseSummary; content: DictionaryContent } | null> {
    const rows = await run(`SELECT ${SUMMARY_COLUMNS}, content FROM dictionary_releases WHERE release_number = $1`, [
      releaseNumber,
    ]);
    const row = rows[0];
    if (!row) return null;
    return { release: toSummary(row), content: parseStoredContent(row.content, releaseNumber) };
  }

  /**
   * Inserts a new release and makes it the draft — one statement, guarded
   * by the state version. The release number comes from the state row, so
   * numbers never collide even under concurrent imports.
   */
  async function createDraft(input: {
    content: DictionaryContent;
    kind: ReleaseKind;
    expectedVersion: number;
    author: string;
    importMeta?: ImportMeta | { removedLanguage: string } | null;
    restoredFrom?: number | null;
  }): Promise<WriteResult> {
    const parsed = dictionaryContentSchema.safeParse(input.content);
    if (!parsed.success) {
      return { ok: false, reason: "invalid", message: parsed.error.issues[0]?.message ?? "Invalid dictionary data." };
    }
    if (parsed.data.master.outcomes.length === 0) {
      return { ok: false, reason: "invalid", message: "An empty dictionary can't be saved." };
    }

    const state = await getState();
    if (state.version !== input.expectedVersion) return conflict();
    const hash = contentHash(parsed.data);
    const base = state.draft ?? state.published;
    if (base && base.contentHash === hash) {
      return {
        ok: false,
        reason: "unchanged",
        message: state.draft
          ? "This is identical to the current draft, so nothing was saved."
          : "This is identical to the live dictionary, so nothing was saved.",
      };
    }

    try {
      const rows = await run(
        `WITH state AS (
           UPDATE dictionary_state SET
             last_release_number = last_release_number + 1,
             draft_release_number = last_release_number + 1,
             version = version + 1,
             updated_at = now()
           WHERE id = 1 AND version = $1
           RETURNING last_release_number, version, published_release_number
         ), release AS (
           INSERT INTO dictionary_releases
             (release_number, kind, content, content_format, content_hash, summary, import_meta,
              parent_release_number, restored_from_release_number, created_by)
           SELECT last_release_number, $2, $3::jsonb, $4, $5, $6::jsonb, $7::jsonb, $8::integer, $9::integer, $10
           FROM state
           RETURNING release_number
         )
         SELECT release.release_number, state.version FROM release, state`,
        [
          input.expectedVersion,
          input.kind,
          JSON.stringify(parsed.data),
          CONTENT_FORMAT,
          hash,
          JSON.stringify(summarize(parsed.data)),
          input.importMeta ? JSON.stringify(input.importMeta) : null,
          base?.number ?? null,
          input.restoredFrom ?? null,
          input.author,
        ]
      );
      const row = rows[0];
      if (!row) return conflict();
      return { ok: true, releaseNumber: Number(row.release_number), version: Number(row.version) };
    } catch (error) {
      if (isUniqueViolation(error)) return conflict();
      throw error;
    }
  }

  return {
    getState,
    getRelease,
    createDraft,

    async listReleases(): Promise<ReleaseSummary[]> {
      const rows = await run(`SELECT ${SUMMARY_COLUMNS} FROM dictionary_releases ORDER BY release_number DESC`);
      return rows.map(toSummary);
    },

    /** What a new import builds on: the draft if there is one, otherwise the live dictionary. */
    async getBase(): Promise<{ state: DictionaryState; content: DictionaryContent; live: DictionaryContent }> {
      const state = await getState();
      const live = state.published ? (await getRelease(state.published.number))!.content : emptyContent();
      const content = state.draft ? (await getRelease(state.draft.number))!.content : live;
      return { state, content, live };
    },

    /**
     * The live dictionary for one language: the master plus only that
     * language's translation, so public pages never load every language.
     * Null when nothing has been published (or the tables don't exist).
     */
    async getPublishedForLanguage(
      language: string
    ): Promise<{ content: DictionaryContent; release: ReleaseSummary } | null> {
      let rows: Record<string, unknown>[];
      try {
        rows = await run(
          `SELECT ${SUMMARY_COLUMNS.split(",").map((c) => `r.${c.trim()}`).join(", ")},
                  jsonb_build_object(
                    'format', r.content->'format',
                    'master', r.content->'master',
                    'translations', CASE
                      WHEN r.content->'translations' ? $1 THEN jsonb_build_object($1::text, r.content->'translations'->$1)
                      ELSE '{}'::jsonb END
                  ) AS content
           FROM dictionary_state s JOIN dictionary_releases r ON r.release_number = s.published_release_number
           WHERE s.id = 1`,
          [language]
        );
      } catch (error) {
        if (error instanceof DictionaryNotInstalledError) return null;
        throw error;
      }
      const row = rows[0];
      if (!row) return null;
      const release = toSummary(row);
      return { content: parseStoredContent(row.content, release.number), release };
    },

    /** Publishes exactly the draft the administrator reviewed. */
    async publish(input: { expectedVersion: number; draftNumber: number; author: string }) {
      const state = await getState();
      if (state.version !== input.expectedVersion || state.draft?.number !== input.draftNumber) return conflict();
      // Re-validate what's about to go live, whatever was stored.
      const draft = await getRelease(input.draftNumber);
      if (!draft) return { ok: false, reason: "not_found", message: "That draft no longer exists." } as Failure;

      const rows = await run(
        `WITH state AS (
           UPDATE dictionary_state SET
             published_release_number = draft_release_number,
             draft_release_number = NULL,
             version = version + 1,
             updated_at = now()
           WHERE id = 1 AND version = $1 AND draft_release_number = $2
           RETURNING published_release_number, version
         )
         UPDATE dictionary_releases r SET
           published_at = COALESCE(r.published_at, now()),
           published_by = COALESCE(r.published_by, $3)
         FROM state
         WHERE r.release_number = state.published_release_number
         RETURNING r.release_number, r.published_at, state.version`,
        [input.expectedVersion, input.draftNumber, input.author]
      );
      const row = rows[0];
      if (!row) return conflict();
      return {
        ok: true as const,
        releaseNumber: Number(row.release_number),
        publishedAt: toIso(row.published_at)!,
        version: Number(row.version),
      };
    },

    /** Drops the draft pointer. The draft release itself stays in the history. */
    async discardDraft(input: { expectedVersion: number; draftNumber: number }) {
      const rows = await run(
        `UPDATE dictionary_state SET draft_release_number = NULL, version = version + 1, updated_at = now()
         WHERE id = 1 AND version = $1 AND draft_release_number = $2
         RETURNING version`,
        [input.expectedVersion, input.draftNumber]
      );
      if (!rows[0]) return conflict();
      return { ok: true as const, version: Number(rows[0].version) };
    },

    /** Copies an earlier release into a new draft release. History is never rewritten. */
    async restore(input: { releaseNumber: number; expectedVersion: number; author: string }): Promise<WriteResult> {
      const source = await getRelease(input.releaseNumber);
      if (!source) return { ok: false, reason: "not_found", message: "That version doesn't exist." };
      return createDraft({
        content: source.content,
        kind: "restore",
        expectedVersion: input.expectedVersion,
        author: input.author,
        restoredFrom: input.releaseNumber,
      });
    },

    /** New draft without one translation (it stays in earlier releases). */
    async removeLanguage(input: { language: string; expectedVersion: number; author: string }): Promise<WriteResult> {
      if (input.language === MASTER_LANGUAGE) {
        return { ok: false, reason: "invalid", message: "The English master can't be removed." };
      }
      const state = await getState();
      const baseNumber = state.draft?.number ?? state.published?.number;
      const base = baseNumber ? await getRelease(baseNumber) : null;
      if (!base || !(input.language in base.content.translations)) {
        return { ok: false, reason: "not_found", message: "That language isn't in the dictionary." };
      }
      const translations = { ...base.content.translations };
      delete translations[input.language];
      return createDraft({
        content: { ...base.content, translations },
        kind: "language_removed",
        expectedVersion: input.expectedVersion,
        author: input.author,
        importMeta: { removedLanguage: input.language },
      });
    },
  };
}

export type DictionaryService = ReturnType<typeof createDictionaryService>;
