import Image from "next/image";
import Link from "next/link";
import MobileNav from "./MobileNav";
import SurveyButton from "./SurveyButton";
import { PRIMARY_NAV, SITE_NAME } from "@/lib/site-config";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 3xl:max-w-7xl 4xl:max-w-[100rem]">
        <Link href="/" className="shrink-0">
          <Image
            src="/cos-d-logo.png"
            alt={`${SITE_NAME} logo`}
            width={1150}
            height={500}
            priority
            className="h-9 w-auto mix-blend-multiply sm:h-10"
          />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-7 text-sm font-medium">
            {PRIMARY_NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-ink-muted transition-colors hover:text-ink"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <SurveyButton compact className="sm:hidden">
            Survey
          </SurveyButton>
          <SurveyButton className="hidden sm:inline-flex">
            Take the survey
          </SurveyButton>
          <MobileNav links={PRIMARY_NAV} />
        </div>
      </div>
    </header>
  );
}
