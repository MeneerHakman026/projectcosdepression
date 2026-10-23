"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreRevision } from "@/app/admin/(protected)/content/actions";

type RestoreButtonProps = {
  slug: string;
  revisionNumber: number;
  expectedVersion: number;
};

export default function RestoreButton({ slug, revisionNumber, expectedVersion }: RestoreButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRestore() {
    const confirmed = window.confirm(
      `Copy version ${revisionNumber} into the draft? This replaces the current draft (it stays in the history). The live site won't change until you publish.`
    );
    if (!confirmed) return;

    setIsPending(true);
    setError(null);
    try {
      const result = await restoreRevision(slug, revisionNumber, expectedVersion);
      if (result.ok) {
        router.push(`/admin/content/pages/${slug}`);
      } else {
        setError(result.message);
        setIsPending(false);
      }
    } catch {
      setError("Couldn't reach the server. Try again.");
      setIsPending(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleRestore}
        disabled={isPending}
        className="btn btn-compact disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Restoring…" : "Restore"}
        <span className="sr-only"> version {revisionNumber}</span>
      </button>
      {error && (
        <p role="alert" className="mt-1 max-w-xs text-right text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
