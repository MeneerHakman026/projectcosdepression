"use client";

import type { CategoryTone } from "@/lib/dictionary/category-colors";
import { toneVars } from "@/lib/dictionary/category-colors";
import type { ViewCategory } from "@/lib/dictionary/view";
import { useUiText } from "./ui-text";

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
  languageName: string;
  onSelect: (categoryKey: string | null) => void;
};

export function EnMark({ languageName }: { languageName: string }) {
  const t = useUiText();
  return (
    <span className="ml-1.5 align-[0.1em] text-[0.625rem] font-semibold tracking-wide text-ink-muted" title={t.notYetTranslated(languageName)}>
      EN
    </span>
  );
}

/**
 * One quiet row of category tabs, generated from the data: "All" plus one
 * tab per category, each with a live count and, when selected, an
 * underline in the category's colour. Group domains are chosen from the
 * group cards themselves.
 */
export default function CategoryNav({
  label,
  categories,
  tones,
  matching,
  filtered,
  total,
  categoryKey,
  languageName,
  onSelect,
}: CategoryNavProps) {
  const t = useUiText();
  const allCount = filtered ? categories.reduce((sum, c) => sum + (matching.get(c.key) ?? 0), 0) : total;

  const tab = (selected: boolean) =>
    `relative inline-flex min-h-11 shrink-0 items-center gap-1.5 text-[0.9375rem] font-medium lg:text-[length:var(--dict-tab)] text-ink transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:transition-opacity after:duration-150 ${
      selected ? "after:opacity-100" : "after:opacity-0 hover:after:opacity-30"
    }`;

  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-x-[1.375rem] overflow-x-auto border-b border-dict-rule [scrollbar-width:none] sm:gap-x-7 [&::-webkit-scrollbar]:hidden"
    >
      <button type="button" aria-pressed={categoryKey === null} onClick={() => onSelect(null)} className={`${tab(categoryKey === null)} after:bg-ink`}>
        {t.all}
        <span className="tabular-nums text-[0.8125rem] font-normal text-ink-muted">
          {allCount}
          <span className="sr-only">{t.countSuffix(allCount, filtered)}</span>
        </span>
      </button>
      {categories.map((category) => {
        const selected = category.key === categoryKey;
        const count = filtered ? matching.get(category.key) ?? 0 : category.count;
        return (
          <button
            key={category.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(selected ? null : category.key)}
            style={toneVars(tones.get(category.key))}
            className={`${tab(selected)} after:bg-[var(--cat-line)] ${filtered && count === 0 ? "text-ink-muted font-normal" : ""}`}
          >
            <span lang={category.label.fallback ? "en" : undefined}>
              {category.label.text}
              {category.label.fallback && <EnMark languageName={languageName} />}
            </span>
            <span className="tabular-nums text-[0.8125rem] font-normal text-ink-muted">
              {count}
              <span className="sr-only">{t.countSuffix(count, filtered)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
