import type { ParticipantRole } from "@/content/dictionary/schema";
import type { SearchResult } from "@/lib/dictionary/search";
import { parseVerbatims } from "@/lib/dictionary/verbatims";
import Highlighted from "./Highlighted";

type VerbatimsProps = {
  text: string;
  lang: string;
  roles: readonly ParticipantRole[];
  highlight?: SearchResult["highlight"] | null;
  /** The quotations' type size (the split view scales it on large screens). */
  quoteClassName?: string;
};

const FIGURE = "border-l border-dict-quote py-0.5 pl-5";
const QUOTE = "leading-[1.75] text-ink";

/**
 * Participant quotations, each set off by a thin rule. When every line
 * starts with a known participant-group label, each line becomes its own
 * attributed block; otherwise the text is shown exactly as written. The
 * quotation text itself is never split, reordered or edited — the source's
 * own quotation marks are the only quotation marks shown.
 */
export default function Verbatims({ text, lang, roles, highlight, quoteClassName = "text-base" }: VerbatimsProps) {
  const parsed = parseVerbatims(text, roles.map((role) => role.code));
  if (parsed.kind === "empty") return null;

  if (parsed.kind === "raw") {
    return (
      <figure className={FIGURE}>
        <blockquote lang={lang} className={`whitespace-pre-line ${QUOTE} ${quoteClassName}`}>
          <Highlighted text={parsed.text} highlight={highlight} />
        </blockquote>
      </figure>
    );
  }

  return (
    <ul className="flex flex-col gap-7">
      {parsed.blocks.map((block, index) => {
        const role = roles.find((r) => r.code.toLowerCase() === block.role.toLowerCase());
        return (
          <li key={`${index}-${block.role}`}>
            <figure className={FIGURE}>
              <blockquote lang={lang} className={`${QUOTE} ${quoteClassName}`}>
                <Highlighted text={block.text} highlight={highlight} />
              </blockquote>
              <figcaption className="mt-2 text-[0.8125rem] text-ink-muted">
                <abbr title={role?.label} className="no-underline">
                  {block.role}
                </abbr>
                {role && (
                  <>
                    <span aria-hidden="true"> · </span>
                    <span className="sr-only">, </span>
                    {role.label}
                  </>
                )}
              </figcaption>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
