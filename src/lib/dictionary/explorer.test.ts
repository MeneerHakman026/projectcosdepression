import { beforeAll, describe, expect, it } from "vitest";
import { outcome, syntheticMaster, syntheticSourceOutcomes, syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import {
  EMPTY_FILTERS,
  PAGE_SIZE,
  buildExplorer,
  filterRecords,
  matchedFields,
  needsAttention,
  pageCount,
  pageOf,
  queryTerms,
  type ExplorerDataset,
} from "./explorer";
import { analyzeImport } from "./import";
import { CONTENT_FORMAT, COLUMNS, emptyContent, type DictionaryContent } from "./model";
import { readWorkbook } from "./xlsx-read";

let content: DictionaryContent;
let dataset: ExplorerDataset;

beforeAll(async () => {
  const read = await readWorkbook(await syntheticWorkbookBytes());
  if (!read.ok) throw new Error(read.message);
  content = analyzeImport(read.sheets, { language: "en", roleCodes: ["PwD", "HCP", "ICG"] }, emptyContent()).proposed!;
  dataset = { outcomes: content.master.outcomes, translations: content.translations };
});

const ids = (filters: Partial<typeof EMPTY_FILTERS>, language = "en", data = dataset) =>
  filterRecords(buildExplorer(data, language), { ...EMPTY_FILTERS, ...filters }).map((r) => r.id);

describe("Dataset Explorer records", () => {
  it("has one record per row with all seven columns exactly as stored", () => {
    const model = buildExplorer(dataset, "en");
    expect(model.records).toHaveLength(80);
    const source = syntheticSourceOutcomes();
    model.records.forEach((record, index) => {
      for (const column of COLUMNS) expect(record.values[column.field]).toBe(source[index][column.field]);
    });
    // Quirks survive untouched: double spaces, trailing spaces, line breaks, curly and straight quotes, U+F0E0.
    const v01 = model.records[0].values;
    expect(v01.verbatims).toBe(source[0].verbatims);
    expect(v01.verbatims).toContain("PwD:  “[SYNTHETIC] Life feels flat and aimless” “Every day is colourless” \nHCP:");
    expect(v01.definition.endsWith(" ")).toBe(true);
    expect(model.records[10].values.verbatims.startsWith('"PwD:')).toBe(true);
    expect(model.records[78].values.verbatims).toContain("");
  });

  it("derives categories and group domains with counts from the data", () => {
    const model = buildExplorer(dataset, "en");
    expect(model.categories.map((c) => [c.label, c.count])).toEqual([
      ["Synthetic symptoms", 64],
      ["Synthetic functioning", 16],
    ]);
    expect(model.categories.flatMap((c) => c.groups.map((g) => g.count))).toEqual([4, 18, 19, 9, 14, 3, 4, 3, 6]);
    expect(model.groupCount).toBe(9);
  });

  it("shows whatever structure a dataset has: 5 or 20 categories", () => {
    const five = buildExplorer({ outcomes: syntheticMaster(5, 3, 2), translations: {} }, "en");
    expect(five.categories).toHaveLength(5);
    expect(five.groupCount).toBe(15);
    const twenty = buildExplorer({ outcomes: syntheticMaster(20, 1, 1), translations: {} }, "en");
    expect(twenty.categories.map((c) => c.label)).toEqual(Array.from({ length: 20 }, (_, i) => `Category ${i + 1}`));
  });

  it("flags problems a reader would miss", () => {
    const model = buildExplorer(dataset, "en");
    const v79 = model.records.find((r) => r.id === "V_79")!;
    expect(v79.notes.map((n) => n.level)).toEqual(["warning"]);
    expect(v79.notes[0].message).toContain("U+F0E0");
    const withEmpty = buildExplorer(
      { outcomes: [outcome("A", "C", "G", { experience: "", verbatims: "  " }), outcome("B", "C", "G")], translations: {} },
      "en"
    );
    expect(withEmpty.records[0].missing).toEqual(["experience", "verbatims"]);
    expect(withEmpty.records[0].notes).toEqual([{ level: "warning", message: "Empty: Experience, Verbatims." }]);
    expect(needsAttention(withEmpty.records[0])).toBe(true);
    expect(needsAttention(withEmpty.records[1])).toBe(false);
  });

  it("handles rows read from an invalid workbook: empty and repeated IDs, empty categories", () => {
    const model = buildExplorer(
      {
        outcomes: [outcome("X", "", "", { outcomeDomain: "" }), outcome("X", "C", "G")],
        translations: {},
        rowNumbers: [2, 3],
      },
      "en",
      { 0: [{ level: "error", message: "The Variable ID X is used more than once." }] }
    );
    expect(model.records.map((r) => [r.index, r.rowNumber])).toEqual([
      [0, 2],
      [1, 3],
    ]);
    expect(model.categories[0].label).toBe("(empty)");
    expect(model.records[0].notes.map((n) => n.message)).toEqual([
      "Empty: Category, Group Domain, Outcome Domain.",
      "The Variable ID X is used more than once.",
    ]);
  });
});

describe("search and filters", () => {
  it("searches all seven columns", () => {
    expect(ids({ query: "V_44" })).toEqual(["V_44"]); // Variable
    expect(ids({ query: "functioning" })).toHaveLength(16); // Category
    expect(ids({ query: "Group S1" })).toEqual(["V_01", "V_02", "V_03", "V_04"]); // Group Domain
    expect(ids({ query: "zest for living" })).toEqual(["V_01"]); // Outcome Domain
    expect(ids({ query: "step-sequencing" })).toEqual(["V_11"]); // Definition
    expect(ids({ query: "driving force" })).toEqual(["V_01"]); // Experience
    expect(ids({ query: "Kilimanjaro" })).toEqual(["V_44"]); // Verbatims
  });

  it("is case-, accent- and quote-style-insensitive, and every word must match", () => {
    expect(ids({ query: "KILIMANJÁRO" })).toEqual(["V_44"]);
    expect(ids({ query: "didn’t manage" })).toEqual(["V_11"]);
    expect(ids({ query: "would've" })).toEqual(["V_65"]);
    expect(ids({ query: "sleep quality" })).toEqual(["V_55"]);
    expect(ids({ query: "kilimanjaro hopeless" })).toEqual([]);
  });

  it("says which columns matched", () => {
    const model = buildExplorer(dataset, "en");
    const v44 = model.records.find((r) => r.id === "V_44")!;
    expect(matchedFields(v44, queryTerms("kilimanjaro"))).toEqual(["verbatims"]);
    expect(matchedFields(v44, queryTerms("synthetic loneliness"))).toEqual(
      expect.arrayContaining(["outcomeDomain", "definition", "experience", "verbatims"])
    );
  });

  it("filters by category, group domain and records needing attention", () => {
    const model = buildExplorer(dataset, "en");
    const [symptoms, functioning] = model.categories;
    expect(ids({ category: functioning.key })).toHaveLength(16);
    expect(ids({ category: symptoms.key, group: symptoms.groups[0].key })).toEqual(["V_01", "V_02", "V_03", "V_04"]);
    expect(ids({ category: symptoms.key, query: "functioning" })).toEqual([]);
    expect(ids({ attention: true })).toEqual(["V_79"]);
  });

  it("shows a translation, marks what isn't translated, and still finds English text", () => {
    const translated: ExplorerDataset = {
      ...dataset,
      translations: {
        fr: {
          categories: { [buildExplorer(dataset, "en").categories[0].key]: "Symptômes synthétiques" },
          groups: {},
          outcomes: { V_01: { outcomeDomain: "Goût de vivre", definition: "Définition « exacte »  ", source: "0123456789abcdef" } },
        },
      },
    };
    const model = buildExplorer(translated, "fr");
    expect(model.languages.map((l) => l.code)).toEqual(["en", "fr"]);
    const v01 = model.records[0];
    expect(v01.values.outcomeDomain).toBe("Goût de vivre");
    expect(v01.values.definition).toBe("Définition « exacte »  ");
    expect(v01.english.outcomeDomain).toBe("Zest for living");
    expect(v01.missing).toEqual(["groupDomain", "experience", "verbatims"]);
    expect(model.records[1].notes[0].message).toBe("Not translated into French.");
    expect(model.categories[0].label).toBe("Symptômes synthétiques");
    expect(ids({ query: "gout de vivre" }, "fr", translated)).toEqual(["V_01"]);
    expect(ids({ query: "Kilimanjaro" }, "fr", translated)).toEqual(["V_44"]);
    // Unknown language falls back to English.
    expect(buildExplorer(translated, "de").language).toBe("en");
  });
});

describe("large datasets", () => {
  it("pages through thousands of records and searches them quickly", () => {
    const outcomes = syntheticMaster(20, 10, 25); // 5000 records, the maximum a dictionary can hold
    const big: ExplorerDataset = { outcomes, translations: {} };
    const started = performance.now();
    const model = buildExplorer(big, "en");
    const built = performance.now();
    const found = filterRecords(model, { ...EMPTY_FILTERS, query: "X_4999" });
    const searched = performance.now();
    expect(model.records).toHaveLength(5000);
    expect(model.categories).toHaveLength(20);
    expect(found.map((r) => r.id)).toEqual(["X_4999"]);
    expect(searched - built).toBeLessThan(150);
    expect(built - started).toBeLessThan(3000);

    expect(pageCount(5000)).toBe(100);
    expect(PAGE_SIZE).toBe(50);
    const last = pageOf(model.records, 100);
    expect([last.first, last.last, last.items.length]).toEqual([4951, 5000, 50]);
    expect(pageOf(model.records, 999).page).toBe(100);
    expect(pageOf([], 3)).toEqual({ items: [], page: 1, first: 0, last: 0 });
  });

  it("doesn't change the data it shows", () => {
    const before = JSON.stringify(content);
    const model = buildExplorer(dataset, "en");
    filterRecords(model, { ...EMPTY_FILTERS, query: "synthetic" });
    expect(JSON.stringify(content)).toBe(before);
    expect(content.format).toBe(CONTENT_FORMAT);
  });
});
