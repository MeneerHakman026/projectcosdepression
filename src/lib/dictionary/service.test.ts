import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../../../test/pglite-db";
import { buildWorkbook, outcome, rowsOf, syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import type { Db } from "@/lib/cms/service";
import { contentHash } from "./hash";
import { analyzeImport } from "./import";
import { emptyContent, type DictionaryContent } from "./model";
import { prepareImport } from "./pipeline";
import { createDictionaryService, DictionaryNotInstalledError, type DictionaryService } from "./service";
import { readWorkbook } from "./xlsx-read";

const ROLES = ["PwD", "HCP", "ICG"];
let source: DictionaryContent;
let smaller: DictionaryContent;
let french: DictionaryContent;

async function contentOf(bytes: Uint8Array, language = "en", base = emptyContent()) {
  const read = await readWorkbook(bytes);
  if (!read.ok) throw new Error(read.message);
  const analysis = analyzeImport(read.sheets, { language, roleCodes: ROLES }, base);
  if (!analysis.proposed) throw new Error(JSON.stringify(analysis.issues));
  return analysis.proposed;
}

beforeAll(async () => {
  source = await contentOf(await syntheticWorkbookBytes());
  smaller = { ...source, master: { outcomes: source.master.outcomes.slice(0, 50) } };
  french = await contentOf(
    await buildWorkbook([
      {
        name: "fr",
        rows: [
          ["Variable", "Category", "Group Domain", "Outcome Domain", "Definition", "Experience", "Verbatims"],
          ["V_01", "Symptômes", "", "Désir de vivre", "", "", ""],
        ],
      },
    ]),
    "fr",
    source
  );
});

describe("dictionary storage and publication (real Postgres SQL)", () => {
  let db: Db;
  let dictionary: DictionaryService;

  beforeEach(async () => {
    ({ db } = await createTestDb());
    dictionary = createDictionaryService(db);
  });

  async function draft(content: DictionaryContent, author = "Chris") {
    const { version } = await dictionary.getState();
    const result = await dictionary.createDraft({ content, kind: "import", expectedVersion: version, author });
    if (!result.ok) throw new Error(result.message);
    return result;
  }

  async function publishDraft(author = "Chris") {
    const state = await dictionary.getState();
    const result = await dictionary.publish({ expectedVersion: state.version, draftNumber: state.draft!.number, author });
    if (!result.ok) throw new Error(result.message);
    return result;
  }

  it("starts empty: nothing published, nothing public", async () => {
    expect(await dictionary.getState()).toEqual({ version: 0, draft: null, published: null });
    expect(await dictionary.getPublishedForLanguage("en")).toBeNull();
  });

  it("keeps a saved draft invisible to the public until it is published", async () => {
    const saved = await draft(source);
    expect(saved.releaseNumber).toBe(1);
    expect(await dictionary.getPublishedForLanguage("en")).toBeNull();

    const state = await dictionary.getState();
    expect(state.draft).toMatchObject({ number: 1, kind: "import", createdBy: "Chris", publishedAt: null });
    expect(state.draft!.summary).toEqual({ outcomes: 80, categories: 2, groups: 9, languages: {} });
  });

  it("publishes atomically and keeps the previous version live while a new draft is prepared", async () => {
    await draft(source);
    const published = await publishDraft();
    expect(published.releaseNumber).toBe(1);

    await draft(smaller, "Second editor");
    const live = await dictionary.getPublishedForLanguage("en");
    expect(live!.content.master.outcomes).toHaveLength(80);
    expect(live!.release.number).toBe(1);

    await publishDraft("Second editor");
    const after = await dictionary.getPublishedForLanguage("en");
    expect(after!.content.master.outcomes).toHaveLength(50);
    expect(after!.release).toMatchObject({ number: 2, publishedBy: "Second editor" });
    expect((await dictionary.getState()).draft).toBeNull();
  });

  it("stores the dataset exactly as imported", async () => {
    await draft(source);
    await publishDraft();
    const live = await dictionary.getPublishedForLanguage("en");
    expect(live!.content).toEqual(source);
    expect(live!.release.contentHash).toBe(contentHash(source));
  });

  it("serves only the requested language to public pages", async () => {
    await draft(french);
    await publishDraft();
    const fr = await dictionary.getPublishedForLanguage("fr");
    expect(Object.keys(fr!.content.translations)).toEqual(["fr"]);
    expect(fr!.release.summary.languages).toEqual({ fr: 1 });
    const en = await dictionary.getPublishedForLanguage("en");
    expect(en!.content.translations).toEqual({});
    const unknown = await dictionary.getPublishedForLanguage("zz");
    expect(unknown!.content.translations).toEqual({});
  });

  it("rejects an import based on an outdated state (concurrent editors)", async () => {
    const { version } = await dictionary.getState();
    const first = await dictionary.createDraft({ content: source, kind: "import", expectedVersion: version, author: "A" });
    const second = await dictionary.createDraft({ content: smaller, kind: "import", expectedVersion: version, author: "B" });
    expect(first.ok).toBe(true);
    expect(second).toMatchObject({ ok: false, reason: "conflict" });
    expect((await dictionary.getState()).draft!.createdBy).toBe("A");
  });

  it("lets only one of two simultaneous imports win", async () => {
    const results = await Promise.all([
      dictionary.createDraft({ content: source, kind: "import", expectedVersion: 0, author: "A" }),
      dictionary.createDraft({ content: smaller, kind: "import", expectedVersion: 0, author: "B" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toEqual([expect.objectContaining({ reason: "conflict" })]);
  });

  it("refuses to publish a draft other than the one reviewed, or a stale state", async () => {
    await draft(source);
    const reviewed = await dictionary.getState();
    await draft(smaller, "Someone else");
    expect(
      await dictionary.publish({ expectedVersion: reviewed.version, draftNumber: reviewed.draft!.number, author: "Chris" })
    ).toMatchObject({ ok: false, reason: "conflict" });
    expect(await dictionary.getPublishedForLanguage("en")).toBeNull();
  });

  it("handles two simultaneous publishes of the same draft: exactly one succeeds", async () => {
    await draft(source);
    const state = await dictionary.getState();
    const results = await Promise.all([
      dictionary.publish({ expectedVersion: state.version, draftNumber: state.draft!.number, author: "A" }),
      dictionary.publish({ expectedVersion: state.version, draftNumber: state.draft!.number, author: "B" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("does not save a draft identical to what it would replace", async () => {
    await draft(source);
    const { version } = await dictionary.getState();
    expect(await dictionary.createDraft({ content: source, kind: "import", expectedVersion: version, author: "x" })).toMatchObject({
      ok: false,
      reason: "unchanged",
    });
    await publishDraft();
    const after = await dictionary.getState();
    expect(await dictionary.createDraft({ content: source, kind: "import", expectedVersion: after.version, author: "x" })).toMatchObject({
      ok: false,
      reason: "unchanged",
    });
    expect((await dictionary.listReleases()).length).toBe(1);
  });

  it("validates content on the server before storing it", async () => {
    const duplicate = { ...source, master: { outcomes: [source.master.outcomes[0], source.master.outcomes[0]] } };
    expect(await dictionary.createDraft({ content: duplicate, kind: "import", expectedVersion: 0, author: "x" })).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(await dictionary.createDraft({ content: emptyContent(), kind: "import", expectedVersion: 0, author: "x" })).toMatchObject({
      ok: false,
      reason: "invalid",
    });
    expect(await dictionary.listReleases()).toEqual([]);
  });

  it("keeps full history, restores an old version as a new draft, and republishes it", async () => {
    await draft(source);
    await publishDraft();
    await draft(smaller);
    await publishDraft();

    const state = await dictionary.getState();
    const restored = await dictionary.restore({ releaseNumber: 1, expectedVersion: state.version, author: "Chris" });
    expect(restored).toMatchObject({ ok: true, releaseNumber: 3 });
    // Restoring alone doesn't change the live dictionary.
    expect((await dictionary.getPublishedForLanguage("en"))!.content.master.outcomes).toHaveLength(50);

    await publishDraft();
    expect((await dictionary.getPublishedForLanguage("en"))!.content).toEqual(source);

    const history = await dictionary.listReleases();
    expect(history.map((r) => [r.number, r.kind, r.restoredFrom, r.publishedAt !== null])).toEqual([
      [3, "restore", 1, true],
      [2, "import", null, true],
      [1, "import", null, true],
    ]);
    expect((await dictionary.getRelease(2))!.content).toEqual(smaller);
  });

  it("discards a draft without deleting it from history", async () => {
    await draft(source);
    await publishDraft();
    await draft(smaller);
    const state = await dictionary.getState();
    expect(await dictionary.discardDraft({ expectedVersion: state.version, draftNumber: 2 })).toMatchObject({ ok: true });
    expect((await dictionary.getState()).draft).toBeNull();
    expect((await dictionary.listReleases()).map((r) => r.number)).toEqual([2, 1]);
    expect((await dictionary.getPublishedForLanguage("en"))!.release.number).toBe(1);
  });

  it("removes a translation as a new draft", async () => {
    await draft(french);
    await publishDraft();
    const state = await dictionary.getState();
    const result = await dictionary.removeLanguage({ language: "fr", expectedVersion: state.version, author: "Chris" });
    expect(result).toMatchObject({ ok: true });
    const newDraft = await dictionary.getRelease((await dictionary.getState()).draft!.number);
    expect(newDraft!.content.translations).toEqual({});
    expect(newDraft!.release).toMatchObject({ kind: "language_removed", removedLanguage: "fr" });
    expect(await dictionary.removeLanguage({ language: "en", expectedVersion: (await dictionary.getState()).version, author: "x" })).toMatchObject({ ok: false });
  });

  it("builds imports on the draft when there is one, and compares them with the live version", async () => {
    await draft(source);
    await publishDraft();
    await draft(smaller);
    const base = await dictionary.getBase();
    const { preview } = await prepareImport(
      await buildWorkbook([{ name: "Sheet1", rows: rowsOf([outcome("V_01", "Symptoms", "Autoaggression symptoms")]) }]),
      { fileName: "x.xlsx", language: "en", roleCodes: ROLES },
      {
        version: base.state.version,
        draftNumber: base.state.draft?.number ?? null,
        liveNumber: base.state.published?.number ?? null,
        content: base.content,
        live: base.live,
      }
    );
    expect(preview.basedOn).toEqual({ kind: "draft", releaseNumber: 2 });
    expect(preview.diff!.before.outcomes).toBe(80); // compared with live
    expect(preview.diff!.outcomes.removed).toHaveLength(79);
    expect(preview.alerts[0]).toMatchObject({ tone: "danger" });
  });

  it("rolls back the whole write when any part of it fails (no half-created draft)", async () => {
    await draft(source);
    await publishDraft();
    const before = await dictionary.getState();
    // An invalid kind violates the releases CHECK constraint inside the same
    // statement that moves the draft pointer and bumps the version.
    await expect(
      dictionary.createDraft({ content: smaller, kind: "bogus" as never, expectedVersion: before.version, author: "x" })
    ).rejects.toThrow();
    expect(await dictionary.getState()).toEqual(before);
    expect((await dictionary.listReleases()).map((r) => r.number)).toEqual([1]);
    expect((await dictionary.getPublishedForLanguage("en"))!.content).toEqual(source);
  });

  it("refuses to serve stored data that fails validation", async () => {
    await draft(source);
    await publishDraft();
    await db.query(`UPDATE dictionary_releases SET content = jsonb_set(content, '{format}', '99') WHERE release_number = 1`);
    await expect(dictionary.getPublishedForLanguage("en")).rejects.toThrow("invalid");
  });

  it("reports a missing installation clearly (and the public read degrades to nothing)", async () => {
    const { db: bare } = await createTestDb({ migrate: false });
    const service = createDictionaryService(bare);
    await expect(service.getState()).rejects.toBeInstanceOf(DictionaryNotInstalledError);
    expect(await service.getPublishedForLanguage("en")).toBeNull();
  });

  it("never touches existing tables", async () => {
    const tables = await db.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    expect(tables.map((t) => t.tablename)).toEqual([
      "cms_page_revisions",
      "cms_pages",
      "dictionary_releases",
      "dictionary_state",
      "eoi_settings",
    ]);
  });
});
