import type { Metadata } from "next";
import Link from "next/link";
import DictionaryPage, { filtersFromSearchParams } from "@/components/dictionary/DictionaryPage";
import type { DictionaryPageContent } from "@/content/dictionary/schema";
import { requireAdminSession } from "@/lib/admin/session";
import { DICTIONARY_PAGE } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { canonicalLanguage } from "@/lib/dictionary/languages";
import { MASTER_LANGUAGE } from "@/lib/dictionary/model";
import { dictionary, getReleaseView } from "@/lib/dictionary/server";
import type { DictionaryView } from "@/lib/dictionary/view";

export const metadata: Metadata = {
  title: "Preview · Outcome Dictionary",
  robots: { index: false, follow: false },
};

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Admin-only preview of the Outcome Dictionary with the real public page.
 *  - ?dataset=draft|live|<version>  which dictionary data to show (page text: live)
 *  - no dataset, optional ?revision=N  previews the *page text* draft or a
 *    page-text version (data: live, or the draft if nothing is live yet)
 * Outside the (protected) group so it gets the public chrome; checks the
 * session itself in addition to proxy.ts.
 */
export default async function DictionaryPreviewPage({ searchParams }: PageProps<"/admin/preview/dictionary">) {
  await requireAdminSession();
  const params = await searchParams;
  const datasetParam = one(params.dataset);
  const revisionParam = one(params.revision);
  const language = canonicalLanguage(one(params.lang) ?? "") ?? MASTER_LANGUAGE;

  const state = await dictionary.getState().catch(() => null);
  let releaseNumber: number | undefined;
  if (datasetParam === "draft") releaseNumber = state?.draft?.number;
  else if (datasetParam && /^\d{1,9}$/.test(datasetParam)) releaseNumber = Number(datasetParam);
  else releaseNumber = state?.published?.number ?? state?.draft?.number;

  let content: DictionaryPageContent;
  let textLabel: string;
  if (datasetParam) {
    content = (await cms.getPublishedContent(DICTIONARY_PAGE)) as DictionaryPageContent;
    textLabel = "page text: live";
  } else {
    const revision = revisionParam && /^\d+$/.test(revisionParam) ? Number(revisionParam) : undefined;
    const preview = await cms.getPreviewContent(DICTIONARY_PAGE, revision);
    if ("error" in preview) {
      content = DICTIONARY_PAGE.defaults;
      textLabel = `page text: ${preview.error}`;
    } else {
      content = preview.content as DictionaryPageContent;
      textLabel = `page text: ${preview.label}`;
    }
  }

  const view: DictionaryView | null = releaseNumber ? await getReleaseView(releaseNumber, language) : null;
  const dataLabel = view
    ? `Dictionary version ${releaseNumber}${releaseNumber === state?.published?.number ? " (live)" : releaseNumber === state?.draft?.number ? " (draft)" : ""}`
    : datasetParam === "draft"
      ? "No draft to preview"
      : "No dictionary data";

  const preserve: Record<string, string> = {};
  if (datasetParam) preserve.dataset = datasetParam;
  if (revisionParam) preserve.revision = revisionParam;

  return (
    <>
      <DictionaryPage
        content={content}
        view={view}
        basePath="/admin/preview/dictionary"
        urlMode="query"
        preserve={preserve}
        filters={filtersFromSearchParams(params)}
        bottomInset="5rem"
      />
      <div className="h-20" aria-hidden="true" />
      <div role="region" aria-label="Preview notice" className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-accent bg-navy text-paper">
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-gutter py-3 text-sm">
          <p>
            <strong className="font-semibold">Preview — not visible to the public.</strong>{" "}
            <span className="text-paper/80">
              {dataLabel} · {textLabel}
            </span>
          </p>
          <Link
            href={datasetParam ? "/admin/content/dictionary" : "/admin/content/pages/dictionary"}
            className="btn btn-compact border-paper/40 text-paper hover:bg-paper hover:text-navy"
          >
            Back to admin
          </Link>
        </div>
      </div>
    </>
  );
}
