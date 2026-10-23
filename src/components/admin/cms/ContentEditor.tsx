"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { publishDraft, saveDraft } from "@/app/admin/(protected)/content/actions";
import { formatDateTime } from "@/lib/admin/format";
import { getIn, setIn, type ContentPath } from "@/lib/cms/paths";
import type { PageStatus } from "@/lib/cms/service";
import type { FieldErrors } from "@/lib/cms/validation";
import PageStatusBadge, { PAGE_STATUS_DESCRIPTIONS } from "./PageStatusBadge";

type EditorContextValue = {
  get: (path: ContentPath) => unknown;
  set: (path: ContentPath, value: unknown) => void;
  errorsFor: (path: ContentPath) => string[];
  /** Whether any error sits at or below this path (to flag collapsed sections). */
  hasErrorsWithin: (path: ContentPath) => boolean;
  disabled: boolean;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor(): EditorContextValue {
  const context = useContext(EditorContext);
  if (!context) throw new Error("useEditor must be used inside <ContentEditor>.");
  return context;
}

export function fieldId(path: ContentPath): string {
  return `field-${path.replace(/\./g, "-")}`;
}

type Notice = { tone: "success" | "error"; text: string; conflict?: boolean } | null;

export type ContentEditorProps = {
  slug: string;
  pageName: string;
  pagePath: string;
  initialContent: unknown;
  initialVersion: number;
  initialStatus: PageStatus;
  draftSavedAt: string | null;
  draftSavedBy: string | null;
  contentError: string | null;
  /** Who is signed in; saves made in this session are attributed to them. */
  editorName: string;
  children: ReactNode;
};

/**
 * Generic editing shell: holds the content being edited, tracks unsaved
 * changes, and runs Save draft / Publish against the server actions. Page-
 * specific editors (e.g. HomeEditor) supply only the fields as children.
 */
export default function ContentEditor({
  slug,
  pageName,
  pagePath,
  initialContent,
  initialVersion,
  initialStatus,
  draftSavedAt,
  draftSavedBy,
  contentError,
  editorName,
  children,
}: ContentEditorProps) {
  const router = useRouter();
  const [content, setContent] = useState<unknown>(initialContent);
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(initialContent));
  const [version, setVersion] = useState(initialVersion);
  const [status, setStatus] = useState<PageStatus>(initialStatus);
  const [lastSaved, setLastSaved] = useState({ at: draftSavedAt, by: draftSavedBy });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice>(
    contentError ? { tone: "error", text: `${contentError} The original built-in content is shown instead.` } : null
  );
  const [pendingAction, setPendingAction] = useState<"save" | "publish" | null>(null);
  const [, startTransition] = useTransition();

  const isDirty = useMemo(() => JSON.stringify(content) !== savedSnapshot, [content, savedSnapshot]);
  const isBusy = pendingAction !== null;

  // Warn before losing unsaved work: closing/reloading the tab, or clicking
  // any link in the admin (Next.js has no route-change blocking API, so
  // link clicks are intercepted before Next's own handler sees them).
  useEffect(() => {
    if (!isDirty) return;
    const message = "You have unsaved changes. Leave this page and lose them?";
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      const href = anchor?.getAttribute("href") ?? "";
      if (!anchor || anchor.getAttribute("target") === "_blank" || href.startsWith("#")) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [isDirty]);

  const set = useCallback((path: ContentPath, value: unknown) => {
    setContent((current: unknown) => setIn(current, path, value));
  }, []);

  const contextValue = useMemo<EditorContextValue>(
    () => ({
      get: (path) => getIn(content, path),
      set,
      errorsFor: (path) => fieldErrors[path] ?? [],
      hasErrorsWithin: (path) =>
        Object.keys(fieldErrors).some((key) => key === path || key.startsWith(`${path}.`)),
      disabled: isBusy,
    }),
    [content, set, fieldErrors, isBusy]
  );

  async function handleSave() {
    setPendingAction("save");
    setNotice(null);
    const submitted = content;
    try {
      const result = await saveDraft(slug, version, submitted);
      if (result.ok) {
        setVersion(result.version);
        setSavedSnapshot(JSON.stringify(submitted));
        setFieldErrors({});
        setStatus((current) => (current === "default" || current === "draft_only" ? "draft_only" : "changes_pending"));
        setLastSaved({ at: result.savedAt, by: editorName });
        setNotice({ tone: "success", text: "Draft saved. The live site hasn't changed — preview, then publish when ready." });
        startTransition(() => router.refresh());
      } else {
        setFieldErrors(result.reason === "invalid" ? result.fieldErrors : {});
        setNotice({ tone: "error", text: result.message, conflict: result.reason === "conflict" });
      }
    } catch {
      setNotice({ tone: "error", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handlePublish() {
    if (!window.confirm(`Publish the saved draft of the ${pageName.toLowerCase()} to the live website?`)) return;
    setPendingAction("publish");
    setNotice(null);
    try {
      const result = await publishDraft(slug, version);
      if (result.ok) {
        setStatus("published");
        setNotice({ tone: "success", text: `Published. The live page now shows version ${result.revisionNumber}.` });
        startTransition(() => router.refresh());
      } else {
        setFieldErrors(result.reason === "invalid" ? result.fieldErrors : {});
        setNotice({ tone: "error", text: result.message, conflict: result.reason === "conflict" });
      }
    } catch {
      setNotice({ tone: "error", text: "Couldn't reach the server. Check your connection and try again." });
    } finally {
      setPendingAction(null);
    }
  }

  const errorEntries = Object.entries(fieldErrors);
  const canPublish = !isDirty && !isBusy && (status === "draft_only" || status === "changes_pending");
  const canPreview = !isDirty && version > 0;

  return (
    <EditorContext.Provider value={contextValue}>
      <div className="sticky top-0 z-30 -mx-gutter border-b border-border bg-paper/95 px-gutter py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <PageStatusBadge status={status} />
              {isDirty && (
                <span className="font-medium text-ink" role="status">
                  Unsaved changes
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              {lastSaved.at
                ? `Draft last saved ${formatDateTime(lastSaved.at)}${lastSaved.by ? ` by ${lastSaved.by}` : ""}`
                : "No draft saved yet"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isBusy}
              className="btn btn-compact disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "save" ? "Saving…" : "Save draft"}
            </button>
            {canPreview ? (
              <a
                href={`/admin/preview/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-compact"
              >
                Preview<span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span
                className="btn btn-compact cursor-not-allowed opacity-50"
                aria-disabled="true"
                title={isDirty ? "Save your changes to preview them" : "Save a draft to preview it"}
              >
                Preview
              </span>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={!canPublish}
              title={isDirty ? "Save your changes before publishing" : undefined}
              className="btn btn-primary btn-compact disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pendingAction === "publish" ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-3xl text-sm text-ink-muted">
        {PAGE_STATUS_DESCRIPTIONS[status]}{" "}
        <Link href={`/admin/content/pages/${slug}/history`} className="text-ink underline underline-offset-2">
          Version history
        </Link>{" "}
        ·{" "}
        <a href={pagePath} target="_blank" rel="noopener noreferrer" className="text-ink underline underline-offset-2">
          View live page<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </p>

      <div aria-live="polite">
        {notice && (
          <div
            role={notice.tone === "error" ? "alert" : "status"}
            className={`mt-6 border px-4 py-3 text-sm ${
              notice.tone === "error" ? "border-red-600 bg-red-50 text-red-700" : "border-border bg-paper-alt text-ink"
            }`}
          >
            <p>{notice.text}</p>
            {errorEntries.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errorEntries.slice(0, 8).map(([path, messages]) => (
                  <li key={path}>
                    <a href={`#${fieldId(path)}`} className="underline underline-offset-2">
                      {messages[0]}
                    </a>
                  </li>
                ))}
                {errorEntries.length > 8 && <li>…and {errorEntries.length - 8} more.</li>}
              </ul>
            )}
            {notice.conflict && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-compact mt-3 border-red-700 text-red-700"
              >
                Reload latest version
              </button>
            )}
          </div>
        )}
      </div>

      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (isDirty && !isBusy) handleSave();
        }}
      >
        {children}
      </form>
    </EditorContext.Provider>
  );
}
