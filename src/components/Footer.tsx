import Image from "next/image";
import Link from "next/link";
import { PRIMARY_NAV, SITE_FULL_NAME, SITE_NAME } from "@/lib/site-config";

const PROJECT_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-border bg-paper-alt">
      <div className="mx-auto max-w-wide px-gutter py-12 md:py-16">
        {/* Logo + nav in one row, top-aligned so the logo sits level with
            the EXPLORE / PROJECT headings rather than floating above them */}
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-12 lg:gap-x-8">
          <div className="lg:col-span-4">
            <Link href="/" className="inline-block">
              <Image
                src="/cos-d-logo.png"
                alt={`${SITE_NAME} — ${SITE_FULL_NAME}`}
                width={460}
                height={200}
                className="h-[clamp(4rem,2.1rem+6.5vw,9.5rem)] w-auto mix-blend-multiply"
              />
            </Link>
            <a
              href="https://www.instagram.com/project.cosd"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="COS-D on Instagram"
              className="mt-3 inline-flex text-ink-muted transition-colors hover:text-brand-teal"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.5" />
                <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
              </svg>
            </a>
          </div>

          <nav
            aria-label="Footer"
            className="flex flex-col gap-y-8 sm:flex-row sm:gap-x-16 lg:col-span-6 lg:col-start-7 lg:justify-between"
          >
            <div>
              <div className="mb-2 h-0.5 w-5 bg-brand-teal" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-teal">
                Explore
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-x-10 gap-y-2.5 text-base sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-3">
                {PRIMARY_NAV.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ink transition-colors hover:text-brand-teal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="mb-2 h-0.5 w-5 bg-brand-teal" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand-teal">
                Project
              </h2>
              <ul className="mt-3 space-y-2.5 text-base">
                {PROJECT_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-ink transition-colors hover:text-brand-teal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto flex max-w-wide flex-col gap-3 px-gutter py-6 text-xs text-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} {SITE_NAME} — {SITE_FULL_NAME}
          </p>
          <div className="flex items-center gap-x-6">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy Policy
            </Link>
            <a href="#" className="transition-colors hover:text-ink">
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}