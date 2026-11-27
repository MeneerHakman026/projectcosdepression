import { describe, expect, it } from "vitest";
import { parseVerbatims } from "./verbatims";

describe("parseVerbatims", () => {
  it("attributes lines by the English codes, keeping each quotation as written", () => {
    expect(parseVerbatims('PwD: “One” “Two”\nHCP: “Three”', ["PwD", "HCP", "ICG"])).toEqual({
      kind: "attributed",
      blocks: [
        { role: "PwD", text: "“One” “Two”" },
        { role: "HCP", text: "“Three”" },
      ],
    });
  });

  it("accepts one-letter codes and French spacing before the colon", () => {
    expect(parseVerbatims('P : "Un"\nPS : "Deux"\nPr : "Trois"', ["P", "PS", "Pr"])).toEqual({
      kind: "attributed",
      blocks: [
        { role: "P", text: '"Un"' },
        { role: "PS", text: '"Deux"' },
        { role: "Pr", text: '"Trois"' },
      ],
    });
  });

  it("never treats an unknown single letter as a code", () => {
    const text = 'I: "a line that only looks like a label"';
    expect(parseVerbatims(text, ["P", "PS", "Pr"])).toEqual({ kind: "raw", text });
  });
});
