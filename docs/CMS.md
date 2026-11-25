# Content management (CMS)

Editors change page **content** in the admin (Admin → Content). Developers own page **structure**: components, layout, which fields exist and how they're validated. Editors can't add HTML, scripts or styling.

## How it fits together

| Piece | Where | Owner |
|---|---|---|
| Page registry (slug, URL, schema, defaults) | `src/lib/cms/pages.ts` | Developer |
| Content schema per page (zod) | `src/content/<page>/schema.ts` | Developer |
| Built-in content, used until first publish | `src/content/<page>/defaults.ts` | Developer |
| Rendering | `src/components/home/HomePage.tsx`, `src/components/registration/*` (take `content` as a prop) | Developer |
| Storage + workflow (save, publish, restore) | `src/lib/cms/service.ts` | — |
| Editor UI | `src/components/admin/cms/*` | — |
| Content | `cms_pages`, `cms_page_revisions` tables | Editor |

**Workflow:** Edit → Save draft → Preview → Publish.

- **Save draft** writes only the draft columns and appends a revision. The public site doesn't change.
- **Preview** (`/admin/preview/<slug>`, `?revision=N` for older versions) renders the saved draft with the real public components. It needs an admin session.
- **Publish** validates the saved draft on the server, copies it into the published columns, and appends a `publish` revision. All of that happens in one SQL statement. It then expires the page's cache tag and path.
- **Restore** copies an old revision into the draft as a new `restore` revision. History is never rewritten, and nothing goes live until the next publish.
- **Concurrency:** every write carries the `draft_version` the editor loaded. If someone saved in between, the write is rejected as a conflict instead of overwriting their work.

**Public reads:** `getPublishedContent()` (`src/lib/cms/server.ts`) is wrapped in `unstable_cache` with tag `cms:page:<slug>`, so `/` stays statically generated. Visitors never trigger a database query. The page falls back to `defaults.ts` when nothing is published yet, or when the CMS tables don't exist. If stored content fails validation, the read throws instead of falling back, so the last good cached page keeps being served.

**Rich text** is a small inline format: `*italic*`, `**bold**`, `[label](/path)`. It's parsed to React elements (`src/lib/cms/rich-text.ts`, `src/components/RichText.tsx`) and never rendered as HTML. Every link is checked against `isSafeHref` on save and again on render.

**Scientific sources** are structured `references` in the content. Each research figure must cite at least one of them, and citations must point to an existing source, so every figure stays traceable to a paper. DOIs are blank: they aren't recorded in `CONTENT_SOURCES.md`, so fill them in from the papers.

**Editor attribution:** the admin uses one shared password, so the "Your name" entered at sign-in is self-reported. It's signed into the session cookie and recorded on every revision. Sessions from before this change keep working and show as "Admin".

## What's editable

| Document | Slug | Where it appears | Editor |
|---|---|---|---|
| Homepage | `home` | `/` | `HomeEditor` |
| Registration | `registration` | `/registration`, `/registration/success` | `RegistrationEditor` |
| Expression of Interest button | `eoi-button` | Every page (header, mobile menu) and the homepage's two main buttons | `EoiButtonEditor` |
| Outcome Dictionary page (wording only) | `dictionary` | `/dictionary` and every `/dictionary/<ID>` | `DictionaryPageEditor` |

The Outcome Dictionary's entries aren't CMS content: they're imported from Excel and versioned separately (Content → Outcome Dictionary). See [DICTIONARY.md](DICTIONARY.md).

### Registration page

Editors change the wording around the form: the introduction, the form heading, "Before you submit" (heading, bullet points, closing paragraph with the Privacy Policy and contact links), the thank-you page and the search-engine title and description.

The form itself is **not** content. Its fields, labels, the consent statement, validation (`src/lib/registration/submission.ts`), the server action (`src/app/registration/actions.ts`), storage and retention stay in code. The schema has no fields for any of them, and anything extra sent to the server is dropped. In the admin preview the form is shown but can't be submitted, so previewing never creates a real Expression of Interest.

### Expression of Interest button (site-wide)

A single published document controls the text and destination of **every** EOI button, so buttons can't drift apart:

- **Internal (default):** links to `/registration`. The path is fixed in code (`INTERNAL_REGISTRATION_PATH`) and isn't editable.
- **External:** links straight to an `https://` study website the editor enters. The address is checked on save, again on publish (server-side zod schema), and again at render (`resolveEoiButton`, which falls back to `/registration` if anything is off). Only `https:` with a real host and no embedded credentials is accepted, so `javascript:`, `data:`, `file:`, `http:`, relative and protocol-relative URLs are all rejected. Visitors navigate directly (an ordinary link in the same tab). There is no redirect endpoint, so the site can't be used as an open redirect.

The editor shows what's **live now** next to what's **in the draft**, and warns that `/registration` and its form stay online in external mode.

**Why a separate document and not part of the Registration page or a new settings table?** It reuses the existing draft, publish, history, restore and conflict handling with no new tables or migration. Keeping it apart from the Registration page means switching the button to the external site never forces half-edited page text to go live with it. Neither the homepage nor the registration page stores its own copy of the button, so there's one source of truth.

**Caching:** public pages read it through `getEoiButton()` (`src/lib/eoi-button.server.ts`), cached under `cms:page:eoi-button`. Publishing it expires that tag and revalidates the root layout (`revalidatePath("/", "layout")`), which refreshes every page. Saving a draft refreshes only admin pages.

**Homepage schema v2:** the homepage's two main buttons used to be free-form `primaryCta` fields. They now always use the site-wide button. `migrateHomeContent` drops the old fields when v1 content is read, which covers the live document and every stored revision. Before this change both still held "Expression of interest" → `/registration`, the same as the button's default, so nothing visible changes. Stored history isn't rewritten.

### When the button points to an external site

`/registration` keeps working: the page is still public, still editable, and **its form still accepts submissions** from anyone who reaches it via an old link or bookmark. That's deliberate for now (see "Open decisions" below).

## Open decisions (not implemented)

- **Closing the internal form when recruitment moves external.** Proposal: a developer-owned "form availability" control (open / closed with a message linking to the study site), separate from the button so each can change independently. Implications to decide first: what the closed page should say; whether `/registration/success` should still be reachable; that the existing EOI closing date in Settings drives deletion of personal data 14 days later, and doesn't currently stop the form from accepting submissions (the server action doesn't check it). A submission that arrives after the closing date is deleted with everything else when the retention period ends.

## Applying the migration

`db/migrations/002_create_cms_pages.sql` is additive. It creates two tables, touches no existing table, and is safe to re-run. Until it's applied, the public site shows built-in content and the admin Content page says editing isn't set up.

Apply it in the Neon SQL editor or with `psql "$DATABASE_URL_UNPOOLED" -f db/migrations/002_create_cms_pages.sql`. Prefer testing on a Neon branch first.

## Deployment checklist

1. `npm test`, `npm run lint` and `npm run build` all pass.
2. Apply migration 002 to the production database (needs approval). The order doesn't matter: code deployed first falls back to built-in content.
3. Deploy.
4. Check that `/` looks unchanged. Nothing is published yet, so it renders `defaults.ts`.
5. Sign in to `/admin` with a name. Open Content → Homepage, change one word, Save draft, and Preview. Confirm the live `/` is unchanged.
6. Publish, then confirm `/` shows the change. Restore the previous version and publish again to undo it.

### Registration page and EOI button release

No database migration is needed. These are new rows in the existing `cms_pages` table, created on first save, and `expressions_of_interest.country` is already nullable.

1. Deploy. Check that `/`, `/about` and `/registration` look unchanged apart from the removed Country field and the "Age group and preferred language are optional." point. Every EOI button should still read "Expression of interest" and go to `/registration`.
2. Content → Expression of Interest button: change the text, Save draft, Preview. Confirm the live header is unchanged. Restore the original text, or leave it unpublished.
3. Content → Registration: change one word, Save draft, Preview (the form can't be submitted there). Confirm the live `/registration` is unchanged. Publish only if the change is wanted.

## Rollback

- **Bad content:** open Version history, Restore the last good version, then Publish. Previous versions stay listed.
- **Emergency (live page wrong, editor unavailable):** `UPDATE cms_pages SET published_content = NULL, published_schema_version = NULL, published_revision_number = NULL, published_draft_version = NULL, published_at = NULL, published_by = NULL WHERE slug = 'home';` No history is lost. **Changes made directly in the database don't reach the live site on their own.** The published page stays cached until something invalidates it (verified on a Neon branch). After the SQL, purge the cache: in Vercel go to Project → Settings → Caches → Purge Data Cache, then redeploy. When the admin is reachable, Restore + Publish is always the better route, because it invalidates the cache itself.
- **Code:** revert the deploy. The previous code doesn't read the `registration` or `eoi-button` rows; they can stay. **Caveat:** if the homepage was *saved or published* after this release, it's stored as schema v2, which older code refuses to read ("saved by a newer version"). Before reverting, restore and publish nothing new. After reverting, if the homepage errors, point it back at the last v1 revision: `UPDATE cms_pages p SET published_content = r.content, published_schema_version = 1, draft_content = r.content, draft_schema_version = 1 FROM cms_page_revisions r WHERE p.slug = 'home' AND r.page_id = p.id AND r.revision_number = <last v1 revision>;`, then purge the cache as above.
- **EOI button pointing at the wrong place:** open Content → Expression of Interest button, choose "Registration page on this website" (or Restore an earlier version), and Publish. The whole site refreshes.
- **Schema:** `DROP TABLE cms_page_revisions; DROP TABLE cms_pages;` This is destructive: it deletes all saved content and history. Only do it if none of that needs to be kept.

## Adding the next page (e.g. `/study`)

Registration was added this way. Use it as the worked example.

1. Define `src/content/study/schema.ts` and `defaults.ts`. Use the shared field builders in `src/lib/cms/validation.ts`.
2. Register it in `CMS_PAGES` (`src/lib/cms/pages.ts`).
3. Make the page render from a `content` prop and load it with `getPublishedContent()`.
4. Add an editor component built from `src/components/admin/cms/fields.tsx`, and route to it in the editor and preview pages.
5. If an existing schema changes in a way that breaks saved content, bump `schemaVersion` and add a `migrate` step.
