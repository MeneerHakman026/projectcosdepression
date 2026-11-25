import Link from "next/link";
import type { ReactNode } from "react";
import DictionaryNav from "@/components/admin/dictionary/DictionaryNav";

export default function DictionaryAdminLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <p className="text-sm">
        <Link href="/admin/content" className="text-ink-muted underline underline-offset-2 hover:text-ink">
          ← Content
        </Link>
        <span className="text-ink-muted"> / Outcome Dictionary data</span>
      </p>
      <DictionaryNav />
      <div className="mt-6">{children}</div>
    </div>
  );
}
