import { existsSync, readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { COLUMNS, type MasterOutcome } from "@/lib/dictionary/model";

/**
 * Test fixtures for the Outcome Dictionary.
 *
 * Automated tests use a SYNTHETIC workbook generated here. Every text is
 * marked [SYNTHETIC] and none of it comes from the research data. It has the
 * same shape as the research team's workbook (80 outcomes V_01–V_80, two
 * categories, nine group domains with the same sizes) and reproduces each
 * quirk of the real data the importer must handle: trailing spaces, double
 * spaces after role labels, curly and straight quotes, nested quotes, a
 * Verbatims cell wrapped in straight quotes (V_11) and a symbol-font
 * character (U+F0E0, V_79).
 *
 * The real workbook is NOT committed (see .gitignore). Where it exists
 * locally, source-workbook.test.ts also validates it.
 */

export const SOURCE_WORKBOOK_PATH = new URL(
  "../docs/dictionary/COS-D_Outcome_Dictionary_EN_master_80-outcomes_source.xlsx",
  import.meta.url
);

export function sourceWorkbookAvailable(): boolean {
  return existsSync(SOURCE_WORKBOOK_PATH);
}

export function sourceWorkbookBytes(): Uint8Array {
  return new Uint8Array(readFileSync(SOURCE_WORKBOOK_PATH));
}

export const HEADERS = COLUMNS.map((column) => column.header);

export const SYNTHETIC_CATEGORIES = ["Synthetic symptoms", "Synthetic functioning"] as const;

/** Group domains with the same sizes as the research workbook: 64 + 16 outcomes. */
export const SYNTHETIC_GROUPS: { category: string; group: string; size: number }[] = [
  { category: "Synthetic symptoms", group: "Group S1", size: 4 },
  { category: "Synthetic symptoms", group: "Group S2", size: 18 },
  { category: "Synthetic symptoms", group: "Group S3", size: 19 },
  { category: "Synthetic symptoms", group: "Group S4", size: 9 },
  { category: "Synthetic symptoms", group: "Group S5", size: 14 },
  { category: "Synthetic functioning", group: "Group F1", size: 3 },
  { category: "Synthetic functioning", group: "Group F2", size: 4 },
  { category: "Synthetic functioning", group: "Group F3", size: 3 },
  { category: "Synthetic functioning", group: "Group F4", size: 6 },
];

type Text = Pick<MasterOutcome, "outcomeDomain" | "definition" | "experience" | "verbatims">;

function placeholder(n: number): Text {
  return {
    outcomeDomain: `Synthetic outcome ${String(n).padStart(2, "0")}`,
    // Trailing space on odd rows, as in much of the real data.
    definition: `[SYNTHETIC] Placeholder definition number ${n} for testing.${n % 2 ? " " : ""}`,
    experience: `[SYNTHETIC] Placeholder experience text ${n}.`,
    verbatims: `PwD:  “[SYNTHETIC] placeholder quote ${n}” \nHCP:   “[SYNTHETIC] professional view ${n}”\nICG: “[SYNTHETIC] caregiver view ${n}”`,
  };
}

/** Hand-written synthetic entries that the search and parsing tests rely on. */
const SPECIAL: Record<number, Partial<Text>> = {
  1: {
    outcomeDomain: "Zest for living",
    definition: "[SYNTHETIC] An invented definition about zest, motivation and engagement with daily life. ",
    experience: "[SYNTHETIC] Invented text describing a missing driving force. ",
    verbatims:
      "PwD:  “[SYNTHETIC] Life feels flat and aimless” “Every day is colourless” \nHCP:   “[They need] more synthetic engagement” \nICG: “[SYNTHETIC] She lost all her sparkle”",
  },
  2: { outcomeDomain: "Synthetic hopelessness", definition: "[SYNTHETIC] Invented hopelessness definition. " },
  3: { definition: "[SYNTHETIC] Placeholder about motivation to start tasks." },
  11: {
    outcomeDomain: "Synthetic planning",
    definition: "[SYNTHETIC] Invented description of step-sequencing and organising tasks.",
    // Wrapped in straight quotes, as V_11 is in the real data: not attributable.
    verbatims:
      "\"PwD:  “[SYNTHETIC] I didn't manage the simple chores” “Where to begin?”\nHCP:   “[SYNTHETIC] planning is hard”\nICG: “[SYNTHETIC] no idea which chore comes first”\"",
  },
  26: { outcomeDomain: "Synthetic emptiness", definition: "[SYNTHETIC] An invented feeling that everything is aimless. " },
  44: {
    outcomeDomain: "Synthetic loneliness",
    verbatims: "PwD:  “[SYNTHETIC] Like standing alone on Mount Kilimanjaro” \nHCP:   “[SYNTHETIC] isolation” \nICG: “[SYNTHETIC] alone”",
  },
  54: { outcomeDomain: "Synthetic oversleeping", definition: "[SYNTHETIC] Invented: sleeping far too long. " },
  55: { outcomeDomain: "Restless sleep", definition: "[SYNTHETIC] Invented: poor sleep quality at night. " },
  56: { outcomeDomain: "Synthetic sleeplessness", definition: "[SYNTHETIC] Invented: being unable to sleep. " },
  65: {
    outcomeDomain: "Synthetic achievement",
    experience: "[SYNTHETIC] Invented: not reaching what they would’ve liked to achieve.",
  },
  79: {
    verbatims: "PwD:  “[SYNTHETIC] vicious circle: tired  less contact  more tired” \nHCP:   “[SYNTHETIC] spiral” \nICG: “[SYNTHETIC] cycle”",
  },
};

/** The 80 synthetic master rows, in source order. */
export function syntheticSourceOutcomes(): MasterOutcome[] {
  const outcomes: MasterOutcome[] = [];
  let n = 1;
  for (const { category, group, size } of SYNTHETIC_GROUPS) {
    for (let i = 0; i < size; i++, n++) {
      outcomes.push({
        id: `V_${String(n).padStart(2, "0")}`,
        category,
        groupDomain: group,
        ...placeholder(n),
        ...SPECIAL[n],
      });
    }
  }
  return outcomes;
}

/** The synthetic workbook as .xlsx bytes (one sheet "Sheet1", like the research workbook). */
export async function syntheticWorkbookBytes(): Promise<Uint8Array> {
  return buildWorkbook([{ name: "Sheet1", rows: rowsOf(syntheticSourceOutcomes()) }]);
}

export type SheetSpec = { name: string; rows: unknown[][]; hidden?: boolean };

/** Builds an .xlsx in memory. Cell values are written as given (strings, numbers, formulas…). */
export async function buildWorkbook(sheets: SheetSpec[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  for (const spec of sheets) {
    const sheet = workbook.addWorksheet(spec.name, spec.hidden ? { state: "hidden" } : undefined);
    spec.rows.forEach((row, r) =>
      row.forEach((value, c) => {
        if (value !== undefined && value !== null) sheet.getCell(r + 1, c + 1).value = value as ExcelJS.CellValue;
      })
    );
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

export function outcome(id: string, category: string, group: string, overrides: Partial<MasterOutcome> = {}): MasterOutcome {
  return {
    id,
    category,
    groupDomain: group,
    outcomeDomain: `Outcome ${id}`,
    definition: `Definition of ${id}.`,
    experience: `Experience of ${id}.`,
    verbatims: `PwD: “Quote for ${id}”\nHCP: “Professional view on ${id}”`,
    ...overrides,
  };
}

export function rowsOf(outcomes: MasterOutcome[]): string[][] {
  return [HEADERS, ...outcomes.map((o) => COLUMNS.map((column) => o[column.field]))];
}

/** A synthetic master with the given number of categories, groups per category and outcomes per group. */
export function syntheticMaster(categories: number, groupsPerCategory: number, outcomesPerGroup: number): MasterOutcome[] {
  const result: MasterOutcome[] = [];
  let n = 1;
  for (let c = 1; c <= categories; c++) {
    for (let g = 1; g <= groupsPerCategory; g++) {
      for (let o = 1; o <= outcomesPerGroup; o++) {
        result.push(outcome(`X_${String(n++).padStart(3, "0")}`, `Category ${c}`, `Group ${c}.${g}`));
      }
    }
  }
  return result;
}
