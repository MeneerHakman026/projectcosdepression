import type { ParticipantRole } from "@/content/dictionary/schema";
import type { SearchResult } from "@/lib/dictionary/search";
import { parseVerbatims } from "@/lib/dictionary/verbatims";
import Highlighted from "./Highlighted";

/** Accent per participant group, assigned by legend order — not hardcoded to particular groups. */
const ROLE_ACCENTS = ["border-teal", "border-navy", "border-mint"];
const ROLE_CHIPS = ["bg-teal/15 text-ink", "bg-navy text-paper", "bg-mint/50 text-ink"];

export function roleAccent(roles: readonly ParticipantRole[], code: string) {
  const index = Math.max(0, roles.findIndex((role) => role.code.toLowerCase() === code.toLowerCase()));
  return { border: ROLE_ACCENTS[index % ROLE_ACCENTS.length], chip: ROLE_CHIPS[index % ROLE_CHIPS.length] };
}

type VerbatimsProps = {
  text: string;
  lang: string;
  roles: readonly ParticipantRole[];
  highlight?: SearchResult["highlight"] | null;
};

/**
 * Participant quotations, visually distinct from the scientific text. When
 * every line starts with a known participant-group label, each line becomes
 * its own attributed block; otherwise the text is shown exactly as written.
 * The quotation text itself is never split, reordered or edited.
 */
export default function Verbatims({ text, lang, roles, highlight }: VerbatimsProps) {
  const parsed = parseVerbatims(text, roles.map((role) => role.code));
  if (parsed.kind === "empty") return null;

  if (parsed.kind === "raw") {
    return (
      <blockquote lang={lang} className="border-l-4 border-border bg-paper-alt px-5 py-4 text-body leading-relaxed whitespace-pre-line text-ink">
        <Highlighted text={parsed.text} highlight={highlight} />
      </blockquote>
    );
  }

  return (
    <ul className="space-y-3">
      {parsed.blocks.map((block, index) => {
        const role = roles.find((r) => r.code.toLowerCase() === block.role.toLowerCase());
        const accent = roleAccent(roles, block.role);
        return (
          <li key={`${index}-${block.role}`}>
            <figure className={`border-l-4 ${accent.border} bg-paper-alt px-5 py-4`}>
              <figcaption className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                <abbr title={role?.label} className={`px-1.5 py-0.5 normal-case tracking-normal no-underline ${accent.chip}`}>
                  {block.role}
                </abbr>
                {role && <span className="normal-case tracking-normal">{role.label}</span>}
              </figcaption>
              <blockquote lang={lang} className="mt-2 text-body leading-relaxed text-ink">
                <Highlighted text={block.text} highlight={highlight} />
              </blockquote>
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
