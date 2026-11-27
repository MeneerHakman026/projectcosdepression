import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, readSessionToken } from "@/lib/admin/auth";
import { editorNameOf } from "@/lib/admin/session";
import { canonicalLanguage } from "@/lib/dictionary/languages";
import { MASTER_LANGUAGE } from "@/lib/dictionary/model";
import { prepareImport, type ImportPreview } from "@/lib/dictionary/pipeline";
import { participantRoleCodes } from "@/lib/dictionary/roles";
import { dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError } from "@/lib/dictionary/service";
import { MAX_UPLOAD_BYTES } from "@/lib/dictionary/xlsx-read";

/**
 * Excel import, in two calls with the same file:
 *   POST ?intent=preview — validate and compare; nothing is stored.
 *   POST ?intent=save    — redo exactly the same work and save it as a draft,
 *                          only if the file and the dictionary are unchanged
 *                          since the preview.
 * The workbook is sent as the raw request body and is never stored; only
 * the parsed dataset and the file's name, size and sha256 are kept.
 */

export const dynamic = "force-dynamic";

export type UploadResponse =
  | { kind: "preview"; preview: ImportPreview }
  | { kind: "saved"; releaseNumber: number; message: string }
  | { kind: "error"; message: string; preview?: ImportPreview };

function json(body: UploadResponse, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function error(message: string, status: number, preview?: ImportPreview) {
  return json({ kind: "error", message, preview }, status);
}

/** Reads the body with a hard size limit, even if Content-Length is missing or wrong. */
async function readLimitedBody(request: NextRequest): Promise<Uint8Array | null> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_UPLOAD_BYTES) return null;
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_UPLOAD_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function cleanFileName(name: string | null): string {
  const base = (name ?? "").split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, 200) || "workbook.xlsx";
}

/** Same-origin check in addition to the session cookie (SameSite=Lax) and the custom header. */
function isSameOrigin(request: NextRequest): boolean {
  if (request.headers.get("x-cosd-admin") !== "1") return false;
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return false;
  const origin = request.headers.get("origin");
  return !origin || origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const session = readSessionToken((await cookies()).get(SESSION_COOKIE_NAME)?.value);
  if (!session) return error("Your admin session has expired. Sign in again, then retry.", 401);
  if (!isSameOrigin(request)) return error("This request wasn't sent from the admin page.", 403);

  const params = request.nextUrl.searchParams;
  const intent = params.get("intent");
  if (intent !== "preview" && intent !== "save") return error("Unknown request.", 400);
  const language = canonicalLanguage(params.get("language") ?? MASTER_LANGUAGE);
  if (!language) return error("Choose a valid language code, for example “fr” or “nl”.", 400);

  const bytes = await readLimitedBody(request);
  if (bytes === null) return error(`The file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`, 413);

  try {
    const base = await dictionary.getBase();
    const prepared = await prepareImport(
      bytes,
      { fileName: cleanFileName(params.get("fileName")), language, roleCodes: await participantRoleCodes() },
      {
        version: base.state.version,
        draftNumber: base.state.draft?.number ?? null,
        liveNumber: base.state.published?.number ?? null,
        content: base.content,
        live: base.live,
      }
    );
    const { preview, proposed } = prepared;

    if (intent === "preview") return json({ kind: "preview", preview });

    // Save: only exactly what was previewed.
    if (!preview.ok || !proposed) return error("This file has errors, so it can't be saved.", 422, preview);
    if (params.get("fileSha256") !== preview.file.sha256) {
      return error("The file differs from the one you previewed. Check it again before saving.", 409, preview);
    }
    if (Number(params.get("expectedVersion")) !== preview.stateVersion) {
      return error(
        "The dictionary changed after your preview (someone imported, published or restored). Check the file again to compare it with the latest version.",
        409,
        preview
      );
    }
    if (preview.unchanged) return error("Nothing to save: this file matches the current version.", 409, preview);
    if (preview.needsAcknowledgement && params.get("acknowledged") !== "1") {
      return error("Confirm that you've reviewed the removals before saving.", 400, preview);
    }

    const result = await dictionary.createDraft({
      content: proposed,
      kind: "import",
      expectedVersion: preview.stateVersion,
      author: editorNameOf(session),
      importMeta: {
        fileName: preview.file.name,
        fileSize: preview.file.size,
        fileSha256: preview.file.sha256,
        sheets: preview.sheets,
        replaces: preview.replaces,
        warnings: preview.issues.filter((issue) => issue.level === "warning").length,
      },
    });
    if (!result.ok) return error(result.message, result.reason === "conflict" ? 409 : 422, preview);

    revalidatePath("/admin/content");
    revalidatePath("/admin/content/dictionary", "layout");
    return json({
      kind: "saved",
      releaseNumber: result.releaseNumber,
      message: `Saved as draft version ${result.releaseNumber}. The live dictionary hasn't changed — preview the draft, then publish it.`,
    });
  } catch (cause) {
    if (cause instanceof DictionaryNotInstalledError) {
      return error("The Outcome Dictionary isn't set up on this server yet (database migration 003).", 503);
    }
    console.error("Dictionary import failed:", cause);
    return error("Something went wrong on the server. Nothing was saved — please try again.", 500);
  }
}
