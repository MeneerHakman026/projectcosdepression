import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/lib/cms/validation";
import { EOI_BUTTON_DEFAULTS } from "./defaults";
import { eoiButtonSchema, type EoiButtonContent } from "./schema";

function errorsFor(content: unknown) {
  const result = eoiButtonSchema.safeParse(content);
  return result.success ? {} : toFieldErrors(result.error);
}

const external = (externalUrl: string): EoiButtonContent => ({
  label: "Expression of interest",
  destination: { mode: "external", externalUrl },
});

describe("eoiButtonSchema", () => {
  it("defaults to the existing label and the internal registration page", () => {
    expect(EOI_BUTTON_DEFAULTS).toEqual({
      label: "Expression of interest",
      destination: { mode: "internal", externalUrl: "" },
    });
    expect(eoiButtonSchema.parse(EOI_BUTTON_DEFAULTS)).toEqual(EOI_BUTTON_DEFAULTS);
  });

  it("accepts an https study website in external mode", () => {
    expect(errorsFor(external("https://example.org/study"))).toEqual({});
  });

  it("trims surrounding whitespace from the address", () => {
    expect(eoiButtonSchema.parse(external("  https://example.org/study  ")).destination.externalUrl).toBe(
      "https://example.org/study"
    );
  });

  it("requires an address when external mode is selected", () => {
    expect(errorsFor(external(""))).toHaveProperty(["destination.externalUrl"]);
    expect(errorsFor(external("   "))).toHaveProperty(["destination.externalUrl"]);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,hi",
    "file:///etc/passwd",
    "http://example.org/study",
    "/registration",
    "not a url",
    "https://user:pw@example.org",
  ])("rejects %j as an external address", (url) => {
    expect(errorsFor(external(url))).toHaveProperty(["destination.externalUrl"]);
  });

  it("keeps a remembered address while internal mode is selected, but still validates it", () => {
    const remembered = { label: "Expression of interest", destination: { mode: "internal", externalUrl: "https://example.org/study" } };
    expect(errorsFor(remembered)).toEqual({});
    const unsafe = { ...remembered, destination: { mode: "internal", externalUrl: "javascript:alert(1)" } };
    expect(errorsFor(unsafe)).toHaveProperty(["destination.externalUrl"]);
  });

  it("requires a label and limits its length", () => {
    expect(errorsFor({ ...EOI_BUTTON_DEFAULTS, label: " " })).toHaveProperty(["label"]);
    expect(errorsFor({ ...EOI_BUTTON_DEFAULTS, label: "x".repeat(41) })).toHaveProperty(["label"]);
  });

  it("only allows the two supported modes", () => {
    expect(errorsFor({ ...EOI_BUTTON_DEFAULTS, destination: { mode: "redirect", externalUrl: "" } })).toHaveProperty([
      "destination.mode",
    ]);
  });

  it("does not allow the internal path to be changed", () => {
    // There is no field for it: an extra key is simply dropped.
    const parsed = eoiButtonSchema.parse({ ...EOI_BUTTON_DEFAULTS, internalPath: "/elsewhere" });
    expect(parsed).not.toHaveProperty("internalPath");
  });
});
