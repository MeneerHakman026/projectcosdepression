import "server-only";
import { EOI_BUTTON } from "@/lib/cms/pages";
import { getPublishedContent } from "@/lib/cms/server";
import { resolveEoiButton, type EoiButtonLink } from "./eoi-button";

/**
 * The published Expression of Interest button, for public pages. Cached
 * under the button's CMS tag, so visitors never trigger a database query
 * and drafts never reach the live site; publishing the button expires the
 * tag and refreshes every page (see revalidationTargets in lib/cms/pages.ts).
 */
export async function getEoiButton(): Promise<EoiButtonLink> {
  return resolveEoiButton(await getPublishedContent(EOI_BUTTON));
}
