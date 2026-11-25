import type { Metadata } from "next";
import Link from "next/link";
import { computeDeletionDate, getEoiSettings } from "@/lib/admin/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const settings = await getEoiSettings();
  const deletionDate = computeDeletionDate(settings.closesAt);

  return (
    <div>
      <h1 className="text-heading font-semibold text-ink">Settings</h1>
      <p className="mt-2 max-w-2xl text-body text-ink-muted">
        All Expression of Interest records will be permanently deleted 14 days after the EOI
        closing date.
      </p>

      <p className="mt-4 max-w-2xl text-sm text-ink-muted">
        The Expression of Interest button&apos;s text and where it leads (this site&apos;s registration page or
        an external study website) are managed in{" "}
        <Link href="/admin/content/pages/eoi-button" className="text-ink underline underline-offset-2">
          Content → Expression of Interest button
        </Link>
        .
      </p>

      <SettingsForm
        initialClosesAt={settings.closesAt ? settings.closesAt.toISOString().slice(0, 10) : ""}
        deletionDate={deletionDate}
      />
    </div>
  );
}
