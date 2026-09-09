export type Testimonial = {
  quote: string;
  role: string;
  accent: "teal" | "mint" | "navy";
};

/**
 * PLACEHOLDER CONTENT — NOT REAL TESTIMONIALS.
 *
 * These are sample quotes for layout purposes only, one per COS-D
 * perspective. Chris has not supplied real testimonials yet (see
 * docs/WEBSITE_REQUIREMENTS.md §18). Replace every entry with a genuine,
 * consented testimonial before launch.
 */
export const PLACEHOLDER_TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "[Placeholder quote — a participant's reflection on taking part in COS-D will go here.]",
    role: "Placeholder — person with lived experience of depression",
    accent: "teal",
  },
  {
    quote:
      "[Placeholder quote — a healthcare professional's perspective on COS-D will go here.]",
    role: "Placeholder — healthcare professional",
    accent: "mint",
  },
  {
    quote:
      "[Placeholder quote — an informal carer's perspective on COS-D will go here.]",
    role: "Placeholder — informal caregiver",
    accent: "navy",
  },
];
