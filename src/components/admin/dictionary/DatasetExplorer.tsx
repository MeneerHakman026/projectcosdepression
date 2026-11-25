"use client";

import { useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  EMPTY_FILTERS,
  EMPTY_LABEL,
  PAGE_SIZE,
  buildExplorer,
  filterRecords,
  matchedFields,
  needsAttention,
  pageCount,
  pageOf,
  queryTerms,
  type ExplorerDataset,
  type ExplorerFilters,
  type ExplorerRecord,
  type RecordNote,
} from "@/lib/dictionary/explorer";
import { languageName } from "@/lib/dictionary/languages";
import { COLUMNS, FIELD_LABELS, MASTER_LANGUAGE, type MasterField } from "@/lib/dictionary/model";
import { parseVerbatims } from "@/lib/dictionary/verbatims";
import ExactText from "./ExactText";

export type ExplorerState = ExplorerFilters & { language: string; page: number };

type DatasetExplorerProps = {
  dataset: ExplorerDataset;
  /** Participant-group abbreviations from the page text, to explain how Verbatims will display. */
  roleCodes: readonly string[];
  /** e.g. "Draft version 3 — not published". Repeated on the record view. */
  datasetLabel: string;
  datasetTone: "live" | "draft" | "other";
  /** Extra notes per record index, such as import warnings. */
  notes?: Record<number, RecordNote[]>;
  initial?: Partial<ExplorerState>;
  /** Mirror filters and the open record in the address bar (?q=…&record=V_01). */
  urlSync?: boolean;
  /** Show the Excel row column (import preview). */
  showRowNumbers?: boolean;
};

const TONE_STYLES = {
  live: "border-accent bg-accent-soft/20",
  draft: "border-amber-600 bg-amber-50",
  other: "border-border bg-paper-alt",
} as const;

const NOTE_STYLES: Record<RecordNote["level"], string> = {
  error: "border-red-700 bg-red-50 text-red-900",
  warning: "border-amber-600 bg-amber-50 text-amber-950",
  info: "border-border bg-paper-alt text-ink",
};

const LONG_FIELDS: MasterField[] = ["definition", "experience", "verbatims"];
const SHORT_FIELDS: MasterField[] = ["id", "category", "groupDomain", "outcomeDomain"];

/** The current address with some query parameters changed (null removes one). */
function urlWith(changes: Record<string, string | null>): string {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  }
  const search = params.toString();
  return `${window.location.pathname}${search ? `?${search}` : ""}`;
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString("en")} ${count === 1 ? one : many}`;
}

function labelOrEmpty(value: string) {
  return value.trim() === "" ? EMPTY_LABEL : value.replace(/\s+/g, " ").trim();
}

export default function DatasetExplorer({
  dataset,
  roleCodes,
  datasetLabel,
  datasetTone,
  notes,
  initial,
  urlSync = false,
  showRowNumbers = false,
}: DatasetExplorerProps) {
  const uid = useId();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState(initial?.language ?? MASTER_LANGUAGE);
  const [query, setQuery] = useState(initial?.query ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [group, setGroup] = useState(initial?.group ?? "");
  const [attention, setAttention] = useState(initial?.attention ?? false);
  const [page, setPage] = useState(initial?.page ?? 1);
  const [localSelected, setLocalSelected] = useState<number | null>(null);
  const [showInvisible, setShowInvisible] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const model = useMemo(() => buildExplorer(dataset, language, notes), [dataset, language, notes]);
  const filters: ExplorerFilters = { query: deferredQuery, category, group, attention };
  const filtered = useMemo(
    () => filterRecords(model, { query: deferredQuery, category, group, attention }),
    [model, deferredQuery, category, group, attention]
  );
  const terms = useMemo(() => queryTerms(deferredQuery), [deferredQuery]);
  const current = pageOf(filtered, page);
  const pages = pageCount(filtered.length);
  const categoryFacet = model.categories.find((c) => c.key === category);
  const groupOptions = categoryFacet ? categoryFacet.groups : model.categories.flatMap((c) => c.groups);
  const attentionCount = useMemo(() => model.records.filter(needsAttention).length, [model]);
  const filtering = filters.query.trim() !== "" || category !== "" || group !== "" || attention;

  // The open record: in the address bar on the data page (so Back works and
  // links can be shared), in component state in the import preview.
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    model.records.forEach((record) => {
      if (!map.has(record.id)) map.set(record.id, record.index);
    });
    return map;
  }, [model]);
  const urlRecord = urlSync ? searchParams.get("record") : null;
  const selectedIndex = urlSync ? (urlRecord ? (indexById.get(urlRecord) ?? null) : null) : localSelected;
  const selected = selectedIndex === null ? null : (model.records[selectedIndex] ?? null);

  // Keep filters in the address bar without adding history entries.
  useEffect(() => {
    if (!urlSync) return;
    const next = urlWith({
      q: deferredQuery.trim() || null,
      category: category || null,
      group: group || null,
      lang: language === MASTER_LANGUAGE ? null : language,
      attention: attention ? "1" : null,
      page: current.page > 1 ? String(current.page) : null,
    });
    if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, "", next);
  }, [urlSync, deferredQuery, category, group, language, attention, current.page]);

  const topRef = useRef<HTMLDivElement>(null);
  const detailHeadingRef = useRef<HTMLHeadingElement>(null);
  const lastOpened = useRef<number | null>(null);

  function open(record: ExplorerRecord) {
    lastOpened.current = record.index;
    if (urlSync) window.history.pushState(null, "", urlWith({ record: record.id }));
    else setLocalSelected(record.index);
  }

  function close() {
    if (urlSync) window.history.pushState(null, "", urlWith({ record: null }));
    else setLocalSelected(null);
  }

  // Move focus with the view: to the record heading when one opens, back to
  // its row when the list returns.
  useEffect(() => {
    if (selected) {
      detailHeadingRef.current?.focus({ preventScroll: true });
      topRef.current?.scrollIntoView({ block: "start" });
    } else if (lastOpened.current !== null) {
      document.getElementById(`${uid}-open-${lastOpened.current}`)?.focus();
    }
  }, [selected, uid]);

  function resetPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  // Previous/next follow the filtered list when the record is in it.
  const sequence = selected && filtered.some((r) => r.index === selected.index) ? filtered : model.records;
  const position = selected ? sequence.findIndex((r) => r.index === selected.index) : -1;

  return (
    <div ref={topRef} className="scroll-mt-6">
      {selected ? (
        <RecordView
          record={selected}
          language={model.language}
          terms={terms}
          roleCodes={roleCodes}
          datasetLabel={datasetLabel}
          datasetTone={datasetTone}
          showInvisible={showInvisible}
          onShowInvisible={setShowInvisible}
          headingRef={detailHeadingRef}
          position={position}
          total={sequence.length}
          inFiltered={sequence === filtered && filtering}
          onBack={close}
          onPrevious={position > 0 ? () => open(sequence[position - 1]) : undefined}
          onNext={position >= 0 && position < sequence.length - 1 ? () => open(sequence[position + 1]) : undefined}
        />
      ) : (
        <div>
          <div role="search" className="grid gap-4 border border-border bg-paper p-4 md:grid-cols-2 xl:grid-cols-[minmax(16rem,2fr)_1fr_1fr_auto]">
            <div className="md:col-span-2 xl:col-span-1">
              <label htmlFor={`${uid}-q`} className="block text-sm font-medium text-ink">
                Search all seven columns
              </label>
              <input
                id={`${uid}-q`}
                type="search"
                value={query}
                onChange={(event) => resetPage(setQuery)(event.target.value)}
                placeholder="Variable, name, definition, quotation…"
                autoComplete="off"
                className="mt-1 w-full border border-border bg-paper px-3 py-2 text-body text-ink"
              />
            </div>
            <div>
              <label htmlFor={`${uid}-category`} className="block text-sm font-medium text-ink">
                Category
              </label>
              <select
                id={`${uid}-category`}
                value={category}
                onChange={(event) => {
                  resetPage(setCategory)(event.target.value);
                  setGroup("");
                }}
                className="mt-1 w-full border border-border bg-paper px-2 py-2 text-sm text-ink"
              >
                <option value="">All categories ({model.categories.length})</option>
                {model.categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} ({c.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-group`} className="block text-sm font-medium text-ink">
                Group Domain
              </label>
              <select
                id={`${uid}-group`}
                value={group}
                onChange={(event) => resetPage(setGroup)(event.target.value)}
                className="mt-1 w-full border border-border bg-paper px-2 py-2 text-sm text-ink"
              >
                <option value="">All group domains ({groupOptions.length})</option>
                {groupOptions.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label} ({g.count})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${uid}-lang`} className="block text-sm font-medium text-ink">
                Language
              </label>
              <select
                id={`${uid}-lang`}
                value={model.language}
                onChange={(event) => {
                  resetPage(setLanguage)(event.target.value);
                  setCategory("");
                  setGroup("");
                }}
                disabled={model.languages.length === 1}
                className="mt-1 w-full border border-border bg-paper px-2 py-2 text-sm text-ink disabled:opacity-70"
              >
                {model.languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.code === MASTER_LANGUAGE ? `${l.name} (master)` : `${l.name} (${l.code})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-2 xl:col-span-4">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={attention}
                  onChange={(event) => resetPage(setAttention)(event.target.checked)}
                  className="accent-[var(--teal-deep)]"
                />
                Only records needing attention{" "}
                <span className="tabular-nums text-ink-muted">({attentionCount})</span>
              </label>
              {filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery(EMPTY_FILTERS.query);
                    setCategory("");
                    setGroup("");
                    setAttention(false);
                    setPage(1);
                  }}
                  className="text-sm font-semibold text-ink underline underline-offset-2"
                >
                  Clear search and filters
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-sm text-ink" role="status" aria-live="polite">
            {filtered.length === 0
              ? `No records match (${plural(model.records.length, "record")} in total).`
              : filtering
                ? `${plural(filtered.length, "record")} match, of ${model.records.length.toLocaleString("en")} in total.`
                : `${plural(model.records.length, "record")} in ${plural(model.categories.length, "category", "categories")} and ${plural(model.groupCount, "group domain")}.`}
            {filtered.length > PAGE_SIZE && ` Showing ${current.first}–${current.last}.`}
            {model.language !== MASTER_LANGUAGE && (
              <span className="text-ink-muted"> Showing the {languageName(model.language)} text; empty cells aren&apos;t translated yet.</span>
            )}
          </p>

          {filtered.length > 0 && (
            <div className="relative mt-3 overflow-x-auto border border-border">
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">
                  Records{filtering ? " matching the search and filters" : ""}, page {current.page} of {pages}. Choose a record to see all
                  seven columns.
                </caption>
                <thead className="bg-paper-alt">
                  <tr className="border-b border-border">
                    {showRowNumbers && (
                      <th scope="col" className="px-3 py-2 font-semibold">
                        Excel row
                      </th>
                    )}
                    <th scope="col" className="px-3 py-2 font-semibold">Variable</th>
                    <th scope="col" className="px-3 py-2 font-semibold">Outcome Domain</th>
                    <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">Category</th>
                    <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">Group Domain</th>
                    <th scope="col" className="hidden px-3 py-2 font-semibold lg:table-cell">Checks</th>
                  </tr>
                </thead>
                <tbody>
                  {current.items.map((record) => (
                    <RecordRow
                      key={record.index}
                      record={record}
                      uid={uid}
                      terms={terms}
                      showRowNumbers={showRowNumbers}
                      onOpen={() => open(record)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pages > 1 && (
            <nav aria-label="Pages" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <button
                type="button"
                className="btn btn-compact disabled:cursor-not-allowed disabled:opacity-40"
                disabled={current.page <= 1}
                onClick={() => setPage(current.page - 1)}
              >
                ‹ Previous page
              </button>
              <span className="tabular-nums text-ink">
                Page {current.page} of {pages}
              </span>
              <button
                type="button"
                className="btn btn-compact disabled:cursor-not-allowed disabled:opacity-40"
                disabled={current.page >= pages}
                onClick={() => setPage(current.page + 1)}
              >
                Next page ›
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}

function RecordRow({
  record,
  uid,
  terms,
  showRowNumbers,
  onOpen,
}: {
  record: ExplorerRecord;
  uid: string;
  terms: string[];
  showRowNumbers: boolean;
  onOpen: () => void;
}) {
  const found = matchedFields(record, terms);
  const problems = record.notes.filter((note) => note.level !== "info");
  const worst = problems.some((note) => note.level === "error") ? "error" : problems.length ? "warning" : null;
  return (
    <tr
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest("button")) onOpen();
      }}
      className="cursor-pointer border-b border-border bg-paper align-top last:border-b-0 hover:bg-paper-alt"
    >
      {showRowNumbers && <td className="px-3 py-2 tabular-nums text-ink-muted">{record.rowNumber ?? "—"}</td>}
      <td className="px-3 py-2">
        <button
          id={`${uid}-open-${record.index}`}
          type="button"
          onClick={onOpen}
          className="whitespace-nowrap font-mono text-sm font-semibold text-ink underline underline-offset-2"
        >
          {record.id.trim() || "(no ID)"}
          <span className="sr-only"> — open all seven columns</span>
        </button>
      </td>
      <td className="px-3 py-2 text-ink">
        {record.values.outcomeDomain.trim() ? (
          <ExactText text={record.values.outcomeDomain.trim()} terms={terms} />
        ) : (
          <span className="italic text-ink-muted">{record.english.outcomeDomain.trim() ? "Not translated" : "Empty"}</span>
        )}
        <span className="mt-0.5 block text-xs text-ink-muted md:hidden">
          {labelOrEmpty(record.values.category || record.english.category)} ›{" "}
          {labelOrEmpty(record.values.groupDomain || record.english.groupDomain)}
        </span>
        {found.length > 0 && (
          <span className="mt-0.5 block text-xs text-ink-muted">Found in: {found.map((field) => FIELD_LABELS[field]).join(", ")}</span>
        )}
        {worst && (
          <span className={`mt-1 inline-block border-l-4 px-2 text-xs lg:hidden ${NOTE_STYLES[worst]}`}>
            {plural(problems.length, "check")}
          </span>
        )}
      </td>
      <td className="hidden px-3 py-2 text-ink md:table-cell">
        <Label value={record.values.category} english={record.english.category} />
      </td>
      <td className="hidden px-3 py-2 text-ink md:table-cell">
        <Label value={record.values.groupDomain} english={record.english.groupDomain} />
      </td>
      <td className="hidden px-3 py-2 lg:table-cell">
        {record.notes.length === 0 ? (
          <span className="text-xs text-ink-muted">OK</span>
        ) : (
          <ul className="space-y-1">
            {record.notes.slice(0, 2).map((note, index) => (
              <li key={index} className={`max-w-xs border-l-4 px-2 text-xs ${NOTE_STYLES[note.level]}`}>
                {note.message}
              </li>
            ))}
            {record.notes.length > 2 && <li className="text-xs text-ink-muted">+{record.notes.length - 2} more</li>}
          </ul>
        )}
      </td>
    </tr>
  );
}

function Label({ value, english }: { value: string; english: string }) {
  if (value.trim()) return <>{value.replace(/\s+/g, " ").trim()}</>;
  if (english.trim()) return <span className="italic text-ink-muted">Not translated</span>;
  return <span className="italic text-red-800">{EMPTY_LABEL}</span>;
}

function stats(text: string): string {
  const characters = [...text].length;
  const lines = text === "" ? 0 : text.split(/\r\n|\r|\n/).length;
  const edges = [
    /^\s/.test(text) ? "starts with a space or line break" : null,
    /\s$/.test(text) ? "ends with a space or line break" : null,
  ].filter(Boolean);
  return [plural(characters, "character"), lines > 1 ? plural(lines, "line") : null, ...edges].filter(Boolean).join(" · ");
}

function RecordView({
  record,
  language,
  terms,
  roleCodes,
  datasetLabel,
  datasetTone,
  showInvisible,
  onShowInvisible,
  headingRef,
  position,
  total,
  inFiltered,
  onBack,
  onPrevious,
  onNext,
}: {
  record: ExplorerRecord;
  language: string;
  terms: string[];
  roleCodes: readonly string[];
  datasetLabel: string;
  datasetTone: "live" | "draft" | "other";
  showInvisible: boolean;
  onShowInvisible: (value: boolean) => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  position: number;
  total: number;
  inFiltered: boolean;
  onBack: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
}) {
  const isTranslation = language !== MASTER_LANGUAGE;
  const verbatims = record.values.verbatims;
  const parsed = verbatims.trim() ? parseVerbatims(verbatims, roleCodes) : null;
  const headingId = useId();

  return (
    <article aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onBack} className="btn btn-compact">
          ← Back to the list
        </button>
        <span className="text-sm tabular-nums text-ink-muted">
          Record {position + 1} of {total}
          {inFiltered ? " matching" : ""}
        </span>
        <span className="ml-auto flex gap-2">
          <button type="button" onClick={onPrevious} disabled={!onPrevious} className="btn btn-compact disabled:cursor-not-allowed disabled:opacity-40">
            ‹ Previous
          </button>
          <button type="button" onClick={onNext} disabled={!onNext} className="btn btn-compact disabled:cursor-not-allowed disabled:opacity-40">
            Next ›
          </button>
        </span>
      </div>

      <div className={`mt-4 border-l-4 px-4 py-2 text-sm text-ink ${TONE_STYLES[datasetTone]}`}>
        {datasetLabel}
        {isTranslation && ` · ${languageName(language)} (${language}), with the English master for reference`}
        {record.rowNumber !== null && ` · Excel row ${record.rowNumber}`}
      </div>

      <h2 id={headingId} ref={headingRef} tabIndex={-1} className="mt-5 text-subheading font-semibold text-ink outline-none">
        <span className="font-mono">{record.id.trim() || "(no ID)"}</span>
        {" — "}
        {(record.values.outcomeDomain || record.english.outcomeDomain).replace(/\s+/g, " ").trim() || EMPTY_LABEL}
      </h2>

      <label className="mt-3 flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={showInvisible}
          onChange={(event) => onShowInvisible(event.target.checked)}
          className="accent-[var(--teal-deep)]"
        />
        Show spaces (·) and line breaks (↵)
      </label>

      {record.notes.length > 0 && (
        <ul className="mt-4 space-y-1.5" aria-label="Checks for this record">
          {record.notes.map((note, index) => (
            <li key={index} className={`border-l-4 px-3 py-2 text-sm ${NOTE_STYLES[note.level]}`}>
              {note.message}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-sm text-ink-muted">
        All seven columns exactly as stored — nothing is shortened, trimmed or reformatted.
      </p>
      <dl className="mt-3 grid gap-px border border-border bg-border sm:grid-cols-2">
        {SHORT_FIELDS.map((field) => (
          <Field key={field} field={field} record={record} terms={terms} showInvisible={showInvisible} isTranslation={isTranslation} />
        ))}
      </dl>
      <dl className="mt-4 space-y-4">
        {LONG_FIELDS.map((field) => (
          <Field
            key={field}
            field={field}
            record={record}
            terms={terms}
            showInvisible={showInvisible}
            isTranslation={isTranslation}
            long
            footer={
              field === "verbatims" && parsed ? (
                <p className="mt-3 border-t border-border pt-2 text-xs text-ink-muted">
                  {parsed.kind === "attributed"
                    ? `On the website these quotations are grouped by participant: ${parsed.blocks.map((block) => block.role).join(", ")}.`
                    : "On the website these quotations are shown exactly as written, because not every line starts with a participant label such as “PwD:”."}
                </p>
              ) : null
            }
          />
        ))}
      </dl>
    </article>
  );
}

function Field({
  field,
  record,
  terms,
  showInvisible,
  isTranslation,
  long = false,
  footer,
}: {
  field: MasterField;
  record: ExplorerRecord;
  terms: string[];
  showInvisible: boolean;
  isTranslation: boolean;
  long?: boolean;
  footer?: ReactNode;
}) {
  const value = record.values[field];
  const english = record.english[field];
  const showEnglish = isTranslation && field !== "id";
  const column = COLUMNS.findIndex((c) => c.field === field) + 1;
  return (
    <div className={long ? "border border-border bg-paper" : "bg-paper"} data-field={field}>
      <dt className={`flex flex-wrap items-baseline justify-between gap-2 px-4 pt-3 text-sm font-semibold text-ink ${long ? "border-b border-border pb-2" : ""}`}>
        <span>
          {FIELD_LABELS[field]} <span className="font-normal text-ink-muted">· column {column}</span>
        </span>
        {value !== "" && <span className="text-xs font-normal text-ink-muted">{stats(value)}</span>}
      </dt>
      <dd className={`px-4 pb-3 ${long ? "pt-3 text-body leading-relaxed" : "pt-1 text-body"} text-ink`}>
        {value === "" ? (
          <span className={`italic ${!isTranslation && field !== "experience" && field !== "verbatims" ? "text-red-800" : "text-ink-muted"}`}>
            {isTranslation && field !== "id" ? "Not translated" : "Empty"}
          </span>
        ) : (
          <ExactText text={value} terms={terms} showInvisible={showInvisible} />
        )}
        {footer}
        {showEnglish && (
          <div className="mt-3 border-l-4 border-border bg-paper-alt px-3 py-2 text-sm text-ink">
            <p className="text-xs font-semibold text-ink-muted">English master</p>
            {english === "" ? <span className="italic text-ink-muted">Empty</span> : <ExactText text={english} terms={terms} showInvisible={showInvisible} />}
          </div>
        )}
      </dd>
    </div>
  );
}
