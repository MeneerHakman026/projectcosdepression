import type { Metadata } from "next";
import Link from "next/link";
import CmsNotInstalled from "@/components/admin/cms/CmsNotInstalled";
import PageStatusBadge from "@/components/admin/cms/PageStatusBadge";
import { formatDateTime } from "@/lib/admin/format";
import { CMS_PAGES } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { CmsNotInstalledError, type PageSummary } from "@/lib/cms/service";

export const metadata: Metadata = { title: "Content" };

export default async function AdminContentPage() {
  let pages: PageSummary[] | null = null;
  try {
    pages = await cms.listPages(CMS_PAGES);
  } catch (error) {
    if (!(error instanceof CmsNotInstalledError)) throw error;
  }

  return (
    <div>
      <h1 className="text-heading font-semibold text-ink">Content</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">
        Edit the text, links and images on the website. Changes are saved as a draft first —
        nothing changes on the live site until you publish.
      </p>

      {pages === null ? (
        <CmsNotInstalled />
      ) : (
        <>
          <h2 className="mt-10 text-subheading font-semibold text-ink">Pages</h2>
          <div className="mt-4 overflow-x-auto border border-border">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-paper-alt">
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    Page
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    URL
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    Last change
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold text-ink">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.slug} className="border-b border-border bg-paper last:border-b-0">
                    <td className="px-4 py-3 font-medium text-ink">{page.name}</td>
                    <td className="px-4 py-3">
                      <a
                        href={page.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-ink-muted underline underline-offset-2 hover:text-ink"
                      >
                        {page.path}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <PageStatusBadge status={page.status} />
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {page.lastModifiedAt ? (
                        <>
                          {formatDateTime(page.lastModifiedAt)}
                          <span className="block text-xs text-ink-muted">by {page.lastModifiedBy}</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">Never edited</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/content/pages/${page.slug}`} className="btn btn-compact">
                        Edit<span className="sr-only"> {page.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-ink-muted">
            More pages, such as Study &amp; FAQs, will appear here as they become editable.
          </p>
        </>
      )}
    </div>
  );
}
