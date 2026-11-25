import { beforeAll, describe, expect, it } from "vitest";
import { syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import { analyzeImport } from "./import";
import { emptyContent } from "./model";
import { buildSearchIndex, editDistance, highlightRanges, parseQuery, search, snippet, type SearchIndex } from "./search";
import { foldWithMap } from "./text";
import { parseVerbatims } from "./verbatims";
import { buildView, type DictionaryView } from "./view";
import { readWorkbook } from "./xlsx-read";

let view: DictionaryView;
let index: SearchIndex;

beforeAll(async () => {
  const read = await readWorkbook(await syntheticWorkbookBytes());
  if (!read.ok) throw new Error(read.message);
  const content = analyzeImport(read.sheets, { language: "en", roleCodes: ["PwD", "HCP", "ICG"] }, emptyContent()).proposed!;
  view = buildView(content, "en", null);
  index = buildSearchIndex(view.outcomes);
});

function ids(query: string): string[] {
  const result = search(index, query);
  return result ? [...result.hits.values()].sort((a, b) => b.score - a.score).map((hit) => hit.id) : [];
}

function name(id: string) {
  return view.outcomes.find((o) => o.id === id)!.outcomeDomain.text;
}

function textOf(id: string) {
  return JSON.stringify(view.outcomes.find((o) => o.id === id)).toLowerCase();
}

describe("search over an 80-outcome dictionary (synthetic)", () => {
  it("finds an outcome by its name, ranked first", () => {
    expect(name(ids("zest for living")[0])).toBe("Zest for living");
    expect(name(ids("Hopelessness")[0])).toBe("Synthetic hopelessness");
  });

  it("searches definitions", () => {
    expect(ids("step-sequencing")).toEqual(["V_11"]);
  });

  it("searches experiences", () => {
    expect(ids("driving force")).toEqual(["V_01"]);
  });

  it("searches verbatims (participant quotations)", () => {
    expect(ids("flat aimless")).toEqual(["V_01"]);
    expect(ids("Mount Kilimanjaro")).toEqual(["V_44"]);
  });

  it("is case-insensitive and matches partial words", () => {
    expect(ids("FLAT AIMLE")).toEqual(["V_01"]);
    expect(ids("motiv").sort()).toEqual(["V_01", "V_03"]);
  });

  it("requires every word to match (AND)", () => {
    expect(ids("sleep quality")).toEqual(["V_55"]);
    for (const id of ids("sleep")) expect(textOf(id)).toContain("sleep");
  });

  it("ignores accents and quote styles", () => {
    expect(ids("flát áimless")).toEqual(["V_01"]);
    expect(ids("didn’t manage")).toEqual(["V_11"]); // stored with a straight apostrophe
    expect(ids("would've liked")[0]).toBe("V_65"); // stored with ’
    expect(ids("would've liked")).toEqual(ids("would’ve liked"));
  });

  it("tolerates small typos, but not for words that exist as typed", () => {
    expect(ids("aimless").sort()).toEqual(["V_01", "V_26"]);
    expect(ids("aimlss").sort()).toEqual(["V_01", "V_26"]);
    expect(ids("hopelesness")).toContain("V_02");
    // "slep" is one edit from "sleep" and from "step" (V_11), so all are fine matches.
    expect(ids("slep")).toEqual(expect.arrayContaining(["V_54", "V_55", "V_56"]));
    // "liked" exists, so it must not also match "like"/"linked".
    for (const id of ids("liked")) expect(textOf(id)).toContain("liked");
  });

  it("returns nothing for nonsense rather than everything", () => {
    expect(ids("qwxzyv")).toEqual([]);
    expect(search(index, "   ")).toBeNull();
  });
});

describe("highlighting", () => {
  it("maps matches in accent-folded text back to the original characters", () => {
    const text = "Désir — “Élan” vital";
    const ranges = highlightRanges(text, { partial: ["elan"], whole: [] });
    expect(ranges.map((r) => text.slice(r.start, r.end))).toEqual(["Élan"]);
  });

  it("handles characters that fold to several letters", () => {
    const text = "Œuvre and straße";
    const { text: folded } = foldWithMap(text);
    expect(folded).toBe("oeuvre and strasse");
    expect(highlightRanges(text, { partial: ["strasse"], whole: [] }).map((r) => text.slice(r.start, r.end))).toEqual(["straße"]);
  });

  it("merges overlapping matches and builds a snippet around the first", () => {
    const text = "[SYNTHETIC] The quick brown fox keeps driving forward, then rests in the shade of an old oak tree.";
    const ranges = highlightRanges(text, { partial: ["driv", "driving"], whole: [] });
    expect(ranges).toHaveLength(1);
    const s = snippet(text, ranges, 10, 10)!;
    expect(s.leading).toBe(true);
    expect(s.text.slice(s.ranges[0].start, s.ranges[0].end)).toBe("driving");
  });

  it("parses queries into folded words", () => {
    expect(parseQuery("  Désir, de VIVRE! ")).toEqual(["desir", "de", "vivre"]);
    expect(parseQuery("a")).toEqual(["a"]);
    expect(editDistance("anxeity", "anxiety", 1)).toBe(1);
  });
});

describe("verbatim attribution", () => {
  it("groups lines by participant role without altering the quotation text", () => {
    const v01 = view.outcomes.find((o) => o.id === "V_01")!.verbatims.text;
    expect(parseVerbatims(v01, ["PwD", "HCP", "ICG"])).toEqual({
      kind: "attributed",
      blocks: [
        { role: "PwD", text: "“[SYNTHETIC] Life feels flat and aimless” “Every day is colourless”" },
        { role: "HCP", text: "“[They need] more synthetic engagement”" },
        { role: "ICG", text: "“[SYNTHETIC] She lost all her sparkle”" },
      ],
    });
  });

  it("falls back to the raw text when a line can't be attributed", () => {
    const v11 = view.outcomes.find((o) => o.id === "V_11")!.verbatims.text;
    expect(parseVerbatims(v11, ["PwD", "HCP", "ICG"])).toEqual({ kind: "raw", text: v11.trim() });
    expect(parseVerbatims("Note: something\nPwD: “x”", ["PwD"]).kind).toBe("raw");
    expect(parseVerbatims("", ["PwD"])).toEqual({ kind: "empty" });
  });

  it("attributes 79 of the 80 outcomes and never loses text", () => {
    let attributed = 0;
    for (const outcome of view.outcomes) {
      const parsed = parseVerbatims(outcome.verbatims.text, ["PwD", "HCP", "ICG"]);
      if (parsed.kind === "attributed") {
        attributed++;
        const rebuilt = parsed.blocks.map((b) => `${b.role}:${b.text}`).join("").replace(/\s+/g, "");
        expect(rebuilt).toBe(outcome.verbatims.text.replace(/\s+/g, ""));
      }
    }
    expect(attributed).toBe(79);
  });
});
