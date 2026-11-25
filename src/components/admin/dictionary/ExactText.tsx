import type { ReactNode } from "react";
import { codePoint, describeCharacter, isUnprintable } from "@/lib/dictionary/explorer";
import { highlightRanges } from "@/lib/dictionary/search";

type ExactTextProps = {
  text: string;
  /** Folded search terms to highlight. */
  terms?: string[];
  /** Show spaces, line breaks and tabs as visible symbols. */
  showInvisible?: boolean;
};

const UNPRINTABLE = /[-\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|[\u{F0000}-\u{10FFFF}]/u;

/**
 * Stored dictionary text shown exactly: every character, line break and
 * space as it is in the data (white-space: pre-wrap), rendered as React text
 * nodes, never as HTML. Characters that can't be seen are marked instead
 * of silently disappearing: symbol-font glyphs and control characters
 * always, spaces and line breaks on request.
 */
export default function ExactText({ text, terms = [], showInvisible = false }: ExactTextProps) {
  const ranges = terms.length > 0 ? highlightRanges(text, { partial: terms, whole: [] }) : [];
  const parts: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) parts.push(...renderRun(text.slice(cursor, range.start), `t${index}`, showInvisible));
    parts.push(
      <mark key={`m${index}`} className="rounded-[2px] bg-mint/60 text-ink">
        {renderRun(text.slice(range.start, range.end), `m${index}`, showInvisible)}
      </mark>
    );
    cursor = range.end;
  });
  if (cursor < text.length) parts.push(...renderRun(text.slice(cursor), "tail", showInvisible));
  return (
    <span className={`whitespace-pre-wrap ${showInvisible ? "[overflow-wrap:anywhere]" : "break-words"}`} data-exact-text="">
      {parts}
    </span>
  );
}

function renderRun(run: string, key: string, showInvisible: boolean): ReactNode[] {
  if (!showInvisible && !UNPRINTABLE.test(run)) return [run];
  const out: ReactNode[] = [];
  let buffer = "";
  let n = 0;
  const flush = () => {
    if (buffer) out.push(buffer);
    buffer = "";
  };
  for (const char of run) {
    if (isUnprintable(char)) {
      flush();
      out.push(
        <span
          key={`${key}-${n++}`}
          title="A symbol-font or control character that won't display on the website"
          className="mx-0.5 inline-block border border-amber-600 bg-amber-50 px-1 font-mono text-[0.75em] leading-tight text-amber-950"
        >
          {codePoint(char)}
        </span>
      );
      continue;
    }
    const marker = showInvisible ? describeCharacter(char) : null;
    if (!marker) {
      buffer += char;
      continue;
    }
    flush();
    out.push(
      <span key={`${key}-${n++}`} aria-hidden="true" className="text-ink-muted">
        {marker.label}
      </span>
    );
    // Keep the real line break / tab so the layout stays the same.
    if (marker.kind === "break" && char === "\n") out.push("\n");
    if (marker.kind === "tab") out.push("\t");
  }
  flush();
  return out;
}
