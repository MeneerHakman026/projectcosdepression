import { Suspense } from "react";
import RichText from "@/components/RichText";
import type { DictionaryPageContent } from "@/content/dictionary/schema";
import type { DictionaryView } from "@/lib/dictionary/view";
import DictionaryExplorer, { type ExplorerFilters, type SortChoice } from "./DictionaryExplorer";
import DictionaryHeader from "./DictionaryHeader";
import { DICTIONARY_CONTAINER } from "./layout";

type DictionaryPageProps = {
  content: DictionaryPageContent;
  view: DictionaryView | null;
  basePath: string;
  urlMode: "path" | "query";
  preserve?: Record<string, string>;
  filters: ExplorerFilters;
};

const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

function plural(n: number, singular: string, pluralForm = `${singular}s`) {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/**
 * The Outcome Dictionary page. Wording comes from the CMS page
 * (`content`); every category, group, outcome and count comes from the
 * published dataset (`view`). Rendered by the public route and by the admin
 * preview, so a preview is always the real page.
 *
 * The page opens on a compact title, the search and the dictionary itself;
 * the CMS introduction, sources and version are in the "About this
 * dictionary" disclosure beside the title.
 */
export default function DictionaryPage({ content, view, basePath, urlMode, preserve, filters }: DictionaryPageProps) {
  const { intro } = content;

  const about = (
    <>
      <p>
        <RichText text={intro.description} />
      </p>
      <p>
        <RichText text={content.source.body} />
      </p>
      {view && (
        <p className="pt-1 text-[0.8125rem] leading-normal">
          {plural(view.totals.outcomes, "outcome domain")} · {plural(view.totals.categories, "category", "categories")} ·{" "}
          {plural(view.totals.groups, "group domain")}
          {view.release && (
            <>
              <br />
              Dictionary version {view.release.number}
              {view.release.publishedAt && <> · published {dateFormatter.format(new Date(view.release.publishedAt))}</>}
            </>
          )}
        </p>
      )}
    </>
  );

  return (
    <div className="dictionary-canvas bg-dict-canvas">
      {view ? (
        // useSearchParams in the explorer needs a Suspense boundary.
        <Suspense>
          <DictionaryExplorer
            view={view}
            texts={{
              heading: intro.heading,
              aboutLabel: content.source.heading,
              verbatimsHeading: content.verbatims.heading,
              verbatimsNote: content.verbatims.note,
              roles: content.verbatims.roles,
            }}
            about={about}
            basePath={basePath}
            urlMode={urlMode}
            preserve={preserve}
            initialFilters={filters}
          />
        </Suspense>
      ) : (
        <div className={`${DICTIONARY_CONTAINER} pt-3 pb-16 sm:pt-5`}>
          <DictionaryHeader title={intro.heading} aboutLabel={content.source.heading} about={about} defaultOpen />
          <div className="mt-6 max-w-2xl border-t border-dict-rule pt-6">
            <h2 className="text-lg font-semibold text-ink">{content.unavailable.heading}</h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-muted">
              <RichText text={content.unavailable.body} />
            </p>
          </div>
        </div>
      )}
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
  // "source" is the old name for dictionary order, kept so earlier links still work.
  const sortChoice: SortChoice = sort === "alpha" || sort === "relevance" ? sort : "auto";
  return {
    q: one("q"),
    category: one("category") || null,
    group: one("group") || null,
    sort: sortChoice,
    translatedOnly: one("translated") === "1",
  };
}
