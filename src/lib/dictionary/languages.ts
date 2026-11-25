import { LANGUAGE_CODE_PATTERN, MASTER_LANGUAGE } from "./model";

/**
 * Language codes and names. Nothing is hardcoded: any valid BCP 47 language
 * tag can be imported, and its name comes from the runtime's Intl data.
 */

/** Canonical form of a language tag ("FR" → "fr", "pt-br" → "pt-BR"), or null if it isn't one. */
export function canonicalLanguage(input: string): string | null {
  const trimmed = input.trim();
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(trimmed)) return null;
  let canonical: string;
  try {
    [canonical] = Intl.getCanonicalLocales(trimmed);
  } catch {
    return null;
  }
  if (!canonical || !LANGUAGE_CODE_PATTERN.test(canonical)) return null;
  // Reject syntactically valid tags that aren't real languages ("tab", "xyz").
  const base = canonical.split("-")[0];
  const name = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" }).of(base);
  return name ? canonical : null;
}

/** English name of a language, e.g. "French". */
export function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** The language's name in itself, e.g. "français". */
export function nativeLanguageName(code: string): string {
  try {
    return new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/**
 * The language a worksheet is named after: "fr", "FR", "fr — French",
 * "nl - Nederlands". Ordinary names such as "Sheet1" or "About" return null.
 */
export function languageFromSheetName(name: string): string | null {
  const match = /^\s*([A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*)(?:\s*[-—–:|]\s+.*|\s+\(.*\))?\s*$/.exec(name);
  return match ? canonicalLanguage(match[1]) : null;
}

export function isMasterLanguage(code: string): boolean {
  return code === MASTER_LANGUAGE;
}
