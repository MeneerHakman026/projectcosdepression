import "server-only";
import ExcelJS from "exceljs";
import { languageName } from "./languages";
import { COLUMNS, MASTER_LANGUAGE, TEXT_FIELDS, type DictionaryContent, type MasterField } from "./model";
import { categoryKeyOf, groupKeyOf } from "./taxonomy";

/**
 * Builds the exported workbooks. Every export can be re-imported unchanged:
 *  - the master sheet has exactly the seven source columns;
 *  - translation sheets have the same seven columns plus read-only English
 *    reference columns (ignored on import);
 *  - each data sheet is named with its language code, which is how the
 *    importer tells languages apart;
 *  - an "About" sheet explains the file and is ignored on import.
 *
 * Formula injection: every value is written as a string cell with the Text
 * number format ("@"), so Excel never evaluates it — not on opening and not
 * after editing a cell. Values themselves are never altered (no added
 * apostrophes), so the exported research text is identical to what's stored.
 */

export type ExportMeta = {
  releaseLabel: string;
  exportedAt: Date;
};

const COLUMN_WIDTHS: Record<MasterField, number> = {
  id: 10,
  category: 14,
  groupDomain: 26,
  outcomeDomain: 30,
  definition: 50,
  experience: 60,
  verbatims: 100,
};

const HEADER_FONT: Partial<ExcelJS.Font> = { name: "Aptos Narrow", size: 12, bold: true };
const BODY_FONT: Partial<ExcelJS.Font> = { name: "Aptos Narrow", size: 12 };
const REFERENCE_FONT: Partial<ExcelJS.Font> = { name: "Aptos Narrow", size: 12, italic: true, color: { argb: "FF595959" } };
const REFERENCE_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } };
const BODY_ALIGNMENT: Partial<ExcelJS.Alignment> = { horizontal: "left", vertical: "middle", wrapText: true };

export const REFERENCE_SUFFIX = " (English reference)";

/**
 * Excel's own escaping for text it can't store literally: control
 * characters (including the \r of \r\n line breaks) become _xHHHH_, and a
 * literal "_xHHHH_" in the text is protected as _x005F_xHHHH_. Excel and
 * the importer decode these back to the original characters.
 */
export function toExcelText(value: string): string {
  return value
    .replace(/_x([0-9A-Fa-f]{4})_/g, "_x005F_x$1_")
    .replace(/[\u0000-\u0008\u000B-\u001F]/g, (char) => `_x${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}_`);
}

type ColumnSpec = { header: string; width: number; reference?: boolean };

function estimateRowHeight(values: string[], widths: number[]): number {
  let lines = 1;
  values.forEach((value, index) => {
    const perLine = Math.max(8, Math.floor(widths[index] * 1.1));
    const count = value.split(/\r\n|\r|\n/).reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / perLine)), 0);
    lines = Math.max(lines, count);
  });
  return Math.min(409, Math.max(16, lines * 16));
}

function addDataSheet(workbook: ExcelJS.Workbook, name: string, columns: ColumnSpec[], rows: string[][]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({ width: column.width }));

  const header = sheet.getRow(1);
  columns.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = toExcelText(column.header);
    cell.numFmt = "@";
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
    if (column.reference) cell.fill = REFERENCE_FILL;
  });

  rows.forEach((values, rowIndex) => {
    const row = sheet.getRow(rowIndex + 2);
    values.forEach((value, index) => {
      const cell = row.getCell(index + 1);
      cell.value = toExcelText(value);
      cell.numFmt = "@";
      cell.alignment = BODY_ALIGNMENT;
      cell.font = columns[index].reference ? REFERENCE_FONT : BODY_FONT;
      if (columns[index].reference) cell.fill = REFERENCE_FILL;
    });
    row.height = estimateRowHeight(
      values,
      columns.map((column) => column.width)
    );
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

function addMasterSheet(workbook: ExcelJS.Workbook, content: DictionaryContent) {
  addDataSheet(
    workbook,
    MASTER_LANGUAGE,
    COLUMNS.map((column) => ({ header: column.header, width: COLUMN_WIDTHS[column.field] })),
    content.master.outcomes.map((outcome) => COLUMNS.map((column) => outcome[column.field]))
  );
}

/**
 * Translation sheet: Variable, then for each field the English reference
 * column followed by the column to translate. `blank` leaves the
 * translation columns empty (the template).
 */
function addTranslationSheet(workbook: ExcelJS.Workbook, content: DictionaryContent, language: string, blank: boolean) {
  const translation = blank ? undefined : content.translations[language];
  const columns: ColumnSpec[] = [{ header: "Variable", width: COLUMN_WIDTHS.id }];
  for (const column of COLUMNS.slice(1)) {
    columns.push({ header: `${column.header}${REFERENCE_SUFFIX}`, width: COLUMN_WIDTHS[column.field], reference: true });
    columns.push({ header: column.header, width: COLUMN_WIDTHS[column.field] });
  }
  const rows = content.master.outcomes.map((outcome) => {
    const entry = translation?.outcomes[outcome.id];
    const translated: Record<MasterField, string> = {
      id: outcome.id,
      category: translation?.categories[categoryKeyOf(outcome.category)] ?? "",
      groupDomain: translation?.groups[groupKeyOf(outcome.category, outcome.groupDomain)] ?? "",
      outcomeDomain: "",
      definition: "",
      experience: "",
      verbatims: "",
    };
    for (const field of TEXT_FIELDS) translated[field] = entry?.[field] ?? "";
    const values = [outcome.id];
    for (const column of COLUMNS.slice(1)) values.push(outcome[column.field], translated[column.field]);
    return values;
  });
  addDataSheet(workbook, language, columns, rows);
}

function addAboutSheet(workbook: ExcelJS.Workbook, meta: ExportMeta, lines: string[]) {
  const sheet = workbook.addWorksheet("About");
  sheet.getColumn(1).width = 110;
  const all = [
    "COS-D Outcome Dictionary",
    `${meta.releaseLabel} · exported ${meta.exportedAt.toISOString().slice(0, 16).replace("T", " ")} UTC`,
    "",
    ...lines,
    "",
    "Rules for re-importing this file (Admin → Content → Outcome Dictionary → Import):",
    "• Keep the first row (column headers) exactly as it is.",
    "• Keep the Variable column: it is the permanent ID that links every language to the same outcome. Don't change existing IDs.",
    "• Each data sheet is named with its language code (en = English master, fr = French, nl = Dutch, …). Keep these names.",
    "• Columns marked “(English reference)” are for reference only and are ignored on import.",
    "• Enter text only — no formulas. Line breaks inside a cell (Alt+Enter) are kept.",
    "• Leave a cell empty if there is no translation yet; the website then shows the English text, marked as not translated.",
    "• Never translate or edit participant quotations (Verbatims) unless an approved translation exists.",
    "• This About sheet is ignored on import.",
  ];
  all.forEach((line, index) => {
    const cell = sheet.getCell(index + 1, 1);
    cell.value = toExcelText(line);
    cell.numFmt = "@";
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.font = index === 0 ? { name: "Aptos Narrow", size: 14, bold: true } : BODY_FONT;
  });
}

function newWorkbook(): ExcelJS.Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "COS-D website";
  workbook.created = new Date();
  return workbook;
}

async function toBytes(workbook: ExcelJS.Workbook): Promise<Uint8Array> {
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export async function exportMaster(content: DictionaryContent, meta: ExportMeta): Promise<Uint8Array> {
  const workbook = newWorkbook();
  addMasterSheet(workbook, content);
  addAboutSheet(workbook, meta, ["English master: the seven source columns, one row per outcome, in source order."]);
  return toBytes(workbook);
}

export async function exportLanguage(content: DictionaryContent, language: string, meta: ExportMeta): Promise<Uint8Array> {
  if (language === MASTER_LANGUAGE) return exportMaster(content, meta);
  const workbook = newWorkbook();
  addTranslationSheet(workbook, content, language, false);
  addAboutSheet(workbook, meta, [
    `${languageName(language)} translation (sheet “${language}”). Grey columns show the English master for reference.`,
  ]);
  return toBytes(workbook);
}

export async function exportAllLanguages(content: DictionaryContent, meta: ExportMeta): Promise<Uint8Array> {
  const workbook = newWorkbook();
  addMasterSheet(workbook, content);
  const languages = Object.keys(content.translations).sort();
  for (const language of languages) addTranslationSheet(workbook, content, language, false);
  addAboutSheet(workbook, meta, [
    `All languages: English master (sheet “en”)${languages.length ? ` and translations (${languages.map((l) => `“${l}” ${languageName(l)}`).join(", ")})` : ""}.`,
    "Importing this whole file replaces the English master and every included translation at once.",
  ]);
  return toBytes(workbook);
}

export async function exportTranslationTemplate(
  content: DictionaryContent,
  language: string,
  meta: ExportMeta
): Promise<Uint8Array> {
  const workbook = newWorkbook();
  addTranslationSheet(workbook, content, language, true);
  addAboutSheet(workbook, meta, [
    `Empty ${languageName(language)} translation template (sheet “${language}”).`,
    "Fill in the white columns. Grey “(English reference)” columns show the English master and are ignored on import.",
    "Use the same translated Category and Group Domain name on every row of the same category or group.",
  ]);
  return toBytes(workbook);
}
