"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/eoi", label: "EOI" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin sections" className="border-t border-border">
      <ul className="mx-auto flex max-w-wide gap-1 overflow-x-auto px-gutter">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/admin" ? pathname === "/admin" : pathname?.startsWith(tab.href) ?? false;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-accent text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
