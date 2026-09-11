import type { Metadata } from "next";
import LoginForm from "@/components/admin/LoginForm";
import { SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-full items-center justify-center bg-paper-alt px-gutter py-16">
      <div className="w-full max-w-sm border border-border bg-paper p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">
          {SITE_NAME} Admin
        </p>
        <h1 className="mt-2 text-subheading font-semibold text-ink">Sign in</h1>
        <LoginForm />
      </div>
    </div>
  );
}
