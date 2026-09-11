"use client";

import { useActionState } from "react";
import { updateEoiClosingDate } from "@/app/admin/(protected)/settings/actions";
import { formatDate } from "@/lib/admin/format";

type SettingsFormProps = {
  initialClosesAt: string;
  deletionDate: Date | null;
};

export default function SettingsForm({ initialClosesAt, deletionDate }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateEoiClosingDate, undefined);

  return (
    <form action={formAction} className="mt-8 max-w-xl space-y-6 border border-border bg-paper p-6">
      {state?.error && (
        <p role="alert" className="border border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="border border-border bg-paper-alt px-4 py-3 text-sm text-ink">
          Saved.
        </p>
      )}

      <div>
        <label htmlFor="closesAt" className="block text-sm font-medium text-ink">
          Expression of Interest closes
        </label>
        <input
          id="closesAt"
          name="closesAt"
          type="date"
          defaultValue={initialClosesAt}
          className="mt-2 w-full max-w-xs border border-border bg-paper px-4 py-2.5 text-body text-ink"
        />
      </div>

      <div>
        <span className="block text-sm font-medium text-ink">Data scheduled for deletion</span>
        <p className="mt-2 text-body text-ink">{formatDate(deletionDate)}</p>
      </div>

      <div>
        <span className="block text-sm font-medium text-ink">Retention period</span>
        <p className="mt-2 text-body text-ink">14 days (fixed)</p>
      </div>

      <p className="border-t border-border pt-4 text-sm text-ink-muted">
        All Expression of Interest records will be permanently deleted 14 days after the EOI
        closing date.
      </p>

      <button
        type="submit"
        className={`btn ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
        disabled={isPending}
      >
        {isPending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
