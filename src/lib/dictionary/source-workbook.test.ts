import ExcelJS from "exceljs";
import { beforeAll, describe, expect, it } from "vitest";
import { HEADERS, sourceWorkbookAvailable, sourceWorkbookBytes } from "../../../test/dictionary-fixtures";
import { summarize } from "./content";
import { contentHash } from "./hash";
import { analyzeImport, type ImportAnalysis } from "./import";
import { COLUMNS, emptyContent, type DictionaryContent } from "./model";
import { deriveTaxonomy } from "./taxonomy";
import { parseVerbatims } from "./verbatims";
import { readWorkbook } from "./xlsx-read";
import { exportMaster } from "./xlsx-write";

/**
 * Authorized local validation of the research team's workbook
 * (docs/dictionary/…source.xlsx). That file is NOT committed — its
 * publication rights are pending — so this suite is skipped wherever it's
 * absent (e.g. CI). Deliberately asserts structure only: no research text
 * appears in this file.
 */

const ROLES = ["PwD", "HCP", "ICG"];

describe.skipIf(!sourceWorkbookAvailable())("the research team's source workbook (local only)", () => {
  let analysis: ImportAnalysis;
  let content: DictionaryContent;
  let cells: string[][];

  beforeAll(async () => {
    const bytes = sourceWorkbookBytes();
    const read = await readWorkbook(bytes);
    if (!read.ok) throw new Error(read.message);
    analysis = analyzeImport(read.sheets, { language: "en", roleCodes: ROLES }, emptyContent());
    content = analysis.proposed!;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
    cells = [];
    workbook.worksheets[0].eachRow((row) => cells.push((row.values as unknown[]).slice(1).map(String)));
  });

  it("imports without errors, from one sheet of 80 rows with the seven source columns", () => {
    expect(analysis.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(analysis.sheets).toEqual([{ name: "Sheet1", role: "master", language: "en", rows: 80 }]);
    expect(cells[0]).toEqual(HEADERS);
  });

  it("preserves every cell exactly and keeps IDs V_01–V_80 in order", () => {
    expect(content.master.outcomes.map((o) => COLUMNS.map((c) => o[c.field]))).toEqual(cells.slice(1));
    expect(content.master.outcomes.map((o) => o.id)).toEqual(Array.from({ length: 80 }, (_, i) => `V_${String(i + 1).padStart(2, "0")}`));
  });

  it("derives 2 categories (64 + 16) and 9 group domains", () => {
    const taxonomy = deriveTaxonomy(content.master.outcomes);
    expect(taxonomy.categories.map((c) => c.outcomeIds.length)).toEqual([64, 16]);
    expect(taxonomy.categories.flatMap((c) => c.groups.map((g) => g.outcomeIds.length))).toEqual([4, 18, 19, 9, 14, 3, 4, 3, 6]);
    expect(summarize(content)).toEqual({ outcomes: 80, categories: 2, groups: 9, languages: {} });
  });

  it("reports the known data-quality issues (V_79 symbol-font character, V_11 unattributable Verbatims)", () => {
    const flagged = analysis.issues.filter((i) => i.level !== "error").map((i) => `${i.outcomeId}:${i.level}`);
    expect(flagged).toEqual(["V_11:info", "V_79:warning"]);
    const attributed = content.master.outcomes.filter((o) => parseVerbatims(o.verbatims, ROLES).kind === "attributed");
    expect(attributed).toHaveLength(79);
  });

  it("round-trips through an Excel export with no change at all", async () => {
    const exported = await exportMaster(content, { releaseLabel: "test", exportedAt: new Date() });
    const read = await readWorkbook(exported);
    if (!read.ok) throw new Error(read.message);
    const again = analyzeImport(read.sheets, { language: "en", roleCodes: ROLES }, emptyContent()).proposed!;
    expect(contentHash(again)).toBe(contentHash(content));
  });
});
