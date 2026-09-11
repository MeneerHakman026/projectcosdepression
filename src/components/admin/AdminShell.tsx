import type { ReactNode } from "react";
import { logoutAdmin } from "@/app/admin/(protected)/actions";
import { SITE_NAME } from "@/lib/site-config";
import AdminTabs from "./AdminTabs";

export default function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-paper-alt">
      <header className="border-b border-border bg-paper">
        <div className="mx-auto flex max-w-wide items-center justify-between gap-4 px-gutter py-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
            {SITE_NAME} Admin
          </p>
          <form action={logoutAdmin}>
            <button type="submit" className="btn btn-compact">
              Log out
            </button>
          </form>
        </div>
        <AdminTabs />
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-wide px-gutter py-10">{children}</div>
      </main>
    </div>
  );
}
