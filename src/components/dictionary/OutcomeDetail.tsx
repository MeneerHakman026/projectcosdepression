"use client";

import { useState, type MouseEvent, type ReactNode, type Ref } from "react";
import RichText from "@/components/RichText";
import type { ParticipantRole } from "@/content/dictionary/schema";
import { toneVars, type CategoryTone } from "@/lib/dictionary/category-colors";
import type { SearchResult } from "@/lib/dictionary/search";
import { parseVerbatims } from "@/lib/dictionary/verbatims";
import type { LocalizedText, ViewCategory, ViewGroup, ViewOutcome } from "@/lib/dictionary/view";
import Highlighted from "./Highlighted";
import Verbatims, { roleMarker } from "./Verbatims";

export type NeighbourLink = { id: string; title: string; href: string } | null;

type OutcomeDetailProps = {
  outcome: ViewOutcome;
  category: ViewCategory | undefined;
  group: ViewGroup | undefined;
  tone: CategoryTone | undefined;
  language: string;
  languageName: string;
  masterLanguage: string;
  roles: readonly ParticipantRole[];
  verbatimsHeading: string;
  verbatimsNote: string;
  highlight: SearchResult["highlight"] | null;
  previous: NeighbourLink;
  next: NeighbourLink;
  shareUrl: string;
  headingRef: Ref<HTMLHeadingElement>;
  onNavigate: (event: MouseEvent<HTMLAnchorElement>, id: string) => void;
  backHref: string;
  onBack: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function FallbackNote({ languageName }: { languageName: string }) {
  return (
    <p className="mt-2 inline-flex items-center gap-2 rounded-sm border border-dashed border-ink-muted/50 px-2 py-0.5 text-xs text-ink-muted">
      <span aria-hidden="true" className="font-semibold">EN</span>
      Not yet translated into {languageName} — shown in English
    </p>
  );
}

function langOf(text: LocalizedText, language: string, master: string) {
  return text.fallback ? master : language;
}

/** One entry row: a small label in the margin (wide panes) or above (narrow), and its text. */
function EntrySection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-y-2.5 @2xl:grid-cols-[9.5rem_minmax(0,1fr)] @2xl:gap-x-10">
      <h3 id={id} className="pt-[0.35em] text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {title}
      </h3>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default function OutcomeDetail({
  outcome,
  category,
  group,
  tone,
  language,
  languageName,
  masterLanguage,
  roles,
  verbatimsHeading,
  verbatimsNote,
  highlight,
  previous,
  next,
  shareUrl,
  headingRef,
  onNavigate,
  backHref,
  onBack,
}: OutcomeDetailProps) {
  const [copied, setCopied] = useState<"idle" | "copied" | "failed">("idle");
  const headingId = `outcome-${outcome.id}-heading`;
  // Attributed quotes already name their participant group, so the legend is only needed for unattributed text.
  const attributed = parseVerbatims(outcome.verbatims.text, roles.map((role) => role.code)).kind === "attributed";

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
    <article aria-labelledby={headingId} style={toneVars(tone)} className="@container pb-4">
      <div className="flex min-h-11 items-center justify-between gap-3">
        <a
          href={backHref}
          onClick={onBack}
          className="group -ml-2 inline-flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <span aria-hidden="true" className="transition-transform duration-150 group-hover:-translate-x-0.5">
            ←
          </span>
          All outcomes
        </a>
        <div className="flex items-center gap-1">
          <span className="font-mono text-xs text-ink-muted" title="Permanent outcome ID">
            {outcome.id}
          </span>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M8.5 11.5a3.5 3.5 0 0 0 5 0l2.5-2.5a3.5 3.5 0 0 0-5-5l-1 1" />
              <path d="M11.5 8.5a3.5 3.5 0 0 0-5 0L4 11a3.5 3.5 0 0 0 5 5l1-1" />
            </svg>
            {copied === "copied" ? "Link copied" : copied === "failed" ? "Couldn't copy" : "Copy link"}
            <span className="sr-only"> to {outcome.outcomeDomain.text}</span>
          </button>
          <span role="status" className="sr-only">
            {copied === "copied" ? "Link copied to clipboard" : copied === "failed" ? `Copy failed. The link is ${shareUrl}` : ""}
          </span>
        </div>
      </div>

      <div key={outcome.id} className="motion-safe:animate-[entry-in_220ms_ease-out]">
        <header className="mt-5 sm:mt-7">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--cat-text,var(--color-accent))]">
            <span aria-hidden="true" className="size-2 rounded-full bg-[var(--cat-line,var(--color-teal))]" />
            <span lang={category?.label.fallback ? masterLanguage : undefined}>{category?.label.text}</span>
            {group && (
              <span lang={group.label.fallback ? masterLanguage : undefined} className="text-ink-muted">
                <span aria-hidden="true" className="mr-2 font-normal text-ink-muted/60">
                  /
                </span>
                <span className="sr-only">, </span>
                {group.label.text}
              </span>
            )}
          </p>

          <h2
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            lang={langOf(outcome.outcomeDomain, language, masterLanguage)}
            className="mt-3 text-[clamp(2rem,1.55rem+1.6vw,3rem)] font-bold leading-[1.08] tracking-[-0.02em] text-balance text-ink [overflow-wrap:anywhere] focus:outline-none"
          >
            <Highlighted text={outcome.outcomeDomain.text} highlight={highlight} />
          </h2>
          {outcome.outcomeDomain.fallback && <FallbackNote languageName={languageName} />}
          <span aria-hidden="true" className="mt-6 block h-0.5 w-12 bg-[var(--cat-line,var(--color-teal))]" />
        </header>

        <div className="mt-8 space-y-9 sm:mt-10 sm:space-y-10">
          {outcome.definition.text && (
            <EntrySection id={`${headingId}-definition`} title="Definition">
              <p
                lang={langOf(outcome.definition, language, masterLanguage)}
                className="max-w-[60ch] whitespace-pre-line text-[clamp(1.1875rem,1.1rem+0.35vw,1.375rem)] leading-[1.55] text-ink"
              >
                <Highlighted text={outcome.definition.text} highlight={highlight} />
              </p>
              {outcome.definition.fallback && <FallbackNote languageName={languageName} />}
            </EntrySection>
          )}

          {outcome.experience.text && (
            <EntrySection id={`${headingId}-experience`} title="Experience">
              <p
                lang={langOf(outcome.experience, language, masterLanguage)}
                className="max-w-[66ch] whitespace-pre-line text-body leading-[1.7] text-ink/85"
              >
                <Highlighted text={outcome.experience.text} highlight={highlight} />
              </p>
              {outcome.experience.fallback && <FallbackNote languageName={languageName} />}
            </EntrySection>
          )}

          {outcome.verbatims.text && (
            <EntrySection id={`${headingId}-verbatims`} title={verbatimsHeading}>
              {outcome.verbatims.fallback && (
                <div className="mb-3">
                  <FallbackNote languageName={languageName} />
                </div>
              )}
              <div className="max-w-[64ch] rounded-[3px] border-l-2 border-[var(--cat-tint,var(--color-border))] bg-[color-mix(in_srgb,var(--cat-soft,var(--color-paper-alt))_45%,white)] px-5 py-6 sm:px-8 sm:py-7">
                <Verbatims
                  text={outcome.verbatims.text}
                  lang={langOf(outcome.verbatims, language, masterLanguage)}
                  roles={roles}
                  highlight={highlight}
                />
              </div>
              <div className="mt-4 max-w-[64ch] space-y-2 text-xs leading-relaxed text-ink-muted">
                <p>
                  <RichText text={verbatimsNote} />
                </p>
                {roles.length > 0 && !attributed && (
                  <dl className="flex flex-wrap gap-x-5 gap-y-1">
                    {roles.map((role) => (
                      <div key={role.code} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className={`h-0.5 w-3 ${roleMarker(roles, role.code)}`} />
                        <dt className="font-semibold text-ink">{role.code}</dt>
                        <dd>{role.label}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            </EntrySection>
          )}
        </div>
      </div>

      <nav aria-label="Other outcomes" className="mt-12 grid grid-cols-2 gap-4 border-t border-border pt-5">
        {previous ? (
          <a
            href={previous.href}
            onClick={(event) => onNavigate(event, previous.id)}
            className="group -m-2 block rounded-sm p-2 text-left"
          >
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">← Previous</span>
            <span className="mt-1 block font-medium text-ink transition-colors group-hover:text-[var(--cat-text,var(--color-accent))]">
              {previous.title}
            </span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={next.href} onClick={(event) => onNavigate(event, next.id)} className="group -m-2 block rounded-sm p-2 text-right">
            <span className="block text-[0.6875rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">Next →</span>
            <span className="mt-1 block font-medium text-ink transition-colors group-hover:text-[var(--cat-text,var(--color-accent))]">
              {next.title}
            </span>
          </a>
        )}
      </nav>
    </article>
  );
}
