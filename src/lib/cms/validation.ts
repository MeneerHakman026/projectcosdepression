import { z } from "zod";
import { collectLinks, parseInline } from "./rich-text";
import { isSafeHref, isSafeImagePath } from "./urls";

/**
 * Building blocks for page content schemas. Messages are written for the
 * person editing content, not for developers — they're shown next to the
 * field in the admin editor.
 */

const HREF_HELP = "Use a site path (/study), an in-page link (#section), an https:// address or mailto:.";

export function plainText(maxLength: number) {
  return z
    .string()
    .trim()
    .min(1, "This field can't be empty.")
    .max(maxLength, `Keep this to ${maxLength} characters or fewer.`);
}

export function optionalPlainText(maxLength: number) {
  return z.string().trim().max(maxLength, `Keep this to ${maxLength} characters or fewer.`);
}

/** Inline-formatted text (see lib/cms/rich-text.ts); every link inside must be safe. */
export function richText(maxLength: number) {
  return plainText(maxLength).superRefine((value, ctx) => {
    for (const href of collectLinks(parseInline(value))) {
      if (!isSafeHref(href)) {
        ctx.addIssue({ code: "custom", message: `The link "${href}" isn't allowed. ${HREF_HELP}` });
      }
    }
  });
}

export const href = z
  .string()
  .trim()
  .min(1, "Enter a link.")
  .refine(isSafeHref, `This link isn't allowed. ${HREF_HELP}`);

export const imagePath = z
  .string()
  .trim()
  .refine(
    isSafeImagePath,
    'Enter the path of an image in the site\'s public folder, e.g. "/front_photo.png".'
  );

export const visible = z.boolean();

export const accent = z.enum(["teal", "mint", "navy"]);
export type Accent = z.infer<typeof accent>;

export const cta = z.object({
  label: plainText(60),
  href,
});

/**
 * A scientific source, kept as structured metadata so every figure on the
 * site can be traced back to it. Fields mirror docs/CONTENT_SOURCES.md.
 */
export const reference = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes only."),
  shortName: plainText(80),
  authors: plainText(300),
  title: plainText(400),
  journal: optionalPlainText(200),
  year: z.string().trim().regex(/^\d{4}$/, "Enter a four-digit year."),
  details: optionalPlainText(100),
  doi: z
    .string()
    .trim()
    .refine((value) => value === "" || /^10\.\d{4,9}\/\S+$/.test(value), 'A DOI looks like "10.1016/…".'),
  url: z
    .string()
    .trim()
    .refine((value) => value === "" || value.startsWith("https://"), "Enter an https:// address.")
    .refine((value) => value === "" || isSafeHref(value), "This address isn't valid."),
  note: optionalPlainText(500),
});
export type Reference = z.infer<typeof reference>;

/** A pointer from a piece of content to an entry in the references list. */
export const citation = z.object({
  referenceId: z.string().trim().min(1, "Choose a source."),
  pages: optionalPlainText(40),
});
export type Citation = z.infer<typeof citation>;

export type FieldErrors = Record<string, string[]>;

/** Flattens zod issues into "a.b.0.c" → messages, matching editor field paths. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}
