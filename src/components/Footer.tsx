import Image from "next/image";
import Link from "next/link";
import SurveyButton from "./SurveyButton";
import { FOOTER_NAV, SITE_FULL_NAME, SITE_NAME } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-paper-alt">
      <div className="mx-auto grid max-w-wide gap-8 px-gutter py-composition-gap md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-grid-gap">
        <Link href="/" className="md:justify-self-start">
          <Image
            src="/cos-d-logo.png"
            alt={`${SITE_NAME} logo`}
            width={460}
            height={200}
            className="h-12 w-auto sm:h-14 md:h-logo-h mix-blend-multiply"
          />
        </Link>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm md:flex md:flex-wrap md:justify-self-center md:justify-center md:gap-x-nav-gap md:gap-y-2"
        >
          {FOOTER_NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <SurveyButton
          variant="secondary"
          compact
          className="w-full md:w-auto md:justify-self-end"
        />
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-wide px-gutter py-6 text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} {SITE_NAME} — {SITE_FULL_NAME}
        </p>
      </div>
    </footer>
  );
}
