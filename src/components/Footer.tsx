import Image from "next/image";
import Link from "next/link";
import { FOOTER_NAV, SITE_FULL_NAME, SITE_NAME } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-paper-alt">
      <div className="mx-auto flex max-w-wide flex-col gap-10 px-gutter py-composition-gap md:flex-row md:items-start md:justify-between md:gap-grid-gap">
        <Link href="/" className="shrink-0">
          <Image
            src="/cos-d-logo.png"
            alt={`${SITE_NAME} logo`}
            width={460}
            height={200}
            className="h-12 w-auto sm:h-14 md:h-[calc(var(--spacing-logo-h)*1.4)] mix-blend-multiply"
          />
        </Link>

        <nav
          aria-label="Footer"
          className="flex flex-col gap-y-3 text-sm md:grid md:auto-cols-max md:grid-flow-col md:grid-rows-4 md:gap-x-12 md:gap-y-3"
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
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-wide px-gutter py-6 text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} {SITE_NAME} — {SITE_FULL_NAME}
        </p>
      </div>
    </footer>
  );
}
