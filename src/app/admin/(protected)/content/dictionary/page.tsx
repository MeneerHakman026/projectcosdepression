import type { Metadata } from "next";
import Link from "next/link";
import ActionButton from "@/components/admin/dictionary/ActionButton";
import { formatDateTime } from "@/lib/admin/format";
import { languageCompleteness, type LanguageCompleteness } from "@/lib/dictionary/content";
import { diffContents } from "@/lib/dictionary/diff";
import { releaseOrigin } from "@/lib/dictionary/labels";
import { languageName } from "@/lib/dictionary/languages";
import { emptyContent, type ContentSummary, type DictionaryContent } from "@/lib/dictionary/model";
import { dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError, type DictionaryState } from "@/lib/dictionary/service";

export const metadata: Metadata = { title: "Outcome Dictionary" };

function Stats({ summary }: { summary: ContentSummary }) {
  const items = [
    ["Outcomes", summary.outcomes],
    ["Categories", summary.categories],
    ["Group domains", summary.groups],
    ["Languages", 1 + Object.keys(summary.languages).length],
  ] as const;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="border border-border bg-paper-alt px-3 py-2">
          <dt className="text-xs text-ink-muted">{label}</dt>
          <dd className="text-subheading font-semibold tabular-nums text-ink">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function percent(part: number, total: number) {
  return total === 0 ? "—" : `${Math.round((part / total) * 100)}%`;
}

function CompletenessTable({ rows, version, canRemove }: { rows: LanguageCompleteness[]; version: number; canRemove: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto border border-border">
      <table className="w-full min-w-[820px] border-collapse text-left text-sm">
        <thead className="bg-paper-alt">
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2 font-semibold">Language</th>
            <th scope="col" className="px-4 py-2 font-semibold">Outcomes translated</th>
            <th scope="col" className="px-4 py-2 font-semibold">Fully translated</th>
            <th scope="col" className="px-4 py-2 font-semibold">Name · Definition · Experience · Verbatims</th>
            <th scope="col" className="px-4 py-2 font-semibold">Category / group names</th>
            <th scope="col" className="px-4 py-2 font-semibold">Possibly outdated</th>
            <th scope="col" className="px-4 py-2 font-semibold"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.language} className="border-b border-border bg-paper last:border-b-0">
              <td className="px-4 py-2 font-medium text-ink">
                {languageName(row.language)} <span className="font-mono text-xs text-ink-muted">{row.language}</span>
              </td>
              <td className="px-4 py-2 tabular-nums">
                <span className="font-semibold">{row.translated}</span> / {row.total}{" "}
                <span className="text-ink-muted">({percent(row.translated, row.total)})</span>
                <span aria-hidden="true" className="mt-1 block h-1 w-28 bg-border">
                  <span className="block h-full bg-teal" style={{ width: percent(row.translated, row.total) }} />
                </span>
              </td>
              <td className="px-4 py-2 tabular-nums">{row.complete}</td>
              <td className="px-4 py-2 tabular-nums text-ink-muted">
                {row.fields.outcomeDomain} · {row.fields.definition} · {row.fields.experience} · {row.fields.verbatims}
              </td>
              <td className="px-4 py-2 tabular-nums text-ink-muted">
                {row.categoryLabels.translated}/{row.categoryLabels.total} · {row.groupLabels.translated}/{row.groupLabels.total}
              </td>
              <td className={`px-4 py-2 tabular-nums ${row.outdated ? "font-semibold text-amber-800" : "text-ink-muted"}`}>
                {row.outdated}
              </td>
              <td className="px-4 py-2 text-right">
                {canRemove && (
                  <ActionButton
                    action={{ kind: "removeLanguage", expectedVersion: version, language: row.language }}
                    label="Remove"
                    pendingLabel="Removing…"
                    variant="quiet"
                    srLabel={languageName(row.language)}
                    confirm={`Create a new draft without the ${languageName(row.language)} translation? It stays in earlier versions and nothing changes publicly until you publish.`}
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function noticeFrom(params: Record<string, string | string[] | undefined>): string | null {
  const get = (key: string) => {
    const value = params[key];
    return typeof value === "string" && /^[A-Za-z0-9-]{1,20}$/.test(value) ? value : null;
  };
  if (get("published")) return `Published. The live dictionary now shows version ${get("published")}.`;
  if (get("restored")) return `Version ${get("restored")} was copied into a new draft (version ${get("draft")}). Preview it, then publish.`;
  if (get("discarded")) return `Draft version ${get("discarded")} was discarded. It's still listed in the version history.`;
  if (get("removed")) return `A new draft without ${languageName(get("removed")!)} was created (version ${get("draft")}). Publish it to apply.`;
  return null;
}

export default async function DictionaryAdminPage({ searchParams }: PageProps<"/admin/content/dictionary">) {
  const notice = noticeFrom(await searchParams);
  let state: DictionaryState | null = null;
  let draftContent: DictionaryContent | null = null;
  let liveContent: DictionaryContent | null = null;
  try {
    state = await dictionary.getState();
    const [draft, live] = await Promise.all([
      state.draft ? dictionary.getRelease(state.draft.number) : null,
      state.published ? dictionary.getRelease(state.published.number) : null,
    ]);
    draftContent = draft?.content ?? null;
    liveContent = live?.content ?? null;
  } catch (error) {
    if (!(error instanceof DictionaryNotInstalledError)) throw error;
  }

  const current = draftContent ?? liveContent;
  const draftDiff = draftContent ? diffContents(liveContent ?? emptyContent(), draftContent) : null;
  const completeness = current ? Object.keys(current.translations).sort().map((code) => languageCompleteness(current, code)) : [];
  const exportVersions = [
    ...(state?.published ? [{ value: "live", label: `Live (version ${state.published.number})` }] : []),
    ...(state?.draft ? [{ value: "draft", label: `Draft (version ${state.draft.number}, unpublished)` }] : []),
  ];
  const exportLanguages = current ? ["en", ...Object.keys(current.translations).sort()] : [];

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/content" className="text-ink-muted underline underline-offset-2 hover:text-ink">
          ← Content
        </Link>
      </p>
      <h1 className="mt-2 text-heading font-semibold text-ink">Outcome Dictionary</h1>
      <p className="mt-2 max-w-3xl text-body text-ink-muted">
        The dictionary is maintained in Excel. Import a workbook, review the changes, save it as a draft, preview it, then
        publish. Each import replaces the whole English master or one whole translation — the website never edits entries one
        by one, so the workbook stays the single source of truth.
      </p>

      {notice && (
        <p role="status" className="mt-6 border-l-4 border-accent bg-accent-soft/30 px-4 py-3 text-body text-ink">
          {notice}
        </p>
      )}

      {state === null ? (
        <div role="alert" className="mt-8 border border-dashed border-border bg-paper p-6">
          <p className="text-body font-semibold text-ink">The Outcome Dictionary isn&apos;t set up yet</p>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            A developer needs to apply <code className="font-mono">db/migrations/003_create_dictionary.sql</code>. The public
            dictionary page says it&apos;s being prepared until then.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/admin/content/dictionary/import" className="btn btn-primary">
              Import Excel
            </Link>
            <Link href="/admin/content/dictionary/history" className="btn">
              Version history
            </Link>
            <Link href="/admin/content/pages/dictionary" className="btn">
              Edit page text
            </Link>
            <a href="/dictionary" target="_blank" rel="noopener noreferrer" className="btn">
              View live page<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <section aria-labelledby="live-heading" className="border border-border bg-paper p-5">
              <h2 id="live-heading" className="text-body font-semibold text-ink">
                Live on the website
              </h2>
              {state.published ? (
                <>
                  <p className="mt-1 text-sm text-ink-muted">
                    Version {state.published.number} · published {formatDateTime(state.published.publishedAt)} by{" "}
                    {state.published.publishedBy}
                  </p>
                  <p className="text-xs text-ink-muted">{releaseOrigin(state.published)}</p>
                  <Stats summary={state.published.summary} />
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  Nothing published yet. The public page says the dictionary is being prepared.
                </p>
              )}
            </section>

            <section
              aria-labelledby="draft-heading"
              className={`border p-5 ${state.draft ? "border-accent bg-accent-soft/10" : "border-border bg-paper"}`}
            >
              <h2 id="draft-heading" className="text-body font-semibold text-ink">
                Draft — not public
              </h2>
              {state.draft ? (
                <>
                  <p className="mt-1 text-sm text-ink-muted">
                    Version {state.draft.number} · saved {formatDateTime(state.draft.createdAt)} by {state.draft.createdBy}
                  </p>
                  <p className="text-xs text-ink-muted">{releaseOrigin(state.draft)}</p>
                  <Stats summary={state.draft.summary} />
                  {draftDiff && (
                    <p className="mt-3 text-sm text-ink">
                      Compared with live: {draftDiff.outcomes.added.length} new, {draftDiff.outcomes.modified.length} modified,{" "}
                      {draftDiff.outcomes.removed.length} removed
                      {draftDiff.translations.filter((t) => t.status !== "unchanged").length > 0 &&
                        `, translation changes in ${draftDiff.translations
                          .filter((t) => t.status !== "unchanged")
                          .map((t) => t.language)
                          .join(", ")}`}
                      .{" "}
                      <Link
                        href={`/admin/content/dictionary/compare?from=${state.published?.number ?? 0}&to=${state.draft.number}`}
                        className="font-semibold text-accent underline underline-offset-2"
                      >
                        See all changes
                      </Link>
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap items-start gap-3">
                    <a href="/admin/preview/dictionary?dataset=draft" target="_blank" rel="noopener noreferrer" className="btn">
                      Preview draft<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                    <ActionButton
                      action={{ kind: "publish", expectedVersion: state.version, draftNumber: state.draft.number }}
                      label="Publish draft"
                      pendingLabel="Publishing…"
                      variant="primary"
                      confirm={`Publish draft version ${state.draft.number} (${state.draft.summary.outcomes} outcomes) to the live website? The current live version stays in the history and can be restored.`}
                    />
                    <ActionButton
                      action={{ kind: "discard", expectedVersion: state.version, draftNumber: state.draft.number }}
                      label="Discard draft"
                      pendingLabel="Discarding…"
                      variant="quiet"
                      confirm="Discard this draft? It stays in the version history, but it will no longer be the draft."
                    />
                  </div>
                </>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">
                  No unpublished draft. Import a workbook or restore an earlier version to create one.
                </p>
              )}
            </section>
          </div>

          <section aria-labelledby="languages-heading" className="mt-10">
            <h2 id="languages-heading" className="text-subheading font-semibold text-ink">
              Translation completeness
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-muted">
              For the {state.draft ? "draft" : "live version"}. English is the master and is always complete. “Possibly
              outdated” counts translations whose English text changed after they were imported. Missing translations show
              in English on the website, clearly marked.
            </p>
            {completeness.length === 0 ? (
              <p className="mt-4 border border-dashed border-border bg-paper p-4 text-sm text-ink-muted">
                No translations yet. Download a translation template below, fill it in, and import it.
              </p>
            ) : (
              <CompletenessTable rows={completeness} version={state.version} canRemove />
            )}
          </section>

          <section aria-labelledby="export-heading" className="mt-10">
            <h2 id="export-heading" className="text-subheading font-semibold text-ink">
              Export to Excel
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-ink-muted">
              Exported workbooks can be edited and imported again without losing anything. Text is exported exactly as stored;
              cells are formatted as text so nothing is ever run as a formula.
            </p>
            {exportVersions.length === 0 ? (
              <p className="mt-4 border border-dashed border-border bg-paper p-4 text-sm text-ink-muted">
                Nothing to export yet.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {[
                  { scope: "master", title: "English master", text: "The seven source columns, one row per outcome." },
                  { scope: "all", title: "All languages", text: "One sheet per language: en, then each translation." },
                ].map((item) => (
                  <form key={item.scope} method="get" action="/admin/content/dictionary/export" className="border border-border bg-paper p-4">
                    <input type="hidden" name="scope" value={item.scope} />
                    <p className="font-semibold text-ink">{item.title}</p>
                    <p className="text-sm text-ink-muted">{item.text}</p>
                    <div className="mt-3 flex flex-wrap items-end gap-3">
                      <label className="text-xs text-ink-muted">
                        Version
                        <select name="release" className="mt-1 block border border-border bg-paper px-2 py-1.5 text-sm text-ink">
                          {exportVersions.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button type="submit" className="btn btn-compact">
                        Download .xlsx
                      </button>
                    </div>
                  </form>
                ))}
                <form method="get" action="/admin/content/dictionary/export" className="border border-border bg-paper p-4">
                  <input type="hidden" name="scope" value="language" />
                  <p className="font-semibold text-ink">One language</p>
                  <p className="text-sm text-ink-muted">A translation with the English text alongside for reference.</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="text-xs text-ink-muted">
                      Language
                      <select name="lang" className="mt-1 block border border-border bg-paper px-2 py-1.5 text-sm text-ink">
                        {exportLanguages.map((code) => (
                          <option key={code} value={code}>
                            {languageName(code)} ({code})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-xs text-ink-muted">
                      Version
                      <select name="release" className="mt-1 block border border-border bg-paper px-2 py-1.5 text-sm text-ink">
                        {exportVersions.map((v) => (
                          <option key={v.value} value={v.value}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="btn btn-compact">
                      Download .xlsx
                    </button>
                  </div>
                </form>
                <form method="get" action="/admin/content/dictionary/export" className="border border-border bg-paper p-4">
                  <input type="hidden" name="scope" value="template" />
                  <input type="hidden" name="release" value={state.published ? "live" : "draft"} />
                  <p className="font-semibold text-ink">Empty translation template</p>
                  <p className="text-sm text-ink-muted">Every outcome ID with the English text for reference, and empty columns to translate.</p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <label className="text-xs text-ink-muted">
                      Language code
                      <input
                        name="lang"
                        required
                        pattern="[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*"
                        placeholder="fr"
                        className="mt-1 block w-24 border border-border bg-paper px-2 py-1.5 text-sm text-ink"
                      />
                    </label>
                    <button type="submit" className="btn btn-compact">
                      Download template
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
