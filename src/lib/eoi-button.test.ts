import { describe, expect, it } from "vitest";
import { EOI_BUTTON_DEFAULTS } from "@/content/eoi-button/defaults";
import { resolveEoiButton } from "./eoi-button";

describe("resolveEoiButton", () => {
  it("links to the internal registration page by default", () => {
    expect(resolveEoiButton(EOI_BUTTON_DEFAULTS)).toEqual({
      label: "Expression of interest",
      href: "/registration",
      external: false,
    });
  });

  it("ignores a remembered external address while internal mode is selected", () => {
    const link = resolveEoiButton({
      label: "Register",
      destination: { mode: "internal", externalUrl: "https://example.org/study" },
    });
    expect(link).toEqual({ label: "Register", href: "/registration", external: false });
  });

  it("links directly to the external study website in external mode", () => {
    const link = resolveEoiButton({
      label: "Take part",
      destination: { mode: "external", externalUrl: "https://example.org/study" },
    });
    expect(link).toEqual({ label: "Take part", href: "https://example.org/study", external: true });
  });

  it.each(["", "javascript:alert(1)", "http://example.org", "data:text/html,x"])(
    "falls back to the internal page rather than rendering an unsafe external link (%j)",
    (externalUrl) => {
      const link = resolveEoiButton({ label: "Take part", destination: { mode: "external", externalUrl } });
      expect(link).toEqual({ label: "Take part", href: "/registration", external: false });
    }
  );
});
