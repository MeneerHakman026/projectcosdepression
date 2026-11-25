"use server";

import { revalidatePath, updateTag } from "next/cache";
import { editorNameOf, requireAdminSession } from "@/lib/admin/session";
import { canonicalLanguage } from "@/lib/dictionary/languages";
import { DICTIONARY_CACHE_TAG, dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError } from "@/lib/dictionary/service";

/** `notice` is a fixed code the overview page turns into a confirmation banner. */
export type DictionaryActionResult =
  | { ok: true; message: string; notice: string }
  | { ok: false; message: string };

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

const BAD_REQUEST: DictionaryActionResult = { ok: false, message: "That request isn't valid. Reload the page and try again." };

function failure(error: unknown, action: string): DictionaryActionResult {
  if (error instanceof DictionaryNotInstalledError) {
    return { ok: false, message: "The Outcome Dictionary isn't set up on this server yet." };
  }
  console.error(`Dictionary ${action} failed:`, error);
  return { ok: false, message: "Something went wrong on the server. Nothing was changed — please try again." };
}

function revalidateAdmin() {
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/dictionary", "layout");
}

/** Publishes exactly the draft the administrator reviewed, then refreshes the public dictionary. */
export async function publishDictionaryDraft(expectedVersion: number, draftNumber: number): Promise<DictionaryActionResult> {
  const session = await requireAdminSession();
  if (!isCount(expectedVersion) || !isCount(draftNumber)) return BAD_REQUEST;
  try {
    const result = await dictionary.publish({ expectedVersion, draftNumber, author: editorNameOf(session) });
    if (!result.ok) return { ok: false, message: result.message };
    // Expire immediately (not stale-while-revalidate) so the next visitor
    // already sees the new dataset; the layout covers /dictionary/<ID> too.
    updateTag(DICTIONARY_CACHE_TAG);
    revalidatePath("/dictionary", "layout");
    revalidateAdmin();
    return {
      ok: true,
      message: `Published. The live dictionary now shows version ${result.releaseNumber}.`,
      notice: `published=${result.releaseNumber}`,
    };
  } catch (error) {
    return failure(error, "publish");
  }
}

/** Stops treating the draft as the draft. It stays in the version history. */
export async function discardDictionaryDraft(expectedVersion: number, draftNumber: number): Promise<DictionaryActionResult> {
  await requireAdminSession();
  if (!isCount(expectedVersion) || !isCount(draftNumber)) return BAD_REQUEST;
  try {
    const result = await dictionary.discardDraft({ expectedVersion, draftNumber });
    if (!result.ok) return { ok: false, message: result.message };
    revalidateAdmin();
    return { ok: true, message: "Draft discarded. It's still listed in the version history.", notice: `discarded=${draftNumber}` };
  } catch (error) {
    return failure(error, "discard");
  }
}

/** Copies an earlier version into a new draft. Nothing goes live until it's published. */
export async function restoreDictionaryRelease(releaseNumber: number, expectedVersion: number): Promise<DictionaryActionResult> {
  const session = await requireAdminSession();
  if (!isCount(expectedVersion) || !isCount(releaseNumber)) return BAD_REQUEST;
  try {
    const result = await dictionary.restore({ releaseNumber, expectedVersion, author: editorNameOf(session) });
    if (!result.ok) return { ok: false, message: result.message };
    revalidateAdmin();
    return {
      ok: true,
      message: `Version ${releaseNumber} was copied into a new draft (version ${result.releaseNumber}). Preview it, then publish.`,
      notice: `restored=${releaseNumber}&draft=${result.releaseNumber}`,
    };
  } catch (error) {
    return failure(error, "restore");
  }
}

/** Creates a draft without one translation. Earlier versions keep it. */
export async function removeDictionaryLanguage(language: string, expectedVersion: number): Promise<DictionaryActionResult> {
  const session = await requireAdminSession();
  const code = typeof language === "string" ? canonicalLanguage(language) : null;
  if (!code || !isCount(expectedVersion)) return BAD_REQUEST;
  try {
    const result = await dictionary.removeLanguage({ language: code, expectedVersion, author: editorNameOf(session) });
    if (!result.ok) return { ok: false, message: result.message };
    revalidateAdmin();
    return {
      ok: true,
      message: `A new draft without ${code} was created (version ${result.releaseNumber}). Publish it to apply.`,
      notice: `removed=${code}&draft=${result.releaseNumber}`,
    };
  } catch (error) {
    return failure(error, "remove language");
  }
}
