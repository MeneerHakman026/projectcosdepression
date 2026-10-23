import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HOME_DEFAULTS } from "@/content/home/defaults";
import type { HomeContent } from "@/content/home/schema";
import { toPlainText, parseInline } from "@/lib/cms/rich-text";
import HomePage from "./HomePage";

// next/image and next/link need the Next.js runtime; plain elements are
// enough to check what content is rendered.
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

function render(content: HomeContent) {
  return renderToStaticMarkup(<HomePage content={content} />);
}

function edited(change: (draft: HomeContent) => void): HomeContent {
  const draft = structuredClone(HOME_DEFAULTS);
  change(draft);
  return draft;
}

const text = (html: string) => html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&amp;/g, "&");

describe("HomePage", () => {
  it("renders every piece of built-in content", () => {
    const html = render(HOME_DEFAULTS);
    const visible = text(html);
    const { hero, about, evidence, development, involved, explore, finalCta } = HOME_DEFAULTS;
    const expected = [
      hero.eyebrow,
      hero.heading,
      hero.intro,
      hero.primaryCta.label,
      hero.secondaryCta.label,
      about.heading,
      toPlainText(parseInline(about.body)),
      about.whyBody,
      evidence.intro,
      evidence.footnote,
      ...evidence.metrics.flatMap((m) => [m.value, m.label, m.context, `${m.sourceLabel}, ${m.year}`]),
      ...development.steps.flatMap((s) => [`${s.step} · ${s.status}`, s.title, s.description]),
      development.steeringNote,
      development.participation.emptyHeading,
      ...involved.groups.flatMap((g) => [g.title, g.description]),
      ...explore.links.flatMap((l) => [l.label, l.description]),
      finalCta.heading,
      finalCta.body,
    ];
    for (const fragment of expected) expect(visible).toContain(fragment);

    expect(html).toContain("<em>what</em>");
    expect(html).toContain('id="what-is-cos-d"');
    expect(html).toContain('alt="Three people having a conversation around a table."');
  });

  it("shows edited content", () => {
    const html = render(
      edited((c) => {
        c.hero.heading = "A different heading";
        c.evidence.metrics[0].value = "81";
      })
    );
    expect(html).toContain("A different heading");
    expect(html).toContain(">81<");
  });

  it("omits hidden sections entirely", () => {
    const html = render(
      edited((c) => {
        c.evidence.visible = false;
        c.finalCta.visible = false;
      })
    );
    expect(html).not.toContain(HOME_DEFAULTS.evidence.heading);
    expect(html).not.toContain(HOME_DEFAULTS.finalCta.heading);
    expect(html).toContain(HOME_DEFAULTS.development.heading);
  });

  it("shows a real participation count only when one is set", () => {
    const html = render(edited((c) => (c.development.participation.count = 1234)));
    expect(html).toContain("1,234");
    expect(html).not.toContain(HOME_DEFAULTS.development.participation.emptyHeading.replace("'", "&#x27;"));
  });

  it("never renders editor text as HTML", () => {
    const html = render(
      edited((c) => {
        c.hero.heading = '<img src=x onerror="alert(1)">';
        c.about.body = '<script>alert("x")</script> and [click](javascript:void)';
      })
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("javascript:");
    expect(text(html)).toContain("and click");
  });
});
