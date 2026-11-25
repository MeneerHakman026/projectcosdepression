import { labelKey } from "./text";

/**
 * One calm accent colour per dictionary Category.
 *
 * The taxonomy comes from Excel, so the number and names of categories are
 * not known in advance. Colours are therefore assigned from the category's
 * *identity* (its label key), never from its position in the workbook:
 *
 *  1. A few well-known names have a preferred colour (Symptoms → rose,
 *     Functioning → teal). These are preferences, not a fixed taxonomy.
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
};

export const CATEGORY_PALETTE: readonly (CategoryTone & { name: string })[] = [
  { name: "rose", text: "#97405A", line: "#B85B70", soft: "#F9EDF0", tint: "#EFC8D1" },
  { name: "teal", text: "#2D6D78", line: "#408B97", soft: "#E8F3F3", tint: "#B7DADD" },
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
  symptoms: "rose",
  functioning: "teal",
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

/** CSS custom properties for a tone, for `style={...}` on an element and its children. */
export function toneVars(tone: CategoryTone | undefined): Record<string, string> {
  if (!tone) return {};
  return { "--cat-text": tone.text, "--cat-line": tone.line, "--cat-soft": tone.soft, "--cat-tint": tone.tint };
}
