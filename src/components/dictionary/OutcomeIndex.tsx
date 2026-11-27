"use client";

import type { MouseEvent, ReactNode } from "react";
import { toneVars, type CategoryTone } from "@/lib/dictionary/category-colors";
import { FIELD_LABELS, type TextField } from "@/lib/dictionary/model";
import { highlightRanges, snippet, type SearchResult } from "@/lib/dictionary/search";
import type { ViewCategory, ViewGroup, ViewOutcome } from "@/lib/dictionary/view";
import { EnMark } from "./CategoryNav";
import Highlighted from "./Highlighted";

const RESULT_FIELDS: TextField[] = ["definition", "experience", "verbatims"];

export type IndexSection = {
  category: ViewCategory;
  groups: { group: ViewGroup; outcomes: ViewOutcome[] }[];
};

type OutcomeIndexProps = {
  /** Category sections with their group cards, or a flat ranked list (best match). */
  layout: { kind: "sections"; sections: IndexSection[] } | { kind: "ranked"; outcomes: ViewOutcome[] };
  categoryByKey: Map<string, ViewCategory>;
  groupByKey: Map<string, ViewGroup>;
  tones: Map<string, CategoryTone>;
  search: SearchResult | null;
  selectedId: string | null;
  languageName: string;
  /** The group domain shown on its own (tablets, or from the URL), if any. */
  focusedGroup: string | null;
  /** Group domains expanded in the accordion (phones and the split view). */
  openGroups: ReadonlySet<string>;
  hrefFor: (id: string) => string;
  onSelect: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  onFocusGroup: (groupKey: string | null) => void;
  onToggleGroup: (groupKey: string) => void;
};

function Count({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`tabular-nums font-normal text-ink-muted ${className}`}>
      {n}
      <span className="sr-only"> {n === 1 ? "outcome" : "outcomes"}</span>
    </span>
  );
}

/** Never more columns of cards than there are cards. */
function cardColumns(groups: number): string {
  if (groups >= 3) return "columns-[3_17.5rem]";
  return groups === 2 ? "columns-[2_17.5rem]" : "";
}

/** A group shown on its own flows its outcomes into columns once it has enough of them. */
function itemColumns(outcomes: number): string {
  if (outcomes > 10) return "columns-[3_15rem]";
  return outcomes > 5 ? "columns-[2_15rem]" : "";
}

const CARD =
  "break-inside-avoid rounded-lg border border-dict-card border-t-2 border-t-[var(--cat-line)] bg-paper px-1 sm:px-1.5 sm:pt-0.5 sm:pb-1.5";

const GROUP_BUTTON =
  "w-full items-center gap-2 rounded px-3 py-1 text-left font-semibold leading-[1.35] text-ink transition-colors duration-150 hover:bg-dict-hover-soft";

/**
 * The dictionary index: every outcome under its category and group domain,
 * as group cards. On tablets each card header shows that group on its own
 * (and back); on phones, and in the split view's narrow index pane (from
 * `lg`), the cards are an accordion.
 */
export default function OutcomeIndex({
  layout,
  categoryByKey,
  groupByKey,
  tones,
  search,
  selectedId,
  languageName,
  focusedGroup,
  openGroups,
  hrefFor,
  onSelect,
  onFocusGroup,
  onToggleGroup,
}: OutcomeIndexProps) {
  const highlight = search?.highlight ?? null;

  function excerptOf(outcome: ViewOutcome): ReactNode {
    const hit = search?.hits.get(outcome.id);
    const field = hit?.fields.find((f) => RESULT_FIELDS.includes(f));
    if (!hit || !field || hit.fields.includes("outcomeDomain")) return null;
    const text = outcome[field].text;
    const excerpt = snippet(text, highlightRanges(text, highlight), 40, 90);
    if (!excerpt) return null;
    return (
      <span className="mt-0.5 block text-[0.8125rem] font-normal leading-snug text-ink-muted">
        <span className="mr-1 text-[0.625rem] font-semibold uppercase tracking-[0.12em]">{FIELD_LABELS[field]}</span>
        {excerpt.leading && "…"}
        <Highlighted text={excerpt.text} ranges={excerpt.ranges} />
        {excerpt.trailing && "…"}
      </span>
    );
  }

  function item(outcome: ViewOutcome, showContext: boolean) {
    const selected = outcome.id === selectedId;
    const category = categoryByKey.get(outcome.categoryKey);
    const group = groupByKey.get(outcome.groupKey);
    return (
      <li key={outcome.id} className="break-inside-avoid" style={showContext ? toneVars(tones.get(outcome.categoryKey)) : undefined}>
        <a
          id={`result-${outcome.id}`}
          href={hrefFor(outcome.id)}
          onClick={(event) => onSelect(event, outcome.id)}
          aria-current={selected ? "true" : undefined}
          className={`block min-h-11 rounded px-3 py-2.5 text-[0.9375rem] leading-[1.45] transition-colors duration-150 sm:min-h-[1.875rem] sm:py-1 lg:min-h-8 lg:py-[0.3125rem] lg:text-sm ${
            selected ? "bg-[var(--cat-soft)] font-semibold text-ink" : "text-dict-ink-soft hover:bg-dict-hover hover:text-ink"
          }`}
        >
          <span lang={outcome.outcomeDomain.fallback ? "en" : undefined}>
            <Highlighted text={outcome.outcomeDomain.text} highlight={highlight} />
            {outcome.outcomeDomain.fallback && <EnMark languageName={languageName} />}
          </span>
          {showContext && (
            <span className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-[var(--cat-line)]" />
              <span className="truncate">
                {category?.label.text} · {group?.label.text}
              </span>
            </span>
          )}
          {excerptOf(outcome)}
        </a>
      </li>
    );
  }

  // ---- Best match: one ranked list ---------------------------------------------
  if (layout.kind === "ranked") {
    return (
      <div
        className={`rounded-lg border border-dict-card border-t-2 border-t-ink bg-paper px-1 py-1.5 sm:px-1.5 ${
          itemColumns(layout.outcomes.length) ? "" : "sm:max-w-[23.5rem] lg:max-w-none"
        }`}
      >
        <ol aria-label="Outcomes, best match first" className={`gap-x-4 ${itemColumns(layout.outcomes.length)}`}>
          {layout.outcomes.map((outcome) => item(outcome, true))}
        </ol>
      </div>
    );
  }

  // ---- Category sections with group cards ----------------------------------------
  const searching = search !== null;
  return (
    <div>
      {layout.sections.map(({ category, groups }) => {
        const shown = groups.reduce((n, g) => n + g.outcomes.length, 0);
        const headingId = `index-${category.slug}`;
        const single = groups.length === 1;
        return (
          <section key={category.key} aria-labelledby={headingId} style={toneVars(tones.get(category.key))} className="mt-[1.125rem] sm:mt-5 lg:mt-4">
            <div className="mb-2.5 flex items-center gap-2.5 sm:mb-3 lg:mb-2">
              <span aria-hidden="true" className="h-[1.125rem] w-1 shrink-0 rounded-sm bg-[var(--cat-line)]" />
              <h2 id={headingId} lang={category.label.fallback ? "en" : undefined} className="text-lg font-bold tracking-[-0.01em] text-ink sm:text-xl lg:text-base">
                {category.label.text}
                {category.label.fallback && <EnMark languageName={languageName} />}
              </h2>
              <Count n={shown} className="text-[0.8125rem]" />
              <span aria-hidden="true" className="h-px flex-1 bg-dict-rule" />
            </div>

            <div className={`gap-x-4 ${cardColumns(groups.length)}`}>
              {groups.map(({ group, outcomes }) => {
                const focused = focusedGroup === group.key;
                const expanded = searching || focused || openGroups.has(group.key);
                const listId = `group-${group.slug}`;
                const name = (
                  <span className="flex-1" lang={group.label.fallback ? "en" : undefined}>
                    {group.label.text}
                    {group.label.fallback && <EnMark languageName={languageName} />}
                  </span>
                );
                return (
                  <article
                    key={group.key}
                    // A group shown on its own keeps the width of one column until its outcomes need more.
                    className={`mb-2.5 sm:mb-4 lg:mb-1.5 ${CARD} ${single && !itemColumns(outcomes.length) ? "sm:max-w-[23.5rem] lg:max-w-none" : ""}`}
                  >
                    <h3>
                      {/* Tablets: show this group on its own, and back. */}
                      <button
                        type="button"
                        aria-pressed={focused}
                        onClick={() => onFocusGroup(focused ? null : group.key)}
                        className={`${GROUP_BUTTON} hidden min-h-[2.625rem] text-base sm:max-lg:flex`}
                      >
                        {name}
                        <Count n={outcomes.length} className="text-[0.8125rem]" />
                        <span className="sr-only">{focused ? ", shown on its own. Show all groups" : ". Show only this group"}</span>
                        <span aria-hidden="true" className="w-3.5 text-center text-lg font-normal text-[var(--cat-text)]">
                          {focused ? "×" : "›"}
                        </span>
                      </button>
                      {/* Phones, and the split view's narrow index pane: expand and collapse. */}
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={listId}
                        onClick={() => onToggleGroup(group.key)}
                        className={`${GROUP_BUTTON} flex min-h-[3.125rem] text-[0.9375rem] sm:max-lg:hidden lg:min-h-10 lg:text-sm`}
                      >
                        {name}
                        <Count n={outcomes.length} className="text-[0.8125rem]" />
                        <span aria-hidden="true" className="w-3.5 text-center text-lg font-normal text-[var(--cat-text)]">
                          {expanded ? "−" : "+"}
                        </span>
                      </button>
                    </h3>
                    <ul
                      id={listId}
                      className={`gap-x-4 border-t border-dict-rule-soft pt-1 ${single ? itemColumns(outcomes.length) : ""} ${
                        expanded ? "" : "max-sm:hidden lg:hidden"
                      }`}
                    >
                      {outcomes.map((outcome) => item(outcome, false))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
