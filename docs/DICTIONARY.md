# Outcome Dictionary

The public Outcome Dictionary (`/dictionary`) and its Excel-based management (Admin → Content → Outcome Dictionary).

**Principle:** the Excel workbook is the source of truth for the dictionary data and its structure. The database stores validated, versioned copies of it. The website renders whatever version is published, and an administrator decides when a new version goes live. Nothing about categories, group domains, outcomes or languages is hardcoded. A workbook with 50 or 200 outcomes, or 5 or 20 categories, needs no code change.

## How it fits together

| Piece | Where |
|---|---|
| Data model and validation schema | `src/lib/dictionary/model.ts` |
| Taxonomy derived from rows (Category → Group Domain) | `src/lib/dictionary/taxonomy.ts` |
| Reading `.xlsx` safely | `src/lib/dictionary/xlsx-read.ts` |
| Import rules (master / translation, validation) | `src/lib/dictionary/import.ts` |
| Comparing two versions | `src/lib/dictionary/diff.ts` |
| Upload → validate → compare (one function) | `src/lib/dictionary/pipeline.ts` |
| Writing `.xlsx` exports | `src/lib/dictionary/xlsx-write.ts` |
| Storage, draft/publish/restore | `src/lib/dictionary/service.ts`, `server.ts` |
| Search (in the browser) | `src/lib/dictionary/search.ts` |
| Verbatim attribution | `src/lib/dictionary/verbatims.ts` |
| Public page | `src/app/dictionary/[[...outcome]]/page.tsx`, `src/components/dictionary/*` |
| Admin | `src/app/admin/(protected)/content/dictionary/*`, `src/components/admin/dictionary/*` |
| Admin preview | `src/app/admin/preview/dictionary/page.tsx` |
| Page wording (intro, source, participant groups) | CMS page `dictionary`: `src/content/dictionary/*` |
| Tables | `db/migrations/003_create_dictionary.sql` |
| Research team's source workbook — **local only, git-ignored, never committed** (publication rights pending) | `docs/dictionary/COS-D_Outcome_Dictionary_EN_master_80-outcomes_source.xlsx` |
| Synthetic test workbook (same shape, `[SYNTHETIC]` text) | `test/dictionary-fixtures.ts` |

There are two kinds of content, and each has exactly one source of truth:

- **Dictionary entries** come from Excel only. There's no form for editing individual outcomes, so the workbook and the website can't drift apart.
- **The wording around them** (introduction, "About this dictionary" source note, participant-group legend, SEO) is a normal CMS page. Edit it under Content → Pages → "Outcome Dictionary page", with the usual draft, preview, publish and history.

## Workbook format

One row per outcome. The first non-empty row holds the headers. Header names are matched without regard to capitals or spacing, and column order doesn't matter.

| Column | Required | Notes |
|---|---|---|
| Variable | yes | Stable ID used in URLs (`/dictionary/V_01`). Letters, digits, `_ - .`, max 64. Unique, case-insensitively. |
| Category | yes | Distinct values become categories. |
| Group Domain | yes | Distinct values *within a category* become groups. The same name under two categories gives two groups. |
| Outcome Domain | yes | |
| Definition | yes | |
| Experience | warning if empty | |
| Verbatims | warning if empty | One line per participant group: `PwD: “…”`. See below. |

- Text is stored **exactly** as in the cell: spaces, line breaks, quotation marks and Unicode. Display trims surrounding whitespace, but storage and export don't.
- Labels that differ only in capitals or spacing ("Symptoms" / " symptoms ") are treated as one category, with a warning. The first spelling is shown.
- Formulas, dates, error values and merged cells are **rejected**, never evaluated. Rich-text formatting is dropped and only the text is kept, with a note.
- Extra columns are ignored, with a warning. Columns ending in "(English reference)" are ignored silently; exported translation sheets use them.
- Hidden sheets and sheets without dictionary headers are ignored and listed in the preview.
- Limits: 4 MB upload, 5,000 rows, 80 MB uncompressed. Legacy `.xls`, password-protected and macro-enabled files are refused with a clear message.

### Languages

- **English is the master.** It defines the IDs and the structure.
- **Translations** use the same seven columns, matched to the master by Variable. A translation file can't add, remove or move outcomes; unknown IDs are ignored with a warning. Translated Category and Group Domain names must be the same on every row of the same category or group, or the import is refused.
- Any BCP 47 language code works (`fr`, `nl`, `de`, `pt-BR`, …). Names come from the browser's `Intl` data. Adding a language needs no schema or code change.
- A single-sheet workbook uses the language chosen in the import form. A multi-sheet workbook, as exported, must name each data sheet with its code (`en`, `fr`, `nl — Nederlands`).
- Missing translations are shown in English and **always marked** ("Not yet translated into French — shown in English", an `EN` tag on labels, and `lang="en"` on the text). English is never presented as a translation.
- Each translated entry records a fingerprint of the English row it was made from. When the English text later changes, the admin counts that translation as "possibly outdated".

### Verbatims

Participant quotations are never edited. The site splits a Verbatims cell into labelled blocks **only** when every non-empty line starts with a participant-group abbreviation that's listed in the page settings (`PwD`, `HCP`, `ICG` by default; editable under Content → Pages → Outcome Dictionary page). Only the label is separated. The quotation text after it is shown exactly as written; individual quotes are never split apart, because the source has nested, unbalanced and straight quotation marks and editorial brackets. If any line doesn't fit, the whole cell is shown as written. In the supplied workbook, 79 of 80 entries are attributed. V_11's cell is wrapped in straight double quotes, so it's shown as written, and the import notes this.

## Workflow

**Import → Check → Save draft → Preview → Publish**

1. **Import** (Outcome Dictionary → Import Excel): choose the file and what it contains (English master, or a translation).
2. **Check** validates and compares against the **live** dictionary. Nothing is stored. The preview shows:
   - counts before and after
   - new, modified, removed and unchanged outcomes
   - word-level differences per field, including spacing-only changes
   - category and group additions, removals and renames
   - translation changes
   - errors, warnings and notes

   Removals need an explicit "I have reviewed…" tick. Changed quotations are flagged. A file identical to the current version is reported as "no changes" and can't be saved.
3. **Save as draft** sends the same file again. The server repeats the whole analysis and saves only if the file's hash *and* the dictionary's state are unchanged since the check, so what's saved is exactly what was reviewed. The public site doesn't change. The uploaded file isn't stored; only its name, size and SHA-256 are kept.
4. **Preview** (`/admin/preview/dictionary?dataset=draft`) renders the real public page with the draft data.
5. **Publish** switches the public dictionary to the draft in one statement, and expires the cache for `/dictionary` and every `/dictionary/<ID>`.

**Replacement semantics.** An English master import replaces the whole master: outcomes not in the file disappear in the new version. Translations of removed outcomes are dropped from that version with a warning, and earlier versions keep them. A translation import replaces that one language. Everything else carries over from the current draft (or the live version if there's no draft). There's no incremental merge.

**History.** Every import, restore and language removal is a complete, immutable version. From Version history you can:

- **View** any version in the preview
- **Compare** any two versions
- **Export** any version to Excel
- **Restore** a version. This copies it into a *new* draft, so history is never rewritten. Publish to make it live.

**Export** (Outcome Dictionary → Export to Excel):

| Export | What you get |
|---|---|
| English master | Exactly the seven source columns, sheet `en` |
| One language | Sheet named with the language code, plus grey "(English reference)" columns |
| All languages | `en`, then one sheet per translation |
| Empty translation template | Every ID with the English text for reference |

Every export has an "About" sheet with instructions, which is ignored on import. Exports re-import with **no changes**; this is tested.

## Data model

```
dictionary_releases   one immutable row per version
  release_number, kind (import | restore | language_removed),
  content jsonb  ← { format, master: { outcomes: [7 raw fields…] },
                     translations: { fr: { categories, groups, outcomes: { V_01: {…, source} } } } }
  content_hash, summary (counts), import_meta (file name/size/sha256, sheets, warnings),
  parent_release_number, restored_from_release_number, created_by/at, published_by/at

dictionary_state      single row (id = 1)
  draft_release_number, published_release_number, last_release_number, version
```

Categories and groups are **not stored**. They're derived from the master rows on every read (`deriveTaxonomy`), so they can't get out of step with the outcomes. Translations label them by key (normalized label; group keys include their category).

### Why snapshots, not normalized tables

- **Atomic publication.** Publishing moves one pointer in one `UPDATE`. The public site switches from one complete dataset to the next and is never empty or half-replaced. There's no `TRUNCATE` and no staging-table swap.
- **Fits Neon's HTTP driver**, which has no interactive transactions. Every write is a single statement (a data-modifying CTE), the same approach as the page CMS. Concurrency is guarded by `dictionary_state.version`, so a stale import, publish or restore is rejected as a conflict, never applied.
- **Exact history and rollback for free.** Any version can be previewed, compared, exported or restored as it was.
- **Size is small.** The 80-outcome master is about 100 KB of JSON; a version with ten full translations would be about 1 MB. Dozens of versions cost a few MB.

Alternatives considered:

- **Normalized per-version tables** (outcomes, translations, taxonomy rows). These offer SQL-level constraints, but writing hundreds of rows per version over HTTP needs batched transactions and staging, all for data that's only ever read and replaced as a whole.
- **Postgres full-text or trigram search** is unnecessary at this size; see Search.

The trade-off: integrity rules live in code (zod schema plus import validation) rather than in foreign keys. Every stored version is re-validated when read, published or restored, and invalid stored data is refused rather than served.

## Search

The public page receives one language's published data (about 100 KB for 80 outcomes; about 25 KB gzipped) and searches it in the browser. That makes search instant while typing, avoids a server round trip per keystroke, and keeps the page cacheable.

- Searches Outcome Domain, Definition, Experience and Verbatims.
- Case-, accent- and quote-style-insensitive; matches partial words.
- All words must match.
- Words that occur nowhere tolerate small typos (1 edit for 4–7 letters, 2 for longer).
- Ranked by field: name before definition, experience and quotations.
- Matches are highlighted in results and in the detail view.

Revisit this if the dictionary grows to thousands of outcomes; at that point server-side search would be worth it.

## Caching

`getPublishedView(lang)` (`src/lib/dictionary/server.ts`) is cached with `unstable_cache` under the tag `dictionary:published`, matching the page CMS. Publishing expires the tag (`updateTag`) and the `/dictionary` layout (which covers every outcome URL), so the next visitor sees the new version. Unknown `?lang=` values resolve to English rather than creating cache entries. **Changes made directly in the database don't reach the live site** until something invalidates the cache (see Rollback).

## Security

- **Admin only.** Import, export, preview, publish, restore and remove-language are all admin-only. `proxy.ts` gates `/admin/*`, and every server action and route handler re-checks the session itself. The import endpoint also requires a same-origin custom header (`x-cosd-admin`), which cross-site forms can't send.
- **Upload parsing.** The workbook is sent as the raw request body with a streaming 4 MB cap, so the global Server Action body limit, which also protects the public registration form, is unchanged. The zip directory is inspected before parsing (entry count, total uncompressed size, `xl/workbook.xml` present, no `vbaProject.bin`). Formulas are rejected, never evaluated. ExcelJS's XML parser doesn't resolve external entities.
- **No HTML rendering of dictionary content.** All dictionary text is rendered as React text nodes; there's no `dangerouslySetInnerHTML`. This is tested with `<script>`, `<img onerror>` and `javascript:` content. Outcome IDs are restricted to URL-safe characters, and invalid IDs return 404.
- **Formula injection in exports.** Every cell is a string cell with the Text number format, so Excel never evaluates it, even after editing. Values are not altered: no apostrophes are added, and research text exports byte-for-byte. Characters Excel can't store literally (the `\r` of `\r\n`, a literal `_x0041_`) use Excel's own `_xHHHH_` escaping and round-trip exactly.

## Deployment checklist (each step needs approval)

The application never needs the source workbook: it isn't referenced by app code, bundled, or served. The 80 outcomes are loaded by importing the workbook in the admin after deployment, and only published once authorised.

1. **Final source review.** Review the diff on `feature/outcome-dictionary`. `git status` must not list `docs/dictionary/*.xlsx`; it's ignored by `.gitignore`.
2. **Commit** to `feature/outcome-dictionary` and open a pull request. Vercel builds a preview deployment, which uses the preview database.
3. **Production migration.** Apply `db/migrations/003_create_dictionary.sql` to Neon project `late-bread-98890216`, branch `main`, database `neondb`, via the Neon SQL editor or `psql "$DATABASE_URL_UNPOOLED" -f db/migrations/003_create_dictionary.sql`. Before applying, check in the Neon console that the SQL editor (or the connection string) points at branch `main`. The migration is one transaction, additive and re-runnable. Then check that `SELECT * FROM dictionary_state` returns one row with every column NULL or 0. Applying the migration before the deploy is safe: the current site doesn't read these tables.
4. **Deploy:** merge to `main`. Vercel deploys production automatically. Check `/`, `/registration` and an Expression of Interest submission flow are unchanged. `/dictionary` shows "The Outcome Dictionary is being prepared".
5. **Admin verification.** Sign in with your name. Content shows the "Outcome Dictionary" section, reporting "Nothing published yet".
6. **Excel import.** Go to Content → Outcome Dictionary → Import Excel, choose the workbook as "English master", and Check. The preview should show 80 new outcomes, 2 categories and 9 group domains, with one warning (V_79) and one note (V_11). Save as draft.
7. **Draft preview.** Preview the draft and read a sample of entries. The public `/dictionary` must still show "being prepared".
8. **Publication**, only after Chris approves the content, its source note and its reuse: Publish. Then check `/dictionary` and `/dictionary/V_01`.

**Validated on Neon (25 November 2026).** These were run on a temporary schema-only branch of `main` (PostgreSQL 18.7), since deleted, and repeated on Next.js 16.4.6:

- migration 003 applied atomically and re-ran as a no-op
- existing tables were byte-identical afterwards
- 8 integration tests, 63 browser checks and 33 extra checks passed against real Neon

Production was verified unchanged before and after with read-only metadata checks.

## Rollback

- **Bad data published:** Version history → Restore the last good version → Publish. Nothing is deleted.
- **Draft not wanted:** Discard draft. It stays in the history.
- **Emergency (admin unavailable):** `UPDATE dictionary_state SET published_release_number = <good release> WHERE id = 1;` or `= NULL` to show "being prepared". Then purge the data cache: in Vercel, go to Project → Settings → Caches → Purge Data Cache, then redeploy. This is the same caveat as the page CMS.
- **Code:** revert the deploy. Older code ignores the new tables, and `/dictionary` goes back to the old placeholder page.
- **Schema:** `DROP TABLE dictionary_state; DROP TABLE dictionary_releases;` This is destructive: it deletes all versions. Only do it if nothing needs to be kept.

## Open questions for the project owner

1. **Permission to publish.** The definitions, experiences and participant quotations appear to come from the PROCEED study (Chevance et al., *Lancet Psychiatry* 2020; see `CONTENT_SOURCES.md`, "Dictionary"). This repository doesn't establish the licence for that material or confirm that participants' quotations may be republished on this site. The default "About this dictionary" text cites Chevance 2020. Confirm the source and wording, and the reuse rights, before the first publish. The publication's circular figure isn't reproduced; the category explorer is an original design.
2. **Terminology.** The source and default legend say "Informal caregivers" (ICG). The COS-D protocol says "carers" (open question in `CONTENT_SOURCES.md`). The legend is editable.
3. **Source data quality**, reported by the importer and left unchanged:
   - V_79's Verbatims contain U+F0E0, a Wingdings arrow pasted from Word, which most browsers show as an empty box.
   - V_11's Verbatims are wrapped in straight double quotes, so they're shown as written rather than grouped by participant.
   - Several Definitions and Experiences end in trailing spaces. These are harmless and invisible.

   Fix them in the workbook if wanted, and re-import.

## Testing

Automated tests use a **synthetic** 80-outcome workbook (`test/dictionary-fixtures.ts`). It has the research workbook's shape and every quirk the importer handles: trailing spaces, curly and straight quotes, a straight-quote-wrapped Verbatims cell, and a symbol-font character. None of its text comes from the research data, so the suite runs anywhere (including CI) without the real workbook.

- `src/lib/dictionary/*.test.ts`:
  - the 80-outcome workbook: seven columns preserved cell by cell, 2 categories, 9 groups, IDs V_01–V_80
  - dynamic taxonomies (1/5/7/20 categories, same-named groups, renames, removals)
  - every validation rule; corrupted, `.xls`, empty and formula files
  - translations (fr, nl, unknown IDs, conflicts, fallback, outdated detection)
  - export round-trips, including Unicode, `\r\n`, formula-like text and `_x` escapes
  - search, highlighting and verbatim parsing
- `src/lib/dictionary/service.test.ts`: the storage workflow against real Postgres SQL (PGlite), covering:
  - draft isolation
  - atomic publish
  - concurrent imports and publishes
  - unchanged detection
  - restore, discard and language removal
  - rollback of a failed write
  - refusing invalid stored data
  - the not-installed state

  PGlite runs one query at a time, so true concurrency is only covered by the Neon test below.
- `src/components/dictionary/DictionaryPage.test.tsx`: rendering, deep links, highlighting, translation fallback labels and HTML-injection safety.
- `src/lib/dictionary/source-workbook.test.ts`: runs **only where the real workbook exists locally**. It checks structure and cell-for-cell preservation, and contains no research text.
- `src/lib/dictionary/neon.integration.test.ts`: runs **only** with `DICTIONARY_TEST_DATABASE_URL` set to a disposable Neon branch that has migration 003 applied. It refuses to run against the `.env.local` database, and deletes all dictionary rows on the target. It covers:
  - Unicode, CRLF and 400-outcome JSON round trips
  - truly concurrent imports and publishes
  - readers during a publish never seeing a partial dataset
  - statement rollback
  - restore
  - database constraints holding even when the app is bypassed
