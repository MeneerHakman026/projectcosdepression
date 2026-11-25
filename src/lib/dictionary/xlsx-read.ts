import "server-only";
import ExcelJS from "exceljs";

/**
 * Safe, low-level reading of an uploaded .xlsx into plain strings.
 *
 * Nothing in a workbook is ever executed: formulas are rejected (not
 * evaluated), macros are refused outright, and the zip container is
 * inspected *before* parsing so a small upload can't expand into gigabytes
 * of XML (a "zip bomb"). The XML parser ExcelJS uses (saxes) doesn't
 * resolve external entities.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // below Vercel's 4.5 MB request limit
const MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 1000;
export const MAX_DATA_ROWS = 5000;
const MAX_COLUMNS = 100;

export type CellProblem = "formula" | "date" | "error" | "merged";

export type RawCell = { text: string; problem?: CellProblem; richText?: boolean };

export type RawRow = { rowNumber: number; cells: RawCell[] };

export type RawSheet = {
  name: string;
  hidden: boolean;
  /** Non-empty rows in order; the first is taken as the header row. */
  rows: RawRow[];
};

export type ReadFailure = { ok: false; message: string };
export type ReadResult = { ok: true; sheets: RawSheet[] } | ReadFailure;

function fail(message: string): ReadFailure {
  return { ok: false, message };
}

type ZipInspection = { ok: true; names: string[] } | ReadFailure;

/** Reads the zip central directory (no decompression) to check sizes and contents. */
export function inspectZip(bytes: Uint8Array): ZipInspection {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minEocd = 22;
  let eocd = -1;
  for (let i = bytes.length - minEocd; i >= Math.max(0, bytes.length - minEocd - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return fail("This file is damaged or isn't an Excel workbook (.xlsx).");

  const entryCount = view.getUint16(eocd + 10, true);
  const directorySize = view.getUint32(eocd + 12, true);
  const directoryOffset = view.getUint32(eocd + 16, true);
  if (entryCount === 0xffff || directoryOffset === 0xffffffff) {
    return fail("This workbook is too large to import.");
  }
  if (entryCount > MAX_ZIP_ENTRIES) return fail("This workbook contains too many parts to import safely.");
  if (directoryOffset + directorySize > bytes.length) {
    return fail("This file is damaged or isn't an Excel workbook (.xlsx).");
  }

  const names: string[] = [];
  let total = 0;
  let offset = directoryOffset;
  const decoder = new TextDecoder();
  for (let n = 0; n < entryCount; n++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      return fail("This file is damaged or isn't an Excel workbook (.xlsx).");
    }
    const uncompressed = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    if (uncompressed === 0xffffffff) return fail("This workbook is too large to import.");
    total += uncompressed;
    if (total > MAX_UNCOMPRESSED_BYTES) return fail("This workbook is too large to import.");
    names.push(decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { ok: true, names };
}

function richTextToString(value: { richText: { text: string }[] }): string {
  return value.richText.map((run) => run.text ?? "").join("");
}

function readCell(cell: ExcelJS.Cell): RawCell {
  const value = cell.value;
  switch (cell.type) {
    case ExcelJS.ValueType.Null:
      return { text: "" };
    case ExcelJS.ValueType.Merge:
      return { text: "", problem: "merged" };
    case ExcelJS.ValueType.String:
    case ExcelJS.ValueType.SharedString:
      return { text: String(value) };
    case ExcelJS.ValueType.Number:
    case ExcelJS.ValueType.Boolean:
      return { text: String(value) };
    case ExcelJS.ValueType.RichText:
      return { text: richTextToString(value as ExcelJS.CellRichTextValue), richText: true };
    case ExcelJS.ValueType.Hyperlink: {
      const text = (value as ExcelJS.CellHyperlinkValue).text as unknown;
      if (text && typeof text === "object" && "richText" in (text as object)) {
        return { text: richTextToString(text as ExcelJS.CellRichTextValue), richText: true };
      }
      return { text: String(text ?? "") };
    }
    case ExcelJS.ValueType.Formula:
      return { text: "", problem: "formula" };
    case ExcelJS.ValueType.Date:
      return { text: "", problem: "date" };
    case ExcelJS.ValueType.Error:
      return { text: "", problem: "error" };
    default:
      return { text: value == null ? "" : String(value) };
  }
}

function isBlankRow(cells: RawCell[]): boolean {
  return cells.every((cell) => cell.text.trim() === "" && !cell.problem);
}

export async function readWorkbook(bytes: Uint8Array): Promise<ReadResult> {
  if (bytes.length === 0) return fail("The file is empty.");
  if (bytes.length > MAX_UPLOAD_BYTES) {
    return fail(`The file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
  // Legacy .xls (and encrypted .xlsx) files are OLE compound documents.
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return fail(
      "This is an older Excel format (.xls) or a password-protected workbook. Open it in Excel, remove any password, and save it as an Excel Workbook (.xlsx)."
    );
  }
  if (!(bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    return fail("This file isn't an Excel workbook (.xlsx).");
  }

  const zip = inspectZip(bytes);
  if (!zip.ok) return zip;
  if (!zip.names.includes("xl/workbook.xml")) return fail("This file isn't an Excel workbook (.xlsx).");
  if (zip.names.some((name) => /vbaProject\.bin$/i.test(name))) {
    return fail("Macro-enabled workbooks can't be imported. Save the file as an Excel Workbook (.xlsx) without macros.");
  }

  const workbook = new ExcelJS.Workbook();
  try {
    // ExcelJS's typings expect a Node Buffer; the bytes are copied, not shared.
    await workbook.xlsx.load(Buffer.from(bytes) as unknown as ExcelJS.Buffer);
  } catch {
    return fail("This workbook couldn't be read. It may be damaged — try opening it in Excel and saving it again.");
  }

  const sheets: RawSheet[] = [];
  for (const worksheet of workbook.worksheets) {
    if (worksheet.rowCount > MAX_DATA_ROWS + 1) {
      return fail(`Sheet "${worksheet.name}" has more than ${MAX_DATA_ROWS} rows.`);
    }
    const columnCount = Math.min(worksheet.columnCount, MAX_COLUMNS);
    const rows: RawRow[] = [];
    for (let r = 1; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      const cells: RawCell[] = [];
      for (let c = 1; c <= columnCount; c++) cells.push(readCell(row.getCell(c)));
      if (!isBlankRow(cells)) rows.push({ rowNumber: r, cells });
    }
    sheets.push({ name: worksheet.name, hidden: worksheet.state !== "visible", rows });
  }
  return { ok: true, sheets };
}
