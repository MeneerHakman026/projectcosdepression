import type { Metadata } from "next";
import { fetchEoiOverviewStats } from "@/lib/admin/eoi";
import { computeEoiStatus } from "@/lib/admin/settings";
import { formatDate } from "@/lib/admin/format";
import StatusBadge from "@/components/admin/StatusBadge";

export const metadata: Metadata = { title: "Overview" };

export default async function AdminOverviewPage() {
  const [stats, statusInfo] = await Promise.all([fetchEoiOverviewStats(), computeEoiStatus()]);

  const summaryItems = [
    { label: "Total EOI submissions", value: stats.total.toLocaleString("en-GB") },
    { label: "Submissions in the last 7 days", value: stats.last7Days.toLocaleString("en-GB") },
    { label: "Most common preferred language", value: stats.topLanguage ?? "—" },
    { label: "Most common age group", value: stats.topAgeGroup ?? "—" },
  ];

  return (
    <div>
      <h1 className="text-heading font-semibold text-ink">Overview</h1>

      <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        {summaryItems.map((item) => (
          <div key={item.label} className="border border-border bg-paper p-5">
            <dt className="text-sm text-ink-muted">{item.label}</dt>
            <dd className="mt-1 text-subheading font-semibold text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-subheading font-semibold text-ink">Expression of Interest status</h2>
        <dl className="mt-4 space-y-3 text-body">
          <div className="flex flex-wrap items-center gap-3">
            <dt className="text-ink-muted">Current status</dt>
            <dd>
              <StatusBadge status={statusInfo.status} />
            </dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-ink-muted">EOI closing date:</dt>
            <dd className="text-ink">{formatDate(statusInfo.closesAt)}</dd>
          </div>
          <div className="flex flex-wrap gap-2">
            <dt className="text-ink-muted">Scheduled deletion date:</dt>
            <dd className="text-ink">{formatDate(statusInfo.deletionDate)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
