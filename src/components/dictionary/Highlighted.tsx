import { Fragment } from "react";
import { highlightRanges, type Range, type SearchResult } from "@/lib/dictionary/search";

type HighlightedProps = {
  text: string;
  highlight?: SearchResult["highlight"] | null;
  /** Precomputed ranges (e.g. for a snippet); takes precedence over `highlight`. */
  ranges?: Range[];
};

/**
 * Plain text with search matches wrapped in <mark>. Text is always rendered
 * as React text nodes — never as HTML — so dictionary content can't inject
 * markup, whatever a workbook contains.
 */
export default function Highlighted({ text, highlight, ranges }: HighlightedProps) {
  const marks = ranges ?? highlightRanges(text, highlight ?? null);
  if (marks.length === 0) return <>{text}</>;
  const parts = [];
  let cursor = 0;
  marks.forEach((range, index) => {
    if (range.start > cursor) parts.push(<Fragment key={`t${index}`}>{text.slice(cursor, range.start)}</Fragment>);
    parts.push(
      <mark key={`m${index}`} className="rounded-[2px] bg-mint/60 px-[1px] text-ink">
        {text.slice(range.start, range.end)}
      </mark>
    );
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(<Fragment key="tail">{text.slice(cursor)}</Fragment>);
  return <>{parts}</>;
}
