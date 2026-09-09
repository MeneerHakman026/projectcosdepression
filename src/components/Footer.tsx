import Image from "next/image";
import Link from "next/link";
import SurveyButton from "./SurveyButton";
import { FOOTER_NAV, SITE_FULL_NAME, SITE_NAME } from "@/lib/site-config";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-paper-alt">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between 3xl:max-w-7xl 4xl:max-w-[100rem]">
        <div className="max-w-xs">
          <Link href="/">
            <Image
              src="/cos-d-logo.png"
              alt={`${SITE_NAME} logo`}
              width={1150}
              height={500}
              className="h-9 w-auto mix-blend-multiply"
            />
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            {SITE_FULL_NAME}
          </p>
        </div>

        <nav
          aria-label="Footer"
          className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3"
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

        <SurveyButton compact className="w-full shrink-0 md:w-auto" />
      </div>

      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs text-ink-muted sm:px-6 3xl:max-w-7xl 4xl:max-w-[100rem]">
          &copy; {new Date().getFullYear()} {SITE_NAME} — {SITE_FULL_NAME}
        </p>
      </div>
    </footer>
  );
}
