import { describe, expect, it } from "vitest";
import { assignCategoryTones, bandColors, CATEGORY_PALETTE, LOGO, contrast, generatedTone, hashKey } from "./category-colors";
import { categoryKeyOf } from "./taxonomy";

const WHITE = "#FFFFFF";

describe("category colours", () => {
  it("every palette tone meets WCAG AA: text ≥ 4.5:1 on white and on its tint, lines ≥ 3:1", () => {
    for (const tone of CATEGORY_PALETTE) {
      expect(contrast(tone.text, WHITE), `${tone.name} text on white`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tone.text, tone.soft), `${tone.name} text on soft`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tone.line, WHITE), `${tone.name} line on white`).toBeGreaterThanOrEqual(3);
    }
  });

  it("generated fallback tones meet the same targets for any hash", () => {
    for (let i = 0; i < 360; i += 7) {
      const tone = generatedTone(hashKey(`category ${i}`) + i);
      expect(contrast(tone.text, WHITE)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tone.text, tone.soft)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(tone.line, WHITE)).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives every entry band (palette and generated) text at ≥ 4.5:1", () => {
    const tones = [...CATEGORY_PALETTE, ...Array.from({ length: 52 }, (_, i) => generatedTone(hashKey(`category ${i}`) + i * 7))];
    for (const tone of tones) {
      const band = bandColors(tone);
      expect(band.background).toBe(tone.band ?? tone.text);
      expect(contrast(band.text, band.background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("gives Symptoms the logo turquoise and Functioning the logo navy with a mint band, whatever their spelling or order", () => {
    const a = assignCategoryTones([categoryKeyOf("Symptoms"), categoryKeyOf("Functioning")]);
    const b = assignCategoryTones([categoryKeyOf("FUNCTIONING "), categoryKeyOf(" symptoms")]);
    expect(a.get("symptoms")?.line).toBe(LOGO.turquoise);
    expect(bandColors(a.get("symptoms")!)).toEqual({ background: "#3A7480", text: "#FFFFFF" });
    expect(a.get("functioning")?.text).toBe("#2C4560");
    expect(bandColors(a.get("functioning")!)).toEqual({ background: LOGO.mint, text: LOGO.navy });
    expect(b.get("symptoms")).toEqual(a.get("symptoms"));
  });

  it("uses no rose or red for the two known categories", () => {
    const tones = assignCategoryTones(["symptoms", "functioning"]);
    for (const tone of tones.values()) {
      for (const colour of [tone.text, tone.line, tone.soft, tone.tint, bandColors(tone).background]) {
        const n = parseInt(colour.slice(1), 16);
        const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
        expect(r, colour).toBeLessThanOrEqual(Math.max(g, b)); // blue-green family: red never dominates
      }
    }
  });

  it("is based on identity, not position: reordering categories changes nothing", () => {
    const keys = ["symptoms", "functioning", "quality of life", "treatment", "relationships"];
    const forward = assignCategoryTones(keys);
    const backward = assignCategoryTones([...keys].reverse());
    for (const key of keys) expect(backward.get(key)).toEqual(forward.get(key));
  });

  it("gives distinct palette colours while there are enough, then falls back to generated tones", () => {
    const keys = Array.from({ length: 20 }, (_, i) => `category ${i + 1}`);
    const tones = assignCategoryTones(keys);
    const fromPalette = keys.map((k) => tones.get(k)!).filter((t) => CATEGORY_PALETTE.includes(t as (typeof CATEGORY_PALETTE)[number]));
    expect(new Set(fromPalette.map((t) => t.line)).size).toBe(CATEGORY_PALETTE.length);
    for (const key of keys) expect(tones.get(key)).toBeDefined();
    const small = assignCategoryTones(keys.slice(0, 5));
    expect(new Set(keys.slice(0, 5).map((k) => small.get(k)!.line)).size).toBe(5);
  });
});
