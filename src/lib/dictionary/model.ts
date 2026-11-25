import { z } from "zod";

/**
 * The Outcome Dictionary's stored data model.
 *
 * A dictionary *release* is an immutable snapshot of everything the public
 * Dictionary shows: the English master (stable outcome IDs, the
 * Category → Group Domain → Outcome Domain structure and the English text)
 * plus zero or more translations keyed by those IDs.
 *
 * Nothing about the structure is hardcoded. Categories and group domains are
 * never stored as such: they're derived from the master rows every time
 * (see taxonomy.ts), so a workbook with 5 or 50 categories needs no code
 * change. Translations can only *label* that structure; they can't add to it.
 */

/** The language of the master workbook, which defines IDs and taxonomy. */
export const MASTER_LANGUAGE = "en";

/** Bumped if the stored JSON shape ever changes incompatibly. */
export const CONTENT_FORMAT = 1;

export const TEXT_FIELDS = ["outcomeDomain", "definition", "experience", "verbatims"] as const;
export type TextField = (typeof TEXT_FIELDS)[number];

export const MASTER_FIELDS = ["id", "category", "groupDomain", ...TEXT_FIELDS] as const;
export type MasterField = (typeof MASTER_FIELDS)[number];

/** The seven source columns, in source order, with their exact header text. */
export const COLUMNS: { field: MasterField; header: string }[] = [
  { field: "id", header: "Variable" },
  { field: "category", header: "Category" },
  { field: "groupDomain", header: "Group Domain" },
  { field: "outcomeDomain", header: "Outcome Domain" },
  { field: "definition", header: "Definition" },
  { field: "experience", header: "Experience" },
  { field: "verbatims", header: "Verbatims" },
];

export const FIELD_LABELS: Record<MasterField, string> = Object.fromEntries(
  COLUMNS.map((column) => [column.field, column.header])
) as Record<MasterField, string>;

/** Stable outcome IDs appear in URLs, so they're restricted to URL-safe characters. */
export const OUTCOME_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/;

/** BCP 47-style language tag as stored (canonical case, e.g. "fr", "pt-BR"). */
export const LANGUAGE_CODE_PATTERN = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** Excel's own per-cell limit; nothing longer can come from a workbook. */
export const MAX_CELL_LENGTH = 32767;

const cellText = z.string().max(MAX_CELL_LENGTH);

/**
 * One master row, exactly as it appeared in the workbook. Text is stored
 * raw (including trailing spaces and line breaks) so an export reproduces
 * the source; display code trims for presentation.
 */
export const masterOutcomeSchema = z.object({
  id: z.string().regex(OUTCOME_ID_PATTERN),
  category: cellText.min(1),
  groupDomain: cellText.min(1),
  outcomeDomain: cellText.min(1),
  definition: cellText,
  experience: cellText,
  verbatims: cellText,
});
export type MasterOutcome = z.infer<typeof masterOutcomeSchema>;

/**
 * A translated outcome. Absent fields are "not translated" — never an empty
 * string — so missing content is always distinguishable from content.
 * `source` fingerprints the English row at the time of translation, so the
 * admin can flag translations whose English has changed since.
 */
export const translationEntrySchema = z.object({
  outcomeDomain: cellText.min(1).optional(),
  definition: cellText.min(1).optional(),
  experience: cellText.min(1).optional(),
  verbatims: cellText.min(1).optional(),
  source: z.string().regex(/^[0-9a-f]{16}$/),
});
export type TranslationEntry = z.infer<typeof translationEntrySchema>;

/** Labels are keyed by the master's normalized taxonomy keys (taxonomy.ts). */
export const languageTranslationSchema = z.object({
  categories: z.record(z.string(), cellText.min(1)),
  groups: z.record(z.string(), cellText.min(1)),
  outcomes: z.record(z.string(), translationEntrySchema),
});
export type LanguageTranslation = z.infer<typeof languageTranslationSchema>;

export const dictionaryContentSchema = z
  .object({
    format: z.literal(CONTENT_FORMAT),
    master: z.object({ outcomes: z.array(masterOutcomeSchema).max(5000) }),
    translations: z.record(z.string().regex(LANGUAGE_CODE_PATTERN), languageTranslationSchema),
  })
  .superRefine((content, ctx) => {
    const seen = new Set<string>();
    for (const outcome of content.master.outcomes) {
      const key = outcome.id.toLowerCase();
      if (seen.has(key)) ctx.addIssue({ code: "custom", message: `Duplicate outcome ID ${outcome.id}` });
      seen.add(key);
    }
    if (MASTER_LANGUAGE in content.translations) {
      ctx.addIssue({ code: "custom", message: "The master language can't also be a translation." });
    }
    const ids = new Set(content.master.outcomes.map((outcome) => outcome.id));
    for (const [language, translation] of Object.entries(content.translations)) {
      for (const id of Object.keys(translation.outcomes)) {
        if (!ids.has(id)) {
          ctx.addIssue({ code: "custom", message: `${language} translation refers to unknown outcome ${id}` });
        }
      }
    }
  });
export type DictionaryContent = z.infer<typeof dictionaryContentSchema>;

export function emptyContent(): DictionaryContent {
  return { format: CONTENT_FORMAT, master: { outcomes: [] }, translations: {} };
}

export type ContentSummary = {
  outcomes: number;
  categories: number;
  groups: number;
  /** Translated outcome count per language (master excluded). */
  languages: Record<string, number>;
};
