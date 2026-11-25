import type { DictionaryPageContent } from "./schema";

/**
 * Built-in wording for /dictionary, used until an editor publishes their own.
 *
 * Source attribution follows docs/CONTENT_SOURCES.md ("Dictionary"): the
 * outcome domains and their descriptions come from the PROCEED study
 * (Chevance 2020), referenced by the COS-D protocol (Veal 2026, p.4).
 * FLAGGED FOR PROJECT-OWNER CONFIRMATION before publication — see
 * docs/DICTIONARY.md, "Scientific integrity and permissions".
 *
 * The participant-role expansions come from the project brief. The
 * informal-caregivers term matches Chevance 2020 and the source workbook's
 * "ICG" label; Veal 2026 says "carers" (open terminology question in
 * docs/CONTENT_SOURCES.md).
 */
export const DICTIONARY_PAGE_DEFAULTS: DictionaryPageContent = {
  seo: {
    title: "Outcome Dictionary",
    description:
      "Search and browse the outcomes of depression treatment that matter to people with depression, informal caregivers and healthcare professionals — with definitions, experiences and participants' own words.",
  },
  intro: {
    eyebrow: "COS-D",
    heading: "Outcome Dictionary",
    description:
      "The outcomes of depression treatment that matter to people with depression, informal caregivers and healthcare professionals. Each entry gives a definition, describes how the outcome can be experienced, and shares what participants said in their own words.",
  },
  explorer: {
    heading: "Browse by category",
  },
  verbatims: {
    heading: "In their own words",
    note: "Quotations from study participants are shown as they appear in the research data, without editing.",
    roles: [
      { code: "PwD", label: "People with depression" },
      { code: "HCP", label: "Healthcare professionals" },
      { code: "ICG", label: "Informal caregivers" },
    ],
  },
  source: {
    heading: "About this dictionary",
    body: "The outcome domains, definitions, experiences and quotations come from the PROCEED study: Chevance A, Ravaud P, Tomlinson A, et al. Identifying outcomes for depression that matter to patients, informal caregivers, and health-care professionals: qualitative content analysis of a large international online survey. *Lancet Psychiatry* 2020;7:692–702.",
  },
  unavailable: {
    heading: "The Outcome Dictionary is being prepared",
    body: "The dictionary will be published here soon.",
  },
};
