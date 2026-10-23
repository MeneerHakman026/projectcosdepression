/**
 * Link and image-path rules for editable content. Every href an editor can
 * type passes through isSafeHref before it is stored (server-side schema
 * validation) and again before it is rendered (defence in depth), so a
 * `javascript:` or `data:` URL can never reach the page.
 */

const MAX_HREF_LENGTH = 2000;

export type HrefKind = "internal" | "anchor" | "external" | "email";

/**
 * Classifies an href, or returns null if it isn't one editors may use.
 * Allowed: site paths ("/study"), in-page anchors ("#what-is-cos-d"),
 * https:// URLs and mailto: addresses. Everything else — including
 * protocol-relative "//host" URLs and plain http:// — is rejected.
 */
export function classifyHref(href: string): HrefKind | null {
  if (!href || href.length > MAX_HREF_LENGTH || /\s/.test(href)) return null;

  if (href.startsWith("#")) {
    return /^#[A-Za-z][\w-]*$/.test(href) ? "anchor" : null;
  }

  if (href.startsWith("/")) {
    if (href.startsWith("//") || href.includes("\\")) return null;
    return /^\/[\w\-./~%]*(\?[\w\-.~%&=+]*)?(#[\w-]*)?$/.test(href) && !href.split(/[?#]/)[0].includes("..")
      ? "internal"
      : null;
  }

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }

  if (url.protocol === "https:" && url.hostname.includes(".")) return "external";
  if (url.protocol === "mailto:" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname)) return "email";
  return null;
}

export function isSafeHref(href: string): boolean {
  return classifyHref(href) !== null;
}

/**
 * Images are served from the site's own /public folder. Editors reference
 * them by path (e.g. "/front_photo.png"); remote URLs are not accepted, so
 * no third-party host is ever loaded on the public site.
 */
export function isSafeImagePath(src: string): boolean {
  return (
    /^\/[\w\-./]+\.(png|jpe?g|webp|avif|gif|svg)$/i.test(src) &&
    !src.startsWith("//") &&
    !src.includes("..")
  );
}
