import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  HEADERS,
  buildWorkbook,
  outcome,
  rowsOf,
  syntheticMaster,
  syntheticWorkbookBytes,
} from "../../../test/dictionary-fixtures";
import { summarize } from "./content";
import { analyzeImport, type ImportAnalysis } from "./import";
import { COLUMNS, emptyContent, type DictionaryContent, type MasterOutcome } from "./model";
import { prepareImport, type ImportBase } from "./pipeline";
import { deriveTaxonomy } from "./taxonomy";
import { buildView } from "./view";
import { readWorkbook } from "./xlsx-read";

const ROLES = ["PwD", "HCP", "ICG"];

async function analyze(bytes: Uint8Array, language = "en", base: DictionaryContent = emptyContent()): Promise<ImportAnalysis> {
  const read = await readWorkbook(bytes);
  if (!read.ok) throw new Error(read.message);
  return analyzeImport(read.sheets, { language, roleCodes: ROLES }, base);
}

function errors(analysis: ImportAnalysis): string[] {
  return analysis.issues.filter((issue) => issue.level === "error").map((issue) => issue.message);
}

async function importMaster(outcomes: MasterOutcome[], base: DictionaryContent = emptyContent()) {
  const analysis = await analyze(await buildWorkbook([{ name: "Sheet1", rows: rowsOf(outcomes) }]), "en", base);
  expect(errors(analysis)).toEqual([]);
  return analysis.proposed!;
}

function base(content: DictionaryContent): ImportBase {
  return { version: 1, draftNumber: null, liveNumber: 1, content, live: content };
}

describe("an 80-outcome workbook shaped like the research workbook (synthetic)", () => {
  let content: DictionaryContent;
  let analysis: ImportAnalysis;
  let sourceRows: string[][];

  beforeAll(async () => {
    const bytes = await syntheticWorkbookBytes();
    analysis = await analyze(bytes);
    content = analysis.proposed!;
    // Read the source independently of the importer, cell by cell.
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
    sourceRows = [];
    workbook.worksheets[0].eachRow((row) => sourceRows.push((row.values as unknown[]).slice(1).map(String)));
  });

  it("imports without errors", () => {
    expect(errors(analysis)).toEqual([]);
    expect(analysis.sheets).toEqual([{ name: "Sheet1", role: "master", language: "en", rows: 80 }]);
  });

  it("has the seven source columns in order", () => {
    expect(sourceRows[0]).toEqual(HEADERS);
  });

  it("contains all 80 stable IDs, V_01 to V_80, in source order", () => {
    expect(content.master.outcomes.map((o) => o.id)).toEqual(
      Array.from({ length: 80 }, (_, i) => `V_${String(i + 1).padStart(2, "0")}`)
    );
  });

  it("preserves every cell of all seven columns exactly (spaces, line breaks, quotation marks)", () => {
    const imported = content.master.outcomes.map((o) => COLUMNS.map((column) => o[column.field]));
    expect(imported).toEqual(sourceRows.slice(1));
    const v01 = content.master.outcomes[0];
    expect(v01.verbatims).toBe(
      "PwD:  “[SYNTHETIC] Life feels flat and aimless” “Every day is colourless” \nHCP:   “[They need] more synthetic engagement” \nICG: “[SYNTHETIC] She lost all her sparkle”"
    );
    expect(v01.definition.endsWith(" ")).toBe(true);
  });

  it("derives two categories and nine group domains", () => {
    const taxonomy = deriveTaxonomy(content.master.outcomes);
    expect(taxonomy.categories.map((c) => [c.label, c.outcomeIds.length])).toEqual([
      ["Synthetic symptoms", 64],
      ["Synthetic functioning", 16],
    ]);
    expect(taxonomy.categories.flatMap((c) => c.groups.map((g) => `${g.label} (${g.outcomeIds.length})`))).toEqual([
      "Group S1 (4)",
      "Group S2 (18)",
      "Group S3 (19)",
      "Group S4 (9)",
      "Group S5 (14)",
      "Group F1 (3)",
      "Group F2 (4)",
      "Group F3 (3)",
      "Group F4 (6)",
    ]);
    expect(summarize(content)).toEqual({ outcomes: 80, categories: 2, groups: 9, languages: {} });
  });

  it("reports data-quality issues instead of silently fixing them", () => {
    const messages = analysis.issues.map((issue) => `${issue.level} ${issue.outcomeId ?? ""} ${issue.message}`);
    // V_79 contains U+F0E0 (a Wingdings arrow pasted from Word, as in the research data).
    expect(messages.some((m) => m.startsWith("warning V_79") && m.includes("U+F0E0"))).toBe(true);
    // V_11's verbatims are wrapped in straight quotes, so they can't be attributed safely.
    expect(messages.some((m) => m.startsWith("info V_11") && m.includes("shown exactly as written"))).toBe(true);
    expect(content.master.outcomes.find((o) => o.id === "V_79")!.verbatims).toContain("");
  });
});

describe("dynamic taxonomy", () => {
  it.each([
    [5, 3, 4],
    [20, 2, 2],
    [1, 1, 50],
    [7, 5, 6],
  ])("adapts to %i categories × %i groups × %i outcomes", async (categories, groups, perGroup) => {
    const content = await importMaster(syntheticMaster(categories, groups, perGroup));
    const view = buildView(content, "en", null);
    expect(view.totals).toEqual({ outcomes: categories * groups * perGroup, categories, groups: categories * groups });
    expect(view.categories).toHaveLength(categories);
    expect(view.categories.every((c) => c.groups.length === groups)).toBe(true);
    expect(view.categories.every((c) => c.count === groups * perGroup)).toBe(true);
  });

  it("keeps identically named groups under different categories separate", async () => {
    const content = await importMaster([
      outcome("A1", "Symptoms", "General"),
      outcome("A2", "Functioning", "General"),
      outcome("A3", "Symptoms", "General"),
    ]);
    const taxonomy = deriveTaxonomy(content.master.outcomes);
    expect(taxonomy.groupByKey.size).toBe(2);
    expect(taxonomy.categories.map((c) => c.groups.map((g) => g.outcomeIds))).toEqual([[["A1", "A3"]], [["A2"]]]);
    // Distinct URL slugs, so filters can't collide.
    const slugs = taxonomy.categories.flatMap((c) => c.groups.map((g) => g.slug));
    expect(new Set(slugs).size).toBe(2);
  });

  it("treats spelling variants of one category as the same category and warns", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: rowsOf([outcome("A1", "Symptoms", "Mood"), outcome("A2", " symptoms ", "mood")]) },
      ])
    );
    expect(errors(analysis)).toEqual([]);
    const taxonomy = deriveTaxonomy(analysis.proposed!.master.outcomes);
    expect(taxonomy.categories.map((c) => c.label)).toEqual(["Symptoms"]);
    expect(taxonomy.groupByKey.size).toBe(1);
    expect(analysis.issues.filter((i) => i.level === "warning" && i.message.includes("differ only in capitals"))).toHaveLength(2);
    // Raw spelling is still preserved per row.
    expect(analysis.proposed!.master.outcomes[1].category).toBe(" symptoms ");
  });

  it("reports removed and renamed categories against the previous dataset", async () => {
    const previous = await importMaster([
      outcome("A1", "Symptoms", "Mood"),
      outcome("A2", "Functioning", "Social"),
      outcome("A3", "Other", "Misc"),
    ]);
    const { preview } = await prepareImport(
      await buildWorkbook([
        { name: "Sheet1", rows: rowsOf([outcome("A1", "Core symptoms", "Mood"), outcome("A2", "Functioning", "Social")]) },
      ]),
      { fileName: "new.xlsx", language: "en", roleCodes: ROLES },
      base(previous)
    );
    expect(preview.ok).toBe(true);
    expect(preview.diff!.categories).toEqual({ added: [], removed: ["Other"], renamed: [{ from: "Symptoms", to: "Core symptoms" }] });
    expect(preview.diff!.outcomes.removed.map((o) => o.id)).toEqual(["A3"]);
    expect(preview.needsAcknowledgement).toBe(true);
    expect(preview.alerts.map((a) => a.message).join(" ")).toContain("Category removed: Other");
  });

  it("handles fewer and more outcomes than the original", async () => {
    const original = await importMaster(syntheticMaster(2, 3, 13)); // 78
    for (const next of [syntheticMaster(2, 3, 8), syntheticMaster(4, 5, 10)]) {
      const { preview } = await prepareImport(
        await buildWorkbook([{ name: "Sheet1", rows: rowsOf(next) }]),
        { fileName: "x.xlsx", language: "en", roleCodes: ROLES },
        base(original)
      );
      expect(preview.ok).toBe(true);
      expect(preview.diff!.after.outcomes).toBe(next.length);
    }
  });
});

describe("import validation", () => {
  it("rejects missing headers and names them", async () => {
    const analysis = await analyze(
      await buildWorkbook([{ name: "Sheet1", rows: [["Variable", "Category", "Group", "Outcome Domain", "Definition", "Experience", "Verbatims"], ["V_01", "S", "G", "O", "D", "E", "V"]] }])
    );
    expect(analysis.ok).toBe(false);
    expect(errors(analysis).join(" ")).toContain("Missing column: “Group Domain”");
  });

  it("accepts headers regardless of capitals and spacing", async () => {
    const rows = rowsOf([outcome("V_01", "S", "G")]);
    rows[0] = rows[0].map((h) => `  ${h.toUpperCase()} `);
    expect((await analyze(await buildWorkbook([{ name: "Sheet1", rows }]))).ok).toBe(true);
  });

  it("rejects missing required cells and reports the row", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: rowsOf([outcome("V_01", "S", "G", { definition: "  " }), outcome("", "S", "G")]) },
      ])
    );
    expect(errors(analysis)).toEqual(["V_01 (row 2): Definition is empty.", "Row 3 has no Variable (outcome ID)."]);
  });

  it("only warns about empty Experience or Verbatims", async () => {
    const analysis = await analyze(
      await buildWorkbook([{ name: "Sheet1", rows: rowsOf([outcome("V_01", "S", "G", { verbatims: "" })]) }])
    );
    expect(analysis.ok).toBe(true);
    expect(analysis.issues.some((i) => i.level === "warning" && i.message.includes("Verbatims is empty"))).toBe(true);
  });

  it("rejects duplicate IDs, including ones differing only in case", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: rowsOf([outcome("V_01", "S", "G"), outcome("V_02", "S", "G"), outcome("v_01", "S", "G")]) },
      ])
    );
    expect(errors(analysis)).toEqual(["The Variable ID V_01 is used more than once (rows 2, 4). Every outcome needs its own ID."]);
  });

  it("rejects IDs that aren't URL-safe", async () => {
    const analysis = await analyze(await buildWorkbook([{ name: "Sheet1", rows: rowsOf([outcome("V 01/x", "S", "G")]) }]));
    expect(errors(analysis)[0]).toContain("isn't a valid Variable ID");
  });

  it("rejects an empty workbook and a sheet with headers only", async () => {
    expect(errors(await analyze(await buildWorkbook([{ name: "Sheet1", rows: [] }])))).toEqual(["The workbook is empty."]);
    expect(errors(await analyze(await buildWorkbook([{ name: "Sheet1", rows: [HEADERS] }])))[0]).toContain("no outcomes");
  });

  it("rejects corrupted files, legacy .xls and non-Excel files without throwing", async () => {
    const good = await buildWorkbook([{ name: "Sheet1", rows: rowsOf([outcome("V_01", "S", "G")]) }]);
    const truncated = good.slice(0, Math.floor(good.length / 2));
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0]);
    const text = new TextEncoder().encode("Variable,Category\nV_01,S");
    for (const [bytes, expected] of [
      [truncated, "damaged"],
      [xls, "older Excel format (.xls)"],
      [text, "isn't an Excel workbook"],
      [new Uint8Array(), "empty"],
    ] as const) {
      const result = await readWorkbook(bytes);
      expect(result.ok).toBe(false);
      expect(!result.ok && result.message).toContain(expected);
    }
  });

  it("ignores unexpected extra columns with a warning, and keeps the data", async () => {
    const rows = rowsOf([outcome("V_01", "S", "G")]).map((row, i) => [...row, i === 0 ? "Notes" : "internal note"]);
    const analysis = await analyze(await buildWorkbook([{ name: "Sheet1", rows }]));
    expect(analysis.ok).toBe(true);
    expect(analysis.issues.find((i) => i.level === "warning")!.message).toContain("“Notes” isn't part of the dictionary");
    expect(analysis.proposed!.master.outcomes[0]).not.toHaveProperty("Notes");
  });

  it("refuses formulas instead of evaluating them", async () => {
    const rows: unknown[][] = rowsOf([outcome("V_01", "S", "G")]);
    rows[1][4] = { formula: '"Evil"&"Text"', result: "EvilText" };
    const analysis = await analyze(await buildWorkbook([{ name: "Sheet1", rows }]));
    expect(errors(analysis)[0]).toContain("contains a formula");
  });

  it("ignores hidden sheets and sheets without dictionary columns", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        { name: "About", rows: [["Some notes"]] },
        { name: "Old", rows: rowsOf([outcome("OLD", "S", "G")]), hidden: true },
        { name: "Sheet1", rows: rowsOf([outcome("V_01", "S", "G")]) },
      ])
    );
    expect(analysis.ok).toBe(true);
    expect(analysis.proposed!.master.outcomes.map((o) => o.id)).toEqual(["V_01"]);
    expect(analysis.sheets.map((s) => [s.name, s.role])).toEqual([
      ["About", "ignored"],
      ["Old", "ignored"],
      ["Sheet1", "master"],
    ]);
  });

  it("treats re-uploading the same file as unchanged", async () => {
    const bytes = await syntheticWorkbookBytes();
    const first = await prepareImport(bytes, { fileName: "a.xlsx", language: "en", roleCodes: ROLES }, base(emptyContent()));
    const second = await prepareImport(bytes, { fileName: "a.xlsx", language: "en", roleCodes: ROLES }, base(first.proposed!));
    expect(second.preview.unchanged).toBe(true);
    expect(second.preview.diff!.identical).toBe(true);
    expect(second.preview.diff!.outcomes.unchanged).toBe(80);
  });

  it("shows field-level changes, flags changed quotations, and spots whitespace-only edits", async () => {
    const previous = await importMaster([outcome("V_01", "S", "G"), outcome("V_02", "S", "G")]);
    const { preview } = await prepareImport(
      await buildWorkbook([
        {
          name: "Sheet1",
          rows: rowsOf([
            outcome("V_01", "S", "G", { verbatims: "PwD: “A different quote”" }),
            outcome("V_02", "S", "G", { definition: "Definition of  V_02. " }),
          ]),
        },
      ]),
      { fileName: "x.xlsx", language: "en", roleCodes: ROLES },
      base(previous)
    );
    const modified = preview.diff!.outcomes.modified;
    expect(modified.map((m) => [m.id, m.changes.map((c) => [c.field, c.whitespaceOnly])])).toEqual([
      ["V_01", [["verbatims", false]]],
      ["V_02", [["definition", true]]],
    ]);
    expect(preview.diff!.verbatimsChanged).toBe(1);
    expect(preview.alerts.some((a) => a.message.includes("quotations"))).toBe(true);
  });
});

describe("translations", () => {
  let master: DictionaryContent;

  beforeAll(async () => {
    master = await importMaster([
      outcome("V_01", "Symptoms", "Mood"),
      outcome("V_02", "Symptoms", "Mood"),
      outcome("V_03", "Functioning", "Social"),
    ]);
  });

  function translationRows(rows: Partial<Record<(typeof HEADERS)[number], string>>[]) {
    return [HEADERS, ...rows.map((row) => HEADERS.map((h) => row[h] ?? ""))];
  }

  it("imports a French translation matched by ID, without touching the master taxonomy", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        {
          name: "Sheet1",
          rows: translationRows([
            { Variable: "V_01", Category: "Symptômes", "Group Domain": "Humeur", "Outcome Domain": "Désir de vivre", Definition: "Définition « accentuée » — çà et là." },
            { Variable: "V_03", "Outcome Domain": "Vie sociale" },
          ]),
        },
      ]),
      "fr",
      master
    );
    expect(errors(analysis)).toEqual([]);
    const proposed = analysis.proposed!;
    expect(proposed.master).toEqual(master.master);
    expect(proposed.translations.fr.outcomes.V_01).toMatchObject({
      outcomeDomain: "Désir de vivre",
      definition: "Définition « accentuée » — çà et là.",
    });
    expect(proposed.translations.fr.outcomes).not.toHaveProperty("V_02");
    expect(Object.values(proposed.translations.fr.categories)).toEqual(["Symptômes"]);
    expect(analysis.issues.some((i) => i.level === "info" && i.message.includes("1 of 3 outcomes have no French translation"))).toBe(true);

    const view = buildView(proposed, "fr", null);
    expect(view.categories.map((c) => [c.label.text, c.label.fallback])).toEqual([
      ["Symptômes", false],
      ["Functioning", true],
    ]);
    const [v01, v02, v03] = view.outcomes;
    expect(v01.outcomeDomain).toEqual({ text: "Désir de vivre", fallback: false });
    expect(v01.experience).toEqual({ text: "Experience of V_01.", fallback: true });
    expect(v02.translated).toBe(false);
    expect(v02.definition.fallback).toBe(true);
    expect(v03.outcomeDomain.fallback).toBe(false);
    expect(v03.definition.fallback).toBe(true);
  });

  it("imports Dutch alongside French without disturbing it", async () => {
    const fr = (await analyze(
      await buildWorkbook([{ name: "fr", rows: translationRows([{ Variable: "V_01", "Outcome Domain": "Désir de vivre" }]) }]),
      "fr",
      master
    )).proposed!;
    const nl = await analyze(
      await buildWorkbook([{ name: "Sheet1", rows: translationRows([{ Variable: "V_02", "Outcome Domain": "Levenslust" }]) }]),
      "nl",
      fr
    );
    expect(Object.keys(nl.proposed!.translations)).toEqual(["fr", "nl"]);
    expect(nl.proposed!.translations.fr).toEqual(fr.translations.fr);
  });

  it("ignores and reports unknown IDs; never creates master outcomes", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: translationRows([{ Variable: "V_01", "Outcome Domain": "Un" }, { Variable: "V_99", "Outcome Domain": "Nouveau" }]) },
      ]),
      "fr",
      master
    );
    expect(analysis.ok).toBe(true);
    expect(analysis.proposed!.master.outcomes.map((o) => o.id)).toEqual(["V_01", "V_02", "V_03"]);
    expect(analysis.issues.find((i) => i.level === "warning")!.message).toContain("V_99");
  });

  it("rejects conflicting translated names within one category", async () => {
    const analysis = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: translationRows([{ Variable: "V_01", Category: "Symptômes" }, { Variable: "V_02", Category: "Symptomes" }]) },
      ]),
      "fr",
      master
    );
    expect(errors(analysis)[0]).toContain("The category “Symptoms” has different French names");
  });

  it("requires an English master before any translation", async () => {
    const analysis = await analyze(
      await buildWorkbook([{ name: "Sheet1", rows: translationRows([{ Variable: "V_01", "Outcome Domain": "Un" }]) }]),
      "fr"
    );
    expect(errors(analysis)[0]).toContain("Import the English workbook first");
  });

  it("rejects a sheet whose name contradicts the chosen language", async () => {
    const analysis = await analyze(
      await buildWorkbook([{ name: "fr", rows: translationRows([{ Variable: "V_01", "Outcome Domain": "Un" }]) }]),
      "en",
      master
    );
    expect(errors(analysis)[0]).toContain("named for French");
  });

  it("removes translations of outcomes removed from a new master, and flags outdated ones", async () => {
    const withFr = (await analyze(
      await buildWorkbook([
        { name: "fr", rows: translationRows([{ Variable: "V_01", "Outcome Domain": "Un" }, { Variable: "V_03", "Outcome Domain": "Trois" }]) },
      ]),
      "fr",
      master
    )).proposed!;
    const analysis = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: rowsOf([outcome("V_01", "Symptoms", "Mood", { definition: "Changed." }), outcome("V_02", "Symptoms", "Mood")]) },
      ]),
      "en",
      withFr
    );
    expect(analysis.ok).toBe(true);
    expect(Object.keys(analysis.proposed!.translations.fr.outcomes)).toEqual(["V_01"]);
    const text = analysis.issues.map((i) => i.message).join("\n");
    expect(text).toContain("French: 1 translated outcome is removed together with its English outcome (V_03)");
    expect(text).toContain("may be out of date");
  });

  it("rejects several unnamed data sheets and accepts a multi-language workbook", async () => {
    const twoUnnamed = await analyze(
      await buildWorkbook([
        { name: "Sheet1", rows: rowsOf([outcome("V_01", "S", "G")]) },
        { name: "Sheet2", rows: rowsOf([outcome("V_01", "S", "G")]) },
      ])
    );
    expect(errors(twoUnnamed).join(" ")).toContain("must be named with its language code");

    const multi = await analyze(
      await buildWorkbook([
        { name: "en", rows: rowsOf([outcome("V_01", "S", "G"), outcome("V_02", "S", "G")]) },
        { name: "nl — Nederlands", rows: translationRows([{ Variable: "V_02", "Outcome Domain": "Twee" }]) },
      ])
    );
    expect(errors(multi)).toEqual([]);
    expect(multi.replaces).toEqual(["en", "nl"]);
    expect(multi.proposed!.translations.nl.outcomes.V_02.outcomeDomain).toBe("Twee");
  });
});
