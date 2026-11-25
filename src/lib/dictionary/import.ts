import { alignTranslation, outdatedTranslations } from "./content";
import { masterRowFingerprint } from "./hash";
import { languageFromSheetName, languageName } from "./languages";
import {
  COLUMNS,
  CONTENT_FORMAT,
  FIELD_LABELS,
  MASTER_LANGUAGE,
  OUTCOME_ID_PATTERN,
  TEXT_FIELDS,
  type DictionaryContent,
  type LanguageTranslation,
  type MasterField,
  type MasterOutcome,
  type TranslationEntry,
} from "./model";
import { categoryKeyOf, deriveTaxonomy, groupKeyOf } from "./taxonomy";
import { cleanLabel, findPrivateUseCharacters, hasUnexpectedControlCharacters, labelKey } from "./text";
import { parseVerbatims } from "./verbatims";
import type { RawSheet } from "./xlsx-read";

/**
 * Turns the sheets of an uploaded workbook into a complete proposed
 * dictionary — the replacement dataset — plus every problem found.
 *
 * Replacement rules:
 *  - An English (master) sheet replaces the entire master: outcomes missing
 *    from it are removed, and existing translations are re-aligned to it.
 *  - A translation sheet replaces that one language. It's matched to the
 *    master by Variable ID and can never add, remove or restructure outcomes.
 *  - Anything not in the workbook is carried over from the base (the
 *    current draft, or the live dictionary if there's no draft).
 *
 * Any "error" blocks the import. Nothing here touches the database.
 */

export type IssueLevel = "error" | "warning" | "info";

export type ImportIssue = {
  level: IssueLevel;
  message: string;
  sheet?: string;
  row?: number;
  outcomeId?: string;
};

export type SheetPlan = {
  name: string;
  role: "master" | "translation" | "ignored";
  language: string | null;
  rows: number;
  note?: string;
};

export type ImportAnalysis = {
  ok: boolean;
  issues: ImportIssue[];
  sheets: SheetPlan[];
  /** Languages this import replaces (MASTER_LANGUAGE for the master). */
  replaces: string[];
  proposed: DictionaryContent | null;
};

export type AnalyzeOptions = {
  /** Language of a workbook's sheet when its name doesn't say (single-sheet workbooks). */
  language: string;
  /** Participant role codes, to report Verbatims that can't be attributed. */
  roleCodes: readonly string[];
};

type SheetRecord = { rowNumber: number; values: Record<MasterField, string> };

const HEADER_TO_FIELD = new Map(COLUMNS.map((column) => [labelKey(column.header), column.field]));
const REFERENCE_COLUMN = /\(english reference\)\s*$/i;

const PROBLEM_TEXT = {
  formula: "contains a formula. Replace formulas with their text (Copy → Paste Special → Values).",
  date: "contains a date. Format the column as Text and re-enter the value.",
  error: "contains an Excel error value (such as #N/A).",
  merged: "is part of a merged cell. Unmerge the cells so every row has its own values.",
} as const;

function describeRows(rows: number[]): string {
  return rows.length === 1 ? `row ${rows[0]}` : `rows ${rows.slice(0, 6).join(", ")}${rows.length > 6 ? "…" : ""}`;
}

function quoted(value: string): string {
  return `“${value}”`;
}

/** Maps the header row to fields; reports missing, duplicate and unexpected columns. */
function readSheetRecords(sheet: RawSheet, issues: ImportIssue[]): SheetRecord[] | null {
  const [header, ...dataRows] = sheet.rows;
  const columnOf = new Map<MasterField, number>();
  const unexpected: string[] = [];
  header.cells.forEach((cell, index) => {
    const text = cleanLabel(cell.text);
    if (!text || REFERENCE_COLUMN.test(text)) return;
    const field = HEADER_TO_FIELD.get(labelKey(text));
    if (!field) {
      unexpected.push(text);
    } else if (columnOf.has(field)) {
      issues.push({ level: "error", sheet: sheet.name, message: `The column ${quoted(FIELD_LABELS[field])} appears more than once.` });
    } else {
      columnOf.set(field, index);
    }
  });

  const missing = COLUMNS.filter((column) => !columnOf.has(column.field)).map((column) => column.header);
  if (missing.length > 0) {
    issues.push({
      level: "error",
      sheet: sheet.name,
      row: header.rowNumber,
      message: `Missing column${missing.length > 1 ? "s" : ""}: ${missing.map(quoted).join(", ")}. The first row must contain the headers ${COLUMNS.map((c) => quoted(c.header)).join(", ")}.`,
    });
    return null;
  }
  if (unexpected.length > 0) {
    issues.push({
      level: "warning",
      sheet: sheet.name,
      message: `Column${unexpected.length > 1 ? "s" : ""} ${unexpected.map(quoted).join(", ")} ${unexpected.length > 1 ? "aren't" : "isn't"} part of the dictionary and will be ignored.`,
    });
  }

  let richText = false;
  const records: SheetRecord[] = [];
  for (const row of dataRows) {
    const values = {} as Record<MasterField, string>;
    let blank = true;
    for (const column of COLUMNS) {
      const cell = row.cells[columnOf.get(column.field)!] ?? { text: "" };
      if (cell.problem) {
        issues.push({
          level: "error",
          sheet: sheet.name,
          row: row.rowNumber,
          message: `The ${quoted(column.header)} cell ${PROBLEM_TEXT[cell.problem]}`,
        });
      }
      if (cell.richText) richText = true;
      values[column.field] = cell.text;
      if (cell.text.trim() !== "" || cell.problem) blank = false;
    }
    if (!blank) records.push({ rowNumber: row.rowNumber, values });
  }
  if (richText) {
    issues.push({
      level: "info",
      sheet: sheet.name,
      message: "Some cells use text formatting (such as bold or italic). Only the text is imported; formatting isn't kept.",
    });
  }
  return records;
}

function checkTextQuality(record: SheetRecord, id: string, sheet: string, issues: ImportIssue[]) {
  for (const field of TEXT_FIELDS) {
    const value = record.values[field];
    const privateUse = findPrivateUseCharacters(value);
    if (privateUse.length > 0) {
      issues.push({
        level: "warning",
        sheet,
        row: record.rowNumber,
        outcomeId: id,
        message: `${FIELD_LABELS[field]} contains a symbol-font character (${privateUse.join(", ")}), often an arrow or bullet pasted from Word. It's imported unchanged but will likely show as an empty box on the website.`,
      });
    }
    if (hasUnexpectedControlCharacters(value)) {
      issues.push({
        level: "warning",
        sheet,
        row: record.rowNumber,
        outcomeId: id,
        message: `${FIELD_LABELS[field]} contains invisible control characters. They're imported unchanged.`,
      });
    }
  }
}

function validateMaster(sheet: string, records: SheetRecord[], options: AnalyzeOptions, issues: ImportIssue[]): MasterOutcome[] {
  if (records.length === 0) {
    issues.push({ level: "error", sheet, message: "The sheet has headers but no outcomes. An empty dictionary can't be imported." });
    return [];
  }

  const outcomes: MasterOutcome[] = [];
  const rowsById = new Map<string, number[]>();
  const spellings = new Map<string, Set<string>>();
  const groupCategories = new Map<string, { label: string; categories: Set<string> }>();
  const namesInGroup = new Map<string, Map<string, number[]>>();

  for (const record of records) {
    const v = record.values;
    const id = v.id.trim();
    const where = id ? `${id} (row ${record.rowNumber})` : `Row ${record.rowNumber}`;

    if (!id) {
      issues.push({ level: "error", sheet, row: record.rowNumber, message: `Row ${record.rowNumber} has no Variable (outcome ID).` });
    } else if (!OUTCOME_ID_PATTERN.test(id)) {
      issues.push({
        level: "error",
        sheet,
        row: record.rowNumber,
        outcomeId: id,
        message: `${quoted(id)} isn't a valid Variable ID. Use letters, numbers, “_”, “-” or “.” (for example V_01), up to 64 characters.`,
      });
    } else {
      const key = id.toLowerCase();
      rowsById.set(key, [...(rowsById.get(key) ?? []), record.rowNumber]);
    }

    for (const field of ["category", "groupDomain", "outcomeDomain", "definition"] as const) {
      if (v[field].trim() === "") {
        issues.push({ level: "error", sheet, row: record.rowNumber, outcomeId: id || undefined, message: `${where}: ${FIELD_LABELS[field]} is empty.` });
      }
    }
    for (const field of ["experience", "verbatims"] as const) {
      if (v[field].trim() === "") {
        issues.push({ level: "warning", sheet, row: record.rowNumber, outcomeId: id || undefined, message: `${where}: ${FIELD_LABELS[field]} is empty.` });
      }
    }
    checkTextQuality(record, id, sheet, issues);

    if (v.category.trim() && v.groupDomain.trim()) {
      for (const [key, label] of [
        [categoryKeyOf(v.category), v.category],
        [groupKeyOf(v.category, v.groupDomain), v.groupDomain],
      ]) {
        spellings.set(key, (spellings.get(key) ?? new Set()).add(cleanLabel(label)));
      }
      const groupName = labelKey(v.groupDomain);
      const shared = groupCategories.get(groupName) ?? { label: cleanLabel(v.groupDomain), categories: new Set<string>() };
      shared.categories.add(cleanLabel(v.category));
      groupCategories.set(groupName, shared);
      const groupKey = groupKeyOf(v.category, v.groupDomain);
      const names = namesInGroup.get(groupKey) ?? new Map<string, number[]>();
      const nameKey = labelKey(v.outcomeDomain);
      if (nameKey) names.set(nameKey, [...(names.get(nameKey) ?? []), record.rowNumber]);
      namesInGroup.set(groupKey, names);
    }

    if (id && OUTCOME_ID_PATTERN.test(id) && v.verbatims.trim()) {
      if (parseVerbatims(v.verbatims, options.roleCodes).kind === "raw") {
        issues.push({
          level: "info",
          sheet,
          row: record.rowNumber,
          outcomeId: id,
          message: `${id}: the Verbatims don't follow the “ROLE: quote” line pattern, so they'll be shown exactly as written instead of grouped by participant.`,
        });
      }
    }

    outcomes.push({
      id,
      category: v.category,
      groupDomain: v.groupDomain,
      outcomeDomain: v.outcomeDomain,
      definition: v.definition,
      experience: v.experience,
      verbatims: v.verbatims,
    });
  }

  for (const [key, rows] of rowsById) {
    if (rows.length > 1) {
      const id = records.find((r) => r.values.id.trim().toLowerCase() === key)!.values.id.trim();
      issues.push({ level: "error", sheet, outcomeId: id, message: `The Variable ID ${id} is used more than once (${describeRows(rows)}). Every outcome needs its own ID.` });
    }
  }
  for (const variants of spellings.values()) {
    if (variants.size > 1) {
      const [first, ...others] = [...variants];
      issues.push({
        level: "warning",
        sheet,
        message: `${[first, ...others].map(quoted).join(" and ")} differ only in capitals or spacing, so they're treated as one. It will be shown as ${quoted(first)}.`,
      });
    }
  }
  for (const { label, categories } of groupCategories.values()) {
    if (categories.size > 1) {
      issues.push({
        level: "info",
        sheet,
        message: `The group domain ${quoted(label)} appears under ${[...categories].map(quoted).join(" and ")}. These are kept as separate groups, one per category.`,
      });
    }
  }
  for (const names of namesInGroup.values()) {
    for (const rows of names.values()) {
      if (rows.length > 1) {
        issues.push({ level: "warning", sheet, message: `Two outcomes in the same group domain have the same name (${describeRows(rows)}).` });
      }
    }
  }
  return outcomes;
}

function validateTranslation(
  sheet: string,
  language: string,
  records: SheetRecord[],
  master: readonly MasterOutcome[],
  previous: LanguageTranslation | undefined,
  issues: ImportIssue[]
): LanguageTranslation | null {
  const name = languageName(language);
  if (master.length === 0) {
    issues.push({
      level: "error",
      sheet,
      message: `There's no English master to match this ${name} translation to. Import the English workbook first.`,
    });
    return null;
  }

  const byId = new Map(master.map((outcome) => [outcome.id.toLowerCase(), outcome]));
  const seen = new Map<string, number[]>();
  const unknown: string[] = [];
  const categoryLabels = new Map<string, Map<string, number[]>>();
  const groupLabels = new Map<string, Map<string, number[]>>();
  const outcomes: Record<string, TranslationEntry> = {};
  let partial = 0;

  const addLabel = (labels: Map<string, Map<string, number[]>>, key: string, raw: string, row: number) => {
    const label = cleanLabel(raw);
    if (!label) return;
    const variants = labels.get(key) ?? new Map<string, number[]>();
    variants.set(label, [...(variants.get(label) ?? []), row]);
    labels.set(key, variants);
  };

  for (const record of records) {
    const v = record.values;
    const id = v.id.trim();
    if (!id) {
      issues.push({ level: "error", sheet, row: record.rowNumber, message: `Row ${record.rowNumber} has translated text but no Variable (outcome ID).` });
      continue;
    }
    const outcome = byId.get(id.toLowerCase());
    if (!outcome) {
      unknown.push(id);
      continue;
    }
    seen.set(outcome.id, [...(seen.get(outcome.id) ?? []), record.rowNumber]);
    checkTextQuality(record, outcome.id, sheet, issues);

    addLabel(categoryLabels, categoryKeyOf(outcome.category), v.category, record.rowNumber);
    addLabel(groupLabels, groupKeyOf(outcome.category, outcome.groupDomain), v.groupDomain, record.rowNumber);

    const entry: Omit<TranslationEntry, "source"> = {};
    for (const field of TEXT_FIELDS) {
      if (v[field].trim() !== "") entry[field] = v[field];
    }
    if (Object.keys(entry).length === 0) continue;
    if (TEXT_FIELDS.some((field) => entry[field] === undefined && outcome[field].trim() !== "")) partial++;

    // Unchanged translations keep their original fingerprint, so a
    // translation stays flagged as outdated until its text is updated.
    const before = previous?.outcomes[outcome.id];
    const unchanged = before && TEXT_FIELDS.every((field) => before[field] === entry[field]);
    outcomes[outcome.id] = { ...entry, source: unchanged ? before.source : masterRowFingerprint(outcome) };
  }

  for (const [id, rows] of seen) {
    if (rows.length > 1) {
      issues.push({ level: "error", sheet, outcomeId: id, message: `${id} appears more than once (${describeRows(rows)}).` });
    }
  }
  if (unknown.length > 0) {
    issues.push({
      level: "warning",
      sheet,
      message: `${unknown.length} row${unknown.length > 1 ? "s have" : " has"} a Variable ID that isn't in the English master and will be ignored: ${unknown.slice(0, 12).join(", ")}${unknown.length > 12 ? "…" : ""}. Translations can't add new outcomes.`,
    });
  }

  const taxonomy = deriveTaxonomy(master);
  const resolveLabels = (labels: Map<string, Map<string, number[]>>, kind: string, englishLabel: (key: string) => string) => {
    const out: Record<string, string> = {};
    for (const [key, variants] of labels) {
      if (variants.size > 1) {
        issues.push({
          level: "error",
          sheet,
          message: `The ${kind} ${quoted(englishLabel(key))} has different ${name} names: ${[...variants]
            .map(([label, rows]) => `${quoted(label)} (${describeRows(rows)})`)
            .join(", ")}. Use one name for every row in the same ${kind}.`,
        });
      } else {
        out[key] = [...variants.keys()][0];
      }
    }
    return out;
  };
  const categories = resolveLabels(categoryLabels, "category", (key) => taxonomy.categoryByKey.get(key)?.label ?? key);
  const groups = resolveLabels(groupLabels, "group domain", (key) => taxonomy.groupByKey.get(key)?.label ?? key);

  const translated = Object.keys(outcomes).length;
  if (translated === 0 && Object.keys(categories).length === 0 && Object.keys(groups).length === 0) {
    issues.push({ level: "error", sheet, message: `No ${name} text was found. Fill in the translation columns, or check that the sheet is the right language.` });
    return null;
  }
  const missing = master.length - translated;
  if (missing > 0) {
    issues.push({
      level: "info",
      sheet,
      message: `${missing} of ${master.length} outcomes have no ${name} translation. Visitors will see the English text for those, clearly marked as not translated.`,
    });
  }
  if (partial > 0) {
    issues.push({
      level: "info",
      sheet,
      message: `${partial} ${name} outcome${partial > 1 ? "s are" : " is"} only partly translated. The missing fields will show in English, marked as not translated.`,
    });
  }
  return { categories, groups, outcomes };
}

export function analyzeImport(sheets: RawSheet[], options: AnalyzeOptions, base: DictionaryContent): ImportAnalysis {
  const issues: ImportIssue[] = [];
  const plans: SheetPlan[] = [];
  const data: { sheet: RawSheet; records: SheetRecord[]; language: string | null }[] = [];

  if (sheets.every((sheet) => sheet.rows.length === 0)) {
    return { ok: false, issues: [{ level: "error", message: "The workbook is empty." }], sheets: [], replaces: [], proposed: null };
  }

  for (const sheet of sheets) {
    const header = sheet.rows[0];
    const recognised = header?.cells.some((cell) => HEADER_TO_FIELD.has(labelKey(cell.text))) ?? false;
    if (!recognised) {
      plans.push({ name: sheet.name, role: "ignored", language: null, rows: 0, note: "No dictionary columns" });
      continue;
    }
    if (sheet.hidden) {
      plans.push({ name: sheet.name, role: "ignored", language: null, rows: 0, note: "Hidden sheet" });
      issues.push({ level: "warning", sheet: sheet.name, message: "This sheet is hidden in Excel, so it's ignored. Unhide it if it should be imported." });
      continue;
    }
    const records = readSheetRecords(sheet, issues);
    if (records === null) {
      plans.push({ name: sheet.name, role: "ignored", language: null, rows: 0, note: "Missing columns" });
      continue;
    }
    data.push({ sheet, records, language: languageFromSheetName(sheet.name) });
  }

  if (data.length === 0) {
    if (!issues.some((issue) => issue.level === "error")) {
      issues.push({
        level: "error",
        message: `No sheet has the dictionary columns. The first row must contain ${COLUMNS.map((c) => quoted(c.header)).join(", ")}.`,
      });
    }
    return { ok: false, issues, sheets: plans, replaces: [], proposed: null };
  }

  // Which language is each sheet? A single sheet uses the language chosen in
  // the form (unless its name says otherwise); several sheets must each be
  // named with their language code, as exported workbooks are.
  if (data.length === 1) {
    const only = data[0];
    if (only.language && only.language !== options.language) {
      issues.push({
        level: "error",
        sheet: only.sheet.name,
        message: `This sheet is named for ${languageName(only.language)} (${only.language}), but you chose ${languageName(options.language)}. Choose ${languageName(only.language)} or rename the sheet.`,
      });
    }
    only.language = options.language;
  } else {
    for (const entry of data) {
      if (!entry.language) {
        issues.push({
          level: "error",
          sheet: entry.sheet.name,
          message: `This workbook has several dictionary sheets, so each must be named with its language code (for example “en” or “fr”). Can't tell which language ${quoted(entry.sheet.name)} is.`,
        });
      }
    }
    const byLanguage = new Map<string, string[]>();
    for (const entry of data) {
      if (entry.language) byLanguage.set(entry.language, [...(byLanguage.get(entry.language) ?? []), entry.sheet.name]);
    }
    for (const [language, names] of byLanguage) {
      if (names.length > 1) {
        issues.push({ level: "error", message: `Sheets ${names.map(quoted).join(" and ")} are both ${languageName(language)}. Keep one sheet per language.` });
      }
    }
  }

  const masterSheet = data.find((entry) => entry.language === MASTER_LANGUAGE);
  const newMaster = masterSheet ? validateMaster(masterSheet.sheet.name, masterSheet.records, options, issues) : null;
  if (masterSheet) {
    plans.push({ name: masterSheet.sheet.name, role: "master", language: MASTER_LANGUAGE, rows: masterSheet.records.length });
  }
  const masterOutcomes = newMaster ?? base.master.outcomes;

  const importedTranslations: Record<string, LanguageTranslation> = {};
  for (const entry of data) {
    if (!entry.language || entry.language === MASTER_LANGUAGE) continue;
    plans.push({ name: entry.sheet.name, role: "translation", language: entry.language, rows: entry.records.length });
    const translation = validateTranslation(
      entry.sheet.name,
      entry.language,
      entry.records,
      masterOutcomes,
      base.translations[entry.language],
      issues
    );
    if (translation) importedTranslations[entry.language] = translation;
  }

  const ok = !issues.some((issue) => issue.level === "error");
  const replaces = [...(newMaster ? [MASTER_LANGUAGE] : []), ...Object.keys(importedTranslations)];
  if (!ok) return { ok, issues, sheets: plans, replaces, proposed: null };

  const translations: Record<string, LanguageTranslation> = {};
  for (const [language, translation] of Object.entries(base.translations)) {
    if (importedTranslations[language]) continue;
    const aligned = alignTranslation(translation, masterOutcomes);
    translations[language] = aligned.translation;
    if (aligned.droppedOutcomes.length > 0) {
      issues.push({
        level: "warning",
        message: `${languageName(language)}: ${aligned.droppedOutcomes.length} translated outcome${aligned.droppedOutcomes.length > 1 ? "s are" : " is"} removed together with ${aligned.droppedOutcomes.length > 1 ? "their" : "its"} English outcome (${aligned.droppedOutcomes.slice(0, 8).join(", ")}${aligned.droppedOutcomes.length > 8 ? "…" : ""}). Earlier versions keep them in the history.`,
      });
    }
    if (aligned.droppedLabels > 0) {
      issues.push({
        level: "info",
        message: `${languageName(language)}: ${aligned.droppedLabels} translated category or group name${aligned.droppedLabels > 1 ? "s" : ""} no longer match an English category or group and will be dropped.`,
      });
    }
  }
  Object.assign(translations, importedTranslations);

  const proposed: DictionaryContent = {
    format: CONTENT_FORMAT,
    master: { outcomes: [...masterOutcomes] },
    translations: Object.fromEntries(Object.entries(translations).sort(([a], [b]) => a.localeCompare(b))),
  };

  if (newMaster) {
    for (const language of Object.keys(proposed.translations)) {
      if (importedTranslations[language]) continue;
      const outdated = outdatedTranslations(proposed, language);
      if (outdated.length > 0) {
        issues.push({
          level: "info",
          message: `${languageName(language)}: the English text changed for ${outdated.length} translated outcome${outdated.length > 1 ? "s" : ""}, so ${outdated.length > 1 ? "those translations" : "that translation"} may be out of date. They're listed under Translation completeness.`,
        });
      }
    }
  }

  return { ok, issues, sheets: plans, replaces, proposed };
}
