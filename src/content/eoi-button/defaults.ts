import type { EoiButtonContent } from "./schema";

/**
 * Shown until the button settings are first published. Matches the label
 * and destination the site used before the button became editable, so
 * deploying this changes nothing for visitors.
 */
export const EOI_BUTTON_DEFAULTS: EoiButtonContent = {
  label: "Expression of interest",
  destination: { mode: "internal", externalUrl: "" },
};
