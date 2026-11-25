import ExcelJS from "exceljs";
import JSZip from "jszip";
import { beforeAll, describe, expect, it } from "vitest";
import { HEADERS, buildWorkbook, outcome, rowsOf, syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import { diffContents } from "./diff";
import { contentHash } from "./hash";
import { analyzeImport } from "./import";
import { emptyContent, type DictionaryContent } from "./model";
import { readWorkbook } from "./xlsx-read";
import { exportAllLanguages, exportLanguage, exportMaster, exportTranslationTemplate, toExcelText } from "./xlsx-write";

const ROLES = ["PwD", "HCP", "ICG"];
const META = { releaseLabel: "Version 1 (live)", exportedAt: new Date("2026-11-25T10:00:00Z") };

async function reimport(bytes: Uint8Array, language: string, base: DictionaryContent): Promise<DictionaryContent> {
  const read = await readWorkbook(bytes);
  if (!read.ok) throw new Error(read.message);
  const analysis = analyzeImport(read.sheets, { language, roleCodes: ROLES }, base);
  const errors = analysis.issues.filter((i) => i.level === "error");
  if (errors.length) throw new Error(errors.map((e) => e.message).join("\n"));
  return analysis.proposed!;
}

describe("Excel export", () => {
  let source: DictionaryContent;

  beforeAll(async () => {
    source = await reimport(await syntheticWorkbookBytes(), "en", emptyContent());
  });

  it("exports the English master with exactly the seven source columns", async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await exportMaster(source, META)) as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["en", "About"]);
    const sheet = workbook.getWorksheet("en")!;
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual(HEADERS);
    expect(sheet.rowCount).toBe(81);
  });

  it("round-trips the supplied workbook with no information loss", async () => {
    const again = await reimport(await exportMaster(source, META), "en", emptyContent());
    expect(again).toEqual(source);
    expect(contentHash(again)).toBe(contentHash(source));
    expect(diffContents(source, again).identical).toBe(true);
  });

  it("round-trips difficult text: Unicode, accents, line breaks, \\r\\n, quotes, formula-like text and Excel escape sequences", async () => {
    const tricky = [
      "=HYPERLINK(\"http://evil\",\"click\")",
      "+SUM(A1:A9)",
      "-1",
      "@cmd",
      "Line one\r\nLine two\nLine three",
      "Literal _x0041_ and _x000D_ text",
      "“Curly” ‘quotes’ \"straight\" — dash … ellipsis",
      "Accents: é è ê ë ç ñ ü ø å œ ß; Chinese 抑郁症; emoji 😔",
      "  leading and trailing spaces  ",
      " private-use arrow",
      "Tab\tinside",
    ];
    const content = await reimport(
      await buildWorkbook([
        {
          name: "Sheet1",
          rows: rowsOf(tricky.map((text, i) => outcome(`T_${i}`, "Cat", "Grp", { definition: text, verbatims: text }))),
        },
      ]),
      "en",
      emptyContent()
    );
    // Put the exact strings in place (the fixture builder itself can't write
    // \r\n), then check our export → import preserves every one of them.
    const withCrlf: DictionaryContent = {
      ...content,
      master: { outcomes: content.master.outcomes.map((o, i) => ({ ...o, definition: tricky[i] })) },
    };
    const again = await reimport(await exportMaster(withCrlf, META), "en", emptyContent());
    expect(again.master.outcomes.map((o) => o.definition)).toEqual(tricky);
    expect(again.master.outcomes.map((o) => o.verbatims)).toEqual(content.master.outcomes.map((o) => o.verbatims));
  });

  it("never writes formulas: formula-like text is a plain string cell with Text format", async () => {
    const content: DictionaryContent = {
      ...emptyContent(),
      master: { outcomes: [outcome("F_1", "C", "G", { definition: "=1+1", experience: "@SUM(1)" })] },
    };
    const zip = await JSZip.loadAsync(await exportMaster(content, META));
    const sheetXml = await zip.file("xl/worksheets/sheet1.xml")!.async("string");
    expect(sheetXml).not.toContain("<f>");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await exportMaster(content, META)) as unknown as ExcelJS.Buffer);
    const cell = workbook.getWorksheet("en")!.getCell("E2");
    expect(cell.type).toBe(ExcelJS.ValueType.String);
    expect(cell.value).toBe("=1+1");
    expect(cell.numFmt).toBe("@");
  });

  it("escapes only what Excel can't store literally", () => {
    expect(toExcelText("a\r\nb")).toBe("a_x000D_\nb");
    expect(toExcelText("x _x0041_ y")).toBe("x _x005F_x0041_ y");
    expect(toExcelText("plain “text” é")).toBe("plain “text” é");
  });

  describe("translations", () => {
    let multilingual: DictionaryContent;

    beforeAll(async () => {
      const header = HEADERS;
      const fr = await reimport(
        await buildWorkbook([
          {
            name: "fr",
            rows: [
              header,
              ["V_01", "Symptômes", "Symptômes d'autoagression", "Désir de vivre", "Une motivation claire…\nDeuxième ligne", "", "PwD: « Citation traduite »"],
              ["V_80", "", "", "Dernier", "", "", ""],
            ],
          },
        ]),
        "fr",
        source
      );
      multilingual = await reimport(
        await buildWorkbook([{ name: "nl", rows: [header, ["V_02", "Symptomen", "", "Suïcidale gedachten", "", "", ""]] }]),
        "nl",
        fr
      );
    });

    it("exports one language with English reference columns, and re-imports it unchanged", async () => {
      const bytes = await exportLanguage(multilingual, "fr", META);
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
      const sheet = workbook.getWorksheet("fr")!;
      const headers = (sheet.getRow(1).values as unknown[]).slice(1);
      expect(headers).toContain("Outcome Domain (English reference)");
      expect(headers.filter((h) => !String(h).includes("reference"))).toEqual(HEADERS);
      expect(sheet.rowCount).toBe(81); // every master ID is listed, translated or not

      const again = await reimport(bytes, "fr", multilingual);
      expect(again).toEqual(multilingual);
    });

    it("exports all languages in one workbook that re-imports to the identical dataset", async () => {
      const bytes = await exportAllLanguages(multilingual, META);
      const read = await readWorkbook(bytes);
      expect(read.ok && read.sheets.map((s) => s.name)).toEqual(["en", "fr", "nl", "About"]);
      const again = await reimport(bytes, "en", emptyContent());
      expect(again.master).toEqual(multilingual.master);
      expect(again.translations.fr.outcomes).toEqual(
        Object.fromEntries(
          Object.entries(multilingual.translations.fr.outcomes).map(([id, entry]) => [id, { ...entry, source: again.translations.fr.outcomes[id].source }])
        )
      );
      // Re-importing on top of the same dataset keeps translation fingerprints too.
      expect(await reimport(bytes, "en", multilingual)).toEqual(multilingual);
    });

    it("produces an empty translation template that lists every ID", async () => {
      const bytes = await exportTranslationTemplate(multilingual, "de", META);
      const read = await readWorkbook(bytes);
      if (!read.ok) throw new Error(read.message);
      const sheet = read.sheets.find((s) => s.name === "de")!;
      expect(sheet.rows).toHaveLength(81);
      // Importing the untouched template is refused: there's nothing in it.
      const analysis = analyzeImport(read.sheets, { language: "de", roleCodes: ROLES }, multilingual);
      expect(analysis.ok).toBe(false);
      expect(analysis.issues.find((i) => i.level === "error")!.message).toContain("No German text was found");
    });
  });
});
