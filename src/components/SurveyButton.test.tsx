import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import SurveyButton from "./SurveyButton";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a data-next-link="" href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("SurveyButton", () => {
  it("renders an internal destination as a client-side link with the configured label", () => {
    const html = renderToStaticMarkup(
      <SurveyButton button={{ label: "Expression of interest", href: "/registration", external: false }} />
    );
    expect(html).toBe('<a data-next-link="" href="/registration" class="btn btn-primary">Expression of interest</a>');
  });

  it("renders an external destination as a plain link straight to the study website", () => {
    const html = renderToStaticMarkup(
      <SurveyButton button={{ label: "Take part", href: "https://example.org/study", external: true }} compact />
    );
    expect(html).toBe('<a href="https://example.org/study" class="btn btn-primary btn-compact">Take part</a>');
    // Same-tab navigation; no redirect through this site.
    expect(html).not.toContain("target=");
    expect(html).not.toContain("data-next-link");
  });

  it("keeps the existing button styles", () => {
    const html = renderToStaticMarkup(
      <SurveyButton button={{ label: "x", href: "/registration", external: false }} className="hidden sm:inline-flex" />
    );
    expect(html).toContain('class="btn btn-primary hidden sm:inline-flex"');
  });
});
