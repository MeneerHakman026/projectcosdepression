import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/admin/dictionary/ActionButton";
import { formatDateTime } from "@/lib/admin/format";
import { releaseOrigin } from "@/lib/dictionary/labels";
import { dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError, type DictionaryState, type ReleaseSummary } from "@/lib/dictionary/service";

export const metadata: Metadata = { title: "Outcome Dictionary history" };

export default async function DictionaryHistoryPage() {
  let data: { state: DictionaryState; releases: ReleaseSummary[] } | null = null;
  try {
    const [state, releases] = await Promise.all([dictionary.getState(), dictionary.listReleases()]);
    data = { state, releases };
  } catch (error) {
    if (!(error instanceof DictionaryNotInstalledError)) throw error;
  }

  // Default comparison: what the newest version changes relative to the
  // live one — or to its predecessor when the newest version is live.
  const newest = data?.releases[0]?.number;
  const live = data?.state.published?.number;
  const defaultFrom = live && live !== newest ? live : (data?.releases[1]?.number ?? newest);

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/content/dictionary" className="text-ink-muted underline underline-offset-2 hover:text-ink">
          ← Outcome Dictionary
        </Link>
      </p>
      <h1 className="mt-2 text-heading font-semibold text-ink">Version history</h1>
      <p className="mt-2 max-w-3xl text-body text-ink-muted">
        Every import and restore is kept as a complete version. Restoring copies an older version into a new draft — nothing
        is deleted, and the live dictionary only changes when you publish.
      </p>

      {data === null ? (
        <p role="alert" className="mt-8 border border-dashed border-border bg-paper p-6 text-body text-ink">
          The Outcome Dictionary isn&apos;t set up yet (database migration 003).
        </p>
      ) : data.releases.length === 0 ? (
        <p className="mt-8 border border-dashed border-border bg-paper p-6 text-body text-ink-muted">No versions yet.</p>
      ) : (
        <>
          <form method="get" action="/admin/content/dictionary/compare" className="mt-6 flex flex-wrap items-end gap-3 text-sm">
            <label className="text-xs text-ink-muted">
              Compare version
              <select name="from" defaultValue={defaultFrom} className="mt-1 block border border-border bg-paper px-2 py-1.5 text-sm text-ink">
                {data.releases.map((r) => (
                  <option key={r.number} value={r.number}>
                    {r.number}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-ink-muted">
              with version
              <select name="to" defaultValue={data.releases[0].number} className="mt-1 block border border-border bg-paper px-2 py-1.5 text-sm text-ink">
                {data.releases.map((r) => (
                  <option key={r.number} value={r.number}>
                    {r.number}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-compact">
              Compare
            </button>
          </form>

          <div className="mt-6 overflow-x-auto border border-border">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead className="bg-paper-alt">
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3 font-semibold">Version</th>
                  <th scope="col" className="px-4 py-3 font-semibold">What happened</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Contents</th>
                  <th scope="col" className="px-4 py-3 font-semibold">By · when</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                  <th scope="col" className="px-4 py-3 font-semibold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {data.releases.map((release) => {
                  const isLive = release.number === data.state.published?.number;
                  const isDraft = release.number === data.state.draft?.number;
                  const languages = Object.keys(release.summary.languages);
                  return (
                    <tr key={release.number} className="border-b border-border bg-paper align-top last:border-b-0">
                      <td className="px-4 py-3 font-medium tabular-nums text-ink">{release.number}</td>
                      <td className="px-4 py-3 text-ink">
                        {releaseOrigin(release)}
                        {release.importMeta && release.importMeta.warnings > 0 && (
                          <span className="block text-xs text-ink-muted">
                            {release.importMeta.warnings} warning{release.importMeta.warnings === 1 ? "" : "s"} at import
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-ink-muted">
                        {release.summary.outcomes} outcomes · {release.summary.categories} categories · {release.summary.groups} groups
                        {languages.length > 0 && <span className="block">Translations: {languages.join(", ")}</span>}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {release.createdBy}
                        <span className="block text-xs text-ink-muted">{formatDateTime(release.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isLive ? (
                          <span className="border border-accent px-2 py-0.5 text-xs font-medium text-ink">Live now</span>
                        ) : isDraft ? (
                          <span className="border border-ink px-2 py-0.5 text-xs font-medium text-ink">Draft</span>
                        ) : release.publishedAt ? (
                          <span className="text-xs text-ink-muted">Published {formatDateTime(release.publishedAt)}</span>
                        ) : (
                          <span className="text-xs text-ink-muted">Never published</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-start justify-end gap-2">
                          <a
                            href={`/admin/preview/dictionary?dataset=${release.number}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-compact"
                          >
                            View<span className="sr-only"> version {release.number} (opens in a new tab)</span>
                          </a>
                          {!isLive && data.state.published && (
                            <Link
                              href={`/admin/content/dictionary/compare?from=${data.state.published.number}&to=${release.number}`}
                              className="btn btn-compact"
                            >
                              Compare with live
                            </Link>
                          )}
                          <a href={`/admin/content/dictionary/export?scope=all&release=${release.number}`} className="btn btn-compact">
                            Excel<span className="sr-only"> export of version {release.number}</span>
                          </a>
                          {/* Restoring the live version only makes sense to replace a pending draft. */}
                          {!isDraft && (!isLive || data.state.draft) && (
                            <ActionButton
                              action={{ kind: "restore", expectedVersion: data.state.version, releaseNumber: release.number }}
                              label="Restore"
                              pendingLabel="Restoring…"
                              srLabel={`version ${release.number}`}
                              confirm={`Copy version ${release.number} into a new draft?${data.state.draft ? " It replaces the current draft (which stays in the history)." : ""} The live dictionary won't change until you publish.`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
