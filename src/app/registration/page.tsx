import type { Metadata } from "next";
import RegistrationPage from "@/components/registration/RegistrationPage";
import { REGISTRATION_PAGE } from "@/lib/cms/pages";
import { getPublishedContent } from "@/lib/cms/server";

/**
 * Expression of Interest page. The wording is managed in the admin
 * (Admin → Content → Registration) and read here from the last published
 * version; until something is published it falls back to
 * content/registration/defaults.ts.
 *
 * This page stays available even when the site-wide Expression of Interest
 * button points to an external study website, so old links keep working.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPublishedContent(REGISTRATION_PAGE);
  return { title: seo.title, description: seo.description };
}

export default async function Registration() {
  const content = await getPublishedContent(REGISTRATION_PAGE);
  return <RegistrationPage content={content} />;
}
