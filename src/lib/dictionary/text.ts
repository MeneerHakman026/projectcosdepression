/**
 * Text normalization shared by the importer, taxonomy and search. Runs on
 * both server and client, so no Node-only APIs here.
 *
 * Three different notions of "the same text" are used, deliberately:
 *  - raw: stored and exported exactly as the workbook had it;
 *  - key: for deciding whether two taxonomy labels are the same category or
 *    group (case, spacing and Unicode form don't matter);
 *  - folded: for search (additionally ignores accents and quote styles).
 */

/** Trims and collapses runs of whitespace — for showing labels. */
export function cleanLabel(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Comparison key for taxonomy labels. */
export function labelKey(value: string): string {
  return cleanLabel(value.normalize("NFKC")).toLocaleLowerCase("en");
}

/** Letters that don't decompose under NFKD but should still match their ASCII spelling. */
const SPECIAL_FOLDS: Record<string, string> = {
  ß: "ss",
  æ: "ae",
  œ: "oe",
  ø: "o",
  ł: "l",
  đ: "d",
  ð: "d",
  þ: "th",
  ı: "i",
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "«": '"',
  "»": '"',
  "–": "-",
  "—": "-",
  "…": "...",
};

const COMBINING_MARK = /\p{M}/u;

function foldChar(char: string): string {
  const lower = char.toLowerCase();
  const special = SPECIAL_FOLDS[lower];
  if (special !== undefined) return special;
  let out = "";
  for (const part of lower.normalize("NFKD")) {
    if (!COMBINING_MARK.test(part)) out += part;
  }
  return out;
}

export type FoldedText = {
  /** Lowercased, accent-free text. */
  text: string;
  /** For each index in `text`, the index of the original character it came from. */
  map: number[];
  /** Length of the original string (for mapping range ends). */
  originalLength: number;
};

/**
 * Folds text for accent- and case-insensitive matching while remembering
 * where every folded character came from, so matches found in the folded
 * text can be highlighted in the original.
 */
export function foldWithMap(original: string): FoldedText {
  let text = "";
  const map: number[] = [];
  let index = 0;
  for (const char of original) {
    const folded = foldChar(char);
    for (let i = 0; i < folded.length; i++) map.push(index);
    text += folded;
    index += char.length;
  }
  return { text, map, originalLength: original.length };
}

export function fold(value: string): string {
  let out = "";
  for (const char of value) out += foldChar(char);
  return out;
}

const WORD = /[\p{L}\p{N}]+/gu;

/** Word tokens of already-folded text. */
export function words(folded: string): string[] {
  return folded.match(WORD) ?? [];
}

/**
 * URL-friendly slug for filter parameters. Not guaranteed unique on its own;
 * taxonomy.ts disambiguates collisions.
 */
export function slugify(value: string): string {
  const slug = fold(cleanLabel(value))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "item";
}

/** Private-use code points: usually symbol-font glyphs (e.g. Wingdings arrows) that won't render on the web. */
export function findPrivateUseCharacters(value: string): string[] {
  const found = new Set<string>();
  for (const char of value) {
    const code = char.codePointAt(0)!;
    if ((code >= 0xe000 && code <= 0xf8ff) || code >= 0xf0000) {
      found.add(`U+${code.toString(16).toUpperCase().padStart(4, "0")}`);
    }
  }
  return [...found];
}

/** Control characters other than tab and line breaks. */
export function hasUnexpectedControlCharacters(value: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}
