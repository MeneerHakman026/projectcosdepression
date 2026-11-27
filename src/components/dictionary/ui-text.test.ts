import { describe, expect, it } from "vitest";
import { EN, FR, uiTextFor } from "./ui-text";

describe("Dictionary interface text", () => {
  it("gives French every string English has, without leaving any in English", () => {
    expect(Object.keys(FR).sort()).toEqual([...Object.keys(EN), "cms"].sort());
    for (const key of Object.keys(EN) as (keyof typeof EN)[]) {
      const en = EN[key], fr = FR[key];
      if (key === "lang" || key === "sortAlpha" || key === "verbatimsTag") continue; // "A–Z" and "Verbatims" read the same
      if (typeof en === "string") expect(fr, key).not.toBe(en);
      if (typeof en === "function") expect((fr as (...a: unknown[]) => unknown)(3, 2, 1), key).not.toEqual((en as (...a: unknown[]) => unknown)(3, 2, 1));
    }
    expect(FR.fieldLabels.definition).toBe("Définition");
  });

  it("pluralises counts in both languages", () => {
    expect(EN.outcomeCount(1)).toBe("1 outcome");
    expect(EN.foundCount(2)).toBe("2 outcomes found");
    expect(FR.outcomeCount(1)).toBe("1 critère");
    expect(FR.shownCount(2)).toBe("2 critères affichés");
  });

  it("follows the Dictionary language, its base language, then English", () => {
    expect(uiTextFor("fr")).toBe(FR);
    expect(uiTextFor("fr-CA")).toBe(FR);
    expect(uiTextFor("nl")).toBe(EN);
    expect(uiTextFor("en")).toBe(EN);
  });

  it("names French participant groups by the codes the French verbatims use", () => {
    expect(FR.cms?.roles.map((role) => role.code)).toEqual(["P", "PS", "Pr"]);
    expect(EN.cms).toBeUndefined(); // English uses the CMS wording
  });
});
