import { NextResponse, type NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import { canonicalLanguage } from "@/lib/dictionary/languages";
import { MASTER_LANGUAGE } from "@/lib/dictionary/model";
import { dictionary } from "@/lib/dictionary/server";
import { DictionaryNotInstalledError } from "@/lib/dictionary/service";
import { exportAllLanguages, exportLanguage, exportMaster, exportTranslationTemplate } from "@/lib/dictionary/xlsx-write";

/**
 * Excel downloads (admin only — drafts and old versions aren't public):
 *   ?scope=master                 English master (seven source columns)
 *   ?scope=language&lang=fr       one language
 *   ?scope=all                    every language, one sheet each
 *   ?scope=template&lang=de       empty translation template
 *   &release=live|draft|<number>  which version (default: live)
 */

export const dynamic = "force-dynamic";

const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function problem(message: string, status: number) {
  return new NextResponse(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function GET(request: NextRequest) {
  await requireAdminSession();
  const params = request.nextUrl.searchParams;
  const scope = params.get("scope") ?? "master";
  const releaseParam = params.get("release") ?? "live";

  try {
    const state = await dictionary.getState();
    const releaseNumber =
      releaseParam === "live"
        ? state.published?.number
        : releaseParam === "draft"
          ? state.draft?.number
          : /^\d{1,9}$/.test(releaseParam)
            ? Number(releaseParam)
            : undefined;
    const release = releaseNumber ? await dictionary.getRelease(releaseNumber) : null;
    if (!release && scope !== "template") return problem("There's no such version to export.", 404);

    const content = release?.content ?? (state.draft ? (await dictionary.getRelease(state.draft.number))?.content : undefined);
    if (!content) return problem("Import the English master before downloading a template.", 404);

    const label = release
      ? `Version ${release.release.number}${release.release.number === state.published?.number ? " (live)" : release.release.number === state.draft?.number ? " (draft, not published)" : ""}`
      : "Template";
    const meta = { releaseLabel: label, exportedAt: new Date() };
    const version = release ? `v${release.release.number}` : "template";
    const date = meta.exportedAt.toISOString().slice(0, 10);

    let bytes: Uint8Array;
    let name: string;
    if (scope === "master") {
      bytes = await exportMaster(content, meta);
      name = `cos-d-outcome-dictionary-en-${version}-${date}.xlsx`;
    } else if (scope === "all") {
      bytes = await exportAllLanguages(content, meta);
      name = `cos-d-outcome-dictionary-all-languages-${version}-${date}.xlsx`;
    } else if (scope === "language" || scope === "template") {
      const language = canonicalLanguage(params.get("lang") ?? "");
      if (!language) return problem("Choose a valid language code.", 400);
      if (scope === "language" && language !== MASTER_LANGUAGE && !(language in content.translations)) {
        return problem("That language isn't in this version.", 404);
      }
      if (scope === "template" && language === MASTER_LANGUAGE) return problem("Templates are for translations.", 400);
      bytes = scope === "language" ? await exportLanguage(content, language, meta) : await exportTranslationTemplate(content, language, meta);
      name = `cos-d-outcome-dictionary-${language}-${scope === "template" ? "template" : version}-${date}.xlsx`;
    } else {
      return problem("Unknown export.", 400);
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": XLSX,
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof DictionaryNotInstalledError) return problem("The Outcome Dictionary isn't set up yet.", 503);
    throw error;
  }
}
