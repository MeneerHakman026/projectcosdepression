"use client";

import type { CategoryTone } from "@/lib/dictionary/category-colors";
import { toneVars } from "@/lib/dictionary/category-colors";
import type { ViewCategory } from "@/lib/dictionary/view";

type CategoryNavProps = {
  label: string;
  categories: ViewCategory[];
  tones: Map<string, CategoryTone>;
  /** Outcomes matching the current search, per category and per group key. */
  matching: Map<string, number>;
  /** Show match counts (search or translated-only active) rather than totals. */
  filtered: boolean;
  total: number;
  categoryKey: string | null;
  groupKey: string | null;
  languageName: string;
  onSelect: (categoryKey: string | null, groupKey: string | null) => void;
};

function EnMark({ languageName }: { languageName: string }) {
  return (
    <span className="ml-1.5 align-[0.1em] text-[0.625rem] font-semibold tracking-wide text-ink-muted" title={`Not yet translated into ${languageName}`}>
      EN
    </span>
  );
}

/**
 * Category → Group Domain navigation, generated from the data. One quiet row
 * of category tabs (each with its colour), and — only once a category is
 * chosen — a second row with its group domains. Counts follow the search.
 */
export default function CategoryNav({
  label,
  categories,
  tones,
  matching,
  filtered,
  total,
  categoryKey,
  groupKey,
  languageName,
  onSelect,
}: CategoryNavProps) {
  const active = categoryKey ? categories.find((c) => c.key === categoryKey) : undefined;
  const allCount = filtered ? categories.reduce((sum, c) => sum + (matching.get(c.key) ?? 0), 0) : total;

  const tab = (selected: boolean) =>
    `group relative inline-flex min-h-11 shrink-0 items-center gap-2 text-[0.9375rem] transition-colors duration-150 ${
      selected ? "font-semibold text-ink" : "text-ink-muted hover:text-ink"
    }`;

  return (
    <nav aria-label={label}>
      <ul className="flex gap-x-6 overflow-x-auto border-b border-border [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        <li className="shrink-0">
          <button type="button" aria-pressed={categoryKey === null} onClick={() => onSelect(null, null)} className={tab(categoryKey === null)}>
            All
            <span className="tabular-nums text-sm font-normal text-ink-muted">{allCount}</span>
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-0 h-0.5 bg-ink transition-opacity ${categoryKey === null ? "opacity-100" : "opacity-0"}`}
            />
          </button>
        </li>
        {categories.map((category) => {
          const selected = category.key === categoryKey;
          const count = filtered ? matching.get(category.key) ?? 0 : category.count;
          return (
            <li key={category.key} className="shrink-0" style={toneVars(tones.get(category.key))}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : category.key, null)}
                className={`${tab(selected)} ${filtered && count === 0 ? "opacity-55" : ""}`}
              >
                <span aria-hidden="true" className="size-2 rounded-full bg-[var(--cat-line)]" />
                <span lang={category.label.fallback ? "en" : undefined} className={selected ? "text-[var(--cat-text)]" : undefined}>
                  {category.label.text}
                  {category.label.fallback && <EnMark languageName={languageName} />}
                </span>
                <span className="tabular-nums text-sm font-normal text-ink-muted">
                  {count}
                  <span className="sr-only"> outcomes{filtered ? " match" : ""}</span>
                </span>
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 bottom-0 h-0.5 bg-[var(--cat-line)] transition-opacity duration-150 ${
                    selected ? "opacity-100" : "opacity-0 group-hover:opacity-40"
                  }`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div style={toneVars(tones.get(active.key))} className="pt-3">
          <ul aria-label={`Group domains in ${active.label.text}`} className="flex flex-wrap gap-1.5">
            <li>
              <button
                type="button"
                aria-pressed={groupKey === null}
                onClick={() => onSelect(active.key, null)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors duration-150 ${
                  groupKey === null
                    ? "border-[var(--cat-tint)] bg-[var(--cat-soft)] font-medium text-[var(--cat-text)]"
                    : "border-border text-ink-muted hover:border-[var(--cat-tint)] hover:text-ink"
                }`}
              >
                All groups
              </button>
            </li>
            {active.groups.map((group) => {
              const selected = group.key === groupKey;
              const count = filtered ? matching.get(group.key) ?? 0 : group.count;
              return (
                <li key={group.key}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onSelect(active.key, selected ? null : group.key)}
                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors duration-150 ${
                      selected
                        ? "border-[var(--cat-tint)] bg-[var(--cat-soft)] font-medium text-[var(--cat-text)]"
                        : "border-border text-ink-muted hover:border-[var(--cat-tint)] hover:text-ink"
                    } ${filtered && count === 0 ? "opacity-55" : ""}`}
                  >
                    <span lang={group.label.fallback ? "en" : undefined}>
                      {group.label.text}
                      {group.label.fallback && <EnMark languageName={languageName} />}
                    </span>
                    <span className="tabular-nums text-xs text-ink-muted">
                      {count}
                      <span className="sr-only"> outcomes</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
