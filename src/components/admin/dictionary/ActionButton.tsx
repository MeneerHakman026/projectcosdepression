"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  discardDictionaryDraft,
  publishDictionaryDraft,
  removeDictionaryLanguage,
  restoreDictionaryRelease,
  type DictionaryActionResult,
} from "@/app/admin/(protected)/content/dictionary/actions";

type Action =
  | { kind: "publish"; expectedVersion: number; draftNumber: number }
  | { kind: "discard"; expectedVersion: number; draftNumber: number }
  | { kind: "restore"; expectedVersion: number; releaseNumber: number }
  | { kind: "removeLanguage"; expectedVersion: number; language: string };

type ActionButtonProps = {
  action: Action;
  label: string;
  pendingLabel: string;
  confirm: string;
  variant?: "primary" | "default" | "quiet";
  srLabel?: string;
};

function run(action: Action): Promise<DictionaryActionResult> {
  switch (action.kind) {
    case "publish":
      return publishDictionaryDraft(action.expectedVersion, action.draftNumber);
    case "discard":
      return discardDictionaryDraft(action.expectedVersion, action.draftNumber);
    case "restore":
      return restoreDictionaryRelease(action.releaseNumber, action.expectedVersion);
    case "removeLanguage":
      return removeDictionaryLanguage(action.language, action.expectedVersion);
  }
}

/**
 * Confirms, runs the action, then goes to the dictionary overview with a
 * confirmation banner. (The button itself may disappear after success —
 * e.g. "Publish draft" once there's no draft — so it can't hold the message.)
 */
export default function ActionButton({ action, label, pendingLabel, confirm, variant = "default", srLabel }: ActionButtonProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DictionaryActionResult | null>(null);

  async function handleClick() {
    if (!window.confirm(confirm)) return;
    setPending(true);
    setResult(null);
    try {
      const outcome = await run(action);
      setResult(outcome);
      if (outcome.ok) {
        startTransition(() => {
          router.push(`/admin/content/dictionary?${outcome.notice}`);
          router.refresh();
        });
      }
    } catch {
      setResult({ ok: false, message: "Couldn't reach the server. Nothing was changed — try again." });
    } finally {
      setPending(false);
    }
  }

  const classes =
    variant === "primary"
      ? "btn btn-primary"
      : variant === "quiet"
        ? "text-sm font-semibold text-accent underline underline-offset-2 hover:text-ink"
        : "btn btn-compact";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button type="button" onClick={handleClick} disabled={pending} className={`${classes} disabled:cursor-not-allowed disabled:opacity-50`}>
        {pending ? pendingLabel : label}
        {srLabel && <span className="sr-only"> {srLabel}</span>}
      </button>
      {result && (
        <span role={result.ok ? "status" : "alert"} className={`max-w-sm text-xs ${result.ok ? "text-ink" : "text-red-700"}`}>
          {result.message}
        </span>
      )}
    </span>
  );
}
