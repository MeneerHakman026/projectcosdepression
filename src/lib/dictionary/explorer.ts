import { languageName } from "./languages";
import {
  COLUMNS,
  FIELD_LABELS,
  MASTER_LANGUAGE,
  TEXT_FIELDS,
  type LanguageTranslation,
  type MasterField,
  type MasterOutcome,
} from "./model";
import { categoryKeyOf, groupKeyOf } from "./taxonomy";
import { cleanLabel, findPrivateUseCharacters, fold, hasUnexpectedControlCharacters } from "./text";

/**
 * The admin Dataset Explorer: a read-only, exact view of every record in a
 * dictionary version or in a workbook being imported. Pure functions, so
 * they run in the browser (instant search) and in tests.
 *
 * Unlike the public page, nothing here is trimmed, cleaned or merged:
 * `values` are the stored cell texts, character for character. Categories
 * and group domains are derived from the records themselves, so the filters
 * show whatever structure the dataset has.
 */

export type ExplorerDataset = {
  outcomes: MasterOutcome[];
  translations: Record<string, LanguageTranslation>;
  /** Excel row of each outcome, aligned with `outcomes` (import preview only). */
  rowNumbers?: (number | null)[];
};

export type RecordNote = { level: "error" | "warning" | "info"; message: string };

export type ExplorerRecord = {
  /** Position in the source order; also the unique key (IDs can repeat in an invalid workbook). */
  index: number;
  id: string;
  rowNumber: number | null;
  categoryKey: string;
  groupKey: string;
  /** The seven columns in the selected language, exactly as stored ("" = empty / not translated). */
  values: Record<MasterField, string>;
  /** The English master values (identical to `values` for English). */
  english: Record<MasterField, string>;
  /** Columns that are empty (English) or not translated (other languages). */
  missing: MasterField[];
  notes: RecordNote[];
  /** Folded text of every column, for search. */
  folded: Record<MasterField, string>;
  foldedEnglish: Record<MasterField, string> | null;
};

export type FacetGroup = { key: string; label: string; count: number };
export type FacetCategory = { key: string; label: string; count: number; groups: FacetGroup[] };

export type ExplorerModel = {
  language: string;
  languages: { code: string; name: string }[];
  records: ExplorerRecord[];
  categories: FacetCategory[];
  groupCount: number;
};

export type ExplorerFilters = {
  query: string;
  category: string;
  group: string;
  attention: boolean;
};

export const EMPTY_FILTERS: ExplorerFilters = { query: "", category: "", group: "", attention: false };

export const PAGE_SIZE = 50;

/** Shown for a category or group domain cell that is empty (only possible in an invalid workbook). */
export const EMPTY_LABEL = "(empty)";

/** Columns that must not be empty in the English master (as the importer enforces). */
const REQUIRED: MasterField[] = ["id", "category", "groupDomain", "outcomeDomain", "definition"];

function codePoint(value: string): string {
  return `U+${value.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
}

/** Notes about a value's characters that are easy to miss when reading. */
function characterNotes(field: MasterField, value: string): RecordNote[] {
  const notes: RecordNote[] = [];
  const privateUse = findPrivateUseCharacters(value);
  if (privateUse.length > 0) {
    notes.push({
      level: "warning",
      message: `${FIELD_LABELS[field]} contains a symbol-font character (${privateUse.join(", ")}) that will likely show as an empty box on the website.`,
    });
  }
  if (hasUnexpectedControlCharacters(value)) {
    notes.push({ level: "warning", message: `${FIELD_LABELS[field]} contains invisible control characters.` });
  }
  return notes;
}

function foldAll(values: Record<MasterField, string>): Record<MasterField, string> {
  return Object.fromEntries(COLUMNS.map((c) => [c.field, fold(values[c.field])])) as Record<MasterField, string>;
}

export function availableLanguages(dataset: ExplorerDataset): { code: string; name: string }[] {
  return [MASTER_LANGUAGE, ...Object.keys(dataset.translations).sort()].map((code) => ({ code, name: languageName(code) }));
}

/**
 * Builds the records and filter options for one language.
 * @param extraNotes notes per record index (e.g. import warnings), added to the record's own.
 */
export function buildExplorer(
  dataset: ExplorerDataset,
  requestedLanguage: string,
  extraNotes: Record<number, RecordNote[]> = {}
): ExplorerModel {
  const language =
    requestedLanguage === MASTER_LANGUAGE || requestedLanguage in dataset.translations ? requestedLanguage : MASTER_LANGUAGE;
  const translation = language === MASTER_LANGUAGE ? undefined : dataset.translations[language];

  const categories: FacetCategory[] = [];
  const categoryByKey = new Map<string, FacetCategory>();
  const groupByKey = new Map<string, FacetGroup>();

  const records = dataset.outcomes.map((outcome, index): ExplorerRecord => {
    const english = Object.fromEntries(COLUMNS.map((c) => [c.field, outcome[c.field]])) as Record<MasterField, string>;
    const categoryKey = categoryKeyOf(outcome.category);
    const groupKey = groupKeyOf(outcome.category, outcome.groupDomain);

    let values = english;
    const missing: MasterField[] = [];
    if (translation) {
      const entry = translation.outcomes[outcome.id];
      values = {
        id: outcome.id,
        category: translation.categories[categoryKey] ?? "",
        groupDomain: translation.groups[groupKey] ?? "",
        outcomeDomain: "",
        definition: "",
        experience: "",
        verbatims: "",
      };
      for (const field of TEXT_FIELDS) values[field] = entry?.[field] ?? "";
      for (const column of COLUMNS) if (column.field !== "id" && values[column.field] === "") missing.push(column.field);
    } else {
      for (const column of COLUMNS) if (outcome[column.field].trim() === "") missing.push(column.field);
    }

    const notes: RecordNote[] = [];
    if (translation) {
      if (!translation.outcomes[outcome.id]) {
        notes.push({ level: "info", message: `Not translated into ${languageName(language)}.` });
      } else if (missing.length > 0) {
        notes.push({ level: "info", message: `Not translated: ${missing.map((field) => FIELD_LABELS[field]).join(", ")}.` });
      }
    } else {
      const empty = missing.filter((field) => REQUIRED.includes(field));
      const optional = missing.filter((field) => !REQUIRED.includes(field));
      if (empty.length > 0) notes.push({ level: "error", message: `Empty: ${empty.map((field) => FIELD_LABELS[field]).join(", ")}.` });
      if (optional.length > 0) notes.push({ level: "warning", message: `Empty: ${optional.map((field) => FIELD_LABELS[field]).join(", ")}.` });
    }
    for (const column of COLUMNS) notes.push(...characterNotes(column.field, values[column.field]));
    notes.push(...(extraNotes[index] ?? []));

    // Facets, in order of first appearance.
    let category = categoryByKey.get(categoryKey);
    if (!category) {
      category = { key: categoryKey, label: labelFor(outcome.category, translation?.categories[categoryKey]), count: 0, groups: [] };
      categoryByKey.set(categoryKey, category);
      categories.push(category);
    }
    category.count++;
    let group = groupByKey.get(groupKey);
    if (!group) {
      group = { key: groupKey, label: labelFor(outcome.groupDomain, translation?.groups[groupKey]), count: 0 };
      groupByKey.set(groupKey, group);
      category.groups.push(group);
    }
    group.count++;

    return {
      index,
      id: outcome.id,
      rowNumber: dataset.rowNumbers?.[index] ?? null,
      categoryKey,
      groupKey,
      values,
      english,
      missing,
      notes,
      folded: foldAll(values),
      foldedEnglish: translation ? foldAll(english) : null,
    };
  });

  return { language, languages: availableLanguages(dataset), records, categories, groupCount: groupByKey.size };
}

function labelFor(english: string, translated: string | undefined): string {
  return cleanLabel(translated ?? "") || cleanLabel(english) || EMPTY_LABEL;
}

/** Search terms: whitespace-separated, folded, so "V_01" or "didn't" stay whole. */
export function queryTerms(query: string): string[] {
  return [...new Set(fold(query).split(/\s+/).filter(Boolean))];
}

export function needsAttention(record: ExplorerRecord): boolean {
  return record.notes.some((note) => note.level !== "info") || record.missing.length > 0;
}

/** The columns a record's search terms were found in (selected language first, then English). */
export function matchedFields(record: ExplorerRecord, terms: string[]): MasterField[] {
  if (terms.length === 0) return [];
  return COLUMNS.map((c) => c.field).filter((field) =>
    terms.some((term) => record.folded[field].includes(term) || (record.foldedEnglish?.[field].includes(term) ?? false))
  );
}

/** Every term must occur somewhere in the record (any column, either language). */
export function matchesQuery(record: ExplorerRecord, terms: string[]): boolean {
  return terms.every((term) =>
    COLUMNS.some((c) => record.folded[c.field].includes(term) || (record.foldedEnglish?.[c.field].includes(term) ?? false))
  );
}

export function filterRecords(model: ExplorerModel, filters: ExplorerFilters): ExplorerRecord[] {
  const terms = queryTerms(filters.query);
  return model.records.filter(
    (record) =>
      (!filters.category || record.categoryKey === filters.category) &&
      (!filters.group || record.groupKey === filters.group) &&
      (!filters.attention || needsAttention(record)) &&
      matchesQuery(record, terms)
  );
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export function pageOf<T>(items: T[], page: number, size = PAGE_SIZE): { items: T[]; page: number; first: number; last: number } {
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pageCount(items.length, size));
  const start = (current - 1) * size;
  const slice = items.slice(start, start + size);
  return { items: slice, page: current, first: slice.length ? start + 1 : 0, last: start + slice.length };
}

/** Characters that need a visible marker when showing text exactly. */
export function describeCharacter(char: string): { label: string; kind: "space" | "break" | "tab" | "special" } | null {
  if (char === " ") return { label: "·", kind: "space" };
  if (char === "\n") return { label: "↵", kind: "break" };
  if (char === "\r") return { label: "␍", kind: "break" };
  if (char === "\t") return { label: "→", kind: "tab" };
  if (char === " ") return { label: "⍽", kind: "space" };
  return null;
}

/** Characters that never display properly and are always marked: symbol-font glyphs and control characters. */
export function isUnprintable(char: string): boolean {
  const code = char.codePointAt(0)!;
  return (code >= 0xe000 && code <= 0xf8ff) || code >= 0xf0000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(char);
}

export { codePoint };
