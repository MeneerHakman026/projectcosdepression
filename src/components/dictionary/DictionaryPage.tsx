import { Newsreader } from "next/font/google";
import { Suspense } from "react";
import RichText from "@/components/RichText";
import TriMark from "@/components/TriMark";
import type { DictionaryPageContent } from "@/content/dictionary/schema";
import type { DictionaryView } from "@/lib/dictionary/view";
import DictionaryExplorer, { type ExplorerFilters } from "./DictionaryExplorer";

/** Participants' own words get a quiet serif voice, distinct from the scientific text. */
const quoteFace = Newsreader({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-quote",
  display: "swap",
});

type DictionaryPageProps = {
  content: DictionaryPageContent;
  view: DictionaryView | null;
  basePath: string;
  urlMode: "path" | "query";
  preserve?: Record<string, string>;
  filters: ExplorerFilters;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

/**
 * The Outcome Dictionary page. Wording comes from the CMS page
 * (`content`); every category, group, outcome and count comes from the
 * published dataset (`view`). Rendered by the public route and by the admin
 * preview, so a preview is always the real page.
 *
 * There is deliberately no hero: visitors arrive to look something up, so
 * the page opens on the title, search and the dictionary itself. The CMS
 * introduction is kept, as context, in the "About" section after it.
 */
export default function DictionaryPage({ content, view, basePath, urlMode, preserve, filters }: DictionaryPageProps) {
  const { intro } = content;

  return (
    <div className={quoteFace.variable}>
      {view ? (
        // useSearchParams in the explorer needs a Suspense boundary.
        <Suspense>
          <DictionaryExplorer
            view={view}
            texts={{
              heading: intro.heading,
              verbatimsHeading: content.verbatims.heading,
              verbatimsNote: content.verbatims.note,
              roles: content.verbatims.roles,
            }}
            basePath={basePath}
            urlMode={urlMode}
            preserve={preserve}
            initialFilters={filters}
          />
        </Suspense>
      ) : (
        <div className="mx-auto max-w-wide px-gutter pt-10 pb-16 sm:pt-14">
          <h1 className="text-[clamp(1.875rem,1.5rem+1.2vw,2.75rem)] font-bold leading-tight tracking-tight text-ink">{intro.heading}</h1>
          <div className="mt-10 max-w-2xl border-t border-border pt-8">
            <h2 className="text-subheading font-semibold text-ink">{content.unavailable.heading}</h2>
            <p className="mt-3 text-body leading-relaxed text-ink-muted">
              <RichText text={content.unavailable.body} />
            </p>
          </div>
        </div>
      )}

      <section aria-labelledby="dictionary-about" className="border-t border-border bg-paper-alt">
        <div className="mx-auto grid max-w-wide gap-x-grid-gap gap-y-6 px-gutter py-14 md:py-16 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
          <div>
            <TriMark className="mb-4" />
            <h2 id="dictionary-about" className="text-lg font-semibold tracking-tight text-ink">
              {content.source.heading}
            </h2>
          </div>
          <div className="max-w-[68ch] space-y-4 text-[0.9375rem] leading-relaxed text-ink-muted">
            <p>
              <RichText text={intro.description} />
            </p>
            <p>
              <RichText text={content.source.body} />
            </p>
            {view?.release && (
              <p className="pt-1 text-xs tracking-wide text-ink-muted">
                Dictionary version {view.release.number}
                {view.release.publishedAt && <> · published {dateFormatter.format(new Date(view.release.publishedAt))}</>}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Reads explorer filters from URL search parameters. */
export function filtersFromSearchParams(params: Record<string, string | string[] | undefined>): ExplorerFilters {
  const one = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value)?.slice(0, 200) ?? "";
  };
  const sort = one("sort");
  return {
    q: one("q"),
    category: one("category") || null,
    group: one("group") || null,
    sort: sort === "source" || sort === "alpha" ? sort : "auto",
    translatedOnly: one("translated") === "1",
  };
}
