import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CmsNotInstalled from "@/components/admin/cms/CmsNotInstalled";
import RestoreButton from "@/components/admin/cms/RestoreButton";
import { formatDateTime } from "@/lib/admin/format";
import { getPageDefinition } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { CmsNotInstalledError, type PageState, type RevisionKind, type RevisionSummary } from "@/lib/cms/service";

export const metadata: Metadata = { title: "Version history" };

const KIND_LABELS: Record<RevisionKind, string> = {
  draft: "Draft saved",
  publish: "Published",
  restore: "Restored",
};

export default async function HistoryPage({ params }: PageProps<"/admin/content/pages/[slug]/history">) {
  const { slug } = await params;
  const page = getPageDefinition(slug);
  if (!page) notFound();

  let data: { state: PageState; revisions: RevisionSummary[] } | null = null;
  try {
    const [state, revisions] = await Promise.all([cms.getPageState(page), cms.listRevisions(page)]);
    data = { state, revisions };
  } catch (error) {
    if (!(error instanceof CmsNotInstalledError)) throw error;
  }

  return (
    <div>
      <p className="text-sm">
        <Link
          href={`/admin/content/pages/${page.slug}`}
          className="text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          ← Back to editor
        </Link>
      </p>
      <h1 className="mt-2 text-heading font-semibold text-ink">Version history: {page.name.toLowerCase()}</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">
        Every saved draft and every publication is kept. Restoring copies an older version into the
        draft — it doesn&apos;t delete anything, and the live site only changes once you publish.
      </p>

      {data === null ? (
        <CmsNotInstalled />
      ) : data.revisions.length === 0 ? (
        <p className="mt-8 border border-dashed border-border bg-paper p-6 text-body text-ink-muted">
          No versions yet. The live page shows its original built-in content.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto border border-border">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-paper-alt">
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  Version
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  What happened
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  By
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  When
                </th>
                <th scope="col" className="px-4 py-3 font-semibold text-ink">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.revisions.map((revision) => {
                const isLive = revision.revisionNumber === data.state.publishedRevisionNumber;
                return (
                  <tr key={revision.revisionNumber} className="border-b border-border bg-paper last:border-b-0">
                    <td className="px-4 py-3 font-medium tabular-nums text-ink">{revision.revisionNumber}</td>
                    <td className="px-4 py-3 text-ink">
                      {KIND_LABELS[revision.kind]}
                      {revision.restoredFromRevisionNumber != null &&
                        ` from version ${revision.restoredFromRevisionNumber}`}
                      {isLive && (
                        <span className="ml-2 border border-accent px-2 py-0.5 text-xs font-medium text-ink">
                          Live now
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink">{revision.author}</td>
                    <td className="px-4 py-3 text-ink">{formatDateTime(revision.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-start justify-end gap-2">
                        <a
                          href={`/admin/preview/${page.slug}?revision=${revision.revisionNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-compact"
                        >
                          View<span className="sr-only"> version {revision.revisionNumber} (opens in a new tab)</span>
                        </a>
                        <RestoreButton
                          slug={page.slug}
                          revisionNumber={revision.revisionNumber}
                          expectedVersion={data.state.version}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
