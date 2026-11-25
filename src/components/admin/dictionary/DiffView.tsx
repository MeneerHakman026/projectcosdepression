import type { ReactNode } from "react";
import type { DatasetDiff, FieldChange, ModifiedOutcome, OutcomeRef, ReviewAlert } from "@/lib/dictionary/diff";
import { languageName } from "@/lib/dictionary/languages";
import { FIELD_LABELS } from "@/lib/dictionary/model";
import { diffWords } from "@/lib/dictionary/word-diff";

/**
 * Renders a comparison of two complete dictionaries. No hooks, so it works
 * in the import preview (client) and the version comparison (server).
 * Expandable parts use <details>, which is keyboard- and screen-reader
 * accessible without any script.
 */

function Count({ label, before, after }: { label: string; before: number; after: number }) {
  const delta = after - before;
  return (
    <div className="border border-border bg-paper px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-subheading font-semibold tabular-nums text-ink">
        {before} <span className="text-ink-muted">→</span> {after}
      </p>
      <p className={`text-xs tabular-nums ${delta < 0 ? "text-red-700" : delta > 0 ? "text-accent" : "text-ink-muted"}`}>
        {delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta}`}
      </p>
    </div>
  );
}

export function Alerts({ alerts }: { alerts: ReviewAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <ul className="space-y-2">
      {alerts.map((alert, index) => (
        <li
          key={index}
          role={alert.tone === "danger" ? "alert" : undefined}
          className={`border-l-4 px-4 py-3 text-sm ${
            alert.tone === "danger" ? "border-red-700 bg-red-50 text-red-900" : "border-amber-600 bg-amber-50 text-amber-950"
          }`}
        >
          <span className="font-semibold">{alert.tone === "danger" ? "Check carefully: " : "Note: "}</span>
          {alert.message}
        </li>
      ))}
    </ul>
  );
}

function TextDiff({ change }: { change: FieldChange }) {
  const segments = diffWords(change.before, change.after);
  const visible = (text: string) => text.replace(/\n/g, "↵\n");
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Previous</p>
        <p className="mt-1 min-h-10 border border-border bg-paper px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-ink">
          {change.before === "" ? (
            <span className="italic text-ink-muted">(empty)</span>
          ) : (
            segments
              .filter((s) => s.type !== "added")
              .map((s, i) =>
                s.type === "removed" ? (
                  <del key={i} className="bg-red-100 text-red-900 decoration-red-700">
                    {change.whitespaceOnly ? visible(s.text) : s.text}
                  </del>
                ) : (
                  <span key={i}>{s.text}</span>
                )
              )
          )}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">New</p>
        <p className="mt-1 min-h-10 border border-border bg-paper px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-ink">
          {change.after === "" ? (
            <span className="italic text-ink-muted">(empty)</span>
          ) : (
            segments
              .filter((s) => s.type !== "removed")
              .map((s, i) =>
                s.type === "added" ? (
                  <ins key={i} className="bg-emerald-100 text-emerald-950 no-underline">
                    {change.whitespaceOnly ? visible(s.text) : s.text}
                  </ins>
                ) : (
                  <span key={i}>{s.text}</span>
                )
              )
          )}
        </p>
      </div>
    </div>
  );
}

function ModifiedList({ items }: { items: ModifiedOutcome[] }) {
  return (
    <ul className="divide-y divide-border border border-border bg-paper">
      {items.map((item) => (
        <li key={item.id}>
          <details className="group">
            <summary className="flex cursor-pointer flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-3 hover:bg-paper-alt">
              <span className="font-mono text-xs text-ink-muted">{item.id}</span>
              <span className="font-medium text-ink">{item.label}</span>
              <span className="text-xs text-ink-muted">
                {item.changes
                  .map((c) => `${FIELD_LABELS[c.field]}${c.whitespaceOnly ? " (spacing only)" : ""}`)
                  .join(", ")}
              </span>
              {item.changes.some((c) => c.field === "verbatims" && !c.whitespaceOnly) && (
                <span className="border border-amber-600 px-1.5 text-[0.7rem] font-semibold text-amber-900">Quotation changed</span>
              )}
            </summary>
            <div className="space-y-5 border-t border-border bg-paper-alt px-4 py-4">
              {item.changes.map((change) => (
                <div key={change.field}>
                  <p className="text-sm font-semibold text-ink">
                    {FIELD_LABELS[change.field]}
                    {change.whitespaceOnly && (
                      <span className="ml-2 text-xs font-normal text-ink-muted">Only spaces or line breaks changed (↵ marks a line break)</span>
                    )}
                  </p>
                  <div className="mt-2">
                    <TextDiff change={change} />
                  </div>
                </div>
              ))}
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function RefList({ items }: { items: OutcomeRef[] }) {
  return (
    <ul className="divide-y divide-border border border-border bg-paper text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-baseline gap-x-3 px-4 py-2">
          <span className="font-mono text-xs text-ink-muted">{item.id}</span>
          <span className="font-medium text-ink">{item.label}</span>
          {item.category && (
            <span className="text-xs text-ink-muted">
              {item.category} · {item.group}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Group({ title, count, tone, children, open }: { title: string; count: number; tone?: "danger"; children: ReactNode; open?: boolean }) {
  if (count === 0) return null;
  return (
    <details open={open} className="group">
      <summary className="cursor-pointer py-2 text-body font-semibold text-ink">
        {title}{" "}
        <span className={`ml-1 inline-block min-w-7 px-1.5 text-center text-sm tabular-nums ${tone === "danger" ? "bg-red-100 text-red-900" : "bg-accent-soft/50 text-ink"}`}>
          {count}
        </span>
      </summary>
      <div className="mt-2 mb-4">{children}</div>
    </details>
  );
}

export default function DiffView({ diff, beforeLabel = "Live", afterLabel = "New" }: { diff: DatasetDiff; beforeLabel?: string; afterLabel?: string }) {
  const { outcomes, categories, groups } = diff;
  const taxonomyChanged =
    categories.added.length + categories.removed.length + categories.renamed.length + groups.added.length + groups.removed.length + groups.renamed.length >
    0;
  const languages = [...new Set([...Object.keys(diff.before.languages), ...Object.keys(diff.after.languages)])];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-ink-muted">
          {beforeLabel} → {afterLabel}
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Count label="Outcomes" before={diff.before.outcomes} after={diff.after.outcomes} />
          <Count label="Categories" before={diff.before.categories} after={diff.after.categories} />
          <Count label="Group domains" before={diff.before.groups} after={diff.after.groups} />
          <Count label="Translations" before={Object.keys(diff.before.languages).length} after={Object.keys(diff.after.languages).length} />
        </div>
      </div>

      {diff.identical ? (
        <p className="border border-border bg-paper px-4 py-3 text-body text-ink">No differences — the two versions are identical.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
            <span>
              <strong className="tabular-nums">{outcomes.added.length}</strong> new
            </span>
            <span>
              <strong className="tabular-nums">{outcomes.modified.length}</strong> modified
            </span>
            <span className={outcomes.removed.length ? "text-red-800" : ""}>
              <strong className="tabular-nums">{outcomes.removed.length}</strong> removed
            </span>
            <span>
              <strong className="tabular-nums">{outcomes.unchanged}</strong> unchanged
            </span>
            {outcomes.orderChanged && <span className="text-ink-muted">The order of outcomes changed.</span>}
          </div>

          {taxonomyChanged && (
            <div className="border border-border bg-paper px-4 py-3 text-sm">
              <p className="font-semibold text-ink">Category and group changes</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink">
                {categories.renamed.map((r) => (
                  <li key={`cr-${r.from}`}>
                    Category renamed: “{r.from}” → “{r.to}”
                  </li>
                ))}
                {categories.added.map((c) => (
                  <li key={`ca-${c}`}>New category: “{c}”</li>
                ))}
                {categories.removed.map((c) => (
                  <li key={`cx-${c}`} className="text-red-800">
                    Category removed: “{c}”
                  </li>
                ))}
                {groups.renamed.map((r) => (
                  <li key={`gr-${r.category}-${r.from}`}>
                    Group domain renamed in {r.category}: “{r.from}” → “{r.to}”
                  </li>
                ))}
                {groups.added.map((g) => (
                  <li key={`ga-${g.category}-${g.group}`}>
                    New group domain in {g.category}: “{g.group}”
                  </li>
                ))}
                {groups.removed.map((g) => (
                  <li key={`gx-${g.category}-${g.group}`} className="text-red-800">
                    Group domain removed from {g.category}: “{g.group}”
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="divide-y divide-border border-y border-border">
            <Group title="Removed outcomes" count={outcomes.removed.length} tone="danger" open>
              <RefList items={outcomes.removed} />
            </Group>
            <Group title="New outcomes" count={outcomes.added.length}>
              <RefList items={outcomes.added} />
            </Group>
            <Group title="Modified outcomes" count={outcomes.modified.length} open={outcomes.modified.length <= 10}>
              <p className="mb-2 text-xs text-ink-muted">Open an outcome to compare each changed field word by word.</p>
              <ModifiedList items={outcomes.modified} />
            </Group>
          </div>

          {diff.translations.filter((t) => t.status !== "unchanged").length > 0 && (
            <div>
              <h3 className="text-body font-semibold text-ink">Translations</h3>
              <div className="mt-2 divide-y divide-border border-y border-border">
                {diff.translations
                  .filter((t) => t.status !== "unchanged")
                  .map((t) => (
                    <details key={t.language} className="py-2">
                      <summary className="cursor-pointer text-sm text-ink">
                        <span className="font-semibold">
                          {languageName(t.language)} ({t.language})
                        </span>{" "}
                        —{" "}
                        {t.status === "added"
                          ? `new translation, ${t.after} outcomes`
                          : t.status === "removed"
                            ? `removed (${t.before} outcomes)`
                            : `${t.added.length} new, ${t.modified.length} modified, ${t.removed.length} removed, ${t.labelChanges.length} category/group name changes`}
                      </summary>
                      <div className="mt-3 space-y-3 pb-2">
                        {t.labelChanges.length > 0 && (
                          <ul className="list-disc pl-5 text-sm text-ink">
                            {t.labelChanges.map((l, i) => (
                              <li key={i}>
                                {l.kind === "category" ? "Category" : "Group domain"} “{l.english}”: {l.before ? `“${l.before}”` : "(none)"} →{" "}
                                {l.after ? `“${l.after}”` : "(none)"}
                              </li>
                            ))}
                          </ul>
                        )}
                        {t.removed.length > 0 && t.status !== "removed" && (
                          <>
                            <p className="text-sm font-semibold text-red-800">Removed translations</p>
                            <RefList items={t.removed} />
                          </>
                        )}
                        {t.added.length > 0 && t.status !== "added" && (
                          <>
                            <p className="text-sm font-semibold text-ink">New translations</p>
                            <RefList items={t.added} />
                          </>
                        )}
                        {t.modified.length > 0 && <ModifiedList items={t.modified} />}
                      </div>
                    </details>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
      {languages.length === 0 && <p className="text-xs text-ink-muted">No translations in either version.</p>}
    </div>
  );
}
