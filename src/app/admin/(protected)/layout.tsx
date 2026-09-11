import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdminSession } from "@/lib/admin/session";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AdminProtectedLayout({ children }: { children: ReactNode }) {
  await requireAdminSession();
  return <AdminShell>{children}</AdminShell>;
}
