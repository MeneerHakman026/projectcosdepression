import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import HomePage from "@/components/home/HomePage";
import RegistrationPage from "@/components/registration/RegistrationPage";
import RegistrationSuccess from "@/components/registration/RegistrationSuccess";
import Section from "@/components/Section";
import SurveyButton from "@/components/SurveyButton";
import type { EoiButtonContent } from "@/content/eoi-button/schema";
import type { HomeContent } from "@/content/home/schema";
import type { RegistrationContent } from "@/content/registration/schema";
import { requireAdminSession } from "@/lib/admin/session";
import { EOI_BUTTON, getPageDefinition, HOME_PAGE, REGISTRATION_PAGE } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { resolveEoiButton } from "@/lib/eoi-button";
import { getEoiButton } from "@/lib/eoi-button.server";

export const metadata: Metadata = {
  title: "Preview",
  robots: { index: false, follow: false },
};

function EoiButtonPreview({ content }: { content: EoiButtonContent }) {
  const button = resolveEoiButton(content);
  return (
    <Section width="default">
      <h1 className="text-heading font-bold tracking-tight text-ink">Expression of Interest button</h1>
      <p className="mt-3 max-w-2xl text-body text-ink-muted">
        This is how every Expression of Interest button on the site will look and where it will lead once this
        version is published. The header above still shows the live button.
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <SurveyButton button={button} />
        <SurveyButton button={button} compact />
      </div>
      <dl className="mt-8 grid max-w-2xl gap-x-6 gap-y-2 text-body sm:grid-cols-[auto_1fr]">
        <dt className="font-medium text-ink">Button text</dt>
        <dd className="text-ink-muted">{button.label}</dd>
        <dt className="font-medium text-ink">Goes to</dt>
        <dd className="break-all font-mono text-sm text-ink-muted">{button.href}</dd>
        <dt className="font-medium text-ink">Type</dt>
        <dd className="text-ink-muted">
          {button.external ? "External study website (visitors leave this site)" : "Registration page on this site"}
        </dd>
      </dl>
    </Section>
  );
}

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
  if (!page || ![HOME_PAGE.slug, REGISTRATION_PAGE.slug, EOI_BUTTON.slug].includes(page.slug)) notFound();

  const revisionNumber = typeof revision === "string" && /^\d+$/.test(revision) ? Number(revision) : undefined;
  const preview = await cms.getPreviewContent(page, revisionNumber);

  let body: React.ReactNode;
  if ("error" in preview) {
    body = (
      <div className="mx-auto max-w-default px-gutter py-16">
        <p role="alert" className="border border-red-600 bg-red-50 px-4 py-3 text-body text-red-700">
          {preview.error}
        </p>
      </div>
    );
  } else if (page.slug === HOME_PAGE.slug) {
    body = <HomePage content={preview.content as HomeContent} eoiButton={await getEoiButton()} />;
  } else if (page.slug === REGISTRATION_PAGE.slug) {
    const content = preview.content as RegistrationContent;
    body = (
      <>
        <RegistrationPage content={content} previewOnly />
        <div className="border-t-4 border-dashed border-border">
          <p className="mx-auto max-w-default px-gutter pt-8 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            Thank-you page (shown after submitting)
          </p>
          <RegistrationSuccess content={content} />
        </div>
      </>
    );
  } else {
    body = <EoiButtonPreview content={preview.content as EoiButtonContent} />;
  }

  return (
    <>
      {body}

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
