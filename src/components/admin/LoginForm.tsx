"use client";

import { useActionState } from "react";
import { loginAdmin } from "@/app/admin/login/actions";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAdmin, undefined);

  return (
    <form action={formAction} className="mt-6 space-y-5" noValidate>
      {state?.error && (
        <p
          role="alert"
          className="border border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.error}
        </p>
      )}

      <div>
        <label htmlFor="editorName" className="block text-sm font-medium text-ink">
          Your name
        </label>
        <p id="editorName-hint" className="mt-1 text-sm text-ink-muted">
          Shown next to content changes you save or publish.
        </p>
        <input
          id="editorName"
          name="editorName"
          type="text"
          autoComplete="name"
          maxLength={60}
          aria-describedby="editorName-hint"
          className="mt-2 w-full border border-border bg-paper px-4 py-3 text-body text-ink"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full border border-border bg-paper px-4 py-3 text-body text-ink"
        />
      </div>

      <button
        type="submit"
        className={`btn btn-primary w-full ${isPending ? "cursor-not-allowed opacity-60" : ""}`}
        disabled={isPending}
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
