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

/** What each master column is for: shown in the blank template's Instructions sheet and as header notes. */
export const COLUMN_GUIDE: Record<MasterField, { required: string; text: string }> = {
  id: {
    required: "Required",
    text:
      "The permanent ID of the outcome, for example V_01. Letters, numbers, “_”, “-” and “.” only (up to 64 characters), and every row needs a different ID. Never change or reuse an ID once it has been published: translations and links to the outcome depend on it.",
  },
  category: {
    required: "Required",
    text: "The top-level category the outcome belongs to. Type it identically on every row of the same category.",
  },
  groupDomain: {
    required: "Required",
    text: "The group domain within that category. Type it identically on every row of the same group domain.",
  },
  outcomeDomain: { required: "Required", text: "The name of the outcome, as shown on the website." },
  definition: { required: "Required", text: "The definition of the outcome." },
  experience: { required: "Recommended (a warning is shown if empty)", text: "How the outcome is experienced." },
  verbatims: {
    required: "Recommended (a warning is shown if empty)",
    text:
      "Participant quotations, exactly as recorded. Start each participant group on a new line inside the cell with its abbreviation and a colon, for example: PwD: “…”",
  },
};

export type TemplateRole = { code: string; label: string };

/**
 * The blank English master template: an Instructions sheet and an empty
 * "en" sheet with the seven column headers. No data rows, so nothing in it
 * could be mistaken for research content. Every cell of the data sheet is
 * formatted as Text, so whatever is typed is kept exactly (IDs such as 01
 * aren't turned into numbers, "=" isn't treated as a formula).
 */
export async function exportBlankTemplate(meta: { exportedAt: Date; roles: TemplateRole[] }): Promise<Uint8Array> {
  const workbook = newWorkbook();

  const guide = workbook.addWorksheet("Instructions");
  guide.getColumn(1).width = 120;
  const lines: { text: string; style?: "title" | "heading" | "column" }[] = [
    { text: "COS-D Outcome Dictionary — Excel template", style: "title" },
    { text: `Blank English master template · downloaded ${meta.exportedAt.toISOString().slice(0, 16).replace("T", " ")} UTC` },
    { text: "" },
    { text: "How this workbook works", style: "heading" },
    { text: "• Fill in the sheet “en” (English). Each row is one outcome. Keep the first row — the seven column headers — exactly as it is." },
    { text: "• The structure is Category → Group Domain → Outcome Domain: every outcome belongs to one group domain, and every group domain to one category." },
    { text: "• Categories and group domains aren't set up anywhere else: the website builds them from the Category and Group Domain columns. Each different Category becomes a category, and each different Group Domain within it a group domain." },
    { text: "• Outcomes are shown in the order of the rows." },
    { text: "• Importing the finished workbook replaces the whole English dictionary. It is saved as a draft first, which you can inspect and preview; nothing is public until you publish it." },
    { text: "" },
    { text: "The seven columns", style: "heading" },
    ...COLUMNS.map((column, index) => ({
      text: `${index + 1}. ${column.header} — ${COLUMN_GUIDE[column.field].required}. ${COLUMN_GUIDE[column.field].text}`,
      style: "column" as const,
    })),
    { text: "" },
    { text: "Keeping participant quotations exact", style: "heading" },
    { text: "• Text is imported and shown exactly as typed: quotation marks, punctuation, spaces and line breaks are kept. Don't correct, shorten or paraphrase quotations." },
    { text: "• Start a new line inside a cell with Alt+Enter (Windows) or Control+Option+Return (Mac)." },
    { text: "• Put each participant group on its own line, starting with its abbreviation and a colon. The website then shows the quotations grouped by participant; otherwise they're shown exactly as written." },
    ...(meta.roles.length > 0
      ? [{ text: `• Participant abbreviations currently set up: ${meta.roles.map((role) => `${role.code} = ${role.label}`).join("; ")}.` }]
      : []),
    { text: "• When copying from Word, paste as text only (Paste Special → Text). Symbols from Word fonts may otherwise show as empty boxes on the website; the import warns about them." },
    { text: "" },
    { text: "Rules", style: "heading" },
    { text: "• Enter text only: no formulas and no merged cells. The cells are already formatted as Text." },
    { text: "• Don't rename the sheet “en” and don't add columns. Other sheets, like this one, are ignored on import." },
    { text: "• Translations use a different file: once the English dictionary has been imported, download a translation template from Admin → Content → Outcome Dictionary." },
    { text: "" },
    { text: "Importing", style: "heading" },
    { text: "1. Admin → Content → Outcome Dictionary → Import Excel. Choose this file and “English master”, then Check file." },
    { text: "2. Read the summary and any warnings, and inspect the imported records: every column and quotation is shown exactly as it was read." },
    { text: "3. Save as draft, preview the draft, and publish when it has been approved." },
  ];
  lines.forEach((line, index) => {
    const cell = guide.getCell(index + 1, 1);
    cell.value = toExcelText(line.text);
    cell.numFmt = "@";
    cell.alignment = { wrapText: true, vertical: "top" };
    cell.font =
      line.style === "title"
        ? { name: "Aptos Narrow", size: 16, bold: true }
        : line.style === "heading"
          ? { name: "Aptos Narrow", size: 13, bold: true }
          : BODY_FONT;
    guide.getRow(index + 1).height = estimateRowHeight([line.text], [120]) + (line.style === "column" ? 4 : 0);
  });

  const sheet = workbook.addWorksheet(MASTER_LANGUAGE, { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
  sheet.columns = COLUMNS.map((column) => ({ width: COLUMN_WIDTHS[column.field], style: { numFmt: "@", alignment: BODY_ALIGNMENT, font: BODY_FONT } }));
  const header = sheet.getRow(1);
  COLUMNS.forEach((column, index) => {
    const cell = header.getCell(index + 1);
    cell.value = column.header;
    cell.numFmt = "@";
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle" };
    cell.note = `${column.header} (${COLUMN_GUIDE[column.field].required.split(" (")[0].toLowerCase()}): ${COLUMN_GUIDE[column.field].text}`;
  });
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };
  return toBytes(workbook);
}
