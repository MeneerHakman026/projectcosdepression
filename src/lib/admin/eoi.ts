import "server-only";
import { sql } from "@/lib/db";

export type EoiRecord = {
  id: number;
  firstName: string;
  email: string;
  country: string | null;
  ageGroup: string | null;
  preferredLanguage: string | null;
  consentGiven: boolean;
  submittedAt: string; // ISO 8601
};

export type EoiFilters = {
  search?: string;
  country?: string;
  ageGroup?: string;
  preferredLanguage?: string;
};

export type EoiFacets = {
  countries: string[];
  ageGroups: string[];
  languages: string[];
};

export type EoiOverviewStats = {
  total: number;
  last7Days: number;
  topLanguage: string | null;
  topAgeGroup: string | null;
};

type EoiRow = {
  id: number;
  first_name: string;
  email: string;
  country: string | null;
  age_group: string | null;
  preferred_language: string | null;
  consent_given: boolean;
  submitted_at: string | Date;
};

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapRow(row: EoiRow): EoiRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    email: row.email,
    country: row.country,
    ageGroup: row.age_group,
    preferredLanguage: row.preferred_language,
    consentGiven: row.consent_given,
    submittedAt: toIso(row.submitted_at),
  };
}

function buildWhereClause(filters: EoiFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(first_name ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (filters.country) {
    params.push(filters.country);
    conditions.push(`country = $${params.length}`);
  }
  if (filters.ageGroup) {
    params.push(filters.ageGroup);
    conditions.push(`age_group = $${params.length}`);
  }
  if (filters.preferredLanguage) {
    params.push(filters.preferredLanguage);
    conditions.push(`preferred_language = $${params.length}`);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

/** All matching EOI records, newest first. Filters are always parameterized. */
export async function fetchEoiRecords(filters: EoiFilters): Promise<EoiRecord[]> {
  const { where, params } = buildWhereClause(filters);
  const rows = (await sql.query(
    `SELECT id, first_name, email, country, age_group, preferred_language, consent_given, submitted_at
     FROM expressions_of_interest
     ${where}
     ORDER BY submitted_at DESC`,
    params
  )) as EoiRow[];
  return rows.map(mapRow);
}

/** Distinct, non-null values actually present in the table, for filter dropdowns. */
export async function fetchEoiFacets(): Promise<EoiFacets> {
  const [countries, ageGroups, languages] = await Promise.all([
    sql`SELECT DISTINCT country FROM expressions_of_interest WHERE country IS NOT NULL ORDER BY country`,
    sql`SELECT DISTINCT age_group FROM expressions_of_interest WHERE age_group IS NOT NULL ORDER BY age_group`,
    sql`SELECT DISTINCT preferred_language FROM expressions_of_interest WHERE preferred_language IS NOT NULL ORDER BY preferred_language`,
  ]);

  return {
    countries: countries.map((r) => r.country as string),
    ageGroups: ageGroups.map((r) => r.age_group as string),
    languages: languages.map((r) => r.preferred_language as string),
  };
}

export async function fetchEoiCount(): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS count FROM expressions_of_interest`;
  return (rows[0]?.count as number) ?? 0;
}

export async function fetchEoiOverviewStats(): Promise<EoiOverviewStats> {
  const [totalRows, last7Rows, langRows, ageRows] = await Promise.all([
    sql`SELECT count(*)::int AS count FROM expressions_of_interest`,
    sql`SELECT count(*)::int AS count FROM expressions_of_interest WHERE submitted_at >= now() - interval '7 days'`,
    sql`
      SELECT preferred_language, count(*)::int AS count
      FROM expressions_of_interest
      WHERE preferred_language IS NOT NULL
      GROUP BY preferred_language
      ORDER BY count DESC, preferred_language ASC
      LIMIT 1
    `,
    sql`
      SELECT age_group, count(*)::int AS count
      FROM expressions_of_interest
      WHERE age_group IS NOT NULL
      GROUP BY age_group
      ORDER BY count DESC, age_group ASC
      LIMIT 1
    `,
  ]);

  return {
    total: (totalRows[0]?.count as number) ?? 0,
    last7Days: (last7Rows[0]?.count as number) ?? 0,
    topLanguage: (langRows[0]?.preferred_language as string | undefined) ?? null,
    topAgeGroup: (ageRows[0]?.age_group as string | undefined) ?? null,
  };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADER = [
  "First name",
  "Email",
  "Country",
  "Age group",
  "Preferred language",
  "Consent",
  "Submitted at",
];

/** RFC 4180 CSV, UTF-8 with a BOM (for Excel), CRLF line endings. */
export function buildEoiCsv(records: EoiRecord[]): string {
  const lines = [CSV_HEADER.map(escapeCsvField).join(",")];

  for (const record of records) {
    lines.push(
      [
        record.firstName,
        record.email,
        record.country ?? "",
        record.ageGroup ?? "",
        record.preferredLanguage ?? "",
        record.consentGiven ? "Yes" : "No",
        record.submittedAt,
      ]
        .map((value) => escapeCsvField(String(value)))
        .join(",")
    );
  }

  const utf8Bom = String.fromCharCode(0xfeff);
  return utf8Bom + lines.join("\r\n") + "\r\n";
}
