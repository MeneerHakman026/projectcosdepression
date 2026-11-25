import { Suspense } from "react";
import RichText from "@/components/RichText";
import Section from "@/components/Section";
import TriMark from "@/components/TriMark";
import type { DictionaryPageContent } from "@/content/dictionary/schema";
import type { DictionaryView } from "@/lib/dictionary/view";
import DictionaryExplorer, { type ExplorerFilters } from "./DictionaryExplorer";

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
 */
export default function DictionaryPage({ content, view, basePath, urlMode, preserve, filters }: DictionaryPageProps) {
  const { intro } = content;

  return (
    <>
      <section className="border-b border-border bg-paper">
        <div className="mx-auto max-w-wide px-gutter pt-12 pb-10 sm:pt-16 lg:pt-20">
          <TriMark className="mb-5" />
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">{intro.eyebrow}</p>
          <h1 className="mt-2 max-w-3xl text-display font-bold tracking-tight text-ink">{intro.heading}</h1>
          <p className="mt-4 max-w-3xl text-lead leading-relaxed text-ink-muted">
            <RichText text={intro.description} />
          </p>
          {view && (
            <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
              {[
                [view.totals.outcomes, view.totals.outcomes === 1 ? "outcome domain" : "outcome domains"],
                [view.totals.categories, view.totals.categories === 1 ? "category" : "categories"],
                [view.totals.groups, view.totals.groups === 1 ? "group domain" : "group domains"],
              ].map(([value, label]) => (
                <div key={String(label)} className="flex flex-col-reverse">
                  <dt className="text-sm text-ink-muted">{label}</dt>
                  <dd className="text-heading font-bold tabular-nums tracking-tight text-ink">{value}</dd>
                </div>
              ))}
              {view.languages.length > 1 && (
                <div className="flex flex-col-reverse">
                  <dt className="text-sm text-ink-muted">languages</dt>
                  <dd className="text-heading font-bold tabular-nums tracking-tight text-ink">{view.languages.length}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </section>

      {view ? (
        <div className="py-10 sm:py-12">
          {/* useSearchParams in the explorer needs a Suspense boundary. */}
          <Suspense>
            <DictionaryExplorer
              view={view}
              texts={{
                explorerHeading: content.explorer.heading,
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
        </div>
      ) : (
        <Section width="narrow">
          <h2 className="text-subheading font-semibold text-ink">{content.unavailable.heading}</h2>
          <p className="mt-3 text-body leading-relaxed text-ink-muted">
            <RichText text={content.unavailable.body} />
          </p>
        </Section>
      )}

      <Section width="wide" divider>
        <div className="max-w-3xl">
          <h2 className="text-subheading font-semibold text-ink">{content.source.heading}</h2>
          <p className="mt-3 text-body leading-relaxed text-ink-muted">
            <RichText text={content.source.body} />
          </p>
          {view?.release && (
            <p className="mt-4 text-xs text-ink-muted">
              Dictionary version {view.release.number}
              {view.release.publishedAt && <> · published {dateFormatter.format(new Date(view.release.publishedAt))}</>}
            </p>
          )}
        </div>
      </Section>
    </>
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
