import { beforeAll, describe, expect, it } from "vitest";
import { HEADERS, buildWorkbook, outcome, rowsOf, syntheticSourceOutcomes, syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import { emptyContent, type DictionaryContent } from "./model";
import { prepareImport, type ImportBase } from "./pipeline";

const OPTIONS = { fileName: "test.xlsx", language: "en", roleCodes: ["PwD", "HCP", "ICG"] };

function base(content: DictionaryContent = emptyContent(), live: DictionaryContent = content): ImportBase {
  return { version: 4, draftNumber: null, liveNumber: content.master.outcomes.length ? 1 : null, content, live };
}

describe("import preview: inspecting what was read", () => {
  let master: DictionaryContent;
  beforeAll(async () => {
    master = (await prepareImport(await syntheticWorkbookBytes(), OPTIONS, base())).proposed!;
  });

  it("returns every record, exactly as read, with its Excel row number", async () => {
    const { preview } = await prepareImport(await syntheticWorkbookBytes(), OPTIONS, base());
    const inspect = preview.inspect!;
    expect(inspect.partial).toBe(false);
    expect(inspect.language).toBe("en");
    expect(inspect.sheet).toBe("Sheet1");
    expect(inspect.outcomes).toEqual(syntheticSourceOutcomes());
    expect(inspect.rowNumbers).toEqual(Array.from({ length: 80 }, (_, i) => i + 2));
    expect(preview.diff!.outcomes.added).toHaveLength(80);
  });

  it("still shows what was read when the file has errors, without making it saveable", async () => {
    const rows = rowsOf([outcome("A", "C", "G"), outcome("A", "C", "G"), outcome("B", "C", "G", { definition: "" })]);
    const { preview, proposed } = await prepareImport(await buildWorkbook([{ name: "Sheet1", rows }]), OPTIONS, base());
    expect(preview.ok).toBe(false);
    expect(proposed).toBeNull();
    expect(preview.inspect!.partial).toBe(true);
    expect(preview.inspect!.outcomes.map((o) => o.id)).toEqual(["A", "A", "B"]);
    expect(preview.inspect!.rowNumbers).toEqual([2, 3, 4]);
    // Field-level problems are tagged so the explorer can show them per record without repeating them.
    expect(preview.issues.find((i) => i.message.includes("Definition is empty"))?.kind).toBe("empty-field");
  });

  it("has nothing to inspect when the file can't be read at all", async () => {
    const { preview } = await prepareImport(new Uint8Array([1, 2, 3]), OPTIONS, base());
    expect(preview.ok).toBe(false);
    expect(preview.inspect).toBeNull();
    const headersOnly = await prepareImport(await buildWorkbook([{ name: "en", rows: [HEADERS] }]), OPTIONS, base());
    expect(headersOnly.preview.inspect).toBeNull();
  });

  it("shows a translation import in its language, with the translation sheet's row numbers", async () => {
    const full = [
      HEADERS,
      ["V_02", "", "", "Désespoir", "", "", ""],
      ["V_01", "", "", "Goût de vivre", "", "", ""],
    ];
    const ok = await prepareImport(await buildWorkbook([{ name: "fr", rows: full }]), { ...OPTIONS, language: "fr" }, base(master));
    const inspect = ok.preview.inspect!;
    expect(ok.preview.ok).toBe(true);
    expect(inspect.language).toBe("fr");
    expect(inspect.sheet).toBe("fr");
    expect(inspect.rowNumbers.slice(0, 3)).toEqual([3, 2, null]);
    expect(inspect.outcomes).toEqual(master.master.outcomes); // the master is untouched
    expect(inspect.translations.fr.outcomes.V_01.outcomeDomain).toBe("Goût de vivre");
  });
});
