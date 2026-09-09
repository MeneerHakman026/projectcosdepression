export type DevelopmentStep = {
  step: string;
  title: string;
  status: string;
  description: string;
  accent: "teal" | "mint" | "navy";
};

/**
 * COS-D's three-step methodology (docs/CONTENT_SOURCES.md §1, "Development
 * methodology" and "Current / future research stages"). Statuses reflect
 * Veal et al. 2026 (the published protocol) as of its acceptance in
 * December 2025 — Step 1 is complete, Step 2's protocol is published but
 * its survey has not opened, and Step 3 has not started. Do not change a
 * status to "underway"/"open" without a confirmed source — see the
 * ParticipationStat component and CONTENT_SOURCES.md's "Requires
 * confirmation from Chris" list.
 */
export const DEVELOPMENT_STEPS: DevelopmentStep[] = [
  {
    step: "Step 1",
    title: "Generate outcome domains",
    status: "Complete",
    description:
      "A large international survey asked people what actually matters when treating depression. It identified 80 candidate outcomes, published in 2020 as the PROCEED study.",
    accent: "teal",
  },
  {
    step: "Step 2",
    title: "Select core outcome domains",
    status: "Protocol published — survey not yet open",
    description:
      "An online survey will ask people to rate and rank the 80 candidate outcomes, followed by a consensus meeting to agree the final shortlist.",
    accent: "mint",
  },
  {
    step: "Step 3",
    title: "Select core outcome measures",
    status: "Planned",
    description:
      "A review of existing questionnaires and scales, matched against the agreed outcomes, will decide exactly how each one should be measured.",
    accent: "navy",
  },
];
