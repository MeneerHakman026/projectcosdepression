import "server-only";
import type { DictionaryPageContent, ParticipantRole } from "@/content/dictionary/schema";
import { DICTIONARY_PAGE } from "@/lib/cms/pages";
import { cms } from "@/lib/cms/server";

/** Participant groups ("PwD" = …) from the live page text (Content → Pages → Outcome Dictionary page). */
export async function participantRoles(): Promise<ParticipantRole[]> {
  try {
    const page = (await cms.getPublishedContent(DICTIONARY_PAGE)) as DictionaryPageContent;
    return page.verbatims.roles;
  } catch {
    return DICTIONARY_PAGE.defaults.verbatims.roles;
  }
}

/** Their abbreviations, used to read the Verbatims column. */
export async function participantRoleCodes(): Promise<string[]> {
  return (await participantRoles()).map((role) => role.code);
}
