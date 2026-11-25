"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/admin/content/dictionary", label: "Overview", match: (path: string) => path === "/admin/content/dictionary" },
  { href: "/admin/content/dictionary/data", label: "Inspect data", match: (path: string) => path.startsWith("/admin/content/dictionary/data") },
  { href: "/admin/content/dictionary/import", label: "Import Excel", match: (path: string) => path.startsWith("/admin/content/dictionary/import") },
  {
    href: "/admin/content/dictionary/history",
    label: "Version history",
    match: (path: string) => path.startsWith("/admin/content/dictionary/history") || path.startsWith("/admin/content/dictionary/compare"),
  },
];

/** Sub-navigation shared by every Outcome Dictionary admin page. */
export default function DictionaryNav() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Outcome Dictionary" className="mt-3 border-b border-border">
      <ul className="flex gap-1 overflow-x-auto">
        {SECTIONS.map((section) => {
          const active = section.match(pathname);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                aria-current={active ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                  active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {section.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
