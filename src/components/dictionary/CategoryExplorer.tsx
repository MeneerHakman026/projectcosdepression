"use client";

import { useState } from "react";
import type { ViewCategory } from "@/lib/dictionary/view";

const CARD_ACCENTS = ["border-teal", "border-navy", "border-mint"];
const BAR_ACCENTS = ["bg-teal", "bg-navy", "bg-mint"];

type CategoryExplorerProps = {
  heading: string;
  categories: ViewCategory[];
  /** Outcomes matching the current search, per category and per group key. */
  matching: Map<string, number>;
  searching: boolean;
  categoryKey: string | null;
  groupKey: string | null;
  languageName: string;
  onSelect: (categoryKey: string | null, groupKey: string | null) => void;
};

/**
 * An original, card-based explorer of the Category → Group Domain hierarchy.
 * Entirely generated from the published data: one card per category, one
 * row per group domain, with counts (and match counts while searching).
 * Accents cycle through the brand colours by position, so any number of
 * categories works.
 */
export default function CategoryExplorer({
  heading,
  categories,
  matching,
  searching,
  categoryKey,
  groupKey,
  languageName,
  onSelect,
}: CategoryExplorerProps) {
  const [open, setOpen] = useState(false);
  const active = categoryKey !== null;

  return (
    <section aria-labelledby="dictionary-explorer-heading">
      <div className="flex items-center justify-between gap-4">
        <h2 id="dictionary-explorer-heading" className="text-subheading font-semibold text-ink">
          {heading}
        </h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="dictionary-explorer-cards"
          className="btn btn-compact lg:hidden"
        >
          {open ? "Hide" : `Show ${categories.length} categor${categories.length === 1 ? "y" : "ies"}`}
        </button>
      </div>

      <div
        id="dictionary-explorer-cards"
        className={`${open ? "grid" : "hidden"} mt-5 gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,19rem),1fr))] lg:grid`}
      >
        {categories.map((category, index) => {
          const categoryActive = category.key === categoryKey;
          const dimmed = active && !categoryActive;
          const categoryMatches = matching.get(category.key) ?? 0;
          return (
            <div
              key={category.key}
              className={`border-t-4 ${CARD_ACCENTS[index % CARD_ACCENTS.length]} border-x border-b border-x-border border-b-border bg-paper transition-opacity ${
                dimmed ? "opacity-60 hover:opacity-100" : ""
              }`}
            >
              <button
                type="button"
                aria-pressed={categoryActive && groupKey === null}
                onClick={() => onSelect(categoryActive && groupKey === null ? null : category.key, null)}
                className={`flex w-full items-baseline justify-between gap-3 px-4 pt-4 pb-3 text-left ${
                  categoryActive && groupKey === null ? "bg-accent-soft/25" : "hover:bg-paper-alt"
                }`}
              >
                <span className="text-body font-semibold text-ink" lang={category.label.fallback ? "en" : undefined}>
                  {category.label.text}
                  {category.label.fallback && (
                    <span className="ml-2 align-middle text-[0.65rem] font-semibold text-ink-muted" title={`Not yet translated into ${languageName}`}>
                      EN
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-muted">
                  {searching ? `${categoryMatches} of ${category.count}` : category.count}
                  <span className="sr-only"> outcomes{searching ? " match" : ""}</span>
                </span>
              </button>
              <ul className="px-2 pb-3">
                {category.groups.map((group) => {
                  const groupActive = group.key === groupKey;
                  const groupMatches = matching.get(group.key) ?? 0;
                  const share = Math.max(4, Math.round(((searching ? groupMatches : group.count) / Math.max(1, category.count)) * 100));
                  return (
                    <li key={group.key}>
                      <button
                        type="button"
                        aria-pressed={groupActive}
                        onClick={() => onSelect(category.key, groupActive ? null : group.key)}
                        className={`group grid w-full grid-cols-[1fr_auto] items-center gap-x-3 px-2 py-1.5 text-left text-sm ${
                          groupActive ? "bg-accent-soft/40 font-medium text-ink" : "text-ink-muted hover:bg-paper-alt hover:text-ink"
                        } ${searching && groupMatches === 0 ? "opacity-50" : ""}`}
                      >
                        <span lang={group.label.fallback ? "en" : undefined}>{group.label.text}</span>
                        <span className="tabular-nums">
                          {searching ? groupMatches : group.count}
                          <span className="sr-only"> outcomes</span>
                        </span>
                        <span aria-hidden="true" className="col-span-2 mt-1 block h-0.5 bg-border">
                          <span
                            className={`block h-full ${BAR_ACCENTS[index % BAR_ACCENTS.length]} ${groupActive ? "" : "opacity-60 group-hover:opacity-100"}`}
                            style={{ width: `${share}%` }}
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
