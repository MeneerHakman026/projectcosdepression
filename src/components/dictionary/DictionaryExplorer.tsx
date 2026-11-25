"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { ParticipantRole } from "@/content/dictionary/schema";
import { FIELD_LABELS, type TextField } from "@/lib/dictionary/model";
import { buildSearchIndex, highlightRanges, search, snippet } from "@/lib/dictionary/search";
import type { DictionaryView, ViewOutcome } from "@/lib/dictionary/view";
import CategoryExplorer from "./CategoryExplorer";
import Highlighted from "./Highlighted";
import OutcomeDetail, { type NeighbourLink } from "./OutcomeDetail";

export type SortChoice = "auto" | "source" | "alpha";

export type ExplorerFilters = {
  q: string;
  category: string | null;
  group: string | null;
  sort: SortChoice;
  translatedOnly: boolean;
};

export type ExplorerTexts = {
  explorerHeading: string;
  verbatimsHeading: string;
  verbatimsNote: string;
  roles: ParticipantRole[];
};

type DictionaryExplorerProps = {
  view: DictionaryView;
  texts: ExplorerTexts;
  /** "/dictionary" publicly; the preview route in the admin. */
  basePath: string;
  /** "path": outcomes at basePath/ID (public). "query": ?outcome=ID (preview). */
  urlMode: "path" | "query";
  /** Query parameters to keep on every URL (e.g. the preview's version). */
  preserve?: Record<string, string>;
  initialFilters: ExplorerFilters;
};

const RESULT_FIELDS: TextField[] = ["definition", "experience", "verbatims"];

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export default function DictionaryExplorer({ view, texts, basePath, urlMode, preserve, initialFilters }: DictionaryExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { outcomes, categories } = view;
  const isTranslation = view.language !== view.masterLanguage;

  const categoryBySlug = useMemo(() => new Map(categories.map((c) => [c.slug, c])), [categories]);
  const groupBySlug = useMemo(
    () => new Map(categories.flatMap((c) => c.groups.map((g) => [g.slug, { ...g, categoryKey: c.key }] as const))),
    [categories]
  );
  const categoryByKey = useMemo(() => new Map(categories.map((c) => [c.key, c])), [categories]);
  const groupByKey = useMemo(() => new Map(categories.flatMap((c) => c.groups.map((g) => [g.key, g] as const))), [categories]);
  const outcomeById = useMemo(() => new Map(outcomes.map((o) => [o.id, o])), [outcomes]);

  const initialGroup = initialFilters.group ? groupBySlug.get(initialFilters.group) : undefined;
  const [query, setQuery] = useState(initialFilters.q);
  const [categoryKey, setCategoryKey] = useState<string | null>(
    initialGroup?.categoryKey ?? (initialFilters.category ? categoryBySlug.get(initialFilters.category)?.key ?? null : null)
  );
  const [groupKey, setGroupKey] = useState<string | null>(initialGroup?.key ?? null);
  const [sort, setSort] = useState<SortChoice>(initialFilters.sort);
  const [translatedOnly, setTranslatedOnly] = useState(isTranslation && initialFilters.translatedOnly);
  const deferredQuery = useDeferredValue(query);

  // The selected outcome lives in the URL, so links are permanent and the
  // browser's back button moves between the list and an outcome.
  const selectedId = useMemo(() => {
    let raw: string | null = null;
    if (urlMode === "query") raw = searchParams.get("outcome");
    else if (pathname.startsWith(`${basePath}/`)) raw = decodeURIComponent(pathname.slice(basePath.length + 1).split("/")[0]);
    return raw && outcomeById.has(raw) ? raw : null;
  }, [urlMode, searchParams, pathname, basePath, outcomeById]);
  const selected = selectedId ? outcomeById.get(selectedId)! : null;

  const index = useMemo(() => buildSearchIndex(outcomes), [outcomes]);
  const result = useMemo(() => search(index, deferredQuery), [index, deferredQuery]);
  const highlight = result?.highlight ?? null;
  const searching = result !== null;

  // Counts for the category explorer: matches for the search (and
  // translated-only toggle), ignoring the category/group filter itself.
  const matching = useMemo(() => {
    const counts = new Map<string, number>();
    for (const outcome of outcomes) {
      if (result && !result.hits.has(outcome.id)) continue;
      if (translatedOnly && !outcome.translated) continue;
      counts.set(outcome.categoryKey, (counts.get(outcome.categoryKey) ?? 0) + 1);
      counts.set(outcome.groupKey, (counts.get(outcome.groupKey) ?? 0) + 1);
    }
    return counts;
  }, [outcomes, result, translatedOnly]);

  const effectiveSort = sort === "auto" ? (searching ? "relevance" : "source") : sort;
  const collator = useMemo(() => new Intl.Collator(view.language, { sensitivity: "base", numeric: true }), [view.language]);
  const results = useMemo(() => {
    const filtered = outcomes.filter(
      (o) =>
        (!categoryKey || o.categoryKey === categoryKey) &&
        (!groupKey || o.groupKey === groupKey) &&
        (!translatedOnly || o.translated) &&
        (!result || result.hits.has(o.id))
    );
    if (effectiveSort === "alpha") return [...filtered].sort((a, b) => collator.compare(a.outcomeDomain.text, b.outcomeDomain.text));
    if (effectiveSort === "relevance" && result) {
      return [...filtered].sort((a, b) => result.hits.get(b.id)!.score - result.hits.get(a.id)!.score || a.position - b.position);
    }
    return filtered;
  }, [outcomes, categoryKey, groupKey, translatedOnly, result, effectiveSort, collator]);

  const filtersActive = query.trim() !== "" || categoryKey !== null || groupKey !== null || translatedOnly;

  // ---- URLs -------------------------------------------------------------

  const filterParams = useMemo(() => {
    const params = new URLSearchParams(preserve);
    if (isTranslation) params.set("lang", view.language);
    if (query.trim()) params.set("q", query.trim());
    if (groupKey) params.set("group", groupByKey.get(groupKey)!.slug);
    else if (categoryKey) params.set("category", categoryByKey.get(categoryKey)!.slug);
    if (sort !== "auto") params.set("sort", sort);
    if (translatedOnly) params.set("translated", "1");
    return params;
  }, [preserve, isTranslation, view.language, query, groupKey, categoryKey, sort, translatedOnly, groupByKey, categoryByKey]);

  function hrefFor(id: string | null, params: URLSearchParams = filterParams): string {
    const next = new URLSearchParams(params);
    if (urlMode === "query" && id) next.set("outcome", id);
    const path = urlMode === "path" && id ? `${basePath}/${encodeURIComponent(id)}` : basePath;
    const search = next.toString();
    return search ? `${path}?${search}` : path;
  }

  /** The permanent link to share: the outcome (and language) only, no filters. */
  function shareUrlFor(id: string): string {
    const params = new URLSearchParams(urlMode === "query" ? preserve : undefined);
    if (isTranslation) params.set("lang", view.language);
    const path = hrefFor(id, params);
    return typeof window === "undefined" ? path : new URL(path, window.location.origin).toString();
  }

  // Mirror the filters into the address bar (without a navigation), so a
  // reload or a shared list link keeps them.
  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = hrefFor(selectedId);
      if (next !== `${window.location.pathname}${window.location.search}`) {
        window.history.replaceState(null, "", next);
      }
    }, 250);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hrefFor only depends on these
  }, [filterParams, selectedId]);

  // ---- Selection, focus and scrolling -------------------------------------

  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailPaneRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const focusAfterSelect = useRef(false);
  const openedFromList = useRef(false);
  const lastSelected = useRef<string | null>(null);

  function select(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (isModifiedClick(event)) return; // let "open in new tab" work normally
    event.preventDefault();
    if (id === selectedId) return;
    openedFromList.current = selectedId === null;
    focusAfterSelect.current = true;
    window.history.pushState(null, "", hrefFor(id));
  }

  function backToResults(event: MouseEvent<HTMLAnchorElement>) {
    if (isModifiedClick(event)) return;
    event.preventDefault();
    if (openedFromList.current) window.history.back();
    else window.history.pushState(null, "", hrefFor(null));
  }

  useEffect(() => {
    if (selectedId) {
      lastSelected.current = selectedId;
      if (!focusAfterSelect.current) return;
      focusAfterSelect.current = false;
      const narrow = window.matchMedia("(max-width: 1023px)").matches;
      if (narrow) {
        workspaceRef.current?.scrollIntoView({ block: "start" });
        headingRef.current?.focus({ preventScroll: true });
      } else {
        detailPaneRef.current?.scrollTo({ top: 0 });
      }
    } else if (lastSelected.current) {
      // Returning to the list: put focus back on the outcome that was open.
      const link = document.getElementById(`result-${lastSelected.current}`);
      if (link && window.matchMedia("(max-width: 1023px)").matches) {
        link.focus({ preventScroll: true });
        link.scrollIntoView({ block: "center" });
      }
    }
  }, [selectedId]);

  function chooseCategory(nextCategory: string | null, nextGroup: string | null) {
    setCategoryKey(nextCategory);
    setGroupKey(nextGroup);
  }

  function resetFilters() {
    setQuery("");
    setCategoryKey(null);
    setGroupKey(null);
    setTranslatedOnly(false);
    setSort("auto");
  }

  function changeLanguage(language: string) {
    const params = new URLSearchParams(filterParams);
    params.delete("translated");
    if (language === view.masterLanguage) params.delete("lang");
    else params.set("lang", language);
    router.push(hrefFor(selectedId, params), { scroll: false });
  }

  // ---- Navigation between outcomes ----------------------------------------

  const sequence = selected && results.some((o) => o.id === selected.id) ? results : outcomes;
  const position = selected ? sequence.findIndex((o) => o.id === selected.id) : -1;
  const neighbour = (outcome: ViewOutcome | undefined): NeighbourLink =>
    outcome ? { id: outcome.id, title: outcome.outcomeDomain.text, href: hrefFor(outcome.id) } : null;

  // ---- Rendering ------------------------------------------------------------

  const groupOptions = categoryKey ? categoryByKey.get(categoryKey)?.groups ?? [] : [];
  const statusText = searching
    ? `${plural(results.length, "outcome")} found`
    : filtersActive
      ? `${plural(results.length, "outcome")} shown`
      : `${plural(results.length, "outcome")}`;

  const showGroupHeadings = effectiveSort === "source";

  return (
    <div>
      {/* Search and language */}
      <div className="mx-auto max-w-wide px-gutter">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div>
            <label htmlFor="dictionary-search" className="block text-sm font-semibold text-ink">
              Search the dictionary
            </label>
            <div className="relative mt-2">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="8.5" cy="8.5" r="5.75" />
                <path d="m13 13 4.5 4.5" strokeLinecap="round" />
              </svg>
              <input
                id="dictionary-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search outcomes, definitions, experiences and quotations"
                autoComplete="off"
                spellCheck={false}
                aria-describedby="dictionary-search-help dictionary-status"
                className="w-full border border-ink/70 bg-paper py-3.5 pl-12 pr-4 text-body text-ink placeholder:text-ink-muted/80 focus:border-accent focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              />
            </div>
            <p id="dictionary-search-help" className="mt-2 text-xs text-ink-muted">
              Matches any part of a word, ignores accents and capitals, and allows for small typos. All words must match.
            </p>
          </div>
          {view.languages.length > 1 && (
            <div>
              <label htmlFor="dictionary-language" className="block text-sm font-semibold text-ink">
                Language
              </label>
              <select
                id="dictionary-language"
                value={view.language}
                onChange={(event) => changeLanguage(event.target.value)}
                className="mt-2 w-full border border-ink/70 bg-paper px-3 py-3.5 text-body text-ink lg:w-80"
              >
                {view.languages.map((language) => {
                  const native = language.nativeName.charAt(0).toLocaleUpperCase(language.code) + language.nativeName.slice(1);
                  return (
                    <option key={language.code} value={language.code}>
                      {native === language.name ? native : `${native} (${language.name})`}
                      {language.code !== view.masterLanguage ? ` · ${language.translated}/${view.totals.outcomes} translated` : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        {isTranslation && (
          <p className="mt-4 border-l-4 border-accent bg-paper-alt px-4 py-3 text-sm text-ink">
            Showing the {view.languageName} translation where available. Anything not yet translated is shown in English
            and marked <span className="border border-dashed border-ink-muted/50 px-1 text-xs font-semibold">EN</span>.
          </p>
        )}
      </div>

      {/* Category explorer */}
      <div className="mx-auto mt-10 max-w-wide px-gutter">
        <CategoryExplorer
          heading={texts.explorerHeading}
          categories={categories}
          matching={matching}
          searching={searching || translatedOnly}
          categoryKey={categoryKey}
          groupKey={groupKey}
          languageName={view.languageName}
          onSelect={chooseCategory}
        />
      </div>

      {/* Results and details */}
      <div ref={workspaceRef} className="mx-auto mt-10 max-w-wide scroll-mt-24 border-t border-border px-gutter pt-8">
        <div className="grid gap-x-10 lg:grid-cols-[minmax(19rem,25rem)_minmax(0,1fr)] xl:gap-x-14">
          {/* Results */}
          <div className={selected ? "hidden lg:block" : ""}>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="dictionary-category" className="block text-xs font-semibold text-ink-muted">
                  Category
                </label>
                <select
                  id="dictionary-category"
                  value={categoryKey ?? ""}
                  onChange={(event) => chooseCategory(event.target.value || null, null)}
                  className="mt-1 w-full border border-border bg-paper px-2 py-2 text-sm text-ink"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.key} value={category.key}>
                      {category.label.text}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dictionary-group" className="block text-xs font-semibold text-ink-muted">
                  Group domain
                </label>
                <select
                  id="dictionary-group"
                  value={groupKey ?? ""}
                  onChange={(event) => {
                    const key = event.target.value || null;
                    const owner = key ? categories.find((c) => c.groups.some((g) => g.key === key)) : null;
                    chooseCategory(owner?.key ?? categoryKey, key);
                  }}
                  className="mt-1 w-full border border-border bg-paper px-2 py-2 text-sm text-ink"
                >
                  <option value="">All group domains</option>
                  {categoryKey
                    ? groupOptions.map((group) => (
                        <option key={group.key} value={group.key}>
                          {group.label.text}
                        </option>
                      ))
                    : categories.map((category) => (
                        <optgroup key={category.key} label={category.label.text}>
                          {category.groups.map((group) => (
                            <option key={group.key} value={group.key}>
                              {group.label.text}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <p id="dictionary-status" role="status" aria-live="polite" className="text-sm font-medium text-ink">
                {statusText}
                {!searching && !filtersActive && <span className="font-normal text-ink-muted"> in {plural(view.totals.categories, "category", "categories")}</span>}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  Sort
                  <select
                    id="dictionary-sort"
                    value={sort}
                    onChange={(event) => setSort(event.target.value as SortChoice)}
                    className="border border-border bg-paper px-1.5 py-1 text-xs text-ink"
                  >
                    <option value="auto">{searching ? "Best match" : "Dictionary order"}</option>
                    <option value="source">Dictionary order</option>
                    <option value="alpha">A–Z</option>
                  </select>
                </label>
                {isTranslation && (
                  <label className="flex items-center gap-2 text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      checked={translatedOnly}
                      onChange={(event) => setTranslatedOnly(event.target.checked)}
                      className="accent-[var(--teal-deep)]"
                    />
                    Translated only
                  </label>
                )}
                {filtersActive && (
                  <button type="button" onClick={resetFilters} className="text-xs font-semibold text-accent underline underline-offset-2 hover:text-ink">
                    Reset filters
                  </button>
                )}
              </div>
            </div>

            {results.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-body font-semibold text-ink">
                  {searching ? <>No outcomes match &ldquo;{query.trim()}&rdquo;</> : "No outcomes match these filters"}
                </p>
                <p className="mx-auto mt-2 max-w-xs text-sm text-ink-muted">
                  {categoryKey && searching
                    ? "Try searching all categories, or check the spelling."
                    : searching
                      ? "Check the spelling, try fewer words, or try a related word."
                      : "Try another category or group domain."}
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  {categoryKey && searching && (
                    <button type="button" className="btn btn-compact" onClick={() => chooseCategory(null, null)}>
                      Search all categories
                    </button>
                  )}
                  <button type="button" className="btn btn-compact" onClick={resetFilters}>
                    Clear search and filters
                  </button>
                </div>
              </div>
            ) : (
              <ol aria-label="Outcomes" className="pt-1">
                {results.map((outcome, i) => {
                  const previous = results[i - 1];
                  const newGroup = showGroupHeadings && (!previous || previous.groupKey !== outcome.groupKey);
                  const hit = result?.hits.get(outcome.id);
                  const snippetField = hit?.fields.find((field) => RESULT_FIELDS.includes(field));
                  const excerpt =
                    snippetField && !hit!.fields.includes("outcomeDomain")
                      ? snippet(outcome[snippetField].text, highlightRanges(outcome[snippetField].text, highlight))
                      : null;
                  const isSelected = outcome.id === selectedId;
                  return (
                    <li key={outcome.id}>
                      {newGroup && (
                        <p className="mt-5 mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-ink-muted first:mt-2">
                          {categoryByKey.get(outcome.categoryKey)?.label.text}
                          <span aria-hidden="true"> · </span>
                          {groupByKey.get(outcome.groupKey)?.label.text}
                        </p>
                      )}
                      <a
                        id={`result-${outcome.id}`}
                        href={hrefFor(outcome.id)}
                        onClick={(event) => select(event, outcome.id)}
                        aria-current={isSelected ? "true" : undefined}
                        className={`group -mx-3 block border-l-2 px-3 py-2.5 transition-colors ${
                          isSelected ? "border-accent bg-accent-soft/30" : "border-transparent hover:border-border hover:bg-paper-alt"
                        }`}
                      >
                        <span className={`block font-medium ${isSelected ? "text-ink" : "text-ink group-hover:text-accent"}`}>
                          <Highlighted text={outcome.outcomeDomain.text} highlight={highlight} />
                          {outcome.outcomeDomain.fallback && (
                            <span className="ml-2 align-middle text-[0.65rem] font-semibold text-ink-muted" title={`Not yet translated into ${view.languageName}`}>
                              EN
                            </span>
                          )}
                        </span>
                        {!showGroupHeadings && (
                          <span className="mt-0.5 block text-xs text-ink-muted">
                            {categoryByKey.get(outcome.categoryKey)?.label.text} · {groupByKey.get(outcome.groupKey)?.label.text}
                          </span>
                        )}
                        {excerpt && snippetField && (
                          <span className="mt-1 block text-sm leading-snug text-ink-muted">
                            <span className="mr-1 text-[0.7rem] font-semibold uppercase tracking-wide">{FIELD_LABELS[snippetField]}:</span>
                            {excerpt.leading && "…"}
                            <Highlighted text={excerpt.text} ranges={excerpt.ranges} />
                            {excerpt.trailing && "…"}
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Details */}
          <div className={selected ? "" : "hidden lg:block"}>
            <div
              ref={detailPaneRef}
              className="lg:sticky lg:top-28 lg:max-h-[calc(100dvh-8rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2"
            >
              {selected ? (
                <OutcomeDetail
                  outcome={selected}
                  category={categoryByKey.get(selected.categoryKey)}
                  group={groupByKey.get(selected.groupKey)}
                  language={view.language}
                  languageName={view.languageName}
                  masterLanguage={view.masterLanguage}
                  roles={texts.roles}
                  verbatimsHeading={texts.verbatimsHeading}
                  verbatimsNote={texts.verbatimsNote}
                  highlight={highlight}
                  previous={neighbour(sequence[position - 1])}
                  next={neighbour(sequence[position + 1])}
                  shareUrl={shareUrlFor(selected.id)}
                  headingRef={headingRef}
                  onNavigate={select}
                  backHref={hrefFor(null)}
                  onBack={backToResults}
                />
              ) : (
                <div className="border border-dashed border-border bg-paper-alt px-6 py-10 lg:mt-1">
                  <p className="text-subheading font-semibold text-ink">Choose an outcome</p>
                  <p className="mt-2 max-w-md text-body text-ink-muted">
                    Select an outcome from the list to read its definition, how it can be experienced, and what participants said in
                    their own words.
                  </p>
                  {texts.roles.length > 0 && (
                    <dl className="mt-6 space-y-1 text-sm">
                      {texts.roles.map((role) => (
                        <div key={role.code} className="flex gap-2">
                          <dt className="w-12 font-semibold text-ink">{role.code}</dt>
                          <dd className="text-ink-muted">{role.label}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
