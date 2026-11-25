-- Outcome Dictionary: versioned datasets imported from Excel, with a
-- separate draft and published pointer.
--
-- Additive only — creates two new tables and touches nothing that already
-- exists (expressions_of_interest, eoi_settings, site_content, cms_pages and
-- cms_page_revisions are left exactly as they are). Safe to re-run: every
-- statement is IF NOT EXISTS / ON CONFLICT DO NOTHING.
--
-- Design (see docs/DICTIONARY.md):
--  * Every import or restore creates a new, immutable release: a complete
--    snapshot of the dictionary (English master + all translations) as
--    JSONB. Releases are never updated except to record when they were
--    first published, and never deleted by the application.
--  * dictionary_state is a single row pointing at the current draft release
--    and the published release. Publishing moves a pointer in one UPDATE,
--    so the public dictionary switches atomically from one complete dataset
--    to the next and is never empty or half-replaced.
--  * dictionary_state.version is an optimistic-concurrency counter: every
--    write must present the version it was based on.
--
-- Until this migration is applied, the public /dictionary page says the
-- dictionary isn't available yet and the admin explains what's missing.
--
-- Rollback (deletes all imported dictionary data and its history — only if
-- none of it needs to be kept):
--   DROP TABLE dictionary_state; DROP TABLE dictionary_releases;

-- One transaction: either both tables and the state row exist afterwards, or
-- nothing changed.
BEGIN;

CREATE TABLE IF NOT EXISTS dictionary_releases (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  release_number integer NOT NULL UNIQUE,
  -- import: from an uploaded workbook; restore: copied from an earlier
  -- release; language_removed: a translation was taken out.
  kind text NOT NULL,
  -- The complete dataset (validated in code by dictionaryContentSchema).
  content jsonb NOT NULL,
  content_format integer NOT NULL,
  -- sha256 of the canonical JSON; identical datasets have identical hashes.
  content_hash text NOT NULL,
  -- Counts shown in lists without loading the content.
  summary jsonb NOT NULL,
  -- For imports: file name, size, sha256, sheets and languages imported,
  -- warning count. The uploaded file itself is not stored.
  import_meta jsonb,
  -- The release this one was built on (the draft or live release at the time).
  parent_release_number integer,
  restored_from_release_number integer,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Set once, the first time this release goes live.
  published_at timestamptz,
  published_by text,

  CONSTRAINT dictionary_releases_kind CHECK (kind IN ('import', 'restore', 'language_removed')),
  CONSTRAINT dictionary_releases_restore_source CHECK (
    (kind = 'restore') = (restored_from_release_number IS NOT NULL)
  ),
  CONSTRAINT dictionary_releases_number_positive CHECK (release_number > 0),
  CONSTRAINT dictionary_releases_published_consistent CHECK (
    (published_at IS NULL) = (published_by IS NULL)
  )
);

CREATE TABLE IF NOT EXISTS dictionary_state (
  id smallint PRIMARY KEY DEFAULT 1,
  draft_release_number integer REFERENCES dictionary_releases (release_number),
  published_release_number integer REFERENCES dictionary_releases (release_number),
  last_release_number integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT dictionary_state_single_row CHECK (id = 1),
  CONSTRAINT dictionary_state_draft_differs CHECK (
    draft_release_number IS NULL OR published_release_number IS NULL
    OR draft_release_number <> published_release_number
  )
);

INSERT INTO dictionary_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

COMMIT;
