import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import { pageCacheTag, type PageDefinition } from "./pages";
import { createCmsService } from "./service";

export const cms = createCmsService({
  query: (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>,
});

/**
 * Published content for a public page, cached until the page is next
 * published (see publishDraft in app/admin/(protected)/content/actions.ts,
 * which invalidates this tag and the page's path). Visitors never trigger a
 * database query on a cached page, and drafts are never read here.
 */
export function getPublishedContent<T>(page: PageDefinition<T>): Promise<T> {
  return unstable_cache(() => cms.getPublishedContent(page), ["cms-published", page.slug], {
    tags: [pageCacheTag(page.slug)],
  })();
}
