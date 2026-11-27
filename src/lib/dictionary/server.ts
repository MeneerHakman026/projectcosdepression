import "server-only";
import { unstable_cache } from "next/cache";
import { sql } from "@/lib/db";
import { translatedOutcomeCount } from "./translation-count";
import { MASTER_LANGUAGE } from "./model";
import { createDictionaryService } from "./service";
import { buildView, type DictionaryView } from "./view";

export const dictionary = createDictionaryService({
  query: (text, params) => sql.query(text, params) as Promise<Record<string, unknown>[]>,
});

/** Bump when DictionaryView's shape or derivation changes (v2: language labels and full-translation counts). */
const VIEW_CACHE_VERSION = "v2";

/** Invalidated on publish (see app/admin/(protected)/content/dictionary/actions.ts). */
export const DICTIONARY_CACHE_TAG = "dictionary:published";

/** Languages of the live dictionary (master first). Empty when nothing is published. */
const getPublishedLanguages = unstable_cache(
  async (): Promise<string[]> => {
    const live = await dictionary.getPublishedForLanguage(MASTER_LANGUAGE);
    return live ? [MASTER_LANGUAGE, ...Object.keys(live.release.summary.languages).sort()] : [];
  },
  ["dictionary-languages"],
  { tags: [DICTIONARY_CACHE_TAG] }
);

/**
 * Fully translated outcomes per language in the live dictionary, for the
 * language menu. Computed from each translation's text rather than taken
 * from the release summary, which counts any outcome with a translated
 * field, including ones that still show English. Cached until the next
 * publish, so each language is read once per release.
 */
const getPublishedLanguageCounts = unstable_cache(
  async (): Promise<Record<string, number>> => {
    const languages = (await getPublishedLanguages()).filter((code) => code !== MASTER_LANGUAGE);
    const counts: Record<string, number> = {};
    for (const code of languages) {
      const live = await dictionary.getPublishedForLanguage(code);
      counts[code] = live ? translatedOutcomeCount(live.content, code) : 0;
    }
    return counts;
  },
  ["dictionary-language-counts"],
  { tags: [DICTIONARY_CACHE_TAG] }
);

/**
 * The live dictionary in one language, ready to render; null until the
 * first publish (or before the tables exist). Cached until the next
 * publish, so visitors never trigger a database query, and drafts are never
 * read here. Unknown languages resolve to English rather than creating
 * new cache entries.
 */
export async function getPublishedView(requestedLanguage: string): Promise<DictionaryView | null> {
  const languages = await getPublishedLanguages();
  if (languages.length === 0) return null;
  const language = languages.includes(requestedLanguage) ? requestedLanguage : MASTER_LANGUAGE;
  return unstable_cache(
    async () => {
      const [live, counts] = await Promise.all([dictionary.getPublishedForLanguage(language), getPublishedLanguageCounts()]);
      if (!live) return null;
      return buildView(live.content, language, { number: live.release.number, publishedAt: live.release.publishedAt }, counts);
    },
    // Versioned with the DictionaryView shape, so a deploy never reads a view cached by older code.
    ["dictionary-view", VIEW_CACHE_VERSION, language],
    { tags: [DICTIONARY_CACHE_TAG] }
  )();
}

/** Uncached view of any release, for the admin preview. */
export async function getReleaseView(releaseNumber: number, language: string): Promise<DictionaryView | null> {
  const release = await dictionary.getRelease(releaseNumber);
  if (!release) return null;
  return buildView(release.content, language, { number: release.release.number, publishedAt: release.release.publishedAt });
}
