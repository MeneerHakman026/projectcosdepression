import { INTERNAL_REGISTRATION_PATH, type EoiButtonContent } from "@/content/eoi-button/schema";
import { isSafeExternalUrl } from "@/lib/cms/urls";

/** A ready-to-render Expression of Interest button. */
export type EoiButtonLink = {
  label: string;
  href: string;
  external: boolean;
};

/**
 * Turns the button settings into a link. The external URL was validated
 * when it was saved and again when it was published; it's checked once
 * more here, and anything unexpected falls back to the internal
 * registration page rather than producing a broken or unsafe link.
 *
 * Visitors go straight to the destination: there is deliberately no
 * redirect endpoint on this site, so it can't be abused as an open redirect.
 */
export function resolveEoiButton(content: EoiButtonContent): EoiButtonLink {
  const { mode, externalUrl } = content.destination;
  if (mode === "external" && isSafeExternalUrl(externalUrl)) {
    return { label: content.label, href: externalUrl, external: true };
  }
  return { label: content.label, href: INTERNAL_REGISTRATION_PATH, external: false };
}
