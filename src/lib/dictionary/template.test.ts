import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { HEADERS, buildWorkbook, rowsOf, syntheticSourceOutcomes, syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import { contentHash } from "./hash";
import { analyzeImport } from "./import";
import { emptyContent, type DictionaryContent } from "./model";
import { deriveTaxonomy } from "./taxonomy";
import { readWorkbook } from "./xlsx-read";
import { exportBlankTemplate, exportTranslationTemplate } from "./xlsx-write";

const ROLES = [
  { code: "PwD", label: "People with depression" },
  { code: "HCP", label: "Healthcare professionals" },
];
const CODES = ROLES.map((r) => r.code);
const NOW = new Date("2026-11-25T10:00:00Z");

async function load(bytes: Uint8Array): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  return workbook;
}

async function analyze(bytes: Uint8Array, language = "en", base: DictionaryContent = emptyContent()) {
  const read = await readWorkbook(bytes);
  if (!read.ok) throw new Error(read.message);
  return analyzeImport(read.sheets, { language, roleCodes: CODES }, base);
}

describe("blank English master template", () => {
  let bytes: Uint8Array;
  let workbook: ExcelJS.Workbook;

  beforeAll(async () => {
    bytes = await exportBlankTemplate({ exportedAt: NOW, roles: ROLES });
    workbook = await load(bytes);
  });

  it("is a valid .xlsx workbook with an Instructions sheet and the data sheet “en”", () => {
    expect([...bytes.slice(0, 2)]).toEqual([0x50, 0x4b]); // zip
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["Instructions", "en"]);
  });

  it("has exactly the seven columns, in order, and no data rows", () => {
    const sheet = workbook.getWorksheet("en")!;
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual([
      "Variable",
      "Category",
      "Group Domain",
      "Outcome Domain",
      "Definition",
      "Experience",
      "Verbatims",
    ]);
    expect(HEADERS).toHaveLength(7);
    expect(sheet.actualRowCount).toBe(1);
    for (let c = 1; c <= 7; c++) {
      // Whole columns formatted as Text, so typed values stay as typed.
      expect(sheet.getColumn(c).numFmt).toBe("@");
      expect(sheet.getRow(1).getCell(c).note).toBeTruthy();
    }
    expect(sheet.getRow(1).getCell(8).value).toBeNull();
  });

  it("explains the columns, the stable ID, the hierarchy, one row per outcome, derived categories and quotations", () => {
    const text = workbook
      .getWorksheet("Instructions")!
      .getColumn(1)
      .values.filter((v): v is string => typeof v === "string")
      .join("\n");
    for (const header of HEADERS) expect(text).toContain(`. ${header} — `);
    expect(text).toMatch(/permanent ID/);
    expect(text).toMatch(/Never change or reuse an ID/);
    expect(text).toContain("Category → Group Domain → Outcome Domain");
    expect(text).toContain("Each row is one outcome");
    expect(text).toMatch(/website builds them from the Category and Group Domain columns/);
    expect(text).toMatch(/exactly as typed/);
    expect(text).toMatch(/Don't correct, shorten or paraphrase quotations/);
    expect(text).toContain("PwD = People with depression; HCP = Healthcare professionals");
  });

  it("contains no quotations or dictionary content, and no formulas", async () => {
    for (const sheet of workbook.worksheets) {
      sheet.eachRow((row) =>
        row.eachCell((cell) => {
          expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
        })
      );
    }
    const text = JSON.stringify(workbook.getWorksheet("en")!.getSheetValues());
    expect(text).not.toMatch(/“[^”]{3,}”/);
  });

  it("imports with one clear error when still empty — the Instructions sheet is ignored", async () => {
    const analysis = await analyze(bytes);
    expect(analysis.issues.filter((i) => i.level === "error").map((i) => i.message)).toEqual([
      "The sheet has headers but no outcomes. An empty dictionary can't be imported.",
    ]);
    expect(analysis.sheets.find((s) => s.name === "Instructions")?.role).toBe("ignored");
  });

  it("imports cleanly once filled in, keeping every cell exactly", async () => {
    const filled = await load(bytes);
    const sheet = filled.getWorksheet("en")!;
    const outcomes = syntheticSourceOutcomes();
    rowsOf(outcomes)
      .slice(1)
      .forEach((values, r) => values.forEach((value, c) => (sheet.getCell(r + 2, c + 1).value = value)));
    const analysis = await analyze(new Uint8Array(await filled.xlsx.writeBuffer()));
    expect(analysis.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(analysis.proposed!.master.outcomes).toEqual(outcomes);
    expect(deriveTaxonomy(analysis.proposed!.master.outcomes).categories).toHaveLength(2);
  });
});

describe("translation template", () => {
  let master: DictionaryContent;
  beforeAll(async () => {
    master = (await analyze(await syntheticWorkbookBytes())).proposed!;
  });

  it("lists every stable ID of the source version and says which version it came from", async () => {
    const bytes = await exportTranslationTemplate(master, "fr", {
      releaseLabel: "Based on the English master of version 3 (live)",
      exportedAt: NOW,
    });
    const workbook = await load(bytes);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["fr", "About"]);
    const ids = workbook.getWorksheet("fr")!.getColumn(1).values.slice(2);
    expect(ids).toEqual(master.master.outcomes.map((o) => o.id));
    expect(String(workbook.getWorksheet("About")!.getCell(2, 1).value)).toContain("Based on the English master of version 3 (live)");
  });

  it("can't change the English master or its categories when imported", async () => {
    const template = await load(
      await exportTranslationTemplate(master, "fr", { releaseLabel: "Based on version 1", exportedAt: NOW })
    );
    const sheet = template.getWorksheet("fr")!;
    // Column 3 = translated Category, 5 = Group Domain, 7 = Outcome Domain.
    sheet.getCell(2, 3).value = "Catégorie traduite";
    sheet.getCell(2, 5).value = "Groupe traduit";
    sheet.getCell(2, 7).value = "Nom traduit";
    sheet.getCell(3, 1).value = "NEW_ID"; // a translation can't add outcomes
    const analysis = await analyze(new Uint8Array(await template.xlsx.writeBuffer()), "fr", master);
    expect(analysis.ok).toBe(true);
    const proposed = analysis.proposed!;
    expect(contentHash({ ...proposed, translations: {} })).toBe(contentHash({ ...master, translations: {} }));
    expect(proposed.master.outcomes.map((o) => o.id)).not.toContain("NEW_ID");
    expect(analysis.issues.some((i) => i.message.includes("NEW_ID") && i.message.includes("can't add new outcomes"))).toBe(true);
    expect(proposed.translations.fr.outcomes.V_01.outcomeDomain).toBe("Nom traduit");
  });
});

describe("template workbooks built elsewhere", () => {
  it("accept the seven headers in any order with extra sheets around them", async () => {
    const bytes = await buildWorkbook([
      { name: "Read me", rows: [["Notes for the team"], ["Variable", "anything"]] },
      { name: "en", rows: [HEADERS] },
    ]);
    const analysis = await analyze(bytes);
    expect(analysis.issues.filter((i) => i.level === "error").map((i) => i.message)).toEqual([
      "The sheet has headers but no outcomes. An empty dictionary can't be imported.",
    ]);
  });
});
