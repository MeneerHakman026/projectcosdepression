import { z } from "zod";
import { plainText } from "@/lib/cms/validation";
import { isSafeExternalUrl } from "@/lib/cms/urls";

/**
 * The site-wide Expression of Interest button: its label and where it
 * leads. Every EOI button on the public site (header, mobile menu, homepage)
 * reads this one published document, so they can never point to different
 * places.
 *
 * Editors choose between two destinations:
 *  - internal: the site's own /registration page (fixed in code, not
 *    editable, so an internal link can never be turned into something else)
 *  - external: an https:// study registration website
 *
 * The external URL is kept while "internal" is selected, so switching back
 * and forth doesn't lose it. It must still be valid (or empty) in that case.
 */
export const EOI_BUTTON_SCHEMA_VERSION = 1;

/** Where the button goes in "internal" mode. Developer-owned. */
export const INTERNAL_REGISTRATION_PATH = "/registration";

export const EXTERNAL_URL_HELP =
  'Enter the full address of the study website, starting with https:// (for example "https://example.org/study").';

export const eoiDestinationMode = z.enum(["internal", "external"]);
export type EoiDestinationMode = z.infer<typeof eoiDestinationMode>;

export const eoiButtonSchema = z
  .object({
    label: plainText(40),
    destination: z.object({
      mode: eoiDestinationMode,
      externalUrl: z.string().trim().max(2000, "This address is too long."),
    }),
  })
  .superRefine((content, ctx) => {
    const { mode, externalUrl } = content.destination;
    const path = ["destination", "externalUrl"];
    if (mode === "external" && externalUrl === "") {
      ctx.addIssue({ code: "custom", path, message: `Enter the study website's address. ${EXTERNAL_URL_HELP}` });
    } else if (externalUrl !== "" && !isSafeExternalUrl(externalUrl)) {
      ctx.addIssue({ code: "custom", path, message: `This address isn't allowed. ${EXTERNAL_URL_HELP}` });
    }
  });

export type EoiButtonContent = z.infer<typeof eoiButtonSchema>;
