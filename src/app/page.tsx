import type { Metadata } from "next";
import HomePage from "@/components/home/HomePage";
import { HOME_PAGE } from "@/lib/cms/pages";
import { getPublishedContent } from "@/lib/cms/server";
import { getEoiButton } from "@/lib/eoi-button.server";

/**
 * Homepage. Content is managed in the admin (Admin → Content → Homepage)
 * and read here from the last published version; until something is
 * published it falls back to the built-in content in
 * content/home/defaults.ts, which is grounded in docs/CONTENT_SOURCES.md.
 *
 * The page stays statically generated: publishing invalidates the cache
 * and the page is regenerated on the next visit.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getPublishedContent(HOME_PAGE);
  return {
    title: { absolute: seo.title },
    description: seo.description,
  };
}

export default async function Home() {
  const [content, eoiButton] = await Promise.all([getPublishedContent(HOME_PAGE), getEoiButton()]);
  return <HomePage content={content} eoiButton={eoiButton} />;
}
