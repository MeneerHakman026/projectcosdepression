"use client";

import { useState, type MouseEvent, type Ref } from "react";
import RichText from "@/components/RichText";
import type { ParticipantRole } from "@/content/dictionary/schema";
import type { SearchResult } from "@/lib/dictionary/search";
import type { LocalizedText, ViewCategory, ViewGroup, ViewOutcome } from "@/lib/dictionary/view";
import Highlighted from "./Highlighted";
import Verbatims from "./Verbatims";

export type NeighbourLink = { id: string; title: string; href: string } | null;

type OutcomeDetailProps = {
  outcome: ViewOutcome;
  category: ViewCategory | undefined;
  group: ViewGroup | undefined;
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
    <p className="mt-2 inline-flex items-center gap-2 border border-dashed border-ink-muted/50 px-2 py-0.5 text-xs text-ink-muted">
      <span aria-hidden="true" className="font-semibold">EN</span>
      Not yet translated into {languageName} — shown in English
    </p>
  );
}

function langOf(text: LocalizedText, language: string, master: string) {
  return text.fallback ? master : language;
}

export default function OutcomeDetail({
  outcome,
  category,
  group,
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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied("copied");
    } catch {
      setCopied("failed");
    }
    window.setTimeout(() => setCopied("idle"), 2500);
  }

  const sections: { key: "definition" | "experience"; title: string; lead: boolean }[] = [
    { key: "definition", title: "Definition", lead: true },
    { key: "experience", title: "Experience", lead: false },
  ];

  return (
    <article aria-labelledby={headingId} className="pb-6">
      <a
        href={backHref}
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-ink-muted underline-offset-4 hover:text-ink hover:underline lg:hidden"
      >
        <span aria-hidden="true">←</span> Back to results
      </a>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          {category?.label.text}
          {group && (
            <>
              <span aria-hidden="true" className="mx-2 text-ink-muted/60">
                ›
              </span>
              <span className="sr-only">, </span>
              {group.label.text}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink-muted" title="Permanent outcome ID">
            {outcome.id}
          </span>
          <button type="button" onClick={copyLink} className="btn btn-compact">
            {copied === "copied" ? "Link copied" : copied === "failed" ? "Couldn't copy" : "Copy link"}
            <span className="sr-only"> to {outcome.outcomeDomain.text}</span>
          </button>
          <span role="status" className="sr-only">
            {copied === "copied" ? "Link copied to clipboard" : copied === "failed" ? `Copy failed. The link is ${shareUrl}` : ""}
          </span>
        </div>
      </div>

      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        lang={langOf(outcome.outcomeDomain, language, masterLanguage)}
        className="mt-3 text-heading font-bold tracking-tight text-ink focus:outline-none"
      >
        <Highlighted text={outcome.outcomeDomain.text} highlight={highlight} />
      </h2>
      {outcome.outcomeDomain.fallback && <FallbackNote languageName={languageName} />}

      <div className="mt-8 space-y-8">
        {sections.map(({ key, title, lead }) =>
          outcome[key].text ? (
            <section key={key} aria-labelledby={`${headingId}-${key}`}>
              <h3 id={`${headingId}-${key}`} className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {title}
              </h3>
              <p
                lang={langOf(outcome[key], language, masterLanguage)}
                className={`mt-2 max-w-[68ch] whitespace-pre-line leading-relaxed ${lead ? "text-lead text-ink" : "text-body text-ink"}`}
              >
                <Highlighted text={outcome[key].text} highlight={highlight} />
              </p>
              {outcome[key].fallback && <FallbackNote languageName={languageName} />}
            </section>
          ) : null
        )}

        {outcome.verbatims.text && (
          <section aria-labelledby={`${headingId}-verbatims`} className="border-t border-border pt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id={`${headingId}-verbatims`} className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {verbatimsHeading}
              </h3>
              <span className="text-xs text-ink-muted">Verbatims</span>
            </div>
            {outcome.verbatims.fallback && <FallbackNote languageName={languageName} />}
            <div className="mt-3 max-w-[72ch]">
              <Verbatims
                text={outcome.verbatims.text}
                lang={langOf(outcome.verbatims, language, masterLanguage)}
                roles={roles}
                highlight={highlight}
              />
            </div>
            <p className="mt-4 max-w-[68ch] text-xs leading-relaxed text-ink-muted">
              <RichText text={verbatimsNote} />
            </p>
            {roles.length > 0 && (
              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                {roles.map((role) => (
                  <div key={role.code} className="flex gap-1.5">
                    <dt className="font-semibold text-ink">{role.code}</dt>
                    <dd>{role.label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}
      </div>

      <nav aria-label="Other outcomes" className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
        {previous ? (
          <a href={previous.href} onClick={(event) => onNavigate(event, previous.id)} className="group block text-left">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">← Previous</span>
            <span className="mt-1 block font-medium text-ink group-hover:text-accent">{previous.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next && (
          <a href={next.href} onClick={(event) => onNavigate(event, next.id)} className="group block sm:text-right">
            <span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted">Next →</span>
            <span className="mt-1 block font-medium text-ink group-hover:text-accent">{next.title}</span>
          </a>
        )}
      </nav>
    </article>
  );
}
