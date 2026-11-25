"use client";

import type { MouseEvent, ReactNode } from "react";
import { toneVars, type CategoryTone } from "@/lib/dictionary/category-colors";
import { FIELD_LABELS, type TextField } from "@/lib/dictionary/model";
import { highlightRanges, snippet, type SearchResult } from "@/lib/dictionary/search";
import type { ViewCategory, ViewGroup, ViewOutcome } from "@/lib/dictionary/view";
import Highlighted from "./Highlighted";

const RESULT_FIELDS: TextField[] = ["definition", "experience", "verbatims"];

type OutcomeIndexProps = {
  /** "index": the full-width overview. "rail": the compact list beside an open entry. */
  variant: "index" | "rail";
  results: ViewOutcome[];
  /** Group results under their category and group domain (dictionary order). */
  grouped: boolean;
  categoryByKey: Map<string, ViewCategory>;
  groupByKey: Map<string, ViewGroup>;
  tones: Map<string, CategoryTone>;
  search: SearchResult | null;
  selectedId: string | null;
  languageName: string;
  hrefFor: (id: string) => string;
  onSelect: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
};

type Section = { categoryKey: string; groups: { groupKey: string; outcomes: ViewOutcome[] }[] };

/** Consecutive runs of the same category and group, in result order. */
function sections(results: ViewOutcome[]): Section[] {
  const out: Section[] = [];
  for (const outcome of results) {
    let section = out[out.length - 1];
    if (!section || section.categoryKey !== outcome.categoryKey) {
      section = { categoryKey: outcome.categoryKey, groups: [] };
      out.push(section);
    }
    let group = section.groups[section.groups.length - 1];
    if (!group || group.groupKey !== outcome.groupKey) {
      group = { groupKey: outcome.groupKey, outcomes: [] };
      section.groups.push(group);
    }
    group.outcomes.push(outcome);
  }
  return out;
}

/**
 * Never more index columns than there is content for: a filter that leaves one
 * or two group domains shouldn't leave empty columns beside them. A single
 * group flows its own outcomes into columns once it has enough of them.
 */
function groupColumns(groups: number): string {
  if (groups >= 3) return "sm:columns-2 xl:columns-3";
  return groups === 2 ? "sm:columns-2" : "";
}

function itemColumns(outcomes: number): string {
  if (outcomes > 10) return "sm:columns-2 xl:columns-3";
  return outcomes > 5 ? "sm:columns-2" : "";
}

function Count({ n }: { n: number }) {
  return (
    <span className="tabular-nums font-normal text-ink-muted">
      {n}
      <span className="sr-only"> {n === 1 ? "outcome" : "outcomes"}</span>
    </span>
  );
}

export default function OutcomeIndex({
  variant,
  results,
  grouped,
  categoryByKey,
  groupByKey,
  tones,
  search,
  selectedId,
  languageName,
  hrefFor,
  onSelect,
}: OutcomeIndexProps) {
  const highlight = search?.highlight ?? null;
  const rail = variant === "rail";

  function excerptOf(outcome: ViewOutcome): ReactNode {
    const hit = search?.hits.get(outcome.id);
    const field = hit?.fields.find((f) => RESULT_FIELDS.includes(f));
    if (!hit || !field || hit.fields.includes("outcomeDomain")) return null;
    const text = outcome[field].text;
    const excerpt = snippet(text, highlightRanges(text, highlight), rail ? 30 : 50, rail ? 70 : 110);
    if (!excerpt) return null;
    return (
      <span className={`mt-1 block leading-snug text-ink-muted ${rail ? "text-[0.8125rem]" : "text-sm"}`}>
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
      <li key={outcome.id} style={showContext ? toneVars(tones.get(outcome.categoryKey)) : undefined} className="break-inside-avoid">
        <a
          id={`result-${outcome.id}`}
          href={hrefFor(outcome.id)}
          onClick={(event) => onSelect(event, outcome.id)}
          aria-current={selected ? "true" : undefined}
          className={
            rail
              ? `group relative -mx-3 block rounded-r-[3px] px-3 py-2 transition-colors duration-150 ${
                  selected ? "bg-[var(--cat-soft)]" : "hover:bg-paper-alt"
                }`
              : "group -mx-2 block rounded-[3px] px-2 py-1.5 transition-colors duration-150 hover:bg-[var(--cat-soft)]"
          }
        >
          {rail && (
            <span
              aria-hidden="true"
              className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-[var(--cat-line)] transition-opacity duration-150 ${
                selected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
              }`}
            />
          )}
          <span
            className={`block leading-snug ${rail ? "text-[0.9375rem]" : "text-[1rem]"} ${
              selected ? "font-semibold text-ink" : "text-ink group-hover:text-[var(--cat-text)]"
            } transition-colors duration-150`}
          >
            <Highlighted text={outcome.outcomeDomain.text} highlight={highlight} />
            {outcome.outcomeDomain.fallback && (
              <span className="ml-1.5 align-[0.1em] text-[0.625rem] font-semibold text-ink-muted" title={`Not yet translated into ${languageName}`}>
                EN
              </span>
            )}
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

  // ---- Flat results (best match, A–Z) ----------------------------------------
  if (!grouped) {
    return (
      <ol
        aria-label="Outcomes"
        className={rail ? "space-y-0.5" : "grid gap-x-10 gap-y-3 sm:grid-cols-2 xl:grid-cols-3"}
      >
        {results.map((outcome) => item(outcome, true))}
      </ol>
    );
  }

  // ---- Grouped by category and group domain ------------------------------------
  if (rail) {
    return (
      <div>
        {sections(results).map((section) => (
          <div key={section.categoryKey} style={toneVars(tones.get(section.categoryKey))} className="mt-6 first:mt-0">
            <p className="flex items-center gap-2 text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--cat-text)]">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--cat-line)]" />
              {categoryByKey.get(section.categoryKey)?.label.text}
            </p>
            {section.groups.map((group) => (
              <div key={group.groupKey} className="mt-3">
                <p lang={groupByKey.get(group.groupKey)?.label.fallback ? "en" : undefined} className="text-xs font-medium text-ink-muted">
                  {groupByKey.get(group.groupKey)?.label.text}
                </p>
                <ul className="mt-1 space-y-px">
                  {group.outcomes.map((outcome) => item(outcome, false))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12 sm:space-y-14">
      {sections(results).map((section) => {
        const category = categoryByKey.get(section.categoryKey);
        const shown = section.groups.reduce((n, g) => n + g.outcomes.length, 0);
        const headingId = `index-${category?.slug ?? section.categoryKey}`;
        return (
          <section key={section.categoryKey} aria-labelledby={headingId} style={toneVars(tones.get(section.categoryKey))}>
            <h2
              id={headingId}
              className="flex items-baseline gap-3 border-b border-[var(--cat-tint)] pb-3 text-lg font-semibold tracking-tight text-ink"
            >
              <span aria-hidden="true" className="size-2.5 shrink-0 translate-y-[-0.1em] self-center rounded-full bg-[var(--cat-line)]" />
              <span lang={category?.label.fallback ? "en" : undefined}>{category?.label.text}</span>
              <span className="text-sm">
                <Count n={shown} />
              </span>
            </h2>
            <div className={`mt-6 gap-x-12 2xl:gap-x-16 ${groupColumns(section.groups.length)}`}>
              {section.groups.map((group) => {
                const info = groupByKey.get(group.groupKey);
                const single = section.groups.length === 1;
                return (
                  <div key={group.groupKey} className="mb-8 break-inside-avoid">
                    <h3 className={`flex items-baseline gap-3 ${single ? "" : "justify-between"} text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-[var(--cat-text)]`}>
                      <span lang={info?.label.fallback ? "en" : undefined}>{info?.label.text}</span>
                      <Count n={group.outcomes.length} />
                    </h3>
                    <ul className={`mt-2 gap-x-12 2xl:gap-x-16 ${single ? itemColumns(group.outcomes.length) : ""}`}>
                      {group.outcomes.map((outcome) => item(outcome, false))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
