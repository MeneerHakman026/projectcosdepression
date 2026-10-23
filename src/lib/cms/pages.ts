import type { z } from "zod";
import { HOME_DEFAULTS } from "@/content/home/defaults";
import { HOME_SCHEMA_VERSION, homeContentSchema } from "@/content/home/schema";

/**
 * The pages whose content can be edited in the admin. Developers own this
 * list: each entry fixes the page's URL, the shape of its content (a zod
 * schema) and the content it shows before anything has been published.
 * Editors can change content within that shape, but never the shape itself.
 */
export type PageDefinition<TContent = unknown> = {
  slug: string;
  path: string;
  name: string;
  description: string;
  schema: z.ZodType<TContent>;
  schemaVersion: number;
  defaults: TContent;
  /**
   * Upgrades content saved under an older schemaVersion to the current
   * shape before it's validated. Identity until the schema first changes.
   */
  migrate?: (content: unknown, fromVersion: number) => unknown;
};

function definePage<TContent>(definition: PageDefinition<TContent>): PageDefinition<TContent> {
  return definition;
}

export const HOME_PAGE = definePage({
  slug: "home",
  path: "/",
  name: "Homepage",
  description: "The front page: introduction, research evidence, study steps and calls to action.",
  schema: homeContentSchema,
  schemaVersion: HOME_SCHEMA_VERSION,
  defaults: HOME_DEFAULTS,
});

export const CMS_PAGES: PageDefinition[] = [HOME_PAGE as PageDefinition];

export function getPageDefinition(slug: string): PageDefinition | undefined {
  return CMS_PAGES.find((page) => page.slug === slug);
}

/** Cache tag for a page's published content; invalidated on publish. */
export function pageCacheTag(slug: string): string {
  return `cms:page:${slug}`;
}
