import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../test/pglite-db";
import { HOME_DEFAULTS } from "@/content/home/defaults";
import type { EoiButtonContent } from "@/content/eoi-button/schema";
import type { RegistrationContent } from "@/content/registration/schema";
import { resolveEoiButton } from "@/lib/eoi-button";
import { CMS_PAGES, EOI_BUTTON, HOME_PAGE, REGISTRATION_PAGE, revalidationTargets } from "./pages";
import { createCmsService, type CmsService, type Db } from "./service";

/**
 * The Registration page and the Expression of Interest button go through
 * the same storage and workflow as the homepage. These tests exercise that
 * workflow for both, against the real SQL.
 */

function registration(change: (draft: RegistrationContent) => void): RegistrationContent {
  const draft = structuredClone(REGISTRATION_PAGE.defaults);
  change(draft);
  return draft;
}

const EXTERNAL: EoiButtonContent = {
  label: "Take part in the study",
  destination: { mode: "external", externalUrl: "https://example.org/study" },
};

describe("Phase 3 CMS documents (against real Postgres SQL)", () => {
  let db: Db;
  let cms: CmsService;

  beforeEach(async () => {
    ({ db } = await createTestDb());
    cms = createCmsService(db);
  });

  describe("registry", () => {
    it("lists the Registration page alongside the Homepage, plus the site-wide button", () => {
      expect(CMS_PAGES.map((page) => [page.slug, page.path])).toEqual([
        ["home", "/"],
        ["registration", "/registration"],
        ["eoi-button", "/"],
      ]);
    });

    it("refreshes the right paths on publish", () => {
      expect(revalidationTargets(HOME_PAGE)).toEqual([{ path: "/" }]);
      expect(revalidationTargets(REGISTRATION_PAGE)).toEqual([
        { path: "/registration" },
        { path: "/registration/success" },
      ]);
      // Shown in the header on every page: refresh the whole site.
      expect(revalidationTargets(EOI_BUTTON)).toEqual([{ path: "/", type: "layout" }]);
    });

    it("lists both new documents with their status", async () => {
      const summaries = await cms.listPages(CMS_PAGES);
      expect(summaries.map((s) => [s.slug, s.status])).toEqual([
        ["home", "default"],
        ["registration", "default"],
        ["eoi-button", "default"],
      ]);
    });
  });

  describe("Registration page", () => {
    const page = REGISTRATION_PAGE;

    it("loads built-in content before anything is saved", async () => {
      expect(await cms.getPublishedContent(page)).toEqual(page.defaults);
      expect(await cms.getPageState(page)).toMatchObject({ status: "default", version: 0, content: page.defaults });
    });

    it("saves drafts without changing the live page, previews them, then publishes", async () => {
      const draft = registration((c) => (c.intro.heading = "Join COS-D"));
      const saved = await cms.saveDraft(page, { content: draft, expectedVersion: 0, author: "Chris" });
      expect(saved).toMatchObject({ ok: true, version: 1, revisionNumber: 1 });

      expect((await cms.getPublishedContent(page)).intro.heading).toBe("Interested in taking part in COS-D?");
      const preview = await cms.getPreviewContent(page);
      expect("content" in preview && (preview.content as RegistrationContent).intro.heading).toBe("Join COS-D");

      expect(await cms.publish(page, { expectedVersion: 1, author: "Chris" })).toMatchObject({
        ok: true,
        revisionNumber: 2,
      });
      expect((await cms.getPublishedContent(page)).intro.heading).toBe("Join COS-D");
    });

    it("keeps a full history and restores an earlier version into the draft only", async () => {
      await cms.saveDraft(page, { content: registration((c) => (c.form.heading = "One")), expectedVersion: 0, author: "Chris" });
      await cms.publish(page, { expectedVersion: 1, author: "Chris" });
      await cms.saveDraft(page, { content: registration((c) => (c.form.heading = "Two")), expectedVersion: 1, author: "Sam" });

      const restored = await cms.restoreRevision(page, { revisionNumber: 1, expectedVersion: 2, author: "Chris" });
      expect(restored).toMatchObject({ ok: true, revisionNumber: 4 });
      expect((await cms.getPageState<RegistrationContent>(page)).content.form.heading).toBe("One");
      expect((await cms.getPublishedContent(page)).form.heading).toBe("One");

      expect((await cms.listRevisions(page)).map((r) => [r.revisionNumber, r.kind, r.author])).toEqual([
        [4, "restore", "Chris"],
        [3, "draft", "Sam"],
        [2, "publish", "Chris"],
        [1, "draft", "Chris"],
      ]);
      const old = await cms.getPreviewContent(page, 3);
      expect("content" in old && (old.content as RegistrationContent).form.heading).toBe("Two");
    });

    it("rejects concurrent edits instead of overwriting them", async () => {
      await cms.saveDraft(page, { content: registration((c) => (c.form.heading = "A")), expectedVersion: 0, author: "A" });
      await cms.saveDraft(page, { content: registration((c) => (c.form.heading = "B")), expectedVersion: 1, author: "B" });

      // A still has version 1 open.
      const stale = await cms.saveDraft(page, {
        content: registration((c) => (c.form.heading = "A again")),
        expectedVersion: 1,
        author: "A",
      });
      expect(stale).toMatchObject({ ok: false, reason: "conflict" });
      expect(await cms.publish(page, { expectedVersion: 1, author: "A" })).toMatchObject({ ok: false, reason: "conflict" });
      expect((await cms.getPageState<RegistrationContent>(page)).content.form.heading).toBe("B");
    });

    it("validates on the server", async () => {
      const result = await cms.saveDraft(page, {
        content: registration((c) => (c.beforeYouSubmit.closing = "[x](javascript:void)")),
        expectedVersion: 0,
        author: "Chris",
      });
      expect(result).toMatchObject({ ok: false, reason: "invalid" });
    });
  });

  describe("Expression of Interest button", () => {
    const page = EOI_BUTTON;
    const live = async () => resolveEoiButton(await cms.getPublishedContent(page));

    it("points to /registration with the existing label until something is published", async () => {
      expect(await live()).toEqual({ label: "Expression of interest", href: "/registration", external: false });
    });

    it("does not change the live button when a draft is saved", async () => {
      const saved = await cms.saveDraft(page, { content: EXTERNAL, expectedVersion: 0, author: "Chris" });
      expect(saved.ok).toBe(true);
      expect(await live()).toEqual({ label: "Expression of interest", href: "/registration", external: false });

      const preview = await cms.getPreviewContent(page);
      expect("content" in preview && resolveEoiButton(preview.content as EoiButtonContent).href).toBe(
        "https://example.org/study"
      );
    });

    it("routes to the external site after publishing, and back after restoring and publishing", async () => {
      await cms.saveDraft(page, { content: EXTERNAL, expectedVersion: 0, author: "Chris" });
      await cms.publish(page, { expectedVersion: 1, author: "Chris" });
      expect(await live()).toEqual({ label: "Take part in the study", href: "https://example.org/study", external: true });

      const back = { ...EXTERNAL, destination: { ...EXTERNAL.destination, mode: "internal" as const } };
      await cms.saveDraft(page, { content: back, expectedVersion: 1, author: "Chris" });
      // The draft switch back is not live yet.
      expect((await live()).external).toBe(true);
      await cms.publish(page, { expectedVersion: 2, author: "Chris" });
      expect(await live()).toEqual({ label: "Take part in the study", href: "/registration", external: false });
      // The external address is remembered for next time.
      expect((await cms.getPageState<EoiButtonContent>(page)).content.destination.externalUrl).toBe(
        "https://example.org/study"
      );
    });

    it.each(["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "http://example.org", ""])(
      "refuses to save external mode with %j",
      async (externalUrl) => {
        const result = await cms.saveDraft(page, {
          content: { label: "Go", destination: { mode: "external", externalUrl } },
          expectedVersion: 0,
          author: "Chris",
        });
        expect(result).toMatchObject({ ok: false, reason: "invalid" });
        expect(result.ok === false && result.reason === "invalid" && result.fieldErrors).toHaveProperty([
          "destination.externalUrl",
        ]);
      }
    );

    it("never serves an unsafe destination even if the database was edited directly", async () => {
      await cms.saveDraft(page, { content: EXTERNAL, expectedVersion: 0, author: "Chris" });
      await cms.publish(page, { expectedVersion: 1, author: "Chris" });
      await db.query(
        `UPDATE cms_pages SET published_content = jsonb_set(published_content, '{destination,externalUrl}', '"javascript:alert(1)"') WHERE slug = 'eoi-button'`
      );
      // Invalid stored content throws, so the cached last-good page keeps being served.
      await expect(cms.getPublishedContent(page)).rejects.toThrow(/invalid/);
    });
  });

  describe("existing homepage content (schema v1)", () => {
    it("keeps serving and editing homepage content saved before the buttons moved", async () => {
      const v1 = {
        ...structuredClone(HOME_DEFAULTS),
        hero: { ...HOME_DEFAULTS.hero, primaryCta: { label: "Expression of interest", href: "/registration" } },
        finalCta: { ...HOME_DEFAULTS.finalCta, primaryCta: { label: "Expression of interest", href: "/registration" } },
      };
      // Shaped like the production row: published, version 4, schema 1.
      await db.query(
        `INSERT INTO cms_pages (slug, draft_content, draft_schema_version, draft_version, draft_updated_by,
           published_content, published_schema_version, published_revision_number, published_draft_version,
           published_at, published_by, last_revision_number)
         VALUES ('home', $1::jsonb, 1, 4, 'Chris', $1::jsonb, 1, 8, 4, now(), 'Chris', 8)`,
        [JSON.stringify(v1)]
      );
      const rows = await db.query(`SELECT id FROM cms_pages WHERE slug = 'home'`);
      await db.query(
        `INSERT INTO cms_page_revisions (page_id, revision_number, kind, content, schema_version, author)
         VALUES ($1, 8, 'publish', $2::jsonb, 1, 'Chris')`,
        [rows[0].id, JSON.stringify(v1)]
      );

      expect(await cms.getPublishedContent(HOME_PAGE)).toEqual(HOME_DEFAULTS);
      const state = await cms.getPageState(HOME_PAGE);
      expect(state).toMatchObject({ status: "published", version: 4, contentError: null });

      // Old revisions can still be previewed and restored.
      const preview = await cms.getPreviewContent(HOME_PAGE, 8);
      expect("content" in preview && preview.content).toEqual(HOME_DEFAULTS);
      expect(await cms.restoreRevision(HOME_PAGE, { revisionNumber: 8, expectedVersion: 4, author: "Chris" })).toMatchObject({
        ok: true,
        revisionNumber: 9,
      });
      // The stored history is untouched.
      const stored = await db.query(
        `SELECT content->'hero'->'primaryCta'->>'href' AS href FROM cms_page_revisions WHERE revision_number = 8`
      );
      expect(stored[0].href).toBe("/registration");
    });
  });
});
