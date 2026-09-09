export const SITE_NAME = "COS-D";
export const SITE_FULL_NAME = "Core Outcome Set for Depression";

/**
 * The study/survey is hosted externally (Chris has not shared the final
 * survey URL yet). Replace this placeholder once it's available.
 */
export const SURVEY_URL = "#";

export type NavLink = {
  href: string;
  label: string;
};

/**
 * Primary navigation, shown in the header on every page.
 *
 * Chris's Vibe Guide lists more content areas (About, Study information,
 * FAQs, Depression Dictionary, Testimonials/Community, Publications,
 * Media/Webinars) than should sit in a restrained mobile-first nav bar, so
 * Study information and FAQs are combined into one page/section.
 */
export const PRIMARY_NAV: NavLink[] = [
  { href: "/about", label: "About" },
  { href: "/study", label: "Study & FAQs" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/community", label: "Community" },
  { href: "/publications", label: "Publications" },
  { href: "/media", label: "Media" },
];

export const FOOTER_NAV: NavLink[] = [
  ...PRIMARY_NAV,
  { href: "/contact", label: "Contact" },
];

export type PagePreview = NavLink & { description: string };

/**
 * Short "explore more" previews shown on the homepage. Descriptions describe
 * what each page is for, not its (not yet written) content, and can stay
 * accurate once real content lands.
 */
export const HOMEPAGE_PREVIEWS: PagePreview[] = [
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
];
