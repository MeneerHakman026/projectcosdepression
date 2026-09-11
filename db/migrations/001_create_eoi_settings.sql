-- Operational settings for the Expression of Interest period.
-- Deliberately separate from site_content: this holds a privacy/retention
-- control (the EOI closing date, which drives automatic deletion of
-- personal data), not editorial text.
--
-- Single-row table: id is pinned to 1 by the check constraint, and all
-- reads/writes target that one row.
CREATE TABLE IF NOT EXISTS eoi_settings (
  id smallint PRIMARY KEY DEFAULT 1,
  closes_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eoi_settings_single_row CHECK (id = 1)
);

INSERT INTO eoi_settings (id, closes_at)
VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;
