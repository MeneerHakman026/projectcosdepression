import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { Db } from "@/lib/cms/service";

const MIGRATIONS = ["001_create_eoi_settings.sql", "002_create_cms_pages.sql"];

/**
 * A throwaway in-memory Postgres with the real migrations applied, so CMS
 * SQL is exercised exactly as written — without touching any real database.
 */
export async function createTestDb(options: { migrate?: boolean } = {}): Promise<{ db: Db; pg: PGlite }> {
  const pg = new PGlite();
  if (options.migrate !== false) {
    for (const file of MIGRATIONS) {
      await pg.exec(readFileSync(new URL(`../db/migrations/${file}`, import.meta.url), "utf8"));
    }
  }
  const db: Db = {
    async query(text, params = []) {
      const result = await pg.query<Record<string, unknown>>(text, params);
      return result.rows;
    },
  };
  return { db, pg };
}
