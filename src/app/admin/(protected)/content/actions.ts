"use server";

import { revalidatePath, updateTag } from "next/cache";
import { editorNameOf, requireAdminSession } from "@/lib/admin/session";
import { getPageDefinition, pageCacheTag } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";
import { CmsNotInstalledError, type PublishResult, type SaveResult } from "@/lib/cms/service";

export type ActionFailure = { ok: false; reason: "error"; message: string };
export type SaveDraftResult = SaveResult | ActionFailure;
export type PublishDraftResult = PublishResult | ActionFailure;

const NOT_FOUND = { ok: false, reason: "not_found", message: "This page can't be edited." } as const;

function isVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function failure(error: unknown, action: string): ActionFailure {
  if (error instanceof CmsNotInstalledError) {
    return { ok: false, reason: "error", message: "Content editing isn't set up on this server yet." };
  }
  console.error(`CMS ${action} failed:`, error);
  return {
    ok: false,
    reason: "error",
    message: "Something went wrong on the server. Your changes are still in the editor — please try again.",
  };
}

function revalidateAdmin(slug: string) {
  revalidatePath("/admin/content");
  revalidatePath(`/admin/content/pages/${slug}`);
}

/**
 * Saves the editor's content as the page's draft. Never touches the
 * published version, so the public site is unaffected.
 */
export async function saveDraft(slug: string, expectedVersion: number, content: unknown): Promise<SaveDraftResult> {
  const session = await requireAdminSession();
  const page = typeof slug === "string" ? getPageDefinition(slug) : undefined;
  if (!page || !isVersion(expectedVersion)) return NOT_FOUND;

  try {
    const result = await cms.saveDraft(page, { content, expectedVersion, author: editorNameOf(session) });
    if (result.ok) revalidateAdmin(page.slug);
    return result;
  } catch (error) {
    return failure(error, "save");
  }
}

/**
 * Publishes the saved draft — exactly the version the editor previewed —
 * and refreshes the public page.
 */
export async function publishDraft(slug: string, expectedVersion: number): Promise<PublishDraftResult> {
  const session = await requireAdminSession();
  const page = typeof slug === "string" ? getPageDefinition(slug) : undefined;
  if (!page || !isVersion(expectedVersion)) return NOT_FOUND;

  try {
    const result = await cms.publish(page, { expectedVersion, author: editorNameOf(session) });
    if (result.ok) {
      // Expire the cached content immediately (not stale-while-revalidate),
      // so the next visitor already sees what was just published.
      updateTag(pageCacheTag(page.slug));
      revalidatePath(page.path);
      revalidateAdmin(page.slug);
    }
    return result;
  } catch (error) {
    return failure(error, "publish");
  }
}

/** Copies an earlier version into the draft. Nothing goes live until it's published. */
export async function restoreRevision(
  slug: string,
  revisionNumber: number,
  expectedVersion: number
): Promise<SaveDraftResult> {
  const session = await requireAdminSession();
  const page = typeof slug === "string" ? getPageDefinition(slug) : undefined;
  if (!page || !isVersion(expectedVersion) || !isVersion(revisionNumber)) return NOT_FOUND;

  try {
    const result = await cms.restoreRevision(page, {
      revisionNumber,
      expectedVersion,
      author: editorNameOf(session),
    });
    if (result.ok) revalidateAdmin(page.slug);
    return result;
  } catch (error) {
    return failure(error, "restore");
  }
}
