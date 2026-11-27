"use client";

import { useId, useState, type ReactNode } from "react";
import { useUiText } from "./ui-text";

type DictionaryHeaderProps = {
  title: string;
  /** CMS: the "About" section heading, used as the toggle's label. */
  aboutLabel: string;
  /** The About text (server-rendered; always in the HTML, shown on request). */
  about: ReactNode;
  /** Extra controls beside the toggle, e.g. the language choice. */
  aside?: ReactNode;
  defaultOpen?: boolean;
  /** The language of the title and About text when it isn't the interface language (CMS text is English). */
  contentLang?: string;
};

/**
 * The compact page heading: the title, and an "About this dictionary"
 * disclosure with the introduction, sources and version, so the page opens
 * on the dictionary itself.
 */
export default function DictionaryHeader({ title, aboutLabel, about, aside, defaultOpen = false, contentLang }: DictionaryHeaderProps) {
  const t = useUiText();
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <>
      {/* Sized by its own column (a container query), not the viewport: the
          title and its controls share a row only when they have room; otherwise
          the controls form a deliberate second row, language left and About right. */}
      <div className="@container">
        <div className="flex flex-wrap items-center gap-x-4 @[26rem]:flex-nowrap @[26rem]:justify-between">
          <h1
            className={`text-[1.375rem] font-bold leading-[1.25] tracking-[-0.02em] text-ink sm:text-[1.75rem] lg:text-[length:var(--dict-h1)] ${
              // With a language menu, a narrow column puts the controls on their own row.
              aside ? "basis-full @[26rem]:basis-auto" : ""
            }`}
          >
            {title}
          </h1>
          <div className="flex flex-1 items-center justify-between gap-x-5 @[26rem]:flex-none @[26rem]:justify-end">
            {aside}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              aria-label={aboutLabel}
              onClick={() => setOpen((value) => !value)}
              className="min-h-11 text-sm text-ink-muted underline decoration-1 underline-offset-[3px] transition-colors hover:text-ink"
            >
              <span className="sm:max-lg:hidden">{t.about}</span>
              <span className="max-sm:hidden lg:hidden">{aboutLabel}</span>
            </button>
          </div>
        </div>
      </div>
      <div id={panelId} hidden={!open} lang={contentLang} className="mb-3 max-w-[43.75rem] space-y-2 text-[0.9375rem] leading-[1.7] text-ink-muted">
        {about}
      </div>
    </>
  );
}
