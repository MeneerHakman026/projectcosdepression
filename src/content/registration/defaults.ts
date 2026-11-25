import type { RegistrationContent } from "./schema";

/**
 * The registration pages' wording as it was before it became editable,
 * copied verbatim from app/registration/page.tsx and
 * app/registration/success/page.tsx — with one deliberate change: the
 * Country field was removed from the form, so the point listing the
 * optional fields no longer mentions "Country of residence".
 */
export const REGISTRATION_DEFAULTS: RegistrationContent = {
  seo: {
    title: "Expression of interest",
    description:
      "Leave your contact details and we'll let you know when the COS-D survey opens for participation.",
  },
  intro: {
    eyebrow: "Expression of Interest",
    heading: "Interested in taking part in COS-D?",
    description:
      "The COS-D survey is not open yet. You can leave your contact details and we will let you know when participation becomes available.",
    note: "Submitting an Expression of Interest is not registration for the COS-D survey and does not affect your eligibility to take part later.",
  },
  form: {
    heading: "Expression of interest form",
  },
  beforeYouSubmit: {
    heading: "Before you submit",
    points: [
      "Submitting an Expression of Interest is voluntary.",
      "Your first name, email address and consent are required if you choose to submit an Expression of Interest.",
      "Age group and preferred language are optional.",
      "We collect this information so we can let you know when the COS-D survey becomes available.",
      "Optional background information helps give us an indication of the range and characteristics of people expressing interest.",
      "Expression of Interest data is kept for no longer than 14 days after the Expression of Interest period closes.",
    ],
    closing:
      "Read the full [Privacy Policy](/privacy) for more detail on how your information is used and protected, or contact us at [project.cosdepression@gmail.com](mailto:project.cosdepression@gmail.com).",
  },
  success: {
    heading: "Thank you for your interest in COS-D.",
    description: "We'll contact you when the COS-D survey opens.",
    homeLinkLabel: "Return to the homepage",
  },
};
