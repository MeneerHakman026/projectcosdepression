import { describe, expect, it } from "vitest";
import { collectLinks, parseInline, toPlainText } from "./rich-text";

describe("parseInline", () => {
  it("returns plain text unchanged", () => {
    expect(parseInline("It's being developed — not decided.")).toEqual([
      { type: "text", value: "It's being developed — not decided." },
    ]);
  });

  it("parses emphasis, bold and links", () => {
    expect(parseInline("*what* and **how** — see [the study](/study)")).toEqual([
      { type: "em", children: [{ type: "text", value: "what" }] },
      { type: "text", value: " and " },
      { type: "strong", children: [{ type: "text", value: "how" }] },
      { type: "text", value: " — see " },
      { type: "link", href: "/study", children: [{ type: "text", value: "the study" }] },
    ]);
  });

  it("supports bold nested in emphasis", () => {
    expect(parseInline("*a **b** c*")).toEqual([
      {
        type: "em",
        children: [
          { type: "text", value: "a " },
          { type: "strong", children: [{ type: "text", value: "b" }] },
          { type: "text", value: " c" },
        ],
      },
    ]);
  });

  it("keeps unmatched and escaped markers as literal text", () => {
    expect(toPlainText(parseInline("<25% *of those"))).toBe("<25% *of those");
    expect(parseInline("\\*not emphasis\\*")).toEqual([{ type: "text", value: "*not emphasis*" }]);
    expect(toPlainText(parseInline("[not a link]"))).toBe("[not a link]");
  });

  it("treats HTML as text", () => {
    expect(parseInline('<script>alert("x")</script>')).toEqual([
      { type: "text", value: '<script>alert("x")</script>' },
    ]);
  });
});

describe("collectLinks", () => {
  it("finds every href, including nested ones", () => {
    expect(collectLinks(parseInline("[a](/a) and *[b](javascript:void)*"))).toEqual(["/a", "javascript:void"]);
  });

  it("never turns a parenthesised href into a link", () => {
    const nodes = parseInline("[b](javascript:alert(1))");
    expect(collectLinks(nodes)).toEqual([]);
    expect(toPlainText(nodes)).toBe("[b](javascript:alert(1))");
  });
});
