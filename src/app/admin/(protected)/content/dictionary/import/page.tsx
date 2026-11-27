import type { Metadata } from "next";
import Link from "next/link";
import ImportWizard from "@/components/admin/dictionary/ImportWizard";
import { languageName } from "@/lib/dictionary/languages";
import { participantRoleCodes } from "@/lib/dictionary/roles";
import { dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError, type DictionaryState } from "@/lib/dictionary/service";
import { MAX_UPLOAD_BYTES } from "@/lib/dictionary/xlsx-read";

export const metadata: Metadata = { title: "Import Outcome Dictionary" };

export default async function DictionaryImportPage() {
  let state: DictionaryState | null = null;
  try {
    state = await dictionary.getState();
  } catch (error) {
    if (!(error instanceof DictionaryNotInstalledError)) throw error;
  }
  const current = state?.draft ?? state?.published;
  const roleCodes = await participantRoleCodes();
  const languages = Object.keys(current?.summary.languages ?? {})
    .sort()
    .map((code) => ({ code, name: languageName(code) }));

  return (
    <div>
      <h1 className="text-heading font-semibold text-ink">Import from Excel</h1>
      <div className="mt-3 max-w-3xl space-y-2 text-body text-ink-muted">
        <p>
          <strong className="text-ink">English master:</strong> the workbook becomes the complete new dictionary. Outcomes not
          in it are removed; categories and group domains are rebuilt from its rows. Existing translations are kept for the
          outcomes that remain.
        </p>
        <p>
          <strong className="text-ink">Translation:</strong> replaces one language only, matched to the English outcomes by
          Variable ID. A translation can&apos;t add or remove outcomes or change the categories.
        </p>
        <p className="text-sm">
          The first row must have the headers Variable, Category, Group Domain, Outcome Domain, Definition, Experience and
          Verbatims. Text is imported exactly as written.{" "}
          <a href="/admin/content/dictionary/export?scope=blank" className="font-semibold text-ink underline underline-offset-2">
            Download the Excel template
          </a>{" "}
          if you&apos;re starting a new workbook
          {current ? (
            <>
              , or a{" "}
              <Link href="/admin/content/dictionary#export" className="font-semibold text-ink underline underline-offset-2">
                translation template
              </Link>
            </>
          ) : null}
          .
        </p>
      </div>

      {state === null ? (
        <p role="alert" className="mt-8 border border-dashed border-border bg-paper p-6 text-body text-ink">
          The Outcome Dictionary isn&apos;t set up yet (database migration 003).
        </p>
      ) : (
        <div className="mt-8">
          <ImportWizard languages={languages} maxBytes={MAX_UPLOAD_BYTES} hasDraft={state.draft !== null} roleCodes={roleCodes} />
        </div>
      )}
    </div>
  );
}
