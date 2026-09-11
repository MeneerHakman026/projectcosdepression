import "server-only";
import { sql } from "@/lib/db";

export type ContentItem = {
  key: string;
  value: string;
  updatedAt: Date;
};

type ContentRow = {
  key: string;
  value: string;
  updated_at: string | Date;
};

function mapRow(row: ContentRow): ContentItem {
  return {
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at instanceof Date ? row.updated_at : new Date(row.updated_at),
  };
}

/** All rows in the generic key/value site_content table, ordered by key. */
export async function listSiteContent(): Promise<ContentItem[]> {
  const rows = (await sql`SELECT key, value, updated_at FROM site_content ORDER BY key`) as ContentRow[];
  return rows.map(mapRow);
}

/** Creates or updates a single content row. */
export async function upsertSiteContent(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO site_content (key, value, updated_at)
    VALUES (${key}, ${value}, now())
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
  `;
}
