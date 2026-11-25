import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { syntheticMaster, syntheticWorkbookBytes } from "../../../../test/dictionary-fixtures";
import type { ExplorerDataset } from "@/lib/dictionary/explorer";
import { analyzeImport } from "@/lib/dictionary/import";
import { emptyContent } from "@/lib/dictionary/model";
import { readWorkbook } from "@/lib/dictionary/xlsx-read";
import DatasetExplorer, { type ExplorerState } from "./DatasetExplorer";
import ExactText from "./ExactText";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
  usePathname: () => "/admin/content/dictionary/data",
}));

let dataset: ExplorerDataset;
const ROLES = ["PwD", "HCP", "ICG"];

beforeAll(async () => {
  const read = await readWorkbook(await syntheticWorkbookBytes());
  if (!read.ok) throw new Error(read.message);
  const content = analyzeImport(read.sheets, { language: "en", roleCodes: ROLES }, emptyContent()).proposed!;
  dataset = { outcomes: content.master.outcomes, translations: content.translations };
});

function render(options: { record?: string; initial?: Partial<ExplorerState>; data?: ExplorerDataset; rows?: boolean } = {}) {
  navigation.search = options.record ? `record=${options.record}` : "";
  return renderToStaticMarkup(
    <DatasetExplorer
      dataset={options.data ?? dataset}
      roleCodes={ROLES}
      datasetLabel="Draft version 3 — NOT published, only visible to admins"
      datasetTone="draft"
      initial={options.initial}
      urlSync
      showRowNumbers={options.rows}
    />
  );
}

const decode = (html: string) =>
  html.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");
const exactTexts = (html: string) =>
  [...html.matchAll(/<span class="[^"]*" data-exact-text="">([\s\S]*?)<\/span>(?=<\/dd>|<p|<div)/g)].map((m) => decode(m[1]));

describe("Dataset Explorer list", () => {
  it("lists the first page with counts, and filters built from the data", () => {
    const html = render();
    expect(html.match(/— open all seven columns/g)).toHaveLength(50);
    expect(text(html)).toContain("80 records in 2 categories and 9 group domains. Showing 1–50.");
    expect(text(html)).toContain("Page 1 of 2");
    expect(text(html)).toContain("All categories (2)");
    expect(text(html)).toContain("Synthetic functioning (16)");
    expect(text(html)).toContain("All group domains (9)");
    expect(text(html)).toContain("Group S3 (19)");
    expect(text(html)).toContain("Only records needing attention (1)");
    for (const header of ["Variable", "Outcome Domain", "Category", "Group Domain"]) expect(html).toContain(`>${header}</th>`);
  });

  it("starts from the search in the address bar", () => {
    const html = render({ initial: { query: "Kilimanjaro" } });
    expect(text(html)).toContain("1 record match, of 80 in total.");
    expect(text(html)).toContain("Found in: Verbatims");
    expect(html).toContain("V_44");
  });

  it("shows any number of categories", () => {
    const html = render({ data: { outcomes: syntheticMaster(12, 2, 1), translations: {} } });
    expect(text(html)).toContain("24 records in 12 categories and 24 group domains.");
    expect(text(html)).toContain("Category 12 (2)");
  });

  it("shows Excel row numbers when inspecting an import", () => {
    const html = render({ rows: true, data: { ...dataset, rowNumbers: dataset.outcomes.map((_, i) => i + 2) } });
    expect(html).toContain(">Excel row</th>");
  });
});

describe("Dataset Explorer record view", () => {
  it("shows all seven columns of the record, exactly as stored", () => {
    const html = render({ record: "V_01" });
    const v01 = dataset.outcomes[0];
    expect(text(html)).toContain("Draft version 3 — NOT published, only visible to admins");
    for (const label of ["Variable", "Category", "Group Domain", "Outcome Domain", "Definition", "Experience", "Verbatims"]) {
      expect(html).toMatch(new RegExp(`<span>${label} <span[^>]*>· column \\d</span></span>`));
    }
    const shown = exactTexts(html);
    expect(shown).toEqual([v01.id, v01.category, v01.groupDomain, v01.outcomeDomain, v01.definition, v01.experience, v01.verbatims]);
    // Untouched: the double spaces, trailing spaces, curly quotes and line break.
    expect(shown[6]).toBe("PwD:  “[SYNTHETIC] Life feels flat and aimless” “Every day is colourless” \nHCP:   “[They need] more synthetic engagement” \nICG: “[SYNTHETIC] She lost all her sparkle”");
    expect(text(html)).toContain("grouped by participant: PwD, HCP, ICG");
    expect(text(html)).toContain("Record 1 of 80");
  });

  it("explains when quotations will be shown as written", () => {
    expect(text(render({ record: "V_11" }))).toContain("shown exactly as written, because not every line starts with a participant label");
  });

  it("marks a symbol-font character instead of hiding it", () => {
    const html = render({ record: "V_79" });
    expect(html).toMatch(/title="A symbol-font or control character[^"]*"[^>]*>U\+F0E0<\/span>/);
    expect(text(html)).toContain("contains a symbol-font character (U+F0E0)");
  });

  it("shows a translation next to the English master and marks what isn't translated", () => {
    const translated: ExplorerDataset = {
      ...dataset,
      translations: { fr: { categories: {}, groups: {}, outcomes: { V_01: { outcomeDomain: "Goût de vivre", source: "0123456789abcdef" } } } },
    };
    const html = render({ record: "V_01", data: translated, initial: { language: "fr" } });
    expect(text(html)).toContain("V_01 — Goût de vivre");
    expect(text(html)).toContain("French (fr), with the English master for reference");
    expect(html.match(/>Not translated</g)!.length).toBe(5);
    expect(html.match(/>English master</g)!.length).toBe(6);
  });

  it("falls back to the list for an unknown record", () => {
    expect(render({ record: "NOPE" })).toContain("Search all seven columns");
  });
});

describe("ExactText", () => {
  it("can show spaces, line breaks and tabs", () => {
    const html = renderToStaticMarkup(<ExactText text={"a  b\r\n\tc "} showInvisible />);
    expect(text(html).replace(/ /g, "")).toBe("a··b␍↵→c·");
    expect(html).toContain("\n");
  });

  it("highlights search terms in the original text", () => {
    const html = renderToStaticMarkup(<ExactText text="Élan vital" terms={["elan"]} />);
    expect(html).toContain("<mark");
    expect(text(html).trim()).toBe("Élan vital");
  });
});
