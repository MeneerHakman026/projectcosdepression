import type { ParticipantRole } from "@/content/dictionary/schema";
import type { SearchResult } from "@/lib/dictionary/search";
import { parseVerbatims } from "@/lib/dictionary/verbatims";
import Highlighted from "./Highlighted";

/**
 * Participant groups take the three COS-D brand colours (the three
 * perspectives of the logo), assigned by legend order — not hardcoded to
 * particular groups. Used only as a small marker beside a written label.
 */
const ROLE_MARKERS = ["bg-teal", "bg-navy", "bg-mint"];

export function roleMarker(roles: readonly ParticipantRole[], code: string) {
  const index = Math.max(0, roles.findIndex((role) => role.code.toLowerCase() === code.toLowerCase()));
  return ROLE_MARKERS[index % ROLE_MARKERS.length];
}

type VerbatimsProps = {
  text: string;
  lang: string;
  roles: readonly ParticipantRole[];
  highlight?: SearchResult["highlight"] | null;
};

const QUOTE_TEXT =
  "[font-family:var(--font-quote),Georgia,'Times_New_Roman',serif] text-[1.125rem] leading-[1.65] text-ink [font-optical-sizing:auto] sm:text-[1.1875rem]";

/**
 * Participant quotations, visually distinct from the scientific text. When
 * every line starts with a known participant-group label, each line becomes
 * its own attributed block; otherwise the text is shown exactly as written.
 * The quotation text itself is never split, reordered or edited — the
 * source's own quotation marks are the only quotation marks shown.
 */
export default function Verbatims({ text, lang, roles, highlight }: VerbatimsProps) {
  const parsed = parseVerbatims(text, roles.map((role) => role.code));
  if (parsed.kind === "empty") return null;

  if (parsed.kind === "raw") {
    return (
      <blockquote lang={lang} className={`whitespace-pre-line ${QUOTE_TEXT}`}>
        <Highlighted text={parsed.text} highlight={highlight} />
      </blockquote>
    );
  }

  return (
    <ul className="divide-y divide-[color-mix(in_srgb,var(--cat-tint,var(--color-border))_55%,white)]">
      {parsed.blocks.map((block, index) => {
        const role = roles.find((r) => r.code.toLowerCase() === block.role.toLowerCase());
        return (
          <li key={`${index}-${block.role}`} className="py-5 first:pt-0 last:pb-0">
            <figure>
              <blockquote lang={lang} className={QUOTE_TEXT}>
                <Highlighted text={block.text} highlight={highlight} />
              </blockquote>
              <figcaption className="mt-2.5 flex items-center gap-2 text-xs text-ink-muted">
                <span aria-hidden="true" className={`h-0.5 w-4 ${roleMarker(roles, block.role)}`} />
                <abbr title={role?.label} className="font-semibold tracking-wide text-ink no-underline">
                  {block.role}
                </abbr>
                {role && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{role.label}</span>
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
