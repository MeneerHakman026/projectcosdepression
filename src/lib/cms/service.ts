import type { PageDefinition } from "./pages";
import { toFieldErrors, type FieldErrors } from "./validation";

/**
 * Content storage and the Edit → Save draft → Preview → Publish workflow.
 *
 * Written against a minimal query interface rather than the Neon client
 * directly, so the exact same SQL runs in production (lib/cms/server.ts)
 * and against an in-memory Postgres in tests.
 *
 * Every write is a single SQL statement, so it's atomic without needing an
 * interactive transaction (which Neon's HTTP driver doesn't offer). Writes
 * are guarded by the draft_version the editor loaded: if anyone saved in
 * between, the statement matches no row and the write is reported as a
 * conflict instead of silently overwriting their work.
 */

export type Db = {
  query(text: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
};

export type PageStatus = "default" | "draft_only" | "changes_pending" | "published";

export type RevisionKind = "draft" | "publish" | "restore";

export type PageState<TContent = unknown> = {
  slug: string;
  status: PageStatus;
  /** Draft content to edit — the built-in defaults if nothing is saved yet. */
  content: TContent;
  /** Pass back with every write; 0 means "no saved draft exists yet". */
  version: number;
  draftSavedAt: string | null;
  draftSavedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
  publishedRevisionNumber: number | null;
  /** Set when saved content no longer matches the current schema. */
  contentError: string | null;
};

export type PageSummary = {
  slug: string;
  path: string;
  name: string;
  status: PageStatus;
  lastModifiedAt: string | null;
  lastModifiedBy: string | null;
};

export type RevisionSummary = {
  revisionNumber: number;
  kind: RevisionKind;
  author: string;
  createdAt: string;
  restoredFromRevisionNumber: number | null;
};

export type MutationFailure =
  | { ok: false; reason: "invalid"; message: string; fieldErrors: FieldErrors }
  | { ok: false; reason: "conflict"; message: string }
  | { ok: false; reason: "not_found"; message: string }
  | { ok: false; reason: "nothing_to_publish"; message: string };

export type SaveResult = { ok: true; version: number; savedAt: string; revisionNumber: number } | MutationFailure;
export type PublishResult = { ok: true; revisionNumber: number; publishedAt: string } | MutationFailure;

/** Thrown when the CMS tables haven't been created yet (migration 002). */
export class CmsNotInstalledError extends Error {
  constructor() {
    super("The content tables don't exist yet. Apply db/migrations/002_create_cms_pages.sql.");
    this.name = "CmsNotInstalledError";
  }
}

const CONFLICT_MESSAGE =
  "Someone else saved this page after you opened it. Your changes haven't been saved — copy anything you need, then reload to see the latest version.";

type PageRow = {
  id: number | string;
  slug: string;
  draft_content: unknown;
  draft_schema_version: number;
  draft_version: number;
  draft_updated_at: string | Date;
  draft_updated_by: string;
  published_content: unknown;
  published_schema_version: number | null;
  published_revision_number: number | null;
  published_draft_version: number | null;
  published_at: string | Date | null;
  published_by: string | null;
};

function toIso(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function statusOf(row: PageRow | undefined): PageStatus {
  if (!row) return "default";
  if (row.published_revision_number == null) return "draft_only";
  return row.published_draft_version === row.draft_version ? "published" : "changes_pending";
}

function isUndefinedTable(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "42P01";
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}

type ParsedContent<T> = { ok: true; content: T } | { ok: false; message: string; fieldErrors: FieldErrors };

/** Upgrades (if needed) and validates stored or submitted content. */
export function parseContent<T>(page: PageDefinition<T>, raw: unknown, schemaVersion: number): ParsedContent<T> {
  if (schemaVersion > page.schemaVersion) {
    return {
      ok: false,
      message: "This content was saved by a newer version of the website and can't be opened here.",
      fieldErrors: {},
    };
  }
  const upgraded = schemaVersion < page.schemaVersion && page.migrate ? page.migrate(raw, schemaVersion) : raw;
  const result = page.schema.safeParse(upgraded);
  if (result.success) return { ok: true, content: result.data };
  return {
    ok: false,
    message: "Some fields need attention before this can be saved.",
    fieldErrors: toFieldErrors(result.error),
  };
}

function invalid(parsed: { message: string; fieldErrors: FieldErrors }): MutationFailure {
  return { ok: false, reason: "invalid", message: parsed.message, fieldErrors: parsed.fieldErrors };
}

export function createCmsService(db: Db) {
  async function run(text: string, params: unknown[] = []) {
    try {
      return await db.query(text, params);
    } catch (error) {
      if (isUndefinedTable(error)) throw new CmsNotInstalledError();
      throw error;
    }
  }

  async function getRow(slug: string): Promise<PageRow | undefined> {
    const rows = await run(`SELECT * FROM cms_pages WHERE slug = $1`, [slug]);
    return rows[0] as PageRow | undefined;
  }

  async function writeDraft(
    page: PageDefinition,
    content: unknown,
    expectedVersion: number,
    author: string,
    kind: "draft" | "restore",
    restoredFrom: number | null
  ): Promise<SaveResult> {
    try {
      const rows = await run(
        `WITH page AS (
           INSERT INTO cms_pages AS p
             (slug, draft_content, draft_schema_version, draft_updated_by, last_revision_number)
           VALUES ($1, $2::jsonb, $3, $4, 1)
           ON CONFLICT (slug) DO UPDATE SET
             draft_content = EXCLUDED.draft_content,
             draft_schema_version = EXCLUDED.draft_schema_version,
             draft_version = p.draft_version + 1,
             draft_updated_at = now(),
             draft_updated_by = EXCLUDED.draft_updated_by,
             last_revision_number = p.last_revision_number + 1
           WHERE p.draft_version = $5
           RETURNING p.id, p.draft_version, p.draft_updated_at, p.last_revision_number
         ), revision AS (
           INSERT INTO cms_page_revisions
             (page_id, revision_number, kind, content, schema_version, author,
              restored_from_revision_number, created_at)
           SELECT id, last_revision_number, $6, $2::jsonb, $3, $4, $7::integer, draft_updated_at
           FROM page
           RETURNING revision_number
         )
         SELECT page.draft_version, page.draft_updated_at, revision.revision_number
         FROM page, revision`,
        [page.slug, JSON.stringify(content), page.schemaVersion, author, expectedVersion, kind, restoredFrom]
      );
      const row = rows[0];
      if (!row) return { ok: false, reason: "conflict", message: CONFLICT_MESSAGE };
      return {
        ok: true,
        version: Number(row.draft_version),
        savedAt: toIso(row.draft_updated_at as string | Date)!,
        revisionNumber: Number(row.revision_number),
      };
    } catch (error) {
      // Two first-ever saves racing each other; the loser is a conflict too.
      if (isUniqueViolation(error)) return { ok: false, reason: "conflict", message: CONFLICT_MESSAGE };
      throw error;
    }
  }

  return {
    async listPages(pages: PageDefinition[]): Promise<PageSummary[]> {
      const rows = (await run(
        `SELECT slug, draft_version, draft_updated_at, draft_updated_by, published_revision_number,
                published_draft_version, published_at, published_by
         FROM cms_pages WHERE slug = ANY($1::text[])`,
        [pages.map((page) => page.slug)]
      )) as PageRow[];
      const bySlug = new Map(rows.map((row) => [row.slug, row]));

      return pages.map((page) => {
        const row = bySlug.get(page.slug);
        const draftAt = toIso(row?.draft_updated_at);
        const publishedAt = toIso(row?.published_at);
        const publishedIsLatest = publishedAt != null && draftAt != null && publishedAt > draftAt;
        return {
          slug: page.slug,
          path: page.path,
          name: page.name,
          status: statusOf(row),
          lastModifiedAt: publishedIsLatest ? publishedAt : draftAt,
          lastModifiedBy: (publishedIsLatest ? row?.published_by : row?.draft_updated_by) ?? null,
        };
      });
    },

    async getPageState<T>(page: PageDefinition<T>): Promise<PageState<T>> {
      const row = await getRow(page.slug);
      const base = {
        slug: page.slug,
        status: statusOf(row),
        draftSavedAt: toIso(row?.draft_updated_at),
        draftSavedBy: row?.draft_updated_by ?? null,
        publishedAt: toIso(row?.published_at),
        publishedBy: row?.published_by ?? null,
        publishedRevisionNumber: row?.published_revision_number ?? null,
      };
      if (!row) return { ...base, content: page.defaults, version: 0, contentError: null };

      const parsed = parseContent(page, row.draft_content, row.draft_schema_version);
      return {
        ...base,
        // Never hand broken content to the editor; fall back to defaults and say so.
        content: parsed.ok ? parsed.content : page.defaults,
        version: row.draft_version,
        contentError: parsed.ok ? null : parsed.message,
      };
    },

    /**
     * Content for the public site. Built-in defaults until the first
     * publish (or before the CMS tables exist). Stored content that fails
     * validation throws rather than falling back, so a cached good page
     * keeps being served instead of silently reverting to old wording.
     */
    async getPublishedContent<T>(page: PageDefinition<T>): Promise<T> {
      let row: PageRow | undefined;
      try {
        row = await getRow(page.slug);
      } catch (error) {
        if (error instanceof CmsNotInstalledError) return page.defaults;
        throw error;
      }
      if (!row || row.published_content == null) return page.defaults;

      const parsed = parseContent(page, row.published_content, row.published_schema_version ?? 0);
      if (!parsed.ok) {
        throw new Error(`Published content for "${page.slug}" is invalid: ${JSON.stringify(parsed.fieldErrors)}`);
      }
      return parsed.content;
    },

    /** Saved draft for preview, or a specific revision when one is given. */
    async getPreviewContent<T>(
      page: PageDefinition<T>,
      revisionNumber?: number
    ): Promise<{ content: T; label: string } | { error: string }> {
      if (revisionNumber == null) {
        const row = await getRow(page.slug);
        if (!row) return { content: page.defaults, label: "Built-in content (nothing saved yet)" };
        const parsed = parseContent(page, row.draft_content, row.draft_schema_version);
        return parsed.ok
          ? { content: parsed.content, label: `Saved draft · ${row.draft_updated_by}` }
          : { error: parsed.message };
      }

      const rows = await run(
        `SELECT r.content, r.schema_version, r.author
         FROM cms_page_revisions r JOIN cms_pages p ON p.id = r.page_id
         WHERE p.slug = $1 AND r.revision_number = $2`,
        [page.slug, revisionNumber]
      );
      const row = rows[0];
      if (!row) return { error: "That version doesn't exist." };
      const parsed = parseContent(page, row.content, Number(row.schema_version));
      return parsed.ok
        ? { content: parsed.content, label: `Version ${revisionNumber} · ${String(row.author)}` }
        : { error: parsed.message };
    },

    async listRevisions(page: PageDefinition): Promise<RevisionSummary[]> {
      const rows = await run(
        `SELECT r.revision_number, r.kind, r.author, r.created_at, r.restored_from_revision_number
         FROM cms_page_revisions r JOIN cms_pages p ON p.id = r.page_id
         WHERE p.slug = $1
         ORDER BY r.revision_number DESC`,
        [page.slug]
      );
      return rows.map((row) => ({
        revisionNumber: Number(row.revision_number),
        kind: row.kind as RevisionKind,
        author: String(row.author),
        createdAt: toIso(row.created_at as string | Date)!,
        restoredFromRevisionNumber:
          row.restored_from_revision_number == null ? null : Number(row.restored_from_revision_number),
      }));
    },

    async saveDraft(
      page: PageDefinition,
      input: { content: unknown; expectedVersion: number; author: string }
    ): Promise<SaveResult> {
      const parsed = parseContent(page, input.content, page.schemaVersion);
      if (!parsed.ok) return invalid(parsed);
      return writeDraft(page, parsed.content, input.expectedVersion, input.author, "draft", null);
    },

    async publish(page: PageDefinition, input: { expectedVersion: number; author: string }): Promise<PublishResult> {
      const row = await getRow(page.slug);
      if (!row) {
        return { ok: false, reason: "not_found", message: "Save a draft before publishing." };
      }
      if (row.draft_version !== input.expectedVersion) {
        return { ok: false, reason: "conflict", message: CONFLICT_MESSAGE };
      }
      if (row.published_draft_version === row.draft_version) {
        return { ok: false, reason: "nothing_to_publish", message: "The saved draft is already live." };
      }
      // Re-validate on the server: what goes live must satisfy the current
      // schema, whatever was stored. The version guard below ensures the
      // content validated here is exactly the content that's published.
      const parsed = parseContent(page, row.draft_content, row.draft_schema_version);
      if (!parsed.ok) return invalid(parsed);

      const rows = await run(
        `WITH page AS (
           UPDATE cms_pages SET
             published_content = draft_content,
             published_schema_version = draft_schema_version,
             published_draft_version = draft_version,
             published_revision_number = last_revision_number + 1,
             last_revision_number = last_revision_number + 1,
             published_at = now(),
             published_by = $3
           WHERE slug = $1
             AND draft_version = $2
             AND published_draft_version IS DISTINCT FROM draft_version
           RETURNING id, published_revision_number, published_content, published_schema_version, published_at
         ), revision AS (
           INSERT INTO cms_page_revisions (page_id, revision_number, kind, content, schema_version, author, created_at)
           SELECT id, published_revision_number, 'publish', published_content, published_schema_version, $3, published_at
           FROM page
           RETURNING revision_number, created_at
         )
         SELECT revision_number, created_at FROM revision`,
        [page.slug, input.expectedVersion, input.author]
      );
      const published = rows[0];
      if (!published) return { ok: false, reason: "conflict", message: CONFLICT_MESSAGE };
      return {
        ok: true,
        revisionNumber: Number(published.revision_number),
        publishedAt: toIso(published.created_at as string | Date)!,
      };
    },

    /**
     * Copies an earlier revision into the draft as a new "restore"
     * revision. History is never rewritten, and nothing goes live until the
     * restored draft is published.
     */
    async restoreRevision(
      page: PageDefinition,
      input: { revisionNumber: number; expectedVersion: number; author: string }
    ): Promise<SaveResult> {
      const rows = await run(
        `SELECT r.content, r.schema_version
         FROM cms_page_revisions r JOIN cms_pages p ON p.id = r.page_id
         WHERE p.slug = $1 AND r.revision_number = $2`,
        [page.slug, input.revisionNumber]
      );
      const source = rows[0];
      if (!source) return { ok: false, reason: "not_found", message: "That version doesn't exist." };

      const parsed = parseContent(page, source.content, Number(source.schema_version));
      if (!parsed.ok) {
        return {
          ok: false,
          reason: "invalid",
          message: "This version can't be restored because it no longer fits the page's current structure.",
          fieldErrors: parsed.fieldErrors,
        };
      }
      return writeDraft(page, parsed.content, input.expectedVersion, input.author, "restore", input.revisionNumber);
    },
  };
}

export type CmsService = ReturnType<typeof createCmsService>;
