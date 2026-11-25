"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { ParticipantRole } from "@/content/dictionary/schema";
import { assignCategoryTones } from "@/lib/dictionary/category-colors";
import { buildSearchIndex, search } from "@/lib/dictionary/search";
import type { DictionaryView, ViewOutcome } from "@/lib/dictionary/view";
import CategoryNav from "./CategoryNav";
import OutcomeDetail, { type NeighbourLink } from "./OutcomeDetail";
import OutcomeIndex from "./OutcomeIndex";

export type SortChoice = "auto" | "source" | "alpha";

export type ExplorerFilters = {
  q: string;
  category: string | null;
  group: string | null;
  sort: SortChoice;
  translatedOnly: boolean;
};

export type ExplorerTexts = {
  /** The page's H1 (CMS: intro heading). */
  heading: string;
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

/** Matches Tailwind's `lg` breakpoint, where the index and an entry sit side by side. */
const NARROW = "(max-width: 1023px)";

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * The dictionary: search, category navigation, and two layouts sharing one
 * URL model —
 *  - no outcome selected: a full-width index of every outcome (like the
 *    index of a reference book), so nothing is empty and nothing is
 *    selected on the visitor's behalf;
 *  - an outcome selected (basePath/ID): the entry to read, with a compact,
 *    sticky index beside it on wide screens. On small screens the entry is
 *    a reading view of its own, and "All outcomes" returns to the list with
 *    the search and filters intact.
 */
export default function DictionaryExplorer({ view, texts, basePath, urlMode, preserve, initialFilters }: DictionaryExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { outcomes, categories } = view;
  const isTranslation = view.language !== view.masterLanguage;

  const tones = useMemo(() => assignCategoryTones(categories.map((c) => c.key)), [categories]);
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

  // Counts for the category navigation: matches for the search (and
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
  const workspaceRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
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

  // Keep the open outcome visible in the compact index beside it.
  useEffect(() => {
    if (!selectedId || !railRef.current) return;
    const rail = railRef.current;
    const item = rail.querySelector<HTMLElement>(`[id="result-${CSS.escape(selectedId)}"]`);
    if (!item) return;
    const top = item.offsetTop - rail.offsetTop;
    if (top < rail.scrollTop || top + item.offsetHeight > rail.scrollTop + rail.clientHeight) {
      rail.scrollTop = Math.max(0, top - rail.clientHeight / 3);
    }
  }, [selectedId]);

  useEffect(() => {
    if (selectedId) {
      lastSelected.current = selectedId;
      if (!focusAfterSelect.current) return;
      focusAfterSelect.current = false;
      const workspace = workspaceRef.current;
      if (window.matchMedia(NARROW).matches) {
        workspace?.scrollIntoView({ block: "start" });
      } else if (workspace && workspace.getBoundingClientRect().top < 0) {
        workspace.scrollIntoView({ block: "start", behavior: scrollBehavior() });
      }
      headingRef.current?.focus({ preventScroll: true });
    } else if (lastSelected.current) {
      // Returning to the index: put focus back on the outcome that was open.
      const link = document.getElementById(`result-${lastSelected.current}`);
      if (link) {
        link.focus({ preventScroll: true });
        link.scrollIntoView({ block: "center" });
      }
    }
  }, [selectedId]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const statusText = searching
    ? `${plural(results.length, "outcome")} found`
    : filtersActive
      ? `${plural(results.length, "outcome")} shown`
      : plural(results.length, "outcome");

  const grouped = effectiveSort === "source";
  const sortOptions: { value: SortChoice; label: string }[] = searching
    ? [
        { value: "auto", label: "Best match" },
        { value: "source", label: "Dictionary" },
        { value: "alpha", label: "A–Z" },
      ]
    : [
        { value: "auto", label: "Dictionary" },
        { value: "alpha", label: "A–Z" },
      ];
  const activeSort: SortChoice = !searching && sort === "source" ? "auto" : sort;

  const emptyState = (
    <div className="py-16 text-center">
      <p className="text-body font-semibold text-ink">
        {searching ? <>No outcomes match &ldquo;{query.trim()}&rdquo;</> : "No outcomes match these filters"}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
        {categoryKey && searching
          ? "Try searching all categories, or check the spelling."
          : searching
            ? "Search looks for any part of a word, ignores accents and capitals and allows small typos. Try fewer words, or a related word."
            : "Try another category or group domain."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
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
  );

  const indexProps = {
    results,
    grouped,
    categoryByKey,
    groupByKey,
    tones,
    search: result,
    selectedId,
    languageName: view.languageName,
    hrefFor: (id: string) => hrefFor(id),
    onSelect: select,
  };

  return (
    <div className="mx-auto max-w-wide px-gutter pt-8 pb-16 sm:pt-10 lg:pt-12 lg:pb-24">
      {/* Title and language */}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <h1 className="text-[clamp(1.875rem,1.5rem+1.2vw,2.75rem)] font-bold leading-[1.05] tracking-[-0.02em] text-ink">{texts.heading}</h1>
        {view.languages.length > 1 && (
          <div className={`flex w-full min-w-0 items-center gap-2 sm:w-auto ${selected ? "max-lg:hidden" : ""}`}>
            <label htmlFor="dictionary-language" className="text-sm text-ink-muted">
              Language
            </label>
            <select
              id="dictionary-language"
              value={view.language}
              onChange={(event) => changeLanguage(event.target.value)}
              className="min-h-11 w-full min-w-0 rounded-[3px] sm:w-auto sm:max-w-[16rem] border border-border bg-paper px-2.5 text-sm text-ink transition-colors hover:border-ink/40"
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

      {/* Search, categories and list controls. On small screens they make way for the reading view. */}
      <div className={selected ? "max-lg:hidden" : undefined}>
        <div className="mt-6 sm:mt-7">
          <label htmlFor="dictionary-search" className="sr-only">
            Search the dictionary
          </label>
          <div className="group/search relative max-w-3xl">
            <svg
              aria-hidden="true"
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-ink-muted transition-colors group-focus-within/search:text-ink"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="8.5" cy="8.5" r="5.75" />
              <path d="m13 13 4.5 4.5" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              id="dictionary-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && query) {
                  event.preventDefault();
                  setQuery("");
                }
              }}
              placeholder="Search outcomes and quotes"
              autoComplete="off"
              spellCheck={false}
              aria-describedby="dictionary-search-help dictionary-status"
              className={`h-14 w-full rounded-[3px] border border-ink/20 bg-paper pl-12 ${query ? "pr-14" : "pr-4 lg:pr-14"} text-body text-ink shadow-[0_1px_2px_rgb(28_44_67/0.04)] transition-[border-color,box-shadow] duration-150 placeholder:text-ink-muted hover:border-ink/35 focus:border-ink/60 focus:shadow-[0_0_0_4px_rgb(159_208_194/0.45)] focus:outline-none [&::-webkit-search-cancel-button]:appearance-none`}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  searchRef.current?.focus();
                }}
                className="absolute top-1/2 right-2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-paper-alt hover:text-ink"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                  <path d="m5 5 10 10M15 5 5 15" />
                </svg>
                <span className="sr-only">Clear search</span>
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 rounded-[3px] border border-border px-1.5 font-sans text-xs text-ink-muted group-focus-within/search:opacity-0 lg:block"
              >
                /
              </kbd>
            )}
          </div>
          <p id="dictionary-search-help" className="sr-only">
            Searches outcome names, definitions, experiences and quotations. Matches any part of a word, ignores accents and capitals, and
            allows for small typos. All words must match.
          </p>
        </div>

        {isTranslation && (
          <p className="mt-4 max-w-3xl border-l-2 border-accent bg-paper-alt px-4 py-2.5 text-sm text-ink">
            Showing the {view.languageName} translation where available. Anything not yet translated is shown in English and marked{" "}
            <span className="border border-dashed border-ink-muted/50 px-1 text-xs font-semibold">EN</span>.
          </p>
        )}

        <div className="mt-6 sm:mt-7">
          <CategoryNav
            label="Browse by category"
            categories={categories}
            tones={tones}
            matching={matching}
            filtered={searching || translatedOnly}
            total={view.totals.outcomes}
            categoryKey={categoryKey}
            groupKey={groupKey}
            languageName={view.languageName}
            onSelect={chooseCategory}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
          <p id="dictionary-status" role="status" aria-live="polite" className="text-ink-muted">
            <span className="font-medium text-ink">{statusText}</span>
            {!searching && !filtersActive && <> in {plural(view.totals.categories, "category", "categories")}</>}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div role="group" aria-label="Order" className="flex items-center gap-1">
              <span className="mr-1 text-ink-muted" aria-hidden="true">
                Order
              </span>
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={activeSort === option.value}
                  onClick={() => setSort(option.value)}
                  className={`min-h-9 rounded-full px-2.5 transition-colors duration-150 ${
                    activeSort === option.value ? "bg-paper-alt font-medium text-ink ring-1 ring-border" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {isTranslation && (
              <label className="flex min-h-9 items-center gap-2 text-ink-muted">
                <input
                  type="checkbox"
                  checked={translatedOnly}
                  onChange={(event) => setTranslatedOnly(event.target.checked)}
                  className="size-4 accent-[var(--teal-deep)]"
                />
                Translated only
              </label>
            )}
            {filtersActive && (
              <button
                type="button"
                onClick={resetFilters}
                className="min-h-9 font-medium text-accent underline decoration-accent/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      </div>

      {/* The dictionary: an index, or an entry with the index beside it. */}
      <div ref={workspaceRef} className="mt-7 scroll-mt-28 sm:mt-9">
        {selected ? (
          <div className="grid gap-x-12 lg:grid-cols-[17rem_minmax(0,1fr)] xl:grid-cols-[19rem_minmax(0,1fr)] xl:gap-x-20">
            <div className="hidden lg:block">
              <div
                ref={railRef}
                className="sticky top-28 -ml-3 max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain pr-3 pb-6 pl-3 [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]"
              >
                {results.length === 0 ? (
                  <p className="py-4 text-sm text-ink-muted">No outcomes match. The open outcome is still shown.</p>
                ) : (
                  <OutcomeIndex variant="rail" {...indexProps} />
                )}
              </div>
            </div>
            <div className="min-w-0 lg:border-l lg:border-border lg:pl-12 xl:pl-20">
              <OutcomeDetail
                outcome={selected}
                category={categoryByKey.get(selected.categoryKey)}
                group={groupByKey.get(selected.groupKey)}
                tone={tones.get(selected.categoryKey)}
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
            </div>
          </div>
        ) : results.length === 0 ? (
          emptyState
        ) : (
          <OutcomeIndex variant="index" {...indexProps} />
        )}
      </div>
    </div>
  );
}
