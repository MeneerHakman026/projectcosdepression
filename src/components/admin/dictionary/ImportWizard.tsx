"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { UploadResponse } from "@/app/admin/(protected)/content/dictionary/import/upload/route";
import type { ImportIssue } from "@/lib/dictionary/import";
import type { ImportPreview } from "@/lib/dictionary/pipeline";
import DiffView, { Alerts } from "./DiffView";

type LanguageOption = { code: string; name: string };

type ImportWizardProps = {
  languages: LanguageOption[];
  maxBytes: number;
  hasDraft: boolean;
};

type Phase = "idle" | "checking" | "preview" | "saving" | "saved";

const LEVEL_STYLES: Record<ImportIssue["level"], string> = {
  error: "border-red-700 bg-red-50 text-red-900",
  warning: "border-amber-600 bg-amber-50 text-amber-950",
  info: "border-border bg-paper text-ink",
};

function IssueGroup({ level, issues, title, open }: { level: ImportIssue["level"]; issues: ImportIssue[]; title: string; open?: boolean }) {
  if (issues.length === 0) return null;
  return (
    <details open={open} className="border border-border bg-paper">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
        {title} <span className="tabular-nums text-ink-muted">({issues.length})</span>
      </summary>
      <ul className="space-y-1.5 border-t border-border px-4 py-3">
        {issues.map((issue, index) => (
          <li key={index} className={`border-l-4 px-3 py-2 text-sm ${LEVEL_STYLES[level]}`}>
            {(issue.sheet || issue.row) && (
              <span className="mr-2 font-mono text-xs opacity-80">
                {issue.sheet ? `“${issue.sheet}”` : ""}
                {issue.row ? ` row ${issue.row}` : ""}
              </span>
            )}
            {issue.message}
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ImportWizard({ languages, maxBytes, hasDraft }: ImportWizardProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState("en");
  const [otherLanguage, setOtherLanguage] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [inputKey, setInputKey] = useState(0);

  const chosenLanguage = language === "other" ? otherLanguage.trim() : language;

  function reset(nextFile: File | null) {
    if (nextFile === null) setInputKey((key) => key + 1);
    setFile(nextFile);
    setPreview(null);
    setMessage(null);
    setAcknowledged(false);
    setPhase("idle");
  }

  async function send(intent: "preview" | "save"): Promise<UploadResponse> {
    const params = new URLSearchParams({ intent, language: chosenLanguage, fileName: file!.name });
    if (intent === "save" && preview) {
      params.set("fileSha256", preview.file.sha256);
      params.set("expectedVersion", String(preview.stateVersion));
      if (acknowledged) params.set("acknowledged", "1");
    }
    const response = await fetch(`/admin/content/dictionary/import/upload?${params}`, {
      method: "POST",
      body: file,
      headers: { "x-cosd-admin": "1", "content-type": "application/octet-stream" },
    });
    try {
      return (await response.json()) as UploadResponse;
    } catch {
      return { kind: "error", message: response.status === 413 ? "The file is too large." : "The server didn't respond as expected." };
    }
  }

  async function check() {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) {
      setMessage({ tone: "error", text: "Choose an Excel workbook (.xlsx). Older .xls files must be saved as .xlsx first." });
      return;
    }
    if (file.size > maxBytes) {
      setMessage({ tone: "error", text: `The file is larger than ${maxBytes / 1024 / 1024} MB.` });
      return;
    }
    if (!chosenLanguage) {
      setMessage({ tone: "error", text: "Enter the language code of the translation, for example “fr”." });
      return;
    }
    setPhase("checking");
    setMessage(null);
    setAcknowledged(false);
    try {
      const result = await send("preview");
      if (result.kind === "preview") {
        setPreview(result.preview);
        setPhase("preview");
      } else {
        setPreview(result.kind === "error" ? result.preview ?? null : null);
        setMessage({ tone: "error", text: result.kind === "error" ? result.message : "Unexpected response." });
        setPhase(result.kind === "error" && result.preview ? "preview" : "idle");
      }
    } catch {
      setMessage({ tone: "error", text: "Couldn't reach the server. Check your connection and try again." });
      setPhase("idle");
    }
  }

  async function save() {
    if (!file || !preview) return;
    setPhase("saving");
    setMessage(null);
    try {
      const result = await send("save");
      if (result.kind === "saved") {
        setMessage({ tone: "success", text: result.message });
        setPhase("saved");
        startTransition(() => router.refresh());
      } else {
        if (result.kind === "error" && result.preview) setPreview(result.preview);
        setAcknowledged(false);
        setMessage({ tone: "error", text: result.kind === "error" ? result.message : "Unexpected response." });
        setPhase("preview");
      }
    } catch {
      setMessage({ tone: "error", text: "Couldn't reach the server. Nothing was saved — try again." });
      setPhase("preview");
    }
  }

  const issues = preview?.issues ?? [];
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const infos = issues.filter((i) => i.level === "info");
  const canSave =
    phase === "preview" && preview?.ok && !preview.unchanged && (!preview.needsAcknowledgement || acknowledged);

  return (
    <div className="space-y-8">
      {/* Step 1: choose */}
      <section aria-labelledby="import-step-1" className="border border-border bg-paper p-5">
        <h2 id="import-step-1" className="text-body font-semibold text-ink">
          1. Choose the workbook
        </h2>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="import-file" className="block text-sm font-medium text-ink">
              Excel file (.xlsx, up to {maxBytes / 1024 / 1024} MB)
            </label>
            <input
              key={inputKey}
              id="import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={phase === "checking" || phase === "saving"}
              onChange={(event) => reset(event.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm text-ink file:mr-3 file:border file:border-ink file:bg-paper file:px-3 file:py-1.5 file:text-sm file:font-semibold hover:file:bg-ink hover:file:text-paper"
            />
          </div>
          <div>
            <label htmlFor="import-language" className="block text-sm font-medium text-ink">
              What does it contain?
            </label>
            <select
              id="import-language"
              value={language}
              onChange={(event) => {
                setLanguage(event.target.value);
                setPreview(null);
                setPhase("idle");
              }}
              disabled={phase === "checking" || phase === "saving"}
              className="mt-2 w-full border border-border bg-paper px-3 py-2 text-sm text-ink"
            >
              <option value="en">English master — replaces the whole dictionary</option>
              {languages.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.name} translation ({l.code}) — replaces this language
                </option>
              ))}
              <option value="other">Another language (new translation)…</option>
            </select>
            {language === "other" && (
              <div className="mt-2">
                <label htmlFor="import-language-code" className="block text-xs text-ink-muted">
                  Language code (for example fr, nl, de, pt-BR)
                </label>
                <input
                  id="import-language-code"
                  value={otherLanguage}
                  onChange={(event) => setOtherLanguage(event.target.value)}
                  className="mt-1 w-40 border border-border bg-paper px-2 py-1.5 text-sm"
                  maxLength={20}
                />
              </div>
            )}
            <p className="mt-2 text-xs text-ink-muted">
              Workbooks exported from here (one sheet per language, named en, fr, …) are recognised automatically; this choice is
              used for single-sheet files.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={check}
            disabled={!file || phase === "checking" || phase === "saving"}
            className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {phase === "checking" ? "Checking…" : "Check file"}
          </button>
          <p className="text-xs text-ink-muted">Checking validates and compares the file. Nothing is saved and the website doesn&apos;t change.</p>
        </div>
      </section>

      {message && (
        <p
          role={message.tone === "error" ? "alert" : "status"}
          className={`border-l-4 px-4 py-3 text-body ${
            message.tone === "error" ? "border-red-700 bg-red-50 text-red-900" : "border-accent bg-accent-soft/30 text-ink"
          }`}
        >
          {message.text}
        </p>
      )}

      {phase === "saved" && (
        <div className="flex flex-wrap gap-3">
          <a href="/admin/preview/dictionary?dataset=draft" target="_blank" rel="noopener noreferrer" className="btn btn-primary">
            Preview the draft<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <Link href="/admin/content/dictionary" className="btn">
            Go to the Outcome Dictionary overview
          </Link>
        </div>
      )}

      {/* Step 2: review */}
      {preview && phase !== "saved" && (
        <section aria-labelledby="import-step-2" className="space-y-5">
          <h2 id="import-step-2" className="text-body font-semibold text-ink">
            2. Review
          </h2>

          <div
            className={`border-l-4 px-4 py-3 ${preview.ok ? "border-accent bg-accent-soft/20" : "border-red-700 bg-red-50"}`}
            role={preview.ok ? "status" : "alert"}
          >
            <p className="font-semibold text-ink">
              {!preview.ok
                ? `This file can't be imported: ${errors.length} problem${errors.length === 1 ? "" : "s"} to fix in Excel. Nothing has changed.`
                : preview.unchanged
                  ? "This file contains no changes. There's nothing to save."
                  : "The file is valid and ready to be saved as a draft."}
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              {preview.file.name} · {(preview.file.size / 1024).toFixed(0)} KB ·{" "}
              {preview.replaces.length > 0
                ? `replaces ${preview.replaces.map((code) => (code === "en" ? "the English master" : code)).join(" and ")}`
                : "nothing to replace"}
              {preview.basedOn.kind === "draft" && ` · builds on the unpublished draft (version ${preview.basedOn.releaseNumber})`}
            </p>
          </div>

          {preview.sheets.length > 0 && (
            <div className="overflow-x-auto border border-border bg-paper">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">How each sheet is read</caption>
                <thead className="bg-paper-alt">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-semibold">Sheet</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Read as</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sheets.map((sheet) => (
                    <tr key={sheet.name} className="border-t border-border">
                      <td className="px-4 py-2 font-mono text-xs">{sheet.name}</td>
                      <td className="px-4 py-2">
                        {sheet.role === "master"
                          ? "English master"
                          : sheet.role === "translation"
                            ? `Translation (${sheet.language})`
                            : `Ignored${sheet.note ? ` — ${sheet.note}` : ""}`}
                      </td>
                      <td className="px-4 py-2 tabular-nums">{sheet.role === "ignored" ? "—" : sheet.rows}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="space-y-2">
            <IssueGroup level="error" issues={errors} title="Errors — must be fixed" open />
            <IssueGroup level="warning" issues={warnings} title="Warnings — check before saving" open={warnings.length <= 8} />
            <IssueGroup level="info" issues={infos} title="Notes" />
          </div>

          {preview.ok && preview.diff && (
            <>
              <Alerts alerts={preview.alerts} />
              <div className="border border-border bg-paper-alt p-4">
                <h3 className="mb-3 text-body font-semibold text-ink">Changes compared with the live dictionary</h3>
                <DiffView diff={preview.diff} beforeLabel="Live now" afterLabel="After this import" />
              </div>
            </>
          )}

          {preview.ok && !preview.unchanged && (
            <section aria-labelledby="import-step-3" className="border border-border bg-paper p-5">
              <h2 id="import-step-3" className="text-body font-semibold text-ink">
                3. Save as draft
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Saving creates a new draft version{hasDraft ? " that replaces the current unpublished draft (which stays in the history)" : ""}.
                The live dictionary only changes when you publish.
              </p>
              {preview.needsAcknowledgement && (
                <label className="mt-4 flex items-start gap-3 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(event) => setAcknowledged(event.target.checked)}
                    className="mt-1 accent-[var(--teal-deep)]"
                  />
                  <span>I have reviewed the outcomes, categories or translations that will be removed, and the removal is intended.</span>
                </label>
              )}
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={save} disabled={!canSave} className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50">
                  {phase === "saving" ? "Saving…" : "Save as draft"}
                </button>
                <button type="button" onClick={() => reset(null)} disabled={phase === "saving"} className="btn">
                  Cancel
                </button>
              </div>
            </section>
          )}
        </section>
      )}
    </div>
  );
}
