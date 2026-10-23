import { describe, expect, it } from "vitest";
import { classifyHref, isSafeHref, isSafeImagePath } from "./urls";

describe("classifyHref", () => {
  it.each([
    ["/study", "internal"],
    ["/", "internal"],
    ["/registration?ref=home#form", "internal"],
    ["#what-is-cos-d", "anchor"],
    ["https://www.instagram.com/project.cosd", "external"],
    ["mailto:project.cosdepression@gmail.com", "email"],
  ])("accepts %s as %s", (href, kind) => {
    expect(classifyHref(href)).toBe(kind);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.example.com",
    "/\\evil.example.com",
    "http://example.com",
    "https://localhost",
    "/../../etc/passwd",
    "#",
    "",
    "study",
    "/path with spaces",
    "mailto:not-an-address",
  ])("rejects %j", (href) => {
    expect(isSafeHref(href)).toBe(false);
  });
});

describe("isSafeImagePath", () => {
  it("accepts images in the public folder", () => {
    expect(isSafeImagePath("/front_photo.png")).toBe(true);
    expect(isSafeImagePath("/images/team/photo-1.webp")).toBe(true);
  });

  it.each(["https://example.com/a.png", "//cdn.example.com/a.png", "/../secret.png", "/script.js", "front_photo.png"])(
    "rejects %j",
    (src) => {
      expect(isSafeImagePath(src)).toBe(false);
    }
  );
});
