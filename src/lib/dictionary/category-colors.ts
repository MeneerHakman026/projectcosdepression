import { labelKey } from "./text";

/**
 * One calm accent colour per dictionary Category.
 *
 * The taxonomy comes from Excel, so the number and names of categories are
 * not known in advance. Colours are therefore assigned from the category's
 * *identity* (its label key), never from its position in the workbook:
 *
 *  1. A few well-known names have a preferred colour, taken from the COS-D
 *     logo (Symptoms → turquoise, Functioning → navy with a mint band).
 *     These are preferences, not a fixed taxonomy.
 *  2. Every other category hashes its key to a preferred palette slot. Taken
 *     slots are resolved by probing to the next free slot, processing
 *     categories in a fixed order (preferred slot, then key) so the result
 *     doesn't depend on row order in the workbook.
 *  3. With more categories than palette entries, extra categories get a
 *     generated colour from the hash, tuned to the same contrast targets.
 *
 * Every tone is checked (category-colors.test.ts) against WCAG AA:
 *  - `text`  ≥ 4.5:1 on white and on `soft` (labels, counts, headings)
 *  - `line`  ≥ 3:1 on white (dots, rules, selection bars: non-text UI)
 *  - the entry band's text ≥ 4.5:1 on the band
 * Colour never carries meaning alone: category names are always shown.
 */

export type CategoryTone = {
  /** Text-safe accent for labels on white or on `soft`. */
  text: string;
  /** Mid accent for thin rules, dots and selection bars. */
  line: string;
  /** Very light tint for selected/hover backgrounds. */
  soft: string;
  /** Light tint for borders and muted fills. */
  tint: string;
  /** Background of the entry's header band, when not `text`. Its text colour is chosen by contrast. */
  band?: string;
};

/**
 * The COS-D logo's colours (also the site's --teal, --mint and --navy
 * tokens in globals.css).
 */
export const LOGO = { turquoise: "#4F9AA7", mint: "#9FD0C2", navy: "#1C2C43" } as const;

export const CATEGORY_PALETTE: readonly (CategoryTone & { name: string })[] = [
  // From the logo: its turquoise for rules and bars, deepened for text and the band.
  { name: "turquoise", text: "#3A7480", line: LOGO.turquoise, soft: "#EAF3F5", tint: "#BBDCE2" },
  // From the logo: its navy (lightened enough to stand apart from the page's ink), with a mint band.
  { name: "navy", text: "#2C4560", line: "#4D6884", soft: "#EAF5F1", tint: "#C4E3D9", band: LOGO.mint },
  { name: "ochre", text: "#7F5712", line: "#B07D2B", soft: "#F7F0E1", tint: "#E8D4A8" },
  { name: "slate", text: "#43578A", line: "#5B71A8", soft: "#EDF0F8", tint: "#C5CEE6" },
  { name: "sage", text: "#4A6B40", line: "#6A8E5E", soft: "#EDF3EA", tint: "#C9DAC0" },
  { name: "plum", text: "#6B3F7D", line: "#8A5A9A", soft: "#F3ECF6", tint: "#D9C5E0" },
  { name: "terracotta", text: "#8E4526", line: "#BB6A45", soft: "#F9EEE8", tint: "#EBC7B4" },
  { name: "olive", text: "#5E5E1C", line: "#86863A", soft: "#F2F2E3", tint: "#D9D9AE" },
  { name: "stone", text: "#50575F", line: "#737A84", soft: "#F0F1F3", tint: "#D2D6DB" },
];

/** Preferred slots for category names researchers already use. */
const PREFERRED: Record<string, string> = {
  symptoms: "turquoise",
  functioning: "navy",
};

/** FNV-1a: small, stable across runtimes, good enough spread for a few dozen keys. */
export function hashKey(key: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

// ---- Contrast helpers (WCAG 2.x relative luminance) -------------------------

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function hsl(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** A muted generated tone for categories beyond the palette, meeting the same contrast targets. */
export function generatedTone(hash: number): CategoryTone {
  const hue = hash % 360;
  const soft = hsl(hue, 0.4, 0.955);
  const tint = hsl(hue, 0.38, 0.84);
  let l = 0.42;
  while (l > 0.15 && (contrast(hsl(hue, 0.4, l), "#FFFFFF") < 4.6 || contrast(hsl(hue, 0.4, l), soft) < 4.6)) l -= 0.01;
  let line = 0.52;
  while (line > 0.2 && contrast(hsl(hue, 0.36, line), "#FFFFFF") < 3.2) line -= 0.01;
  return { text: hsl(hue, 0.4, l), line: hsl(hue, 0.36, line), soft, tint };
}

/**
 * Colours for a set of categories, keyed by category key (the taxonomy's
 * labelKey). Deterministic for a given set of keys, independent of order.
 */
export function assignCategoryTones(categoryKeys: readonly string[]): Map<string, CategoryTone> {
  const slots = CATEGORY_PALETTE.length;
  const taken = new Set<number>();
  const result = new Map<string, CategoryTone>();
  const unique = [...new Set(categoryKeys.map((key) => labelKey(key)))];

  const pinned = unique.filter((key) => PREFERRED[key]);
  for (const key of pinned) {
    const slot = CATEGORY_PALETTE.findIndex((tone) => tone.name === PREFERRED[key]);
    taken.add(slot);
    result.set(key, CATEGORY_PALETTE[slot]);
  }

  const rest = unique
    .filter((key) => !PREFERRED[key])
    .map((key) => ({ key, hash: hashKey(key) }))
    .sort((a, b) => a.hash % slots - (b.hash % slots) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  for (const { key, hash } of rest) {
    let slot = -1;
    for (let probe = 0; probe < slots; probe++) {
      const candidate = (hash + probe) % slots;
      if (!taken.has(candidate)) {
        slot = candidate;
        break;
      }
    }
    if (slot === -1) {
      result.set(key, generatedTone(hash));
    } else {
      taken.add(slot);
      result.set(key, CATEGORY_PALETTE[slot]);
    }
  }

  // Map back to the caller's keys (which are normally already label keys).
  return new Map(categoryKeys.map((key) => [key, result.get(labelKey(key))!]));
}

/** The page's ink (the logo navy), the darker of the two text colours a band can carry. */
export const BAND_INK = LOGO.navy;

/**
 * The coloured band at the top of an outcome entry: the tone's `band`, or
 * else its deep `text` accent, with whichever of white or ink reads best on it.
 */
export function bandColors(tone: CategoryTone): { background: string; text: string } {
  const background = tone.band ?? tone.text;
  const text = contrast(background, "#FFFFFF") >= contrast(background, BAND_INK) ? "#FFFFFF" : BAND_INK;
  return { background, text };
}

/** CSS custom properties for a tone, for `style={...}` on an element and its children. */
export function toneVars(tone: CategoryTone | undefined): Record<string, string> {
  if (!tone) return {};
  const band = bandColors(tone);
  return {
    "--cat-text": tone.text,
    "--cat-line": tone.line,
    "--cat-soft": tone.soft,
    "--cat-tint": tone.tint,
    "--cat-band": band.background,
    "--cat-band-text": band.text,
  };
}
