import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HomePage from "@/components/home/HomePage";
import type { HomeContent } from "@/content/home/schema";
import { requireAdminSession } from "@/lib/admin/session";
import { getPageDefinition, HOME_PAGE } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

/**
 * Admin-only preview of a page's saved draft (or of a specific version via
 * ?revision=N), rendered with the real public components and site chrome.
 * Lives outside the (protected) group so it isn't wrapped in the admin
 * shell, so it checks the session itself — in addition to proxy.ts, which
 * already gates every /admin path.
 */
export default async function PreviewPage({ params, searchParams }: PageProps<"/admin/preview/[slug]">) {
  await requireAdminSession();
  const { slug } = await params;
  const { revision } = await searchParams;
  const page = getPageDefinition(slug);
  if (!page || page.slug !== HOME_PAGE.slug) notFound();

  const revisionNumber = typeof revision === "string" && /^\d+$/.test(revision) ? Number(revision) : undefined;
  const preview = await cms.getPreviewContent(page, revisionNumber);

  return (
    <>
      {"error" in preview ? (
        <div className="mx-auto max-w-default px-gutter py-16">
          <p role="alert" className="border border-red-600 bg-red-50 px-4 py-3 text-body text-red-700">
            {preview.error}
          </p>
        </div>
      ) : (
        <HomePage content={preview.content as HomeContent} />
      )}

      <div
        role="region"
        aria-label="Preview notice"
        className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-accent bg-navy text-paper"
      >
        <div className="mx-auto flex max-w-wide flex-wrap items-center justify-between gap-3 px-gutter py-3 text-sm">
          <p>
            <strong className="font-semibold">Preview — not visible to the public.</strong>{" "}
            <span className="text-paper/80">{"error" in preview ? "" : preview.label}</span>
          </p>
          <Link
            href={`/admin/content/pages/${page.slug}`}
            className="btn btn-compact border-paper/40 text-paper hover:bg-paper hover:text-navy"
          >
            Back to editor
          </Link>
        </div>
      </div>
    </>
  );
}
