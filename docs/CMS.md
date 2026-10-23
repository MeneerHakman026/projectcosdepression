# Content management (CMS)

Editors change page **content** in the admin (Admin → Content). Developers own page **structure**: components, layout, which fields exist and how they're validated. Editors can't add HTML, scripts or styling.

## How it fits together

| Piece | Where | Owner |
|---|---|---|
| Page registry (slug, URL, schema, defaults) | `src/lib/cms/pages.ts` | Developer |
| Content schema per page (zod) | `src/content/<page>/schema.ts` | Developer |
| Built-in content, used until first publish | `src/content/<page>/defaults.ts` | Developer |
| Rendering | `src/components/home/HomePage.tsx` (takes `content` as a prop) | Developer |
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

## Rollback

- **Bad content:** open Version history, Restore the last good version, then Publish. Previous versions stay listed.
- **Emergency (live page wrong, editor unavailable):** `UPDATE cms_pages SET published_content = NULL, published_schema_version = NULL, published_revision_number = NULL, published_draft_version = NULL, published_at = NULL, published_by = NULL WHERE slug = 'home';` This makes `/` fall back to built-in content after the next revalidation or redeploy. No history is lost.
- **Code:** revert the deploy. The previous code doesn't read the CMS tables, and they can stay in place.
- **Schema:** `DROP TABLE cms_page_revisions; DROP TABLE cms_pages;` This is destructive: it deletes all saved content and history. Only do it if none of that needs to be kept.

## Adding the next page (e.g. `/study`)

1. Define `src/content/study/schema.ts` and `defaults.ts`. Use the shared field builders in `src/lib/cms/validation.ts`.
2. Register it in `CMS_PAGES` (`src/lib/cms/pages.ts`).
3. Make the page render from a `content` prop and load it with `getPublishedContent()`.
4. Add an editor component built from `src/components/admin/cms/fields.tsx`, and route to it in the editor and preview pages.
5. If an existing schema changes in a way that breaks saved content, bump `schemaVersion` and add a `migrate` step.
