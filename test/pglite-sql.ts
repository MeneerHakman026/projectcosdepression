import { PGlite } from "@electric-sql/pglite";

/**
 * Mirrors the production `expressions_of_interest` table exactly as it
 * exists in Neon (inspected 2026-11-25; it predates db/migrations). Note
 * `country` is nullable with no default or check constraint.
 */
export const EXPRESSIONS_OF_INTEREST_DDL = `
  CREATE TABLE expressions_of_interest (
    id serial PRIMARY KEY,
    first_name text NOT NULL,
    email text NOT NULL,
    country text,
    age_group text,
    preferred_language text,
    consent_given boolean NOT NULL DEFAULT false,
    submitted_at timestamptz NOT NULL DEFAULT now()
  );
`;

type Rows = Record<string, unknown>[];

/**
 * An in-memory stand-in for the Neon `sql` client (lib/db.ts): supports
 * both the tagged-template form and sql.query(text, params), with values
 * always sent as parameters, as Neon does.
 */
export async function createEoiTestSql() {
  const pg = new PGlite();
  await pg.exec(EXPRESSIONS_OF_INTEREST_DDL);

  const query = async (text: string, params: unknown[] = []): Promise<Rows> =>
    (await pg.query<Record<string, unknown>>(text, params)).rows;

  const sql = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]): Promise<Rows> =>
      query(
        strings.reduce((text, part, index) => text + (index > 0 ? `$${index}` : "") + part, ""),
        values
      ),
    { query }
  );
  return { sql, pg };
}

export type EoiTestSql = Awaited<ReturnType<typeof createEoiTestSql>>["sql"];
