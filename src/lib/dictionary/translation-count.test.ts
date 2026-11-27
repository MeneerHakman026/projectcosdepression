import { describe, expect, it } from "vitest";
import { CONTENT_FORMAT, type DictionaryContent, type MasterOutcome, type TranslationEntry } from "./model";
import { translatedOutcomeCount } from "./translation-count";

const SOURCE = "0123456789abcdef";

function master(id: string, fields: Partial<MasterOutcome> = {}): MasterOutcome {
  return {
    id,
    category: "Symptoms",
    groupDomain: "Mood",
    outcomeDomain: `Outcome ${id}`,
    definition: `Definition ${id}`,
    experience: `Experience ${id}`,
    verbatims: `PwD: "Quote ${id}"`,
    ...fields,
  };
}

function content(outcomes: MasterOutcome[], fr: Record<string, Omit<TranslationEntry, "source">>): DictionaryContent {
  return {
    format: CONTENT_FORMAT,
    master: { outcomes },
    translations: {
      fr: {
        categories: {},
        groups: {},
        outcomes: Object.fromEntries(Object.entries(fr).map(([id, entry]) => [id, { ...entry, source: SOURCE }])),
      },
    },
  };
}

const full = (id: string) => ({ outcomeDomain: `Résultat ${id}`, definition: `Définition ${id}`, experience: `Expérience ${id}`, verbatims: `PwD: "Citation ${id}"` });

describe("translatedOutcomeCount", () => {
  it("counts outcomes whose every English field is translated", () => {
    expect(translatedOutcomeCount(content([master("V_01"), master("V_02")], { V_01: full("V_01"), V_02: full("V_02") }), "fr")).toBe(2);
  });

  it("doesn't count partly translated outcomes, which still show English fallback", () => {
    const partial = { ...full("V_02"), verbatims: undefined };
    expect(translatedOutcomeCount(content([master("V_01"), master("V_02"), master("V_03")], { V_01: full("V_01"), V_02: partial }), "fr")).toBe(1);
  });

  it("doesn't require a translation for a field that is empty in English", () => {
    const rest = { ...full("V_01"), experience: undefined };
    expect(translatedOutcomeCount(content([master("V_01", { experience: "" })], { V_01: rest }), "fr")).toBe(1);
  });

  it("doesn't count English copied into the translation, ignoring whitespace", () => {
    const english = master("V_01");
    const copy = { outcomeDomain: english.outcomeDomain, definition: ` ${english.definition}\n`, experience: english.experience, verbatims: english.verbatims };
    expect(translatedOutcomeCount(content([english], { V_01: copy }), "fr")).toBe(0);
  });

  it("still counts an outcome where one field legitimately reads the same in both languages", () => {
    const english = master("V_01", { outcomeDomain: "Stress" });
    expect(translatedOutcomeCount(content([english], { V_01: { ...full("V_01"), outcomeDomain: "Stress" } }), "fr")).toBe(1);
  });

  it("is 0 for the master language and for languages without a translation", () => {
    const c = content([master("V_01")], { V_01: full("V_01") });
    expect(translatedOutcomeCount(c, "en")).toBe(0);
    expect(translatedOutcomeCount(c, "de")).toBe(0);
  });
});
