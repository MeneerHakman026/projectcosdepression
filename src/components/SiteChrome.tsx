"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type SiteChromeProps = {
  skipLink: ReactNode;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
};

/**
 * Hides the public marketing header/footer on /admin routes while keeping
 * Header and Footer as Server Components (rendered by the root layout and
 * passed in as children, rather than imported directly into this client
 * component) so they aren't pulled into the client bundle.
 */
export default function SiteChrome({ skipLink, header, footer, children }: SiteChromeProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  return (
    <>
      {!isAdmin && skipLink}
      {!isAdmin && header}
      <main id="main-content" className="flex-1">
        {children}
      </main>
      {!isAdmin && footer}
    </>
  );
}
