import { z } from "zod";
import { plainText, richText } from "@/lib/cms/validation";

/**
 * Editable wording around the Outcome Dictionary (/dictionary).
 *
 * This is only the editorial frame — introduction, notes, source and the
 * participant-role legend. The dictionary entries themselves (categories,
 * group domains, outcomes, definitions, experiences, verbatims) are NOT here:
 * they're managed exclusively through Excel import (Admin → Content →
 * Outcome Dictionary), so there's a single source of truth for them.
 */
export const DICTIONARY_PAGE_SCHEMA_VERSION = 1;

export const participantRole = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,8}$/, "Use the abbreviation exactly as it appears before the colon in the Verbatims, e.g. PwD."),
  label: plainText(80),
});
export type ParticipantRole = z.infer<typeof participantRole>;

export const dictionaryPageSchema = z
  .object({
    seo: z.object({
      title: plainText(80),
      description: plainText(300),
    }),
    intro: z.object({
      eyebrow: plainText(40),
      heading: plainText(140),
      description: richText(800),
    }),
    explorer: z.object({
      heading: plainText(100),
    }),
    verbatims: z.object({
      heading: plainText(80),
      note: richText(600),
      roles: z.array(participantRole).max(12, "Use at most 12 participant groups."),
    }),
    source: z.object({
      heading: plainText(80),
      body: richText(1200),
    }),
    unavailable: z.object({
      heading: plainText(140),
      body: richText(600),
    }),
  })
  .superRefine((content, ctx) => {
    const seen = new Set<string>();
    content.verbatims.roles.forEach((role, index) => {
      const key = role.code.toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({ code: "custom", path: ["verbatims", "roles", index, "code"], message: "This abbreviation is already listed." });
      }
      seen.add(key);
    });
  });

export type DictionaryPageContent = z.infer<typeof dictionaryPageSchema>;
