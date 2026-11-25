import { describe, expect, it } from "vitest";
import { DICTIONARY_PAGE, revalidationTargets } from "@/lib/cms/pages";
import { DICTIONARY_PAGE_DEFAULTS } from "./defaults";
import { dictionaryPageSchema } from "./schema";

describe("Outcome Dictionary page text (CMS)", () => {
  it("has valid built-in defaults", () => {
    expect(dictionaryPageSchema.parse(DICTIONARY_PAGE_DEFAULTS)).toEqual(DICTIONARY_PAGE_DEFAULTS);
  });

  it("defines the participant groups used in the source workbook", () => {
    expect(DICTIONARY_PAGE_DEFAULTS.verbatims.roles.map((r) => r.code)).toEqual(["PwD", "HCP", "ICG"]);
  });

  it("rejects duplicate or malformed participant abbreviations", () => {
    const duplicate = structuredClone(DICTIONARY_PAGE_DEFAULTS);
    duplicate.verbatims.roles.push({ code: "pwd", label: "Again" });
    expect(dictionaryPageSchema.safeParse(duplicate).success).toBe(false);
    const malformed = structuredClone(DICTIONARY_PAGE_DEFAULTS);
    malformed.verbatims.roles[0].code = "P w D:";
    expect(dictionaryPageSchema.safeParse(malformed).success).toBe(false);
  });

  it("rejects unsafe links in rich text", () => {
    const unsafe = structuredClone(DICTIONARY_PAGE_DEFAULTS);
    unsafe.source.body = "[click](javascript:void)";
    expect(dictionaryPageSchema.safeParse(unsafe).success).toBe(false);
  });

  it("refreshes every outcome page when published", () => {
    expect(revalidationTargets(DICTIONARY_PAGE)).toEqual([{ path: "/dictionary", type: "layout" }]);
  });
});
