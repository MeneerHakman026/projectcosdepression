"use client";

import { createContext, useContext } from "react";
import type { ParticipantRole } from "@/content/dictionary/schema";

/**
 * The Dictionary's interface wording, per interface language.
 *
 * Only the interface lives here: labels, buttons, status messages and
 * accessibility text. Scientific content (outcomes, definitions,
 * experiences, verbatims, category and group names) comes from the
 * published dataset and is never translated here.
 *
 * The interface follows the Dictionary language the visitor picked. A
 * language without an entry here falls back to English, so publishing a new
 * translation never breaks the page; adding its interface is a matter of
 * adding one object below (copy `en`, translate the values) and listing it
 * in UI_TEXT.
 *
 * A few English wordings come from the CMS (the page heading, the verbatims
 * heading and note, the participant groups, the introduction). English uses
 * the CMS values, so editors stay in control of them; other languages give
 * their own version in `cms`, as the CMS holds English only.
 */
export type UiText = {
  /** The interface language (BCP 47), set as `lang` on the Dictionary. */
  lang: string;

  /** Translations of CMS wording; absent for English, which uses the CMS. */
  cms?: {
    heading: string;
    aboutLabel: string;
    verbatimsHeading: string;
    verbatimsNote: string;
    /** Participant groups by the codes this language's verbatims use. */
    roles: ParticipantRole[];
    placeholderIntro: string;
  };

  // Heading and language
  about: string;
  languageLabel: string;

  // Search
  searchLabel: string;
  searchPlaceholderShort: string;
  searchPlaceholderLong: string;
  searchHelp: string;
  clearSearch: string;

  // Count, order and filters
  outcomeCount: (n: number) => string;
  foundCount: (n: number) => string;
  shownCount: (n: number) => string;
  translatedOnly: string;
  clearAll: string;
  sort: string;
  sortAuto: string;
  sortRelevance: string;
  sortAlpha: string;
  allGroups: string;

  // Empty results
  noMatchQuery: (query: string) => string;
  noMatchFilters: string;
  tipSearchAllCategories: string;
  tipSearch: string;
  tipFilters: string;
  searchAllCategories: string;
  clearSearchAndFilters: string;

  // Category tabs and index
  categoryLabel: string;
  all: string;
  /** Screen-reader suffix after a count: " outcomes" / " outcomes match". */
  countSuffix: (n: number, matching: boolean) => string;
  notYetTranslated: (language: string) => string;
  showOnlyGroup: string;
  shownOnItsOwn: string;
  rankedListLabel: string;
  fieldLabels: { definition: string; experience: string; verbatims: string };

  // The entry
  definition: string;
  experience: string;
  verbatimsTag: string;
  fallbackNote: (language: string) => string;
  copyLink: string;
  linkCopied: string;
  copyFailed: string;
  copyLinkTo: (title: string) => string;
  copiedAnnouncement: string;
  copyFailedAnnouncement: (url: string) => string;
  previous: string;
  next: string;
  previousNextLabel: string;
  close: string;
  showing: (title: string) => string;
  /** The crisis-support line, around the helpline link. */
  support: [before: string, after: string];

  // Nothing selected
  selectOutcome: string;
  totals: (outcomes: number, categories: number, groups: number) => string;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const EN: UiText = {
  lang: "en",
  about: "About",
  languageLabel: "Language",

  searchLabel: "Search the dictionary",
  searchPlaceholderShort: "Search the dictionary",
  searchPlaceholderLong: "Search outcomes, definitions, experiences and quotations",
  searchHelp:
    "Searches outcome names, definitions, experiences and quotations. Matches any part of a word, ignores accents and capitals, and allows for small typos. All words must match. Press slash to search from anywhere on the page.",
  clearSearch: "Clear search",

  outcomeCount: (n) => plural(n, "outcome", "outcomes"),
  foundCount: (n) => `${plural(n, "outcome", "outcomes")} found`,
  shownCount: (n) => `${plural(n, "outcome", "outcomes")} shown`,
  translatedOnly: "Translated only",
  clearAll: "Clear all",
  sort: "Sort",
  sortAuto: "Dictionary order",
  sortRelevance: "Best match",
  sortAlpha: "A–Z",
  allGroups: "All groups",

  noMatchQuery: (query) => `No outcomes match “${query}”`,
  noMatchFilters: "No outcomes match these filters",
  tipSearchAllCategories: "Try searching all categories, or check the spelling.",
  tipSearch:
    "Search looks for any part of a word, ignores accents and capitals and allows small typos. Try fewer words, or a related word.",
  tipFilters: "Try another category or group domain.",
  searchAllCategories: "Search all categories",
  clearSearchAndFilters: "Clear search and filters",

  categoryLabel: "Category",
  all: "All",
  countSuffix: (n, matching) => ` ${n === 1 ? "outcome" : "outcomes"}${matching ? (n === 1 ? " matches" : " match") : ""}`,
  notYetTranslated: (language) => `Not yet translated into ${language}`,
  showOnlyGroup: ". Show only this group",
  shownOnItsOwn: ", shown on its own. Show all groups",
  rankedListLabel: "Outcomes, best match first",
  fieldLabels: { definition: "Definition", experience: "Experience", verbatims: "Verbatims" },

  definition: "Definition",
  experience: "Experience",
  verbatimsTag: "Verbatims",
  fallbackNote: (language) => `Not yet translated into ${language} — shown in English`,
  copyLink: "Copy link",
  linkCopied: "Link copied",
  copyFailed: "Couldn't copy",
  copyLinkTo: (title) => ` to ${title}`,
  copiedAnnouncement: "Link copied to clipboard",
  copyFailedAnnouncement: (url) => `Copy failed. The link is ${url}`,
  previous: "Previous",
  next: "Next",
  previousNextLabel: "Previous and next outcome",
  close: "Close",
  showing: (title) => `Showing ${title}`,
  support: ["Struggling right now? You can find free, local support at ", ""],

  selectOutcome: "Select an outcome",
  totals: (outcomes, categories, groups) =>
    `${plural(outcomes, "outcome domain", "outcome domains")} · ${plural(categories, "category", "categories")} · ${plural(groups, "group domain", "group domains")}`,
};

/**
 * French. "Outcome" is rendered as "critère de jugement" (shortened to
 * "critère" in counts), the usual French term in clinical research.
 * Participant codes are those used in the French verbatims (P, PS, Pr).
 */
export const FR: UiText = {
  lang: "fr",
  cms: {
    heading: "Dictionnaire des critères de jugement",
    aboutLabel: "À propos de ce dictionnaire",
    verbatimsHeading: "Avec leurs propres mots",
    verbatimsNote: "Les citations des participants à l’étude sont reproduites telles qu’elles figurent dans les données de recherche, sans modification.",
    roles: [
      { code: "P", label: "Personnes avec une dépression" },
      { code: "PS", label: "Professionnels de santé" },
      { code: "Pr", label: "Proches aidants" },
    ],
    placeholderIntro:
      "Les critères de jugement du traitement de la dépression qui comptent pour les personnes avec une dépression, les proches aidants et les professionnels de santé. Chaque entrée donne une définition, décrit comment le critère peut être vécu et rapporte ce que les participants en ont dit avec leurs propres mots.",
  },
  about: "À propos",
  languageLabel: "Langue",

  searchLabel: "Rechercher dans le dictionnaire",
  searchPlaceholderShort: "Rechercher dans le dictionnaire",
  searchPlaceholderLong: "Rechercher des critères, définitions, vécus et citations",
  searchHelp:
    "Recherche dans les noms des critères, les définitions, les vécus et les citations. Trouve n’importe quelle partie d’un mot, ignore les accents et les majuscules et tolère les petites fautes de frappe. Tous les mots doivent correspondre. Appuyez sur la barre oblique pour rechercher depuis n’importe où sur la page.",
  clearSearch: "Effacer la recherche",

  outcomeCount: (n) => plural(n, "critère", "critères"),
  foundCount: (n) => `${plural(n, "critère trouvé", "critères trouvés")}`,
  shownCount: (n) => `${plural(n, "critère affiché", "critères affichés")}`,
  translatedOnly: "Traduits uniquement",
  clearAll: "Tout effacer",
  sort: "Trier",
  sortAuto: "Ordre du dictionnaire",
  sortRelevance: "Pertinence",
  sortAlpha: "A–Z",
  allGroups: "Tous les domaines",

  noMatchQuery: (query) => `Aucun critère ne correspond à « ${query} »`,
  noMatchFilters: "Aucun critère ne correspond à ces filtres",
  tipSearchAllCategories: "Essayez de rechercher dans toutes les catégories, ou vérifiez l’orthographe.",
  tipSearch:
    "La recherche trouve n’importe quelle partie d’un mot, ignore les accents et les majuscules et tolère les petites fautes de frappe. Essayez avec moins de mots, ou un mot proche.",
  tipFilters: "Essayez une autre catégorie ou un autre domaine.",
  searchAllCategories: "Rechercher dans toutes les catégories",
  clearSearchAndFilters: "Effacer la recherche et les filtres",

  categoryLabel: "Catégorie",
  all: "Tous",
  countSuffix: (n, matching) => ` ${n === 1 ? "critère" : "critères"}${matching ? (n === 1 ? " correspond" : " correspondent") : ""}`,
  notYetTranslated: (language) => `Pas encore traduit en ${language}`,
  showOnlyGroup: ". Afficher uniquement ce domaine",
  shownOnItsOwn: ", affiché seul. Afficher tous les domaines",
  rankedListLabel: "Critères, les plus pertinents d’abord",
  fieldLabels: { definition: "Définition", experience: "Vécu", verbatims: "Verbatims" },

  definition: "Définition",
  experience: "Vécu",
  verbatimsTag: "Verbatims",
  fallbackNote: (language) => `Pas encore traduit en ${language} — affiché en anglais`,
  copyLink: "Copier le lien",
  linkCopied: "Lien copié",
  copyFailed: "Copie impossible",
  copyLinkTo: (title) => ` vers ${title}`,
  copiedAnnouncement: "Lien copié dans le presse-papiers",
  copyFailedAnnouncement: (url) => `La copie a échoué. Le lien est ${url}`,
  previous: "Précédent",
  next: "Suivant",
  previousNextLabel: "Critère précédent et suivant",
  close: "Fermer",
  showing: (title) => `Affichage : ${title}`,
  support: ["Vous traversez un moment difficile ? Vous trouverez une aide gratuite près de chez vous sur ", ""],

  selectOutcome: "Sélectionnez un critère",
  totals: (outcomes, categories, groups) =>
    `${plural(outcomes, "critère", "critères")} · ${plural(categories, "catégorie", "catégories")} · ${plural(groups, "domaine", "domaines")}`,
};

/** Interface languages. To add one, write its UiText above and list it here. */
const UI_TEXT: Record<string, UiText> = { en: EN, fr: FR };

/** The interface for a Dictionary language: its own, its base language's ("fr" for "fr-CA"), or English. */
export function uiTextFor(language: string): UiText {
  return UI_TEXT[language] ?? UI_TEXT[language.split("-")[0]] ?? EN;
}

/** A language's name in the interface language, lower-case as in running text ("français", "French"). */
export function languageNameIn(code: string, ui: UiText): string {
  try {
    return new Intl.DisplayNames([ui.lang], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

const UiTextContext = createContext<UiText>(EN);

export const UiTextProvider = UiTextContext.Provider;

/** The interface wording for the Dictionary being shown. */
export function useUiText(): UiText {
  return useContext(UiTextContext);
}
