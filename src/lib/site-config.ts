export const SITE_NAME = "COS-D";
export const SITE_FULL_NAME = "Core Outcome Set for Depression";

/**
 * Expression-of-interest destination for every survey CTA on the site.
 * Points at the internal /registration page.
 */
export const SURVEY_URL: string = "/registration";

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
