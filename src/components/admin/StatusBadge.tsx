import type { EoiStatus } from "@/lib/admin/settings";

const LABELS: Record<EoiStatus, string> = {
  open: "Open",
  closed: "Closed",
  scheduled_for_deletion: "Scheduled for deletion",
  data_deleted: "Data deleted",
};

export default function StatusBadge({ status }: { status: EoiStatus }) {
  return (
    <span className="inline-flex items-center border border-ink px-3 py-1 text-sm font-medium text-ink">
      {LABELS[status]}
    </span>
  );
}
