import { z } from "zod";
import { plainText, richText } from "@/lib/cms/validation";

/**
 * Editable wording on the Expression of Interest pages (/registration and
 * /registration/success).
 *
 * Only the editorial text around the form lives here. The form itself —
 * its fields, labels, validation, consent statement, where submissions are
 * stored and how long they're kept — stays in code
 * (components/RegistrationForm.tsx, app/registration/actions.ts), so it
 * can't be changed or broken from the admin.
 */
export const REGISTRATION_SCHEMA_VERSION = 1;

export const registrationContentSchema = z.object({
  seo: z.object({
    title: plainText(80),
    description: plainText(300),
  }),
  intro: z.object({
    eyebrow: plainText(40),
    heading: plainText(140),
    description: plainText(400),
    note: richText(600),
  }),
  form: z.object({
    heading: plainText(100),
  }),
  beforeYouSubmit: z.object({
    heading: plainText(100),
    points: z
      .array(richText(400))
      .min(1, "Add at least one point.")
      .max(12, "Use at most 12 points."),
    closing: richText(800),
  }),
  success: z.object({
    heading: plainText(140),
    description: plainText(400),
    homeLinkLabel: plainText(60),
  }),
});

export type RegistrationContent = z.infer<typeof registrationContentSchema>;
