import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CmsNotInstalled from "@/components/admin/cms/CmsNotInstalled";
import DictionaryPageEditor from "@/components/admin/cms/DictionaryPageEditor";
import EoiButtonEditor from "@/components/admin/cms/EoiButtonEditor";
import HomeEditor from "@/components/admin/cms/HomeEditor";
import RegistrationEditor from "@/components/admin/cms/RegistrationEditor";
import type { DictionaryPageContent } from "@/content/dictionary/schema";
import type { EoiButtonContent } from "@/content/eoi-button/schema";
import type { HomeContent } from "@/content/home/schema";
import type { RegistrationContent } from "@/content/registration/schema";
import { editorNameOf, requireAdminSession } from "@/lib/admin/session";
import { DICTIONARY_PAGE, EOI_BUTTON, getPageDefinition, HOME_PAGE, REGISTRATION_PAGE } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { CmsNotInstalledError, type PageState } from "@/lib/cms/service";
import { resolveEoiButton, type EoiButtonLink } from "@/lib/eoi-button";

const EDITABLE = new Set([HOME_PAGE.slug, REGISTRATION_PAGE.slug, DICTIONARY_PAGE.slug, EOI_BUTTON.slug]);

export async function generateMetadata({ params }: PageProps<"/admin/content/pages/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit ${getPageDefinition(slug)?.name ?? "page"}` };
}

/** What the live site shows right now, read directly (uncached) for the editor. */
async function liveEoiButton(): Promise<EoiButtonLink> {
  try {
    return resolveEoiButton(await cms.getPublishedContent(EOI_BUTTON));
  } catch {
    // Unreadable stored content: the live site keeps serving its last
    // cached version, which can't be determined here.
    return resolveEoiButton(EOI_BUTTON.defaults);
  }
}

export default async function EditPage({ params }: PageProps<"/admin/content/pages/[slug]">) {
  const session = await requireAdminSession();
  const { slug } = await params;
  const page = getPageDefinition(slug);
  // Only pages with a dedicated editor are listed; /study and others get
  // one when their content model is defined.
  if (!page || !EDITABLE.has(page.slug)) notFound();

  let state: PageState | null = null;
  try {
    state = await cms.getPageState(page);
  } catch (error) {
    if (!(error instanceof CmsNotInstalledError)) throw error;
  }

  const editorProps = state && {
    slug: page.slug,
    pageName: page.name,
    pagePath: page.path,
    initialVersion: state.version,
    initialStatus: state.status,
    draftSavedAt: state.draftSavedAt,
    draftSavedBy: state.draftSavedBy,
    contentError: state.contentError,
    editorName: editorNameOf(session),
  };

  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/content" className="text-ink-muted underline underline-offset-2 hover:text-ink">
          ← Content
        </Link>
      </p>
      <h1 className="mt-2 text-heading font-semibold text-ink">Edit {page.name.toLowerCase()}</h1>
      {page.scope === "site" && <p className="mt-2 max-w-2xl text-body text-ink-muted">{page.description}</p>}

      {state === null || editorProps === null ? (
        <CmsNotInstalled />
      ) : page.slug === HOME_PAGE.slug ? (
        <HomeEditor {...editorProps} initialContent={state.content as HomeContent} />
      ) : page.slug === REGISTRATION_PAGE.slug ? (
        <RegistrationEditor {...editorProps} initialContent={state.content as RegistrationContent} />
      ) : page.slug === DICTIONARY_PAGE.slug ? (
        <DictionaryPageEditor {...editorProps} initialContent={state.content as DictionaryPageContent} />
      ) : (
        <EoiButtonEditor
          {...editorProps}
          initialContent={state.content as EoiButtonContent}
          live={await liveEoiButton()}
        />
      )}
    </div>
  );
}
