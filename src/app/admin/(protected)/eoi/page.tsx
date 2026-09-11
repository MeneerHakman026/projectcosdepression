import type { Metadata } from "next";
import Link from "next/link";
import { fetchEoiFacets, fetchEoiRecords, type EoiFilters } from "@/lib/admin/eoi";
import { formatDateTime } from "@/lib/admin/format";

export const metadata: Metadata = { title: "EOI" };

type SearchParams = { [key: string]: string | string[] | undefined };

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

const fieldClasses =
  "mt-2 w-full border border-border bg-paper px-4 py-2.5 text-body text-ink";
const labelClasses = "block text-sm font-medium text-ink";

export default async function AdminEoiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const filters: EoiFilters = {
    search: firstValue(params.q) || undefined,
    country: firstValue(params.country) || undefined,
    ageGroup: firstValue(params.ageGroup) || undefined,
    preferredLanguage: firstValue(params.language) || undefined,
  };

  const [records, facets] = await Promise.all([fetchEoiRecords(filters), fetchEoiFacets()]);

  const exportQuery = new URLSearchParams();
  if (filters.search) exportQuery.set("q", filters.search);
  if (filters.country) exportQuery.set("country", filters.country);
  if (filters.ageGroup) exportQuery.set("ageGroup", filters.ageGroup);
  if (filters.preferredLanguage) exportQuery.set("language", filters.preferredLanguage);
  const exportHref = `/admin/eoi/export${exportQuery.toString() ? `?${exportQuery}` : ""}`;

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-heading font-semibold text-ink">Expression of Interest</h1>
        <Link href={exportHref} className="btn btn-primary">
          Export CSV
        </Link>
      </div>

      <form method="get" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label htmlFor="q" className={labelClasses}>
            Search
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={filters.search ?? ""}
            placeholder="First name or email"
            className={fieldClasses}
          />
        </div>

        <div>
          <label htmlFor="country" className={labelClasses}>
            Country
          </label>
          <select
            id="country"
            name="country"
            defaultValue={filters.country ?? ""}
            className={fieldClasses}
          >
            <option value="">All countries</option>
            {facets.countries.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="ageGroup" className={labelClasses}>
            Age group
          </label>
          <select
            id="ageGroup"
            name="ageGroup"
            defaultValue={filters.ageGroup ?? ""}
            className={fieldClasses}
          >
            <option value="">All age groups</option>
            {facets.ageGroups.map((ageGroup) => (
              <option key={ageGroup} value={ageGroup}>
                {ageGroup}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="language" className={labelClasses}>
            Preferred language
          </label>
          <select
            id="language"
            name="language"
            defaultValue={filters.preferredLanguage ?? ""}
            className={fieldClasses}
          >
            <option value="">All languages</option>
            {facets.languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end gap-4 lg:col-span-4">
          <button type="submit" className="btn">
            Apply filters
          </button>
          {hasActiveFilters && (
            <Link
              href="/admin/eoi"
              className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        {records.length} matching record{records.length === 1 ? "" : "s"}
      </p>

      <div className="mt-3 overflow-x-auto border border-border">
        <table className="w-full min-w-[860px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-paper-alt">
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                First name
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                Email
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                Country
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                Age group
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                Preferred language
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                Consent
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-ink">
                Submitted at
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} className="border-b border-border bg-paper last:border-b-0">
                <td className="px-4 py-3 text-ink">{record.firstName}</td>
                <td className="px-4 py-3 text-ink">{record.email}</td>
                <td className="px-4 py-3 text-ink">{record.country ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{record.ageGroup ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{record.preferredLanguage ?? "—"}</td>
                <td className="px-4 py-3 text-ink">{record.consentGiven ? "Yes" : "No"}</td>
                <td className="px-4 py-3 text-ink">{formatDateTime(record.submittedAt)}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr className="bg-paper">
                <td colSpan={7} className="px-4 py-6 text-center text-ink-muted">
                  No matching records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
