import { masterRowFingerprint } from "./hash";
import type { ContentSummary, DictionaryContent, LanguageTranslation, MasterOutcome, TranslationEntry } from "./model";
import { categoryKeyOf, countGroups, deriveTaxonomy, groupKeyOf } from "./taxonomy";

export function summarize(content: DictionaryContent): ContentSummary {
  const taxonomy = deriveTaxonomy(content.master.outcomes);
  const languages: Record<string, number> = {};
  for (const [language, translation] of Object.entries(content.translations)) {
    languages[language] = Object.keys(translation.outcomes).length;
  }
  return {
    outcomes: content.master.outcomes.length,
    categories: taxonomy.categories.length,
    groups: countGroups(taxonomy),
    languages,
  };
}

/**
 * Keeps only the parts of a translation that still belong to the master:
 * entries for outcomes that exist, labels for categories/groups that exist.
 * Used when a new English master replaces the old one. Dropped entries
 * aren't lost — they stay in the earlier release's history.
 */
export function alignTranslation(
  translation: LanguageTranslation,
  outcomes: readonly MasterOutcome[]
): { translation: LanguageTranslation; droppedOutcomes: string[]; droppedLabels: number } {
  const ids = new Set(outcomes.map((outcome) => outcome.id));
  const categoryKeys = new Set(outcomes.map((outcome) => categoryKeyOf(outcome.category)));
  const groupKeys = new Set(outcomes.map((outcome) => groupKeyOf(outcome.category, outcome.groupDomain)));

  const kept: Record<string, TranslationEntry> = {};
  const droppedOutcomes: string[] = [];
  for (const [id, entry] of Object.entries(translation.outcomes)) {
    if (ids.has(id)) kept[id] = entry;
    else droppedOutcomes.push(id);
  }
  let droppedLabels = 0;
  const filterLabels = (labels: Record<string, string>, valid: Set<string>) => {
    const out: Record<string, string> = {};
    for (const [key, label] of Object.entries(labels)) {
      if (valid.has(key)) out[key] = label;
      else droppedLabels++;
    }
    return out;
  };
  return {
    translation: {
      categories: filterLabels(translation.categories, categoryKeys),
      groups: filterLabels(translation.groups, groupKeys),
      outcomes: kept,
    },
    droppedOutcomes,
    droppedLabels,
  };
}

/** IDs whose English row changed after the translation was imported. */
export function outdatedTranslations(content: DictionaryContent, language: string): string[] {
  const translation = content.translations[language];
  if (!translation) return [];
  return content.master.outcomes
    .filter((outcome) => {
      const entry = translation.outcomes[outcome.id];
      return entry && entry.source !== masterRowFingerprint(outcome);
    })
    .map((outcome) => outcome.id);
}

export type LanguageCompleteness = {
  language: string;
  total: number;
  /** Outcomes with at least one translated field. */
  translated: number;
  /** Outcomes with all four text fields translated (or the English field is empty). */
  complete: number;
  fields: Record<"outcomeDomain" | "definition" | "experience" | "verbatims", number>;
  categoryLabels: { translated: number; total: number };
  groupLabels: { translated: number; total: number };
  outdated: number;
};

export function languageCompleteness(content: DictionaryContent, language: string): LanguageCompleteness {
  const translation = content.translations[language] ?? { categories: {}, groups: {}, outcomes: {} };
  const taxonomy = deriveTaxonomy(content.master.outcomes);
  const fields = { outcomeDomain: 0, definition: 0, experience: 0, verbatims: 0 };
  let translated = 0;
  let complete = 0;
  for (const outcome of content.master.outcomes) {
    const entry = translation.outcomes[outcome.id];
    if (!entry) continue;
    translated++;
    let all = true;
    for (const field of Object.keys(fields) as (keyof typeof fields)[]) {
      if (entry[field] !== undefined) fields[field]++;
      else if (outcome[field].trim() !== "") all = false;
    }
    if (all) complete++;
  }
  return {
    language,
    total: content.master.outcomes.length,
    translated,
    complete,
    fields,
    categoryLabels: {
      translated: taxonomy.categories.filter((c) => translation.categories[c.key]).length,
      total: taxonomy.categories.length,
    },
    groupLabels: {
      translated: [...taxonomy.groupByKey.keys()].filter((key) => translation.groups[key]).length,
      total: taxonomy.groupByKey.size,
    },
    outdated: outdatedTranslations(content, language).length,
  };
}
