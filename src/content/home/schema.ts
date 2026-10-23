import { z } from "zod";
import {
  accent,
  citation,
  cta,
  href,
  imagePath,
  plainText,
  reference,
  richText,
  visible,
} from "@/lib/cms/validation";

/**
 * Editable content of the homepage. The structure mirrors the page's
 * existing sections one to one (components/home/HomePage.tsx); the layout
 * and styling of each section stay in code.
 *
 * Bump HOME_SCHEMA_VERSION and add a step to migrateHomeContent (see
 * lib/cms/pages.ts) whenever a change here would make previously saved
 * content invalid.
 */
export const HOME_SCHEMA_VERSION = 1;

/** Anchor the hero's "Learn what this means" button points to. */
export const ABOUT_SECTION_ID = "what-is-cos-d";

const metric = z.object({
  value: plainText(16),
  label: plainText(80),
  context: plainText(300),
  sourceLabel: plainText(60),
  year: plainText(20),
  citations: z.array(citation).min(1, "Link this figure to at least one source."),
});

const developmentStep = z.object({
  step: plainText(30),
  title: plainText(80),
  status: plainText(80),
  description: plainText(400),
  accent,
});

export const homeContentSchema = z
  .object({
    seo: z.object({
      title: plainText(80),
      description: plainText(300),
    }),
    hero: z.object({
      eyebrow: plainText(40),
      heading: plainText(140),
      intro: richText(600),
      primaryCta: cta,
      secondaryCta: cta,
      image: z.object({
        src: imagePath,
        alt: plainText(200),
      }),
    }),
    about: z.object({
      visible,
      heading: plainText(100),
      body: richText(1200),
      whyHeading: plainText(100),
      whyBody: richText(1200),
    }),
    evidence: z.object({
      visible,
      heading: plainText(100),
      intro: richText(800),
      metrics: z.array(metric).min(1, "Add at least one figure.").max(8, "Use at most 8 figures."),
      footnote: richText(600),
    }),
    development: z.object({
      visible,
      heading: plainText(100),
      intro: richText(800),
      steps: z.array(developmentStep).min(1, "Add at least one step.").max(6, "Use at most 6 steps."),
      steeringNote: richText(600),
      citations: z.array(citation),
      participation: z.object({
        count: z.number().int().min(0, "Enter zero or more.").nullable(),
        countLabel: plainText(120),
        emptyHeading: plainText(100),
        emptyBody: plainText(300),
      }),
    }),
    involved: z.object({
      visible,
      heading: plainText(100),
      intro: richText(600),
      groups: z
        .array(
          z.object({
            title: plainText(80),
            description: plainText(300),
            accent,
          })
        )
        .min(1, "Add at least one group.")
        .max(6, "Use at most 6 groups."),
    }),
    explore: z.object({
      visible,
      heading: plainText(100),
      intro: plainText(300),
      links: z
        .array(
          z.object({
            label: plainText(80),
            href,
            description: plainText(200),
          })
        )
        .min(1, "Add at least one link.")
        .max(8, "Use at most 8 links."),
    }),
    finalCta: z.object({
      visible,
      heading: plainText(100),
      body: richText(600),
      primaryCta: cta,
      secondaryCta: cta,
    }),
    references: z.array(reference).max(50, "Use at most 50 sources."),
  })
  .superRefine((content, ctx) => {
    // Sources must be uniquely identifiable, and every citation must point
    // at one that exists — otherwise a figure would silently lose its source.
    const ids = new Set<string>();
    content.references.forEach((ref, index) => {
      if (ids.has(ref.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["references", index, "id"],
          message: "Another source already uses this ID.",
        });
      }
      ids.add(ref.id);
    });

    const checkCitations = (citations: { referenceId: string }[], path: (string | number)[]) => {
      citations.forEach((item, index) => {
        if (!ids.has(item.referenceId)) {
          ctx.addIssue({
            code: "custom",
            path: [...path, index, "referenceId"],
            message: "This source isn't in the sources list.",
          });
        }
      });
    };
    content.evidence.metrics.forEach((item, index) =>
      checkCitations(item.citations, ["evidence", "metrics", index, "citations"])
    );
    checkCitations(content.development.citations, ["development", "citations"]);

    // A button pointing at a hidden section would scroll to nothing.
    if (!content.about.visible) {
      const anchor = `#${ABOUT_SECTION_ID}`;
      const buttons = [
        { path: ["hero", "secondaryCta", "href"], value: content.hero.secondaryCta.href },
        { path: ["hero", "primaryCta", "href"], value: content.hero.primaryCta.href },
      ];
      for (const button of buttons) {
        if (button.value === anchor) {
          ctx.addIssue({
            code: "custom",
            path: button.path,
            message: `This button links to the "${content.about.heading}" section, which is hidden.`,
          });
        }
      }
    }
  });

export type HomeContent = z.infer<typeof homeContentSchema>;
export type ResearchMetricContent = HomeContent["evidence"]["metrics"][number];
export type DevelopmentStepContent = HomeContent["development"]["steps"][number];
