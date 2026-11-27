import { TEXT_FIELDS, type DictionaryContent } from "./model";

/** Whitespace-insensitive comparison, so a pasted English cell isn't counted as a translation. */
function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

/**
 * Outcomes a visitor can read wholly in `language`: every English text
 * field that has content is translated, so nothing falls back to English,
 * and the entry isn't simply the English copied into the translation sheet.
 * A single field may legitimately read the same in both languages (a
 * quotation, or a name like "Stress"), so only an entry identical to the
 * English in every field is treated as a copy. The master language is never
 * a translation and counts 0.
 */
export function translatedOutcomeCount(content: DictionaryContent, language: string): number {
  const translation = content.translations[language];
  if (!translation) return 0;
  let count = 0;
  for (const outcome of content.master.outcomes) {
    const entry = translation.outcomes[outcome.id];
    if (!entry) continue;
    const fields = TEXT_FIELDS.filter((field) => outcome[field].trim() !== "");
    if (fields.length === 0 || fields.some((field) => entry[field] === undefined)) continue;
    if (fields.every((field) => sameText(entry[field]!, outcome[field]))) continue;
    count++;
  }
  return count;
}
