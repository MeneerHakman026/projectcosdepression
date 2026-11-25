import { renderToStaticMarkup } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { outcome, syntheticWorkbookBytes } from "../../../test/dictionary-fixtures";
import { DICTIONARY_PAGE_DEFAULTS } from "@/content/dictionary/defaults";
import { analyzeImport } from "@/lib/dictionary/import";
import { CONTENT_FORMAT, emptyContent, type DictionaryContent } from "@/lib/dictionary/model";
import { buildView } from "@/lib/dictionary/view";
import { readWorkbook } from "@/lib/dictionary/xlsx-read";
import DictionaryPage, { filtersFromSearchParams } from "./DictionaryPage";

const navigation = vi.hoisted(() => ({ pathname: "/dictionary", search: "" }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

let source: DictionaryContent;

beforeAll(async () => {
  const read = await readWorkbook(await syntheticWorkbookBytes());
  if (!read.ok) throw new Error(read.message);
  source = analyzeImport(read.sheets, { language: "en", roleCodes: ["PwD", "HCP", "ICG"] }, emptyContent()).proposed!;
});

function render(content: DictionaryContent, options: { path?: string; search?: string; language?: string } = {}) {
  navigation.pathname = options.path ?? "/dictionary";
  navigation.search = options.search ?? "";
  const view = buildView(content, options.language ?? "en", { number: 3, publishedAt: "2026-11-25T10:00:00.000Z" });
  return renderToStaticMarkup(
    <DictionaryPage
      content={DICTIONARY_PAGE_DEFAULTS}
      view={view}
      basePath="/dictionary"
      urlMode="path"
      filters={filtersFromSearchParams(Object.fromEntries(new URLSearchParams(options.search ?? "")))}
    />
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("public Outcome Dictionary page", () => {
  it("renders the title and counts computed from the data (not hardcoded)", () => {
    const html = text(render(source));
    expect(html).toContain("Outcome Dictionary");
    expect(html).toMatch(/outcome domains 80/);
    expect(html).toMatch(/categories 2/);
    expect(html).toMatch(/group domains 9/);
    expect(html).toContain("Dictionary version 3");
  });

  it("server-renders every outcome as a permanent link", () => {
    const html = render(source);
    for (const o of source.master.outcomes) expect(html).toContain(`href="/dictionary/${o.id}"`);
  });

  it("generates the category explorer and filters from the data", () => {
    const html = text(render(source));
    for (const label of ["Synthetic symptoms", "Synthetic functioning", "Group S1", "Group S5", "Group F4"]) {
      expect(html).toContain(label);
    }
    const small = text(
      render({ ...emptyContent(), master: { outcomes: [outcome("Z_1", "Only category", "Only group")] } })
    );
    expect(small).toContain("Only category");
    expect(small).not.toContain("Synthetic symptoms");
    expect(small).toMatch(/outcome domain 1\b/);
  });

  it("shows an outcome's full detail at its deep link, with quotations attributed by participant group", () => {
    const html = render(source, { path: "/dictionary/V_01" });
    const visible = text(html);
    expect(visible).toContain("Zest for living");
    expect(visible).toContain("[SYNTHETIC] An invented definition about zest, motivation and engagement with daily life.");
    expect(visible).toContain("[SYNTHETIC] Invented text describing a missing driving force.");
    expect(visible).toContain("“[SYNTHETIC] Life feels flat and aimless” “Every day is colourless”");
    expect(html).toContain('<abbr title="Healthcare professionals"');
    expect(visible).toContain("Informal caregivers");
    expect(html).toContain('aria-current="true"');
    expect(visible).toContain("Next →");
  });

  it("shows unattributable quotations exactly as written", () => {
    const visible = text(render(source, { path: "/dictionary/V_11" }));
    expect(visible).toContain('"PwD: “[SYNTHETIC] I didn\'t manage the simple chores”');
  });

  it("highlights search matches when a query is in the URL", () => {
    const html = render(source, { path: "/dictionary/V_01", search: "q=aimless" });
    expect(html).toMatch(/<mark[^>]*>aimless<\/mark>/);
    expect(text(html)).toContain("2 outcomes found");
  });

  it("filters by group from the URL", () => {
    const visible = text(render(source, { search: "group=group-s1" }));
    expect(visible).toContain("4 outcomes shown");
  });

  it("never renders workbook text as HTML", () => {
    const hostile: DictionaryContent = {
      ...emptyContent(),
      master: {
        outcomes: [
          outcome("X_1", "<img src=x onerror=alert(1)>", "Group", {
            outcomeDomain: "<script>alert('x')</script>",
            definition: '<a href="javascript:alert(1)">click</a>',
            verbatims: "PwD: <b>bold</b>",
          }),
        ],
      },
    };
    const html = render(hostile, { path: "/dictionary/X_1" });
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('<a href="javascript');
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("labels missing translations instead of passing English off as translated", () => {
    const french: DictionaryContent = {
      format: CONTENT_FORMAT,
      master: { outcomes: source.master.outcomes },
      translations: {
        fr: {
          categories: {},
          groups: {},
          outcomes: { V_01: { outcomeDomain: "Désir de vivre", definition: "Une motivation claire.", source: "0123456789abcdef" } },
        },
      },
    };
    const html = render(french, { path: "/dictionary/V_01", search: "lang=fr", language: "fr" });
    const visible = text(html);
    expect(visible).toContain("Désir de vivre");
    expect(visible).toContain("Une motivation claire.");
    expect(visible).toContain("Not yet translated into French — shown in English");
    expect(html).toContain('lang="fr"');
    expect(html).toContain('lang="en"');
    expect(visible).toContain("Showing the French translation where available");
  });

  it("shows the 'being prepared' message when nothing is published", () => {
    navigation.pathname = "/dictionary";
    const html = renderToStaticMarkup(
      <DictionaryPage content={DICTIONARY_PAGE_DEFAULTS} view={null} basePath="/dictionary" urlMode="path" filters={filtersFromSearchParams({})} />
    );
    expect(text(html)).toContain("The Outcome Dictionary is being prepared");
    expect(html).not.toContain("dictionary-search");
  });
});
