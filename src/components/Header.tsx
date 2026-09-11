import Image from "next/image";
import Link from "next/link";
import MobileNav from "./MobileNav";
import SurveyButton from "./SurveyButton";
import { PRIMARY_NAV, SITE_NAME } from "@/lib/site-config";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-paper">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-header-y sm:px-gutter-header">
        <Link href="/" className="col-start-1 shrink-0 justify-self-start">
          <Image
            src="/cos-d-logo-mark.png"
            alt={`${SITE_NAME} logo`}
            width={460}
            height={200}
            priority
            className="h-12 w-auto md:h-12 xl:h-logo-h"
          />
        </Link>

        <nav aria-label="Primary" className="col-start-2 hidden justify-self-center lg:block">
          <ul className="flex items-center gap-nav-gap text-body font-medium">
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

        <div className="col-start-3 ml-auto flex items-center justify-self-end gap-2">
          <SurveyButton compact className="sm:hidden" />
          <SurveyButton className="hidden sm:inline-flex" />
          <MobileNav links={PRIMARY_NAV} />
        </div>
      </div>
    </header>
  );
}
