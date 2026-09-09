export type ResearchMetric = {
  /** Kept as a string (not number) so formatting like "<25%" renders exactly as sourced. */
  value: string;
  label: string;
  context: string;
  source: string;
  year: string;
};

/**
 * Evidence that motivates COS-D — background/earlier research, not current
 * COS-D participation. Every entry is traceable to a numbered row in
 * docs/CONTENT_SOURCES.md §3 ("Website-ready metrics"); the row is noted
 * against each entry below. Selected together (rather than the largest
 * available numbers) to tell one story: a large body of research identified
 * what matters to patients, carers and clinicians, yet trials mostly don't
 * measure it, and rarely measure it consistently.
 *
 * Do not add PROCEED/COS-D recruitment or target numbers here (see
 * CONTENT_SOURCES.md §3, row 17) — those describe planned or historical
 * enrolment, not findings, and must not appear alongside evidence metrics.
 */
export const RESEARCH_METRICS: ResearchMetric[] = [
  {
    // CONTENT_SOURCES.md §3, row 4
    value: "80",
    label: "Outcomes identified as mattering",
    context:
      "Patients, carers and clinicians identified 80 distinct outcomes that matter when treating depression.",
    source: "Chevance et al.",
    year: "2020",
  },
  {
    // CONTENT_SOURCES.md §3, row 20
    value: "<25%",
    label: "...of those are measured in trials",
    context:
      "Fewer than a quarter of those 80 outcomes are actually measured in late-stage depression trials.",
    source: "Veal et al.",
    year: "2024/2026",
  },
  {
    // CONTENT_SOURCES.md §3, row 11
    value: "388",
    label: "Different measures in use",
    context:
      "Across 450 depression trials reviewed, researchers found 388 different outcome measures in use.",
    source: "Veal et al.",
    year: "2024",
  },
  {
    // CONTENT_SOURCES.md §3, row 14
    value: "9%",
    label: "Not measured by any common scale",
    context:
      "7 of the 80 outcomes that matter to patients — including mental pain and irritability — aren't captured by any of the 25 most-used measures.",
    source: "Veal et al.",
    year: "2024",
  },
];
