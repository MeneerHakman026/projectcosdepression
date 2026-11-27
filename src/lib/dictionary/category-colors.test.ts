import { describe, expect, it } from "vitest";
import { assignCategoryTones, CATEGORY_PALETTE, contrast, generatedTone, hashKey } from "./category-colors";
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

  it("gives Symptoms rose and Functioning teal, whatever their spelling or order", () => {
    const a = assignCategoryTones([categoryKeyOf("Symptoms"), categoryKeyOf("Functioning")]);
    const b = assignCategoryTones([categoryKeyOf("FUNCTIONING "), categoryKeyOf(" symptoms")]);
    expect(a.get("symptoms")?.line).toBe("#B85B70");
    expect(a.get("functioning")?.line).toBe("#408B97");
    expect(b.get("symptoms")).toEqual(a.get("symptoms"));
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
