import type { PageStatus } from "@/lib/cms/service";

const LABELS: Record<PageStatus, string> = {
  default: "Built-in content",
  draft_only: "Draft, never published",
  changes_pending: "Published · unpublished changes",
  published: "Published",
};

export const PAGE_STATUS_DESCRIPTIONS: Record<PageStatus, string> = {
  default: "The live page shows its original built-in content. Nothing has been saved here yet.",
  draft_only: "A draft is saved, but the live page still shows its original built-in content.",
  changes_pending: "The live page shows the last published version. A newer draft is saved but not published.",
  published: "The live page shows the latest saved version.",
};

export default function PageStatusBadge({ status }: { status: PageStatus }) {
  const emphasis = status === "changes_pending" || status === "draft_only";
  return (
    <span
      className={`inline-flex items-center border px-2.5 py-0.5 text-xs font-medium ${
        emphasis ? "border-accent bg-accent-soft/30 text-ink" : "border-ink text-ink"
      }`}
    >
      {LABELS[status]}
    </span>
  );
}
