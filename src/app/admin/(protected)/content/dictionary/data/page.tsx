import type { Metadata } from "next";
import Link from "next/link";
import DatasetExplorer, { type ExplorerState } from "@/components/admin/dictionary/DatasetExplorer";
import { formatDateTime } from "@/lib/admin/format";
import { canonicalLanguage } from "@/lib/dictionary/languages";
import { participantRoleCodes } from "@/lib/dictionary/roles";
import { dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError, type DictionaryState, type ReleaseSummary } from "@/lib/dictionary/service";

export const metadata: Metadata = { title: "Inspect Outcome Dictionary data" };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

type Status = "live" | "draft" | "other";

function statusOf(release: ReleaseSummary, state: DictionaryState): Status {
  if (release.number === state.published?.number) return "live";
  if (release.number === state.draft?.number) return "draft";
  return "other";
}

function describe(release: ReleaseSummary, state: DictionaryState): string {
  const status = statusOf(release, state);
  if (status === "live") return `Published version ${release.number} — live on the website`;
  if (status === "draft") return `Draft version ${release.number} — NOT published, only visible to admins`;
  return `Earlier version ${release.number} — not live${release.publishedAt ? ` (was published ${formatDateTime(release.publishedAt)})` : " (never published)"}`;
}

export default async function DictionaryDataPage({ searchParams }: PageProps<"/admin/content/dictionary/data">) {
  const params = await searchParams;
  let state: DictionaryState | null = null;
  let releases: ReleaseSummary[] = [];
  try {
    [state, releases] = await Promise.all([dictionary.getState(), dictionary.listReleases()]);
  } catch (error) {
    if (!(error instanceof DictionaryNotInstalledError)) throw error;
  }

  const heading = (
    <>
      <h1 className="text-heading font-semibold text-ink">Inspect data</h1>
      <p className="mt-2 max-w-3xl text-body text-ink-muted">
        Every record of a dictionary version, with all seven Excel columns exactly as stored. Read-only: nothing here changes the
        data or the website.
      </p>
    </>
  );

  if (state === null) {
    return (
      <div>
        {heading}
        <p role="alert" className="mt-8 border border-dashed border-border bg-paper p-6 text-body text-ink">
          The Outcome Dictionary isn&apos;t set up yet (database migration 003).
        </p>
      </div>
    );
  }

  if (releases.length === 0) {
    return (
      <div>
        {heading}
        <section aria-labelledby="no-data" className="mt-8 border border-dashed border-border bg-paper p-6">
          <h2 id="no-data" className="text-body font-semibold text-ink">
            No data imported yet
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            There is nothing to inspect until an Excel workbook has been imported. Download the template, fill in one row per
            outcome, then import it. You can inspect every record before anything is published.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/content/dictionary/import" className="btn btn-primary">
              Import Excel
            </Link>
            <a href="/admin/content/dictionary/export?scope=blank" className="btn">
              Download Excel template
            </a>
          </div>
        </section>
      </div>
    );
  }

  // Which version: ?dataset=draft|live|<number>; by default the draft, which
  // is what needs checking before publishing.
  const datasetParam = one(params.dataset);
  const requested =
    datasetParam === "live"
      ? state.published?.number
      : datasetParam === "draft"
        ? state.draft?.number
        : datasetParam && /^\d{1,9}$/.test(datasetParam)
          ? Number(datasetParam)
          : (state.draft?.number ?? state.published?.number ?? releases[0].number);
  const loaded = requested ? await dictionary.getRelease(requested) : null;
  const roleCodes = await participantRoleCodes();

  const initial: Partial<ExplorerState> = {
    query: one(params.q) ?? "",
    category: one(params.category) ?? "",
    group: one(params.group) ?? "",
    language: canonicalLanguage(one(params.lang) ?? "") ?? "en",
    attention: one(params.attention) === "1",
    page: Number(one(params.page)) || 1,
  };

  const live = state.published ? releases.find((r) => r.number === state.published!.number) : undefined;
  const draft = state.draft ? releases.find((r) => r.number === state.draft!.number) : undefined;
  const earlier = releases.filter((r) => r !== live && r !== draft);
  const status = loaded ? statusOf(loaded.release, state) : "other";

  return (
    <div>
      {heading}

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 border border-border bg-paper p-4">
        <label className="text-sm font-medium text-ink">
          Dataset
          <select
            name="dataset"
            defaultValue={loaded ? String(loaded.release.number) : undefined}
            className="mt-1 block max-w-full border border-border bg-paper px-2 py-2 text-sm text-ink"
          >
            {draft && <option value={draft.number}>Draft — version {draft.number} (not published)</option>}
            {live && <option value={live.number}>Published — version {live.number} (live on the website)</option>}
            {earlier.length > 0 && (
              <optgroup label="Earlier versions">
                {earlier.map((release) => (
                  <option key={release.number} value={release.number}>
                    Version {release.number} — {formatDateTime(release.createdAt)}, {release.summary.outcomes} outcomes
                    {release.publishedAt ? " (published before)" : " (never published)"}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <button type="submit" className="btn btn-compact">
          Show this dataset
        </button>
        {loaded && (
          <a
            href={`/admin/content/dictionary/export?scope=master&release=${loaded.release.number}`}
            className="ml-auto text-sm font-semibold text-ink underline underline-offset-2"
          >
            Download this version as Excel
          </a>
        )}
      </form>

      {!loaded ? (
        <p role="alert" className="mt-6 border border-dashed border-border bg-paper p-6 text-body text-ink">
          That version doesn&apos;t exist. Choose a dataset above.
        </p>
      ) : (
        <>
          <div
            className={`mt-6 border-l-4 px-4 py-3 ${
              status === "live" ? "border-accent bg-accent-soft/20" : status === "draft" ? "border-amber-600 bg-amber-50" : "border-border bg-paper-alt"
            }`}
          >
            <p className="font-semibold text-ink">You are viewing: {describe(loaded.release, state)}</p>
            <p className="mt-1 text-sm text-ink-muted">
              {loaded.release.summary.outcomes} outcomes · {loaded.release.summary.categories} categories ·{" "}
              {loaded.release.summary.groups} group domains · saved {formatDateTime(loaded.release.createdAt)} by{" "}
              {loaded.release.createdBy}
              {loaded.release.importMeta && ` · from “${loaded.release.importMeta.fileName}”`}
            </p>
          </div>

          <div className="mt-6">
            <DatasetExplorer
              key={loaded.release.number}
              dataset={{ outcomes: loaded.content.master.outcomes, translations: loaded.content.translations }}
              roleCodes={roleCodes}
              datasetLabel={describe(loaded.release, state)}
              datasetTone={status}
              initial={initial}
              urlSync
            />
          </div>
        </>
      )}
    </div>
  );
}
