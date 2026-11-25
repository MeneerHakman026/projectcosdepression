import { languageName, nativeLanguageName } from "./languages";
import { MASTER_LANGUAGE, type DictionaryContent, type TextField } from "./model";
import { deriveTaxonomy } from "./taxonomy";
import { cleanLabel } from "./text";

/**
 * What the public Dictionary renders for one language: plain serializable
 * data, passed from the server to the client explorer.
 *
 * Every piece of text says which language it is in. When a translation is
 * missing, the English text is used *and flagged* (`fallback: true`), so the
 * interface can label it rather than silently passing English off as a
 * translation.
 */

export type LocalizedText = { text: string; fallback: boolean };

export type ViewOutcome = {
  id: string;
  position: number;
  categoryKey: string;
  groupKey: string;
  /** Has at least one translated field in the selected language. */
  translated: boolean;
} & Record<TextField, LocalizedText>;

export type ViewGroup = { key: string; slug: string; label: LocalizedText; count: number };
export type ViewCategory = { key: string; slug: string; label: LocalizedText; count: number; groups: ViewGroup[] };

export type ViewLanguage = { code: string; name: string; nativeName: string; translated: number };

export type DictionaryView = {
  language: string;
  languageName: string;
  masterLanguage: string;
  languages: ViewLanguage[];
  categories: ViewCategory[];
  outcomes: ViewOutcome[];
  totals: { outcomes: number; categories: number; groups: number };
  release: { number: number; publishedAt: string | null } | null;
};

/**
 * @param counts translated-outcome count per language. Public pages load only
 *   one translation, so the full list comes from the release summary.
 */
export function availableLanguages(total: number, counts: Record<string, number>): ViewLanguage[] {
  return [
    { code: MASTER_LANGUAGE, name: languageName(MASTER_LANGUAGE), nativeName: nativeLanguageName(MASTER_LANGUAGE), translated: total },
    ...Object.keys(counts)
      .sort()
      .map((code) => ({ code, name: languageName(code), nativeName: nativeLanguageName(code), translated: counts[code] })),
  ];
}

export function buildView(
  content: DictionaryContent,
  requestedLanguage: string,
  release: DictionaryView["release"],
  languageCounts?: Record<string, number>
): DictionaryView {
  const counts =
    languageCounts ??
    Object.fromEntries(Object.entries(content.translations).map(([code, t]) => [code, Object.keys(t.outcomes).length]));
  const language =
    requestedLanguage === MASTER_LANGUAGE || requestedLanguage in content.translations ? requestedLanguage : MASTER_LANGUAGE;
  const translation = language === MASTER_LANGUAGE ? undefined : content.translations[language];
  const taxonomy = deriveTaxonomy(content.master.outcomes);

  const label = (english: string, translated: string | undefined): LocalizedText =>
    translation === undefined
      ? { text: english, fallback: false }
      : translated
        ? { text: translated, fallback: false }
        : { text: english, fallback: true };

  const categories: ViewCategory[] = taxonomy.categories.map((category) => ({
    key: category.key,
    slug: category.slug,
    label: label(category.label, translation?.categories[category.key]),
    count: category.outcomeIds.length,
    groups: category.groups.map((group) => ({
      key: group.key,
      slug: group.slug,
      label: label(group.label, translation?.groups[group.key]),
      count: group.outcomeIds.length,
    })),
  }));

  const groupKeyById = new Map<string, { categoryKey: string; groupKey: string }>();
  for (const group of taxonomy.groupByKey.values()) {
    for (const id of group.outcomeIds) groupKeyById.set(id, { categoryKey: group.categoryKey, groupKey: group.key });
  }

  const outcomes: ViewOutcome[] = content.master.outcomes.map((outcome, position) => {
    const entry = translation?.outcomes[outcome.id];
    const text = (field: TextField): LocalizedText => {
      const english = field === "outcomeDomain" ? cleanLabel(outcome[field]) : outcome[field].trim();
      if (translation === undefined) return { text: english, fallback: false };
      const translated = entry?.[field];
      if (translated !== undefined) return { text: field === "outcomeDomain" ? cleanLabel(translated) : translated.trim(), fallback: false };
      return { text: english, fallback: english !== "" };
    };
    return {
      id: outcome.id,
      position,
      ...groupKeyById.get(outcome.id)!,
      translated: translation === undefined || entry !== undefined,
      outcomeDomain: text("outcomeDomain"),
      definition: text("definition"),
      experience: text("experience"),
      verbatims: text("verbatims"),
    };
  });

  return {
    language,
    languageName: languageName(language),
    masterLanguage: MASTER_LANGUAGE,
    languages: availableLanguages(outcomes.length, counts),
    categories,
    outcomes,
    totals: { outcomes: outcomes.length, categories: categories.length, groups: taxonomy.groupByKey.size },
    release,
  };
}
