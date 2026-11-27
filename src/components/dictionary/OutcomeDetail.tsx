"use client";

import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import RichText from "@/components/RichText";
import type { ParticipantRole } from "@/content/dictionary/schema";
import { toneVars, type CategoryTone } from "@/lib/dictionary/category-colors";
import type { SearchResult } from "@/lib/dictionary/search";
import { KEY_SEPARATOR } from "@/lib/dictionary/taxonomy";
import { labelKey } from "@/lib/dictionary/text";
import { parseVerbatims } from "@/lib/dictionary/verbatims";
import type { LocalizedText, ViewCategory, ViewGroup, ViewOutcome } from "@/lib/dictionary/view";
import Highlighted from "./Highlighted";
import { useUiText } from "./ui-text";
import Verbatims from "./Verbatims";

export type NeighbourLink = { id: string; title: string; href: string } | null;

/** Everything an entry shows, whichever way it is presented. */
export type OutcomeEntryProps = {
  outcome: ViewOutcome;
  category: ViewCategory | undefined;
  group: ViewGroup | undefined;
  tone: CategoryTone | undefined;
  language: string;
  languageName: string;
  masterLanguage: string;
  /** Participant groups for verbatims in `language`. */
  roles: readonly ParticipantRole[];
  /** Participant groups for verbatims shown in the master language (a fallback). */
  masterRoles: readonly ParticipantRole[];
  verbatimsHeading: string;
  verbatimsNote: string;
  highlight: SearchResult["highlight"] | null;
  previous: NeighbourLink;
  next: NeighbourLink;
  shareUrl: string;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
};

/**
 * Group domains whose entries also point to crisis support. Matched on the
 * group's key (from the English workbook label, in any category), like the
 * preferred category colours: if the group is renamed, the line simply
 * doesn't show.
 */
const SUPPORT_GROUPS = [labelKey("Autoaggression symptoms")];

function offersSupport(groupKey: string): boolean {
  return SUPPORT_GROUPS.some((key) => groupKey.endsWith(`${KEY_SEPARATOR}${key}`));
}

function FallbackNote({ languageName }: { languageName: string }) {
  const t = useUiText();
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-sm border border-dashed border-ink-muted/50 px-2 py-0.5 text-xs text-ink-muted">
      <span aria-hidden="true" className="font-semibold">EN</span>
      {t.fallbackNote(languageName)}
    </p>
  );
}

function langOf(text: LocalizedText, language: string, master: string) {
  return text.fallback ? master : language;
}

const LABEL = "font-semibold uppercase tracking-[0.14em] text-ink-muted";

/**
 * Per presentation: the sheet keeps its established sizes; the panel follows
 * the split-view reference. In the panel, the band, text and Previous / Next
 * share one left-aligned measure (~82 characters of body text at any size) behind the
 * same inset from the card's left edge, so they line up with each other and
 * the reading starts right beside the index; extra width in a wide card
 * stays on the right.
 */
const VARIANT = {
  sheet: {
    band: "rounded-t-xl py-2.5 pr-3 pl-5 sm:rounded-none sm:pr-10 sm:pl-12",
    padX: "px-5 sm:px-12",
    body: "pt-7 pb-10",
    title: "text-[2rem] sm:text-[2.5rem]",
    measure: "",
    label: "text-xs",
    definition: "text-[1.1875rem] sm:text-[1.3125rem]",
    text: "text-base",
    small: "text-sm",
    section: "mb-8",
  },
  panel: {
    band: "rounded-t-[7px] py-3.5 px-[clamp(1.25rem,4vw,3rem)]",
    padX: "px-[clamp(1.25rem,4vw,3rem)]",
    body: "pt-6 pb-10",
    // Type and spacing from the split view's scale (globals.css, .dictionary-split):
    // as on laptops up to ~1440px, a little larger on big monitors.
    title: "text-[length:var(--dict-title)]",
    measure: "w-full max-w-[calc(var(--dict-text)*38)]",
    label: "text-[length:var(--dict-label)]",
    definition: "text-[length:var(--dict-definition)]",
    text: "text-[length:var(--dict-text)]",
    small: "text-[length:var(--dict-small)]",
    section: "mb-(--dict-section)",
  },
} as const;

type EntryVariant = keyof typeof VARIANT;

/**
 * One dictionary entry: the category band, the scrolling text and
 * Previous / Next. Shared by the modal sheet (OutcomeSheet) and the inline
 * split-view panel (OutcomePanel), which only differ in what surrounds it.
 */
function OutcomeEntry({
  outcome,
  category,
  group,
  language,
  languageName,
  masterLanguage,
  roles: languageRoles,
  masterRoles,
  verbatimsHeading,
  verbatimsNote,
  highlight,
  previous,
  next,
  shareUrl,
  onNavigate,
  variant,
  headingId,
  bandAction,
  focusHeadingOnChange,
}: Omit<OutcomeEntryProps, "tone"> & {
  variant: EntryVariant;
  headingId: string;
  /** Shown at the end of the band (the sheet's close button). */
  bandAction?: ReactNode;
  /** Modal sheet: move focus to the new title on Previous / Next. The inline panel leaves focus where it is. */
  focusHeadingOnChange: boolean;
}) {
  const v = VARIANT[variant];
  const t = useUiText();
  // English text shown as a fallback uses the English participant codes.
  const roles = outcome.verbatims.fallback ? masterRoles : languageRoles;
  const bodyRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  // Attributed quotes already name their participant group, so the legend is only needed for unattributed text.
  const attributed = parseVerbatims(outcome.verbatims.text, roles.map((role) => role.code)).kind === "attributed";
  const support = offersSupport(outcome.groupKey);

  // Moving to another entry: start at its top (and, in the sheet, announce its title).
  const shownId = useRef(outcome.id);
  useEffect(() => {
    if (shownId.current === outcome.id) return;
    shownId.current = outcome.id;
    setCopied("idle");
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (focusHeadingOnChange) headingRef.current?.focus({ preventScroll: true });
  }, [outcome.id, focusHeadingOnChange]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  }

  return (
    <>
      {/* The category band, in the category's colour. */}
      <div className={`flex-none bg-[var(--cat-band)] text-[var(--cat-band-text)] ${v.band}`}>
        <div className={`flex items-center justify-between gap-3 ${v.measure}`}>
          <p className={`min-w-0 font-semibold leading-[1.45] ${v.small}`}>
            <span lang={category?.label.fallback ? masterLanguage : undefined}>{category?.label.text}</span>
            {group && (
              <>
                <span aria-hidden="true"> › </span>
                <span className="sr-only">, </span>
                <span lang={group.label.fallback ? masterLanguage : undefined}>{group.label.text}</span>
              </>
            )}
          </p>
          {bandAction}
        </div>
      </div>

      <div
        ref={bodyRef}
        tabIndex={0}
        aria-labelledby={headingId}
        role="region"
        className={`dictionary-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-wrap:break-word] focus-visible:outline-offset-[-2px] ${v.padX} ${v.body}`}
      >
        <div key={outcome.id} className={`motion-safe:animate-[entry-in_200ms_ease-out] ${v.measure}`}>
          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            lang={langOf(outcome.outcomeDomain, language, masterLanguage)}
            className={`font-bold leading-[1.15] tracking-[-0.02em] text-balance [overflow-wrap:anywhere] focus:outline-none ${v.title}`}
          >
            <Highlighted text={outcome.outcomeDomain.text} highlight={highlight} />
          </h2>
          {outcome.outcomeDomain.fallback && <FallbackNote languageName={languageName} />}

          <div className="mt-1.5 mb-6 flex items-center gap-4">
            <button
              type="button"
              onClick={copyLink}
              className="min-h-11 text-[0.8125rem] font-medium text-ink underline decoration-1 underline-offset-[3px] transition-colors hover:text-accent"
            >
              {copied === "copied" ? t.linkCopied : copied === "failed" ? t.copyFailed : t.copyLink}
              <span className="sr-only">{t.copyLinkTo(outcome.outcomeDomain.text)}</span>
            </button>
            <span role="status" className="sr-only">
              {copied === "copied" ? t.copiedAnnouncement : copied === "failed" ? t.copyFailedAnnouncement(shareUrl) : ""}
            </span>
          </div>

          {outcome.definition.text && (
            <section aria-labelledby={`${headingId}-definition`} className={v.section}>
              <h3 id={`${headingId}-definition`} className={`${LABEL} ${v.label}`}>
                {t.definition}
              </h3>
              <p lang={langOf(outcome.definition, language, masterLanguage)} className={`mt-2.5 whitespace-pre-line leading-[1.55] ${v.definition}`}>
                <Highlighted text={outcome.definition.text} highlight={highlight} />
              </p>
              {outcome.definition.fallback && <FallbackNote languageName={languageName} />}
            </section>
          )}

          {outcome.experience.text && (
            <section aria-labelledby={`${headingId}-experience`} className={v.section}>
              <h3 id={`${headingId}-experience`} className={`${LABEL} ${v.label}`}>
                {t.experience}
              </h3>
              <p lang={langOf(outcome.experience, language, masterLanguage)} className={`mt-2.5 whitespace-pre-line leading-[1.75] ${v.text}`}>
                <Highlighted text={outcome.experience.text} highlight={highlight} />
              </p>
              {outcome.experience.fallback && <FallbackNote languageName={languageName} />}
            </section>
          )}

          {outcome.verbatims.text && (
            <section aria-labelledby={`${headingId}-verbatims`} className="border-t border-border pt-7">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id={`${headingId}-verbatims`} className={`${LABEL} ${v.label}`}>
                  {verbatimsHeading}
                </h3>
                <span className="text-[0.8125rem] text-ink-muted">{t.verbatimsTag}</span>
              </div>
              {outcome.verbatims.fallback && <FallbackNote languageName={languageName} />}
              <div className="mt-5">
                <Verbatims
                  text={outcome.verbatims.text}
                  lang={langOf(outcome.verbatims, language, masterLanguage)}
                  roles={roles}
                  highlight={highlight}
                  quoteClassName={v.text}
                />
              </div>
              <div className="mt-6 space-y-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                <p>
                  <RichText text={verbatimsNote} />
                </p>
                {roles.length > 0 && !attributed && (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1">
                    {roles.map((role) => (
                      <div key={role.code} className="flex gap-1.5">
                        <dt className="font-semibold text-ink">{role.code}</dt>
                        <dd>{role.label}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </section>
          )}

          {support && (
            <p className={`mt-8 border-t border-border pt-5 leading-[1.6] ${v.small}`}>
              {t.support[0]}
              <a href="https://findahelpline.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-[3px]">
                findahelpline.com
              </a>
              {t.support[1]}
            </p>
          )}
        </div>
      </div>

      <nav aria-label={t.previousNextLabel} className={`flex-none border-t border-border py-1 ${v.padX}`}>
        <div className={`flex gap-6 ${v.measure}`}>
          {previous ? (
            <a href={previous.href} onClick={(event) => onNavigate(event, previous.id)} className="group block min-h-16 min-w-0 flex-1 py-2 text-left">
              <span className="block text-xs text-ink-muted">← {t.previous}</span>
              <span className={`mt-0.5 block font-semibold ${v.small} text-ink group-hover:underline group-hover:underline-offset-[3px]`}>{previous.title}</span>
            </a>
          ) : (
            <span className="flex-1" />
          )}
          {next ? (
            <a href={next.href} onClick={(event) => onNavigate(event, next.id)} className="group block min-h-16 min-w-0 flex-1 py-2 text-right">
              <span className="block text-xs text-ink-muted">{t.next} →</span>
              <span className={`mt-0.5 block font-semibold ${v.small} text-ink group-hover:underline group-hover:underline-offset-[3px]`}>{next.title}</span>
            </a>
          ) : (
            <span className="flex-1" />
          )}
        </div>
      </nav>
    </>
  );
}

/**
 * Tablets and phones: the entry in a modal sheet over the index, from the
 * right on tablets and from the bottom on phones. The open entry lives in
 * the URL (see DictionaryExplorer), so this component only shows it;
 * closing (×, Escape, the backdrop) asks the explorer to change the URL.
 *
 * A native <dialog> provides the focus trap, the inert page behind it and
 * Escape. A deep link is server-rendered open (data-ssr-open, see
 * globals.css: only below the split-view width) and becomes modal once
 * `modal` is true, i.e. once the page knows it is narrow.
 */
export function OutcomeSheet({ modal, onClose, ...props }: OutcomeEntryProps & { modal: boolean; onClose: () => void }) {
  const t = useUiText();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = `outcome-${props.outcome.id}-heading`;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!modal || !dialog) return;
    if (!dialog.open) dialog.showModal();
    // Modal now: the server-rendered stand-in (see globals.css) is no longer
    // needed. React never sets this attribute again, as its value doesn't change.
    dialog.removeAttribute("data-ssr-open");
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [modal]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      data-ssr-open=""
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === event.currentTarget) onClose();
      }}
      style={toneVars(props.tone)}
      className="dictionary-entry fixed inset-x-0 top-6 bottom-0 m-0 h-auto max-h-none w-full max-w-none overflow-hidden rounded-t-xl border-0 bg-paper p-0 text-ink shadow-[0_0_40px_rgb(31_42_68/0.16)] motion-safe:animate-[sheet-in-up_240ms_ease-out] sm:top-0 sm:left-auto sm:h-dvh sm:w-[36.25rem] sm:max-w-full sm:rounded-none sm:motion-safe:animate-[sheet-in-right_240ms_ease-out]"
    >
      <div className="flex h-full flex-col">
        <OutcomeEntry
          {...props}
          variant="sheet"
          headingId={headingId}
          focusHeadingOnChange
          bandAction={
            <button
              type="button"
              onClick={onClose}
              className="dictionary-entry-close -my-1 inline-flex size-11 flex-none items-center justify-center rounded text-2xl font-light text-current transition-colors hover:bg-white/15"
            >
              <span aria-hidden="true">×</span>
              <span className="sr-only">{t.close}</span>
            </button>
          }
        />
      </div>
    </dialog>
  );
}

/**
 * The split view's card: left-aligned in the reading column and capped at
 * 80rem, so on ultrawide screens the unused space is canvas to the right of
 * the card, never between the index and the reading.
 */
const PANEL_CARD = "flex min-h-0 w-full max-w-[80rem] flex-1 flex-col rounded-lg border border-dict-card bg-paper";

/**
 * Wide screens: the entry inline in the split view's right-hand panel. Not
 * a dialog: no backdrop, no focus trap, no Escape. Choosing another outcome
 * in the index updates it in place and leaves focus where the visitor is;
 * a polite live region names the newly shown outcome.
 */
export function OutcomePanel(props: OutcomeEntryProps) {
  const t = useUiText();
  const headingId = `entry-${props.outcome.id}-heading`;
  const [announcement, setAnnouncement] = useState("");
  const shownId = useRef(props.outcome.id);
  const title = props.outcome.outcomeDomain.text;

  useEffect(() => {
    if (shownId.current === props.outcome.id) return;
    shownId.current = props.outcome.id;
    setAnnouncement(t.showing(title));
  }, [props.outcome.id, title, t]);

  return (
    // A plain container: the entry's scrolling text is already a region named by its title.
    <div style={toneVars(props.tone)} className={`dictionary-panel ${PANEL_CARD}`}>
      <OutcomeEntry {...props} variant="panel" headingId={headingId} focusHeadingOnChange={false} />
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** Wide screens, nothing selected yet: a quiet note in the right-hand panel. */
export function EntryPlaceholder({ children }: { children: ReactNode }) {
  const t = useUiText();
  return (
    <div className={PANEL_CARD}>
      {/* The same inset and measure as an entry's text. */}
      <div className="px-[clamp(1.25rem,4vw,3rem)] py-12 text-[length:var(--dict-text)] leading-[1.75] text-ink-muted">
        <div className="w-full max-w-[calc(var(--dict-text)*38)]">
          <h2 className="mb-3 text-[1.5em] font-bold tracking-[-0.01em] text-ink">{t.selectOutcome}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
