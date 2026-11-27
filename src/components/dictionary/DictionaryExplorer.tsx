"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import type { ParticipantRole } from "@/content/dictionary/schema";
import { assignCategoryTones } from "@/lib/dictionary/category-colors";
import { buildSearchIndex, search } from "@/lib/dictionary/search";
import type { DictionaryView, ViewOutcome } from "@/lib/dictionary/view";
import CategoryNav from "./CategoryNav";
import DictionaryHeader from "./DictionaryHeader";
import { DICTIONARY_CONTAINER } from "./layout";
import OutcomeDetail, { type NeighbourLink } from "./OutcomeDetail";
import OutcomeIndex, { type IndexSection } from "./OutcomeIndex";

/** "auto": dictionary order. "alpha": A–Z within each group. "relevance": best match first (while searching). */
export type SortChoice = "auto" | "alpha" | "relevance";

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
  /** CMS: the About section heading, used as the disclosure's label. */
  aboutLabel: string;
  verbatimsHeading: string;
  verbatimsNote: string;
  roles: ParticipantRole[];
};

type DictionaryExplorerProps = {
  view: DictionaryView;
  texts: ExplorerTexts;
  /** The About text, rendered on the server. */
  about: ReactNode;
  /** "/dictionary" publicly; the preview route in the admin. */
  basePath: string;
  /** "path": outcomes at basePath/ID (public). "query": ?outcome=ID (preview). */
  urlMode: "path" | "query";
  /** Query parameters to keep on every URL (e.g. the preview's version). */
  preserve?: Record<string, string>;
  initialFilters: ExplorerFilters;
};

/** Below Tailwind's `sm` breakpoint the cards become an accordion and the entry a bottom sheet. */
const SMALL = "(max-width: 639px)";

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

function isModifiedClick(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * The dictionary: search, category tabs and an index of group cards, with
 * the selected outcome in a sheet over the index. The open outcome lives in
 * the URL (basePath/ID, or ?outcome=ID in the preview), so links are
 * permanent and Back/Forward open and close entries; search and filters are
 * mirrored into the query string.
 */
export default function DictionaryExplorer({ view, texts, about, basePath, urlMode, preserve, initialFilters }: DictionaryExplorerProps) {
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
    initialFilters.category ? categoryBySlug.get(initialFilters.category)?.key ?? null : null
  );
  const [groupKey, setGroupKey] = useState<string | null>(initialGroup?.key ?? null);
  const [sort, setSort] = useState<SortChoice>(initialFilters.sort);
  const [translatedOnly, setTranslatedOnly] = useState(isTranslation && initialFilters.translatedOnly);
  const deferredQuery = useDeferredValue(query);
  const [small, setSmall] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(SMALL);
    const update = () => setSmall(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // The selected outcome lives in the URL, so links are permanent and the
  // browser's back button moves between the list and an outcome.
  const selectedId = useMemo(() => {
    let raw: string | null = null;
    if (urlMode === "query") raw = searchParams.get("outcome");
    else if (pathname.startsWith(`${basePath}/`)) raw = decodeURIComponent(pathname.slice(basePath.length + 1).split("/")[0]);
    return raw && outcomeById.has(raw) ? raw : null;
  }, [urlMode, searchParams, pathname, basePath, outcomeById]);
  const selected = selectedId ? outcomeById.get(selectedId)! : null;

  // Small screens: which group cards are expanded. The open outcome's group
  // is, so that closing the entry returns to a visible link.
  const [openGroups, setOpenGroups] = useState<ReadonlySet<string>>(() => new Set(selected ? [selected.groupKey] : []));
  const [trackedSelection, setTrackedSelection] = useState(selectedId);
  if (trackedSelection !== selectedId) {
    setTrackedSelection(selectedId);
    if (selected && !openGroups.has(selected.groupKey)) setOpenGroups(new Set(openGroups).add(selected.groupKey));
  }

  const index = useMemo(() => buildSearchIndex(outcomes), [outcomes]);
  const result = useMemo(() => search(index, deferredQuery), [index, deferredQuery]);
  const highlight = result?.highlight ?? null;
  const searching = result !== null;

  // Counts for the category tabs: matches for the search (and translated-only
  // toggle), ignoring the category/group filter itself.
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

  const effectiveSort: SortChoice = sort === "relevance" && !searching ? "auto" : sort;
  const collator = useMemo(() => new Intl.Collator(view.language, { sensitivity: "base", numeric: true }), [view.language]);

  const filtered = useMemo(
    () =>
      outcomes.filter(
        (o) =>
          (!categoryKey || o.categoryKey === categoryKey) &&
          (!groupKey || o.groupKey === groupKey) &&
          (!translatedOnly || o.translated) &&
          (!result || result.hits.has(o.id))
      ),
    [outcomes, categoryKey, groupKey, translatedOnly, result]
  );

  // The index's layout, and the same order flattened (for Previous / Next).
  const { layout, ordered } = useMemo(() => {
    if (effectiveSort === "relevance" && result) {
      const ranked = [...filtered].sort((a, b) => result.hits.get(b.id)!.score - result.hits.get(a.id)!.score || a.position - b.position);
      return { layout: { kind: "ranked" as const, outcomes: ranked }, ordered: ranked };
    }
    const byGroup = new Map<string, ViewOutcome[]>();
    for (const outcome of filtered) {
      const list = byGroup.get(outcome.groupKey);
      if (list) list.push(outcome);
      else byGroup.set(outcome.groupKey, [outcome]);
    }
    const sections: IndexSection[] = [];
    for (const category of categories) {
      const groups = category.groups
        .filter((group) => byGroup.has(group.key))
        .map((group) => {
          const list = byGroup.get(group.key)!;
          return {
            group,
            outcomes: effectiveSort === "alpha" ? [...list].sort((a, b) => collator.compare(a.outcomeDomain.text, b.outcomeDomain.text)) : list,
          };
        });
      if (groups.length > 0) sections.push({ category, groups });
    }
    return {
      layout: { kind: "sections" as const, sections },
      ordered: sections.flatMap((s) => s.groups.flatMap((g) => g.outcomes)),
    };
  }, [filtered, effectiveSort, result, categories, collator]);

  const filtersActive = query.trim() !== "" || categoryKey !== null || groupKey !== null || translatedOnly;

  // ---- URLs -------------------------------------------------------------

  const filterParams = useMemo(() => {
    const params = new URLSearchParams(preserve);
    if (isTranslation) params.set("lang", view.language);
    if (query.trim()) params.set("q", query.trim());
    if (categoryKey) params.set("category", categoryByKey.get(categoryKey)!.slug);
    if (groupKey) params.set("group", groupByKey.get(groupKey)!.slug);
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

  // ---- Selection and focus ------------------------------------------------

  const searchRef = useRef<HTMLInputElement>(null);
  const openedFromList = useRef(false);
  const lastSelected = useRef<string | null>(null);

  function select(event: MouseEvent<HTMLAnchorElement>, id: string) {
    if (isModifiedClick(event)) return; // let "open in new tab" work normally
    event.preventDefault();
    if (id === selectedId) return;
    if (selectedId === null) {
      openedFromList.current = true;
      window.history.pushState(null, "", hrefFor(id));
    } else {
      // Previous / Next inside the open entry replace it, so Back (and
      // closing) always return to the index.
      window.history.replaceState(null, "", hrefFor(id));
    }
  }

  /** Closes the entry: back to where the visitor came from, or to the index. */
  function closeEntry() {
    if (openedFromList.current) {
      openedFromList.current = false;
      window.history.back();
    } else {
      window.history.pushState(null, "", hrefFor(null));
    }
  }

  useEffect(() => {
    if (selectedId) {
      lastSelected.current = selectedId;
      return;
    }
    openedFromList.current = false;
    if (!lastSelected.current) return;
    // Back on the index: put focus on the outcome that was open.
    const link = document.getElementById(`result-${lastSelected.current}`);
    if (link) {
      link.focus({ preventScroll: true });
      link.scrollIntoView({ block: "nearest" });
    }
  }, [selectedId]);

  // "/" focuses the search from anywhere on the page.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (document.querySelector("dialog.dictionary-entry[open]")) return;
      event.preventDefault();
      searchRef.current?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function chooseCategory(nextCategory: string | null) {
    setCategoryKey(nextCategory);
    setGroupKey(null);
  }

  function toggleGroup(key: string) {
    const next = new Set(openGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenGroups(next);
    // On a small screen, collapsing the group a link opened on its own returns to all groups.
    if (groupKey === key) setGroupKey(null);
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

  const sequence = selected && ordered.some((o) => o.id === selected.id) ? ordered : outcomes;
  const position = selected ? sequence.findIndex((o) => o.id === selected.id) : -1;
  const neighbour = (outcome: ViewOutcome | undefined): NeighbourLink =>
    outcome ? { id: outcome.id, title: outcome.outcomeDomain.text, href: hrefFor(outcome.id) } : null;

  // ---- Rendering ------------------------------------------------------------

  const statusText = searching
    ? `${plural(filtered.length, "outcome")} found`
    : filtersActive
      ? `${plural(filtered.length, "outcome")} shown`
      : plural(filtered.length, "outcome");

  const sortOptions: { value: SortChoice; label: string }[] = [
    { value: "auto", label: "Dictionary order" },
    ...(searching ? [{ value: "relevance" as const, label: "Best match" }] : []),
    { value: "alpha", label: "A–Z" },
  ];

  const focusedGroup = groupKey ? groupByKey.get(groupKey) : undefined;

  const languageSelect =
    view.languages.length > 1 ? (
      <div className="flex min-w-0 items-center gap-2">
        <label htmlFor="dictionary-language" className="sr-only">
          Language
        </label>
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4 flex-none text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="7.25" />
          <path d="M2.75 10h14.5M10 2.75c2 2.2 2.9 4.6 2.9 7.25S12 15.05 10 17.25C8 15.05 7.1 12.65 7.1 10S8 4.95 10 2.75Z" />
        </svg>
        <select
          id="dictionary-language"
          value={view.language}
          onChange={(event) => changeLanguage(event.target.value)}
          className="min-h-11 max-w-[11rem] min-w-0 cursor-pointer border-0 bg-transparent text-sm font-medium text-ink sm:max-w-[16rem]"
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
    ) : null;

  return (
    <div className={`${DICTIONARY_CONTAINER} pt-3 pb-10 sm:pt-5 sm:pb-16`}>
      <DictionaryHeader title={texts.heading} aboutLabel={texts.aboutLabel} about={about} aside={languageSelect} />

      {/* Search */}
      <div className="mt-1">
        <label htmlFor="dictionary-search" className="sr-only">
          Search the dictionary
        </label>
        <div className="flex h-12 items-center gap-3 rounded-lg border border-dict-field bg-paper px-3.5 transition-[border-color,box-shadow] hover:border-[#c9c3bf] has-[input:focus-visible]:border-ink has-[input:focus-visible]:shadow-[0_0_0_1px_var(--color-ink)]">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[1.125rem] flex-none text-ink-muted" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="10.5" cy="10.5" r="7" />
            <path d="m16 16 5 5" strokeLinecap="round" />
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
            placeholder={small ? "Search the dictionary" : "Search outcomes, definitions, experiences and quotations"}
            autoComplete="off"
            spellCheck={false}
            aria-describedby="dictionary-search-help dictionary-status"
            className="h-10 min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
              className="-mr-2 inline-flex size-10 flex-none items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-dict-hover hover:text-ink"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="m5 5 10 10M15 5 5 15" />
              </svg>
              <span className="sr-only">Clear search</span>
            </button>
          )}
        </div>
        <p id="dictionary-search-help" className="sr-only">
          Searches outcome names, definitions, experiences and quotations. Matches any part of a word, ignores accents and capitals, and
          allows for small typos. All words must match. Press slash to search from anywhere on the page.
        </p>
      </div>

      {isTranslation && (
        <p className="mt-3 border-l-2 border-accent bg-paper px-4 py-2.5 text-sm text-ink">
          Showing the {view.languageName} translation where available. Anything not yet translated is shown in English and marked{" "}
          <span className="border border-dashed border-ink-muted/50 px-1 text-xs font-semibold">EN</span>.
        </p>
      )}

      {/* Category tabs */}
      <div className="mt-1.5 sm:mt-2">
        <CategoryNav
          label="Category"
          categories={categories}
          tones={tones}
          matching={matching}
          filtered={searching || translatedOnly}
          total={view.totals.outcomes}
          categoryKey={categoryKey}
          languageName={view.languageName}
          onSelect={chooseCategory}
        />
      </div>

      {/* Count and order */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 text-[0.8125rem] text-ink-muted">
        <p id="dictionary-status" role="status" aria-live="polite">
          {statusText}
        </p>
        <div className="flex flex-wrap items-center gap-x-5">
          {isTranslation && (
            <label className="flex min-h-11 items-center gap-2 sm:min-h-9">
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
              className="min-h-11 text-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-accent sm:min-h-9"
            >
              Clear all
            </button>
          )}
          <label className="flex items-center gap-2">
            Sort
            <select
              value={effectiveSort}
              onChange={(event) => setSort(event.target.value as SortChoice)}
              className="min-h-11 cursor-pointer border-0 bg-transparent font-medium text-ink sm:min-h-9"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {focusedGroup && (
        <button
          type="button"
          onClick={() => setGroupKey(null)}
          className="mt-2 min-h-11 text-sm font-semibold text-ink transition-colors hover:text-accent"
        >
          <span aria-hidden="true">← </span>All groups
        </button>
      )}

      {/* The index */}
      <div className="mt-1">
        {filtered.length === 0 ? (
          <div className="py-14 text-center">
            <p className="font-semibold text-ink">
              {searching ? <>No outcomes match &ldquo;{query.trim()}&rdquo;</> : "No outcomes match these filters"}
            </p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-ink-muted">
              {categoryKey && searching
                ? "Try searching all categories, or check the spelling."
                : searching
                  ? "Search looks for any part of a word, ignores accents and capitals and allows small typos. Try fewer words, or a related word."
                  : "Try another category or group domain."}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-x-6">
              {categoryKey && searching && (
                <button type="button" className="min-h-11 text-sm font-medium text-ink underline underline-offset-[3px]" onClick={() => chooseCategory(null)}>
                  Search all categories
                </button>
              )}
              <button type="button" className="min-h-11 text-sm font-medium text-ink underline underline-offset-[3px]" onClick={resetFilters}>
                Clear search and filters
              </button>
            </div>
          </div>
        ) : (
          <OutcomeIndex
            layout={layout}
            categoryByKey={categoryByKey}
            groupByKey={groupByKey}
            tones={tones}
            search={result}
            selectedId={selectedId}
            languageName={view.languageName}
            focusedGroup={groupKey}
            openGroups={openGroups}
            hrefFor={(id) => hrefFor(id)}
            onSelect={select}
            onFocusGroup={setGroupKey}
            onToggleGroup={toggleGroup}
          />
        )}
      </div>

      {selected && (
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
          onNavigate={select}
          onClose={closeEntry}
        />
      )}
    </div>
  );
}
