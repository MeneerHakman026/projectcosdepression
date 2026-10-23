import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CmsNotInstalled from "@/components/admin/cms/CmsNotInstalled";
import HomeEditor from "@/components/admin/cms/HomeEditor";
import type { HomeContent } from "@/content/home/schema";
import { editorNameOf, requireAdminSession } from "@/lib/admin/session";
import { getPageDefinition, HOME_PAGE } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { CmsNotInstalledError, type PageState } from "@/lib/cms/service";

export async function generateMetadata({ params }: PageProps<"/admin/content/pages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit ${getPageDefinition(slug)?.name ?? "page"}` };
}

export default async function EditPage({ params }: PageProps<"/admin/content/pages/[slug]">) {
  const session = await requireAdminSession();
  const { slug } = await params;
  const page = getPageDefinition(slug);
  // Only pages with a dedicated editor are listed; /study and others get
  // one when their content model is defined.
  if (!page || page.slug !== HOME_PAGE.slug) notFound();

  let state: PageState | null = null;
  try {
    state = await cms.getPageState(page);
  } catch (error) {
    if (!(error instanceof CmsNotInstalledError)) throw error;
  }

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/content" className="text-ink-muted underline underline-offset-2 hover:text-ink">
          ← Content
        </Link>
      </p>
      <h1 className="mt-2 text-heading font-semibold text-ink">Edit {page.name.toLowerCase()}</h1>

      {state === null ? (
        <CmsNotInstalled />
      ) : (
        <HomeEditor
          slug={page.slug}
          pageName={page.name}
          pagePath={page.path}
          initialContent={state.content as HomeContent}
          initialVersion={state.version}
          initialStatus={state.status}
          draftSavedAt={state.draftSavedAt}
          draftSavedBy={state.draftSavedBy}
          contentError={state.contentError}
          editorName={editorNameOf(session)}
        />
      )}
    </div>
  );
}
