import type { Metadata } from "next";
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

      <SettingsForm
        initialClosesAt={settings.closesAt ? settings.closesAt.toISOString().slice(0, 10) : ""}
        deletionDate={deletionDate}
      />
    </div>
  );
}
