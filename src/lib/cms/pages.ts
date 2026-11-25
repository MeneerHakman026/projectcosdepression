import type { z } from "zod";
import { DICTIONARY_PAGE_DEFAULTS } from "@/content/dictionary/defaults";
import { DICTIONARY_PAGE_SCHEMA_VERSION, dictionaryPageSchema } from "@/content/dictionary/schema";
import { EOI_BUTTON_DEFAULTS } from "@/content/eoi-button/defaults";
import { EOI_BUTTON_SCHEMA_VERSION, eoiButtonSchema } from "@/content/eoi-button/schema";
import { HOME_DEFAULTS } from "@/content/home/defaults";
import { HOME_SCHEMA_VERSION, homeContentSchema, migrateHomeContent } from "@/content/home/schema";
import { REGISTRATION_DEFAULTS } from "@/content/registration/defaults";
import { REGISTRATION_SCHEMA_VERSION, registrationContentSchema } from "@/content/registration/schema";

/**
 * The content documents that can be edited in the admin. Developers own this
 * list: each entry fixes where the content appears, the shape of its content
 * (a zod schema) and the content it shows before anything has been published.
 * Editors can change content within that shape, but never the shape itself.
 *
 * Most entries are pages. An entry with scope "site" is a site-wide setting
 * (e.g. the Expression of Interest button in the header) that goes through
 * the same draft → preview → publish → history workflow, but appears on
 * every page rather than one.
 */
export type PageDefinition<TContent = unknown> = {
  slug: string;
  /** The page's URL. For site-wide settings, the page to open as "view live". */
  path: string;
  name: string;
  description: string;
  /** "site": shown on every page, so publishing refreshes the whole site. Defaults to "page". */
  scope?: "page" | "site";
  /** Other URLs whose wording comes from this content (refreshed on publish). */
  alsoRevalidate?: string[];
  /** Also refresh every URL below `path` (e.g. /dictionary/V_01) on publish. */
  revalidateSubpaths?: boolean;
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
  migrate: migrateHomeContent,
});

export const REGISTRATION_PAGE = definePage({
  slug: "registration",
  path: "/registration",
  name: "Registration",
  description: "The Expression of Interest page: introduction, \"Before you submit\" and the thank-you page.",
  alsoRevalidate: ["/registration/success"],
  schema: registrationContentSchema,
  schemaVersion: REGISTRATION_SCHEMA_VERSION,
  defaults: REGISTRATION_DEFAULTS,
});

export const EOI_BUTTON = definePage({
  slug: "eoi-button",
  path: "/",
  name: "Expression of Interest button",
  description: "Button text and destination for every Expression of Interest button on the site.",
  scope: "site",
  schema: eoiButtonSchema,
  schemaVersion: EOI_BUTTON_SCHEMA_VERSION,
  defaults: EOI_BUTTON_DEFAULTS,
});

export const DICTIONARY_PAGE = definePage({
  slug: "dictionary",
  path: "/dictionary",
  name: "Outcome Dictionary page",
  description:
    "Wording around the Outcome Dictionary: introduction, source, and the participant-group legend. The dictionary entries themselves are managed by Excel import.",
  revalidateSubpaths: true,
  schema: dictionaryPageSchema,
  schemaVersion: DICTIONARY_PAGE_SCHEMA_VERSION,
  defaults: DICTIONARY_PAGE_DEFAULTS,
});

export const CMS_PAGES: PageDefinition[] = [
  HOME_PAGE as PageDefinition,
  REGISTRATION_PAGE as PageDefinition,
  DICTIONARY_PAGE as PageDefinition,
  EOI_BUTTON as PageDefinition,
];

export function getPageDefinition(slug: string): PageDefinition | undefined {
  return CMS_PAGES.find((page) => page.slug === slug);
}

/** Cache tag for a page's published content; invalidated on publish. */
export function pageCacheTag(slug: string): string {
  return `cms:page:${slug}`;
}

export type RevalidationTarget = { path: string; type?: "layout" };

/**
 * Paths to refresh after publishing. A site-wide setting refreshes the root
 * layout, which covers every page; a page refreshes its own URL(s).
 */
export function revalidationTargets(page: PageDefinition): RevalidationTarget[] {
  if (page.scope === "site") return [{ path: "/", type: "layout" }];
  if (page.revalidateSubpaths) {
    return [{ path: page.path, type: "layout" }, ...(page.alsoRevalidate ?? []).map((path) => ({ path }))];
  }
  return [page.path, ...(page.alsoRevalidate ?? [])].map((path) => ({ path }));
}
