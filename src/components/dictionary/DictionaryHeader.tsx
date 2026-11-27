"use client";

import { useId, useState, type ReactNode } from "react";

type DictionaryHeaderProps = {
  title: string;
  /** CMS: the "About" section heading, used as the toggle's label. */
  aboutLabel: string;
  /** The About text (server-rendered; always in the HTML, shown on request). */
  about: ReactNode;
  /** Extra controls beside the toggle, e.g. the language choice. */
  aside?: ReactNode;
  defaultOpen?: boolean;
};

/**
 * The compact page heading: the title, and an "About this dictionary"
 * disclosure with the introduction, sources and version, so the page opens
 * on the dictionary itself.
 */
export default function DictionaryHeader({ title, aboutLabel, about, aside, defaultOpen = false }: DictionaryHeaderProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <h1 className="text-[1.375rem] font-bold leading-[1.25] tracking-[-0.02em] text-ink sm:text-[1.75rem] lg:text-[1.375rem]">{title}</h1>
        <div className="flex items-center gap-x-5">
          {aside}
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={aboutLabel}
            onClick={() => setOpen((value) => !value)}
            className="min-h-11 text-sm text-ink-muted underline decoration-1 underline-offset-[3px] transition-colors hover:text-ink"
          >
            <span className="sm:max-lg:hidden">About</span>
            <span className="max-sm:hidden lg:hidden">{aboutLabel}</span>
          </button>
        </div>
      </div>
      <div id={panelId} hidden={!open} className="mb-3 max-w-[43.75rem] space-y-2 text-[0.9375rem] leading-[1.7] text-ink-muted">
        {about}
      </div>
    </>
  );
}
