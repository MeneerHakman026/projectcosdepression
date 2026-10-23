import type { HomeContent } from "./schema";

/**
 * Built-in homepage content: the exact wording the homepage had before it
 * became editable, grounded in docs/CONTENT_SOURCES.md (the project's traced
 * scientific source of truth). The public site renders this until a version
 * is first published from the admin editor, and the editor starts from it.
 *
 * Do not reword, round or "improve" anything here — every statistic and
 * status claim is taken from CONTENT_SOURCES.md. Two kinds of number appear
 * on the page and must stay visually and verbally distinct:
 *  - evidence.metrics: findings from earlier/background research (PROCEED,
 *    Veal 2024) that explain why COS-D is needed. Each row is noted against
 *    its numbered row in CONTENT_SOURCES.md §3. Do not add PROCEED/COS-D
 *    recruitment or target numbers here (§3, row 17).
 *  - development.participation: current COS-D participation — deliberately
 *    empty (count: null) until Chris confirms the Step 2 survey is open and
 *    supplies a real figure. Never backfill it with PROCEED's 3,003 or with
 *    Step 2's recruitment targets (2,000 / 500 / 300).
 *
 * Development step statuses reflect Veal et al. 2026 (the published
 * protocol) as of its acceptance in December 2025 — Step 1 is complete,
 * Step 2's protocol is published but its survey has not opened, and Step 3
 * has not started.
 *
 * Terminology note: Veal et al. 2026 (the current protocol) says "carers";
 * Chevance et al. 2020 (PROCEED, background) says "informal caregivers".
 * This page uses "carers" for the current project — final wording still
 * TODO: confirm with Chris (CONTENT_SOURCES.md §1).
 *
 * DOIs are left blank: they aren't recorded in CONTENT_SOURCES.md and the
 * PDFs in docs/research have no text layer to read them from. Fill them in
 * from the papers rather than guessing.
 */
export const HOME_DEFAULTS: HomeContent = {
  seo: {
    title: "COS-D — Core Outcome Set for Depression",
    description:
      "COS-D is a research study involving people with depression, healthcare professionals, and informal caregivers. Learn about the study and take part in the survey.",
  },
  hero: {
    eyebrow: "COS-D",
    heading: "Deciding together what matters in depression care",
    intro:
      "COS-D is working out which outcomes should always be measured in depression research — the things that matter most to people living with depression, their carers, and healthcare professionals — so that different studies can be fairly compared.",
    primaryCta: { label: "Expression of interest", href: "/registration" },
    secondaryCta: { label: "Learn what this means", href: "#what-is-cos-d" },
    image: {
      src: "/front_photo.png",
      alt: "Three people having a conversation around a table.",
    },
  },
  about: {
    visible: true,
    heading: "What is COS-D?",
    body: "COS-D — a Core Outcome Set for Depression — is a research project working out which outcomes should be measured in every study of depression treatment: *what* to measure (such as mood, ability to work, or social isolation) and *how* to measure it (which questionnaire or scale to use). It's being developed with people who have depression, their carers, and healthcare professionals — not decided for them.",
    whyHeading: "Why it matters",
    whyBody:
      "Depression trials often measure different things, in different ways — and frequently miss what patients themselves say matters most. That makes it hard to know which treatments really work, or to combine results across studies. Agreeing on a shared set of outcomes makes depression research easier to compare, combine, and improve — for everyone involved.",
  },
  evidence: {
    visible: true,
    heading: "Why this research is needed",
    intro:
      "Two pieces of research make the case for COS-D: a large survey of people affected by depression, and a review of how depression trials actually measure outcomes. This is the evidence behind the project — not participation in COS-D itself.",
    metrics: [
      {
        // CONTENT_SOURCES.md §3, row 4
        value: "80",
        label: "Outcomes identified as mattering",
        context:
          "Patients, carers and clinicians identified 80 distinct outcomes that matter when treating depression.",
        sourceLabel: "Chevance et al.",
        year: "2020",
        citations: [{ referenceId: "chevance-2020", pages: "p.695" }],
      },
      {
        // CONTENT_SOURCES.md §3, row 20
        value: "<25%",
        label: "...of those are measured in trials",
        context:
          "Fewer than a quarter of those 80 outcomes are actually measured in late-stage depression trials.",
        sourceLabel: "Veal et al.",
        year: "2024/2026",
        citations: [
          { referenceId: "veal-2026", pages: "p.2" },
          { referenceId: "veal-2024", pages: "" },
        ],
      },
      {
        // CONTENT_SOURCES.md §3, row 11
        value: "388",
        label: "Different measures in use",
        context:
          "Across 450 depression trials reviewed, researchers found 388 different outcome measures in use.",
        sourceLabel: "Veal et al.",
        year: "2024",
        citations: [{ referenceId: "veal-2024", pages: "p.290" }],
      },
      {
        // CONTENT_SOURCES.md §3, row 14
        value: "9%",
        label: "Not measured by any common scale",
        context:
          "7 of the 80 outcomes that matter to patients — including mental pain and irritability — aren't captured by any of the 25 most-used measures.",
        sourceLabel: "Veal et al.",
        year: "2024",
        citations: [{ referenceId: "veal-2024", pages: "p.285" }],
      },
    ],
    footnote:
      "These figures describe earlier research (the PROCEED study and a systematic review of depression trials) that led to COS-D. They are not current COS-D participation figures — see below for where the project stands today.",
  },
  development: {
    visible: true,
    heading: "How COS-D is being developed",
    intro:
      "COS-D follows three steps. The first is complete and published; the second has a published plan but hasn't opened for participation yet; the third hasn't started.",
    steps: [
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
    ],
    steeringNote:
      "The process is overseen by a steering committee of 14 people, including three with lived experience of depression, who are co-authors of the study protocol.",
    // CONTENT_SOURCES.md §1 ("Development methodology", "Stakeholder groups")
    citations: [{ referenceId: "veal-2026", pages: "p.2–3" }],
    participation: {
      count: null,
      countLabel: "people have taken part in COS-D's Step 2 survey so far.",
      emptyHeading: "Recruitment hasn't opened yet",
      emptyBody: "The Step 2 survey isn't live yet. Once it is, real participation figures will appear here.",
    },
  },
  involved: {
    visible: true,
    heading: "Who's involved",
    intro: "COS-D only works if it reflects everyone affected by depression — not just one point of view.",
    groups: [
      {
        title: "People with depression",
        description: "Lived experience of depression, including what recovery and support feel like day to day.",
        accent: "teal",
      },
      {
        title: "Healthcare professionals",
        description:
          "Clinical expertise from working with depression in practice, and what's realistic to measure.",
        accent: "mint",
      },
      {
        title: "Carers",
        description: "The perspective of family, partners, or friends who support someone through depression.",
        accent: "navy",
      },
    ],
  },
  explore: {
    visible: true,
    heading: "Explore COS-D",
    intro: "Learn more about the study before you take part.",
    // Descriptions describe what each page is for, not its (not yet
    // written) content, so they stay accurate once real content lands.
    links: [
      {
        href: "/about",
        label: "About the project",
        description: "Who is running COS-D, and how the study came about.",
      },
      {
        href: "/study",
        label: "Study & FAQs",
        description: "What taking part involves, and answers to common questions.",
      },
      {
        href: "/dictionary",
        label: "Depression dictionary",
        description: "Plain-language explanations of terms used throughout the study.",
      },
      {
        href: "/media",
        label: "Media & webinars",
        description: "Videos and webinars related to the project.",
      },
    ],
  },
  finalCta: {
    visible: true,
    heading: "Want to take part?",
    body: "The next stage of COS-D is open to people with depression, their carers, and healthcare professionals. Register your interest and we'll be in touch.",
    primaryCta: { label: "Expression of interest", href: "/registration" },
    secondaryCta: { label: "Read more about the study", href: "/study" },
  },
  // Full references from docs/CONTENT_SOURCES.md ("Source papers").
  references: [
    {
      id: "chevance-2020",
      shortName: "Chevance 2020 (PROCEED)",
      authors: "Chevance A, Ravaud P, Tomlinson A, et al.",
      title:
        "Identifying outcomes for depression that matter to patients, informal caregivers, and health-care professionals: qualitative content analysis of a large international online survey",
      journal: "Lancet Psychiatry",
      year: "2020",
      details: "7:692–702",
      doi: "",
      url: "",
      note: "The PROCEED study — background research, Step 1 of COS-D.",
    },
    {
      id: "catchpole-2020",
      shortName: "Commentary 2020",
      authors: "Catchpole J.",
      title: "A participatory approach to determining outcome measures in people with depression",
      journal: "Lancet Psychiatry",
      year: "2020",
      details: "7:650–652",
      doi: "",
      url: "",
      note: "Independent commentary on PROCEED — background.",
    },
    {
      id: "chevance-2020-cos-debate",
      shortName: "Controversy/Debate 2020",
      authors: "Chevance A, Tran V-T, Ravaud P.",
      title:
        "Controversy and Debate Series on Core Outcome Sets. Paper 1: Improving the generalizability and credibility of core outcome sets (COS) by a large and international participation of diverse stakeholders",
      journal: "J Clin Epidemiol",
      year: "2020",
      details: "125:206–212",
      doi: "",
      url: "",
      note: "Methodology paper proposing the approach later used for COS-D — background.",
    },
    {
      id: "veal-2024",
      shortName: "Veal 2024",
      authors: "Veal C, Tomlinson A, Cipriani A, et al.",
      title:
        "Heterogeneity of outcome measures in depression trials and the relevance of the content of outcome measures to patients: a systematic review",
      journal: "Lancet Psychiatry",
      year: "2024",
      details: "11:285–294",
      doi: "",
      url: "",
      note: "Evidence of the problem COS-D addresses — background.",
    },
    {
      id: "veal-2026",
      shortName: "Veal 2026 (COS-D protocol)",
      authors: "Veal C, Krause KR, Fried EI, et al.",
      title: "A protocol for the development of a core outcome set for adults with depression",
      journal: "J Clin Epidemiol",
      year: "2026",
      details: "191:112119",
      doi: "",
      url: "",
      note: "The COS-D protocol itself — the current project. Published online 29 Dec 2025.",
    },
  ],
};
