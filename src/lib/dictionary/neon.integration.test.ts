import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { outcome, syntheticMaster } from "../../../test/dictionary-fixtures";
import type { Db } from "@/lib/cms/service";
import { contentHash } from "./hash";
import { CONTENT_FORMAT, type DictionaryContent } from "./model";
import { createDictionaryService, type DictionaryService } from "./service";

/**
 * The dictionary workflow against a REAL Neon database (HTTP driver, real
 * concurrency — PGlite runs queries one at a time, so only this exercises
 * truly simultaneous writes).
 *
 * Skipped unless DICTIONARY_TEST_DATABASE_URL points at a disposable Neon
 * branch with migration 003 applied. It deletes all dictionary rows on that
 * database, so it refuses to run against the database in .env.local.
 *
 *   DICTIONARY_TEST_DATABASE_URL=<branch connection string> npx vitest run src/lib/dictionary/neon.integration.test.ts
 */

const url = process.env.DICTIONARY_TEST_DATABASE_URL;

function localDatabaseHost(): string | null {
  try {
    const line = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
      .split("\n")
      .find((l) => l.startsWith("DATABASE_URL="));
    return line ? new URL(line.slice("DATABASE_URL=".length).replace(/^["']|["']$/g, "")).hostname.replace("-pooler", "") : null;
  } catch {
    return null;
  }
}

const target = url ? new URL(url).hostname.replace("-pooler", "") : null;
if (target && target === localDatabaseHost()) {
  throw new Error("Refusing to run destructive integration tests against the DATABASE_URL in .env.local.");
}

const content = (outcomes = syntheticMaster(2, 3, 4)): DictionaryContent => ({
  format: CONTENT_FORMAT,
  master: { outcomes },
  translations: {},
});

describe.skipIf(!url)("dictionary workflow on real Neon PostgreSQL", () => {
  let db: Db;
  let dictionary: DictionaryService;

  beforeAll(() => {
    const sql = neon(url!);
    db = { query: (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]> };
    dictionary = createDictionaryService(db);
  });

  beforeEach(async () => {
    // Reset this disposable database's dictionary tables only.
    await db.query(`UPDATE dictionary_state SET draft_release_number = NULL, published_release_number = NULL, last_release_number = 0, version = 0`);
    await db.query(`DELETE FROM dictionary_releases`);
  });

  async function draft(c: DictionaryContent) {
    const { version } = await dictionary.getState();
    const result = await dictionary.createDraft({ content: c, kind: "import", expectedVersion: version, author: "Neon test" });
    if (!result.ok) throw new Error(result.message);
    return result;
  }

  async function publish() {
    const s = await dictionary.getState();
    const result = await dictionary.publish({ expectedVersion: s.version, draftNumber: s.draft!.number, author: "Neon test" });
    if (!result.ok) throw new Error(result.message);
    return result;
  }

  it("round-trips Unicode, CRLF, quotes and large JSON through Neon unchanged", async () => {
    const tricky = content([
      outcome("U_1", "Catégorie", "Groupe", {
        definition: "Line one\r\nLine two\n“curly” ‘single’ \"straight\" — … é ü ø œ ß 抑郁 😔 ",
        verbatims: "PwD:  “quote” \nHCP:   “[bracket] quote” ",
      }),
      ...syntheticMaster(10, 10, 4), // 400 outcomes
    ]);
    await draft(tricky);
    await publish();
    const live = await dictionary.getPublishedForLanguage("en");
    expect(live!.content).toEqual(tricky);
    expect(live!.release.contentHash).toBe(contentHash(tricky));
  });

  it("isolates drafts and switches the published dataset in one step", async () => {
    await draft(content());
    await publish();
    await draft(content(syntheticMaster(5, 2, 3)));
    expect((await dictionary.getPublishedForLanguage("en"))!.content.master.outcomes).toHaveLength(24);
    await publish();
    expect((await dictionary.getPublishedForLanguage("en"))!.content.master.outcomes).toHaveLength(30);
  });

  it("lets exactly one of several truly concurrent imports win", async () => {
    const { version } = await dictionary.getState();
    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        dictionary.createDraft({ content: content(syntheticMaster(n, 1, 2)), kind: "import", expectedVersion: version, author: `Editor ${n}` })
      )
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.reason === "conflict")).toBe(true);
    expect(await dictionary.listReleases()).toHaveLength(1);
  });

  it("publishes a draft exactly once under concurrent publish clicks", async () => {
    await draft(content());
    const s = await dictionary.getState();
    const results = await Promise.all(
      [1, 2, 3, 4].map(() => dictionary.publish({ expectedVersion: s.version, draftNumber: s.draft!.number, author: "x" }))
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const after = await dictionary.getState();
    expect(after.published!.number).toBe(s.draft!.number);
    expect(after.draft).toBeNull();
    expect(after.version).toBe(s.version + 1);
  });

  it("never exposes a partial dataset while publishing (readers during a publish see old or new, nothing else)", async () => {
    const small = content(syntheticMaster(1, 1, 3));
    const large = content(syntheticMaster(10, 10, 5));
    await draft(small);
    await publish();
    await draft(large);
    const s = await dictionary.getState();
    const reads = Array.from({ length: 12 }, () => dictionary.getPublishedForLanguage("en"));
    const publishing = dictionary.publish({ expectedVersion: s.version, draftNumber: s.draft!.number, author: "x" });
    const seen = (await Promise.all(reads)).map((r) => r!.content.master.outcomes.length);
    expect((await publishing).ok).toBe(true);
    expect(seen.every((n) => n === 3 || n === 500)).toBe(true);
  });

  it("rolls back the whole statement when part of a write fails", async () => {
    await draft(content());
    await publish();
    const before = await dictionary.getState();
    await expect(
      dictionary.createDraft({ content: content(syntheticMaster(3, 1, 1)), kind: "bogus" as never, expectedVersion: before.version, author: "x" })
    ).rejects.toThrow();
    expect(await dictionary.getState()).toEqual(before);
  });

  it("restores and republishes an earlier version; history stays intact", async () => {
    const first = content();
    await draft(first);
    await publish();
    await draft(content(syntheticMaster(1, 1, 1)));
    await publish();
    const s = await dictionary.getState();
    expect(await dictionary.restore({ releaseNumber: 1, expectedVersion: s.version, author: "x" })).toMatchObject({ ok: true, releaseNumber: 3 });
    await publish();
    expect((await dictionary.getPublishedForLanguage("en"))!.content).toEqual(first);
    expect((await dictionary.listReleases()).map((r) => [r.number, r.kind, r.publishedAt !== null])).toEqual([
      [3, "restore", true],
      [2, "import", true],
      [1, "import", true],
    ]);
  });

  it("enforces the database constraints even if the application were bypassed", async () => {
    await draft(content());
    await expect(db.query(`UPDATE dictionary_state SET published_release_number = draft_release_number`)).rejects.toThrow(/draft_differs/);
    await expect(db.query(`UPDATE dictionary_state SET draft_release_number = 999`)).rejects.toThrow(/foreign key/);
    await expect(db.query(`INSERT INTO dictionary_state (id) VALUES (2)`)).rejects.toThrow();
    await expect(db.query(`DELETE FROM dictionary_releases`)).rejects.toThrow(/foreign key/);
  });
});
