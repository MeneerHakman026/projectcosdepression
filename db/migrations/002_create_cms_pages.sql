-- Content management: editable page content with separated draft and
-- published versions, plus an append-only revision history.
--
-- Additive only — creates two new tables and touches nothing that already
-- exists (site_content, eoi_settings and expressions_of_interest are left
-- exactly as they are). Safe to re-run: every statement is IF NOT EXISTS.
--
-- Which pages exist, their URL, template and content schema are defined in
-- code (src/lib/cms/pages.ts). This table holds only the editable content
-- for those pages. A page with no row here renders its built-in default
-- content, so applying this migration changes nothing on the public site.
--
-- Rollback (only if no content has been published yet that you want to
-- keep): DROP TABLE cms_page_revisions; DROP TABLE cms_pages;

CREATE TABLE IF NOT EXISTS cms_pages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug text NOT NULL UNIQUE,

  -- Working copy. Saving a draft only ever writes these columns, so the
  -- public site is never affected by a save.
  draft_content jsonb NOT NULL,
  draft_schema_version integer NOT NULL,
  -- Optimistic-concurrency counter: bumped on every draft write. Writers
  -- must present the version they loaded; a mismatch means someone else
  -- saved in between, and the write is rejected rather than overwriting.
  draft_version integer NOT NULL DEFAULT 1,
  draft_updated_at timestamptz NOT NULL DEFAULT now(),
  draft_updated_by text NOT NULL,

  -- What the public site renders. NULL until the first publish, in which
  -- case the page's built-in default content is shown.
  published_content jsonb,
  published_schema_version integer,
  published_revision_number integer,
  -- draft_version at the moment of publishing; differs from draft_version
  -- whenever there are saved-but-unpublished changes.
  published_draft_version integer,
  published_at timestamptz,
  published_by text,

  -- Last revision number handed out for this page. Incremented in the same
  -- statement that writes a revision, under the row lock, so revision
  -- numbers can never collide.
  last_revision_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cms_pages_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT cms_pages_draft_version_positive CHECK (draft_version > 0),
  CONSTRAINT cms_pages_published_consistent CHECK (
    (published_content IS NULL) = (published_revision_number IS NULL)
    AND (published_content IS NULL) = (published_at IS NULL)
  )
);

-- Append-only: rows are inserted, never updated or deleted by the
-- application. Restoring an old revision copies its content into a new
-- revision instead of rewinding history.
CREATE TABLE IF NOT EXISTS cms_page_revisions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  page_id bigint NOT NULL REFERENCES cms_pages (id) ON DELETE RESTRICT,
  revision_number integer NOT NULL,
  -- draft: a saved draft; publish: the content that went live;
  -- restore: an earlier revision copied back into the draft.
  kind text NOT NULL,
  content jsonb NOT NULL,
  schema_version integer NOT NULL,
  author text NOT NULL,
  restored_from_revision_number integer,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT cms_page_revisions_kind CHECK (kind IN ('draft', 'publish', 'restore')),
  CONSTRAINT cms_page_revisions_restore_source CHECK (
    (kind = 'restore') = (restored_from_revision_number IS NOT NULL)
  ),
  CONSTRAINT cms_page_revisions_unique_number UNIQUE (page_id, revision_number)
);
