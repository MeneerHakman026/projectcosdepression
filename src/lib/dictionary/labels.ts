import { languageName } from "./languages";
import type { ReleaseSummary } from "./service";

/** One-line description of where a release came from, for admin lists. */
export function releaseOrigin(release: ReleaseSummary): string {
  if (release.kind === "restore") return `Restored from version ${release.restoredFrom}`;
  if (release.kind === "language_removed") {
    return `Removed ${release.removedLanguage ? languageName(release.removedLanguage) : "a translation"}`;
  }
  const meta = release.importMeta;
  if (!meta) return "Imported";
  const what = meta.replaces.map((code) => (code === "en" ? "English master" : languageName(code))).join(" + ");
  return `Imported ${what} from ${meta.fileName}`;
}
