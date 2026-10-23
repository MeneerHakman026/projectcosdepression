import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../test/pglite-db";
import type { HomeContent } from "@/content/home/schema";
import { HOME_PAGE } from "./pages";
import { CmsNotInstalledError, createCmsService, type CmsService, type Db } from "./service";

const page = HOME_PAGE;

function edited(change: (draft: HomeContent) => void): HomeContent {
  const draft = structuredClone(page.defaults);
  change(draft);
  return draft;
}

async function saveOk(cms: CmsService, content: unknown, expectedVersion: number, author = "Chris") {
  const result = await cms.saveDraft(page, { content, expectedVersion, author });
  if (!result.ok) throw new Error(`save failed: ${result.message}`);
  return result;
}

describe("CMS service (against real Postgres SQL)", () => {
  let db: Db;
  let cms: CmsService;

  beforeEach(async () => {
    ({ db } = await createTestDb());
    cms = createCmsService(db);
  });

  it("serves built-in content before anything is saved", async () => {
    expect(await cms.getPublishedContent(page)).toEqual(page.defaults);
    const state = await cms.getPageState(page);
    expect(state).toMatchObject({ status: "default", version: 0, publishedAt: null });
    expect(state.content).toEqual(page.defaults);
  });

  it("saving a draft never changes the published content", async () => {
    const draft = edited((c) => (c.hero.heading = "A new heading"));
    const saved = await saveOk(cms, draft, 0);

    expect(saved).toMatchObject({ version: 1, revisionNumber: 1 });
    expect((await cms.getPublishedContent(page)).hero.heading).toBe(page.defaults.hero.heading);

    const state = await cms.getPageState<HomeContent>(page);
    expect(state.status).toBe("draft_only");
    expect(state.content.hero.heading).toBe("A new heading");
    expect(state.draftSavedBy).toBe("Chris");
  });

  it("publishes the saved draft atomically and records a revision", async () => {
    const draft = edited((c) => (c.hero.heading = "Published heading"));
    const { version } = await saveOk(cms, draft, 0);

    const published = await cms.publish(page, { expectedVersion: version, author: "Chris" });
    expect(published).toMatchObject({ ok: true, revisionNumber: 2 });
    expect((await cms.getPublishedContent(page)).hero.heading).toBe("Published heading");

    const state = await cms.getPageState(page);
    expect(state).toMatchObject({ status: "published", publishedBy: "Chris", publishedRevisionNumber: 2 });

    const revisions = await cms.listRevisions(page);
    expect(revisions.map((r) => [r.revisionNumber, r.kind, r.author])).toEqual([
      [2, "publish", "Chris"],
      [1, "draft", "Chris"],
    ]);
  });

  it("keeps the published version live while a newer draft is edited", async () => {
    const first = await saveOk(cms, edited((c) => (c.hero.heading = "Live")), 0);
    await cms.publish(page, { expectedVersion: first.version, author: "Chris" });
    await saveOk(cms, edited((c) => (c.hero.heading = "Work in progress")), first.version);

    expect((await cms.getPublishedContent(page)).hero.heading).toBe("Live");
    expect((await cms.getPageState(page)).status).toBe("changes_pending");
  });

  it("rejects a save based on an outdated version instead of overwriting", async () => {
    const first = await saveOk(cms, edited((c) => (c.hero.heading = "Editor A")), 0);
    // Editor B opened the page at version 1 too, and saves first.
    await saveOk(cms, edited((c) => (c.hero.heading = "Editor B")), first.version, "Editor B");

    const stale = await cms.saveDraft(page, {
      content: edited((c) => (c.hero.heading = "Editor A again")),
      expectedVersion: first.version,
      author: "Editor A",
    });
    expect(stale).toMatchObject({ ok: false, reason: "conflict" });
    expect(((await cms.getPageState(page)).content as HomeContent).hero.heading).toBe("Editor B");
  });

  it("treats two simultaneous first saves as a conflict for the slower one", async () => {
    const results = await Promise.all([
      cms.saveDraft(page, { content: page.defaults, expectedVersion: 0, author: "A" }),
      cms.saveDraft(page, { content: page.defaults, expectedVersion: 0, author: "B" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([expect.objectContaining({ reason: "conflict" })]);
  });

  it("refuses to publish a draft other than the one the editor previewed", async () => {
    const first = await saveOk(cms, page.defaults, 0);
    await saveOk(cms, edited((c) => (c.hero.heading = "Changed by someone else")), first.version);

    const result = await cms.publish(page, { expectedVersion: first.version, author: "Chris" });
    expect(result).toMatchObject({ ok: false, reason: "conflict" });
    expect(await cms.getPublishedContent(page)).toEqual(page.defaults);
  });

  it("does not publish the same draft twice", async () => {
    const { version } = await saveOk(cms, page.defaults, 0);
    await cms.publish(page, { expectedVersion: version, author: "Chris" });
    expect(await cms.publish(page, { expectedVersion: version, author: "Chris" })).toMatchObject({
      ok: false,
      reason: "nothing_to_publish",
    });
  });

  it("requires a saved draft before publishing", async () => {
    expect(await cms.publish(page, { expectedVersion: 0, author: "Chris" })).toMatchObject({
      ok: false,
      reason: "not_found",
    });
  });

  it("validates content on the server and reports field errors", async () => {
    const result = await cms.saveDraft(page, {
      content: edited((c) => (c.hero.primaryCta.href = "javascript:alert(1)")),
      expectedVersion: 0,
      author: "Chris",
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(result.ok === false && result.reason === "invalid" && result.fieldErrors).toHaveProperty([
      "hero.primaryCta.href",
    ]);
    expect((await cms.getPageState(page)).status).toBe("default");
  });

  it("rejects content that isn't page content at all", async () => {
    for (const content of [null, "text", 42, [], { hero: {} }]) {
      expect(await cms.saveDraft(page, { content, expectedVersion: 0, author: "x" })).toMatchObject({
        ok: false,
        reason: "invalid",
      });
    }
  });

  it("strips unknown fields rather than storing them", async () => {
    await saveOk(cms, { ...page.defaults, injected: "<script>" }, 0);
    expect((await cms.getPageState(page)).content).not.toHaveProperty("injected");
  });

  it("restores an old revision as a new draft revision without rewriting history", async () => {
    const v1 = await saveOk(cms, edited((c) => (c.hero.heading = "Version one")), 0);
    const pub = await cms.publish(page, { expectedVersion: v1.version, author: "Chris" });
    const v3 = await saveOk(cms, edited((c) => (c.hero.heading = "Version three")), v1.version);

    const restored = await cms.restoreRevision(page, {
      revisionNumber: 1,
      expectedVersion: v3.version,
      author: "Chris",
    });
    expect(restored).toMatchObject({ ok: true, revisionNumber: 4 });

    const state = await cms.getPageState<HomeContent>(page);
    expect(state.content.hero.heading).toBe("Version one");
    // Restoring changes the draft only; the live page is untouched until published.
    expect((await cms.getPublishedContent(page)).hero.heading).toBe("Version one");
    expect(pub.ok && pub.revisionNumber).toBe(2);

    const revisions = await cms.listRevisions(page);
    expect(revisions.map((r) => [r.revisionNumber, r.kind, r.restoredFromRevisionNumber])).toEqual([
      [4, "restore", 1],
      [3, "draft", null],
      [2, "publish", null],
      [1, "draft", null],
    ]);
  });

  it("rejects a restore based on an outdated version", async () => {
    const v1 = await saveOk(cms, page.defaults, 0);
    await saveOk(cms, edited((c) => (c.hero.heading = "Newer")), v1.version);
    expect(
      await cms.restoreRevision(page, { revisionNumber: 1, expectedVersion: v1.version, author: "Chris" })
    ).toMatchObject({ ok: false, reason: "conflict" });
  });

  it("reports a missing revision", async () => {
    expect(await cms.restoreRevision(page, { revisionNumber: 99, expectedVersion: 0, author: "x" })).toMatchObject({
      ok: false,
      reason: "not_found",
    });
  });

  it("previews the saved draft or a specific revision", async () => {
    const v1 = await saveOk(cms, edited((c) => (c.hero.heading = "First")), 0);
    await saveOk(cms, edited((c) => (c.hero.heading = "Second")), v1.version);

    const draft = await cms.getPreviewContent<HomeContent>(page);
    const old = await cms.getPreviewContent<HomeContent>(page, 1);
    expect("content" in draft && draft.content.hero.heading).toBe("Second");
    expect("content" in old && old.content.hero.heading).toBe("First");
    expect(await cms.getPreviewContent(page, 42)).toEqual({ error: "That version doesn't exist." });
  });

  it("lists pages with status and last editor", async () => {
    expect(await cms.listPages([page])).toEqual([
      expect.objectContaining({ slug: "home", path: "/", status: "default", lastModifiedAt: null }),
    ]);
    const { version } = await saveOk(cms, page.defaults, 0, "Chris");
    await cms.publish(page, { expectedVersion: version, author: "Publisher" });
    expect(await cms.listPages([page])).toEqual([
      expect.objectContaining({ status: "published", lastModifiedBy: "Publisher" }),
    ]);
  });

  it("never serves invalid stored content to the public site", async () => {
    const { version } = await saveOk(cms, page.defaults, 0);
    await cms.publish(page, { expectedVersion: version, author: "Chris" });
    await db.query(`UPDATE cms_pages SET published_content = '{"broken": true}'::jsonb`);
    await expect(cms.getPublishedContent(page)).rejects.toThrow(/invalid/);
  });

  it("enforces history and consistency rules in the database itself", async () => {
    await saveOk(cms, page.defaults, 0);
    await expect(
      db.query(`INSERT INTO cms_page_revisions (page_id, revision_number, kind, content, schema_version, author)
                SELECT id, 1, 'draft', '{}'::jsonb, 1, 'x' FROM cms_pages`)
    ).rejects.toThrow();
    await expect(db.query(`UPDATE cms_pages SET published_content = '{}'::jsonb`)).rejects.toThrow();
    await expect(db.query(`DELETE FROM cms_pages`)).rejects.toThrow();
  });
});

describe("CMS service before the migration is applied", () => {
  it("falls back to built-in content on the public site", async () => {
    const { db } = await createTestDb({ migrate: false });
    const cms = createCmsService(db);
    expect(await cms.getPublishedContent(page)).toEqual(page.defaults);
    await expect(cms.getPageState(page)).rejects.toBeInstanceOf(CmsNotInstalledError);
  });
});
