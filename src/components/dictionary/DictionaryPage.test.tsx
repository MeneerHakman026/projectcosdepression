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

function render(
  content: DictionaryContent,
  options: { path?: string; search?: string; language?: string; page?: typeof DICTIONARY_PAGE_DEFAULTS } = {}
) {
  navigation.pathname = options.path ?? "/dictionary";
  navigation.search = options.search ?? "";
  const view = buildView(content, options.language ?? "en", { number: 3, publishedAt: "2026-11-25T10:00:00.000Z" });
  return renderToStaticMarkup(
    <DictionaryPage
      content={options.page ?? DICTIONARY_PAGE_DEFAULTS}
      view={view}
      basePath="/dictionary"
      urlMode="path"
      filters={filtersFromSearchParams(Object.fromEntries(new URLSearchParams(options.search ?? "")))}
    />
  );
}

const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("public Outcome Dictionary page", () => {
  it("renders the title and counts computed from the data (not hardcoded), without a hero", () => {
    const raw = render(source);
    const html = text(raw);
    expect(raw).toMatch(/<h1[^>]*>Outcome Dictionary<\/h1>/);
    expect(raw).toMatch(/<p id="dictionary-status"[^>]*>80 outcomes<\/p>/);
    expect(html).toContain("80 outcome domains · 2 categories · 9 group domains"); // in "About this dictionary"
    expect(html).toMatch(/All 80/);
    expect(html).toMatch(/Synthetic symptoms 64 outcomes/);
    expect(html).toMatch(/Synthetic functioning 16 outcomes/);
    expect(raw.match(/<h3[^>]*>/g)).toHaveLength(9); // one heading per group domain in the index
    expect(html).not.toMatch(/outcome domains \d/); // the old statistics block
    expect(html).toContain("Dictionary version 3");
  });

  it("gives each category its own colour, from its identity", () => {
    const raw = render(source);
    expect(raw).toMatch(/--cat-line:#[0-9A-F]{6}/);
    const lines = new Set([...raw.matchAll(/--cat-line:(#[0-9A-F]{6})/g)].map((m) => m[1]));
    expect(lines.size).toBe(2);
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
    expect(small).toContain("1 outcome domain · 1 category · 1 group domain");
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

  it("doesn't show the outcome ID in the entry, but keeps it in links and for Copy link", () => {
    const raw = render(source, { path: "/dictionary/V_01" });
    for (const entry of [raw.slice(raw.indexOf('class="dictionary-panel')), raw.slice(raw.indexOf("<dialog"))]) {
      const body = entry.slice(entry.indexOf("<h2"), entry.indexOf("Definition"));
      expect(text(body)).not.toContain("V_01");
      expect(body).toContain("Copy link");
    }
    expect(raw).toContain('id="result-V_01" href="/dictionary/V_01"');
    expect(raw).toContain('href="/dictionary/V_02"'); // Next
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

  it("ignores the retired Eyebrow and Explorer heading CMS fields (kept only so stored content stays valid)", () => {
    const page = structuredClone(DICTIONARY_PAGE_DEFAULTS);
    page.intro.eyebrow = "RETIRED-EYEBROW";
    page.explorer.heading = "RETIRED-EXPLORER";
    const html = render(source, { page });
    expect(html).not.toContain("RETIRED-EYEBROW");
    expect(html).not.toContain("RETIRED-EXPLORER");
    expect(html).toBe(render(source));
  });

  it("never uses more columns of group cards than there are cards", () => {
    const cardColumnsOf = (html: string) => [...html.matchAll(/<div class="gap-x-4[^"]*">/g)].map((m) => m[0]);
    // 5 and 4 groups: up to three columns of cards.
    expect(cardColumnsOf(render(source))[0]).toContain("columns-[3_17.5rem]");
    // One group of 4 outcomes: a single card, no empty columns beside it.
    const one = render(source, { search: "group=group-s1" });
    expect(cardColumnsOf(one)[0]).not.toContain("columns-");
    expect(one).not.toMatch(/<ul id="group-group-s1" class="[^"]*columns-/);
    // One group of 18 outcomes: the outcomes themselves flow into columns.
    expect(render(source, { search: "group=group-s2" })).toMatch(/<ul id="group-group-s2" class="[^"]*columns-\[3_15rem\]/);
  });

  it("renders group cards that filter on wide screens and expand on small ones", () => {
    const raw = render(source);
    expect(raw.match(/<article /g)).toHaveLength(9);
    expect(raw).toMatch(/aria-pressed="false"[^>]*>.*?Group S1/);
    expect(raw).toMatch(/aria-expanded="false" aria-controls="group-group-s1"/);
    // A group shown on its own is expanded, with a way back to all groups.
    const one = render(source, { search: "group=group-s1" });
    expect(one).toMatch(/aria-expanded="true" aria-controls="group-group-s1"/);
    expect(text(one)).toContain("All groups");
  });

  it("opens a deep-linked outcome in a dialog, server-rendered open before hydration", () => {
    const raw = render(source, { path: "/dictionary/V_01" });
    expect(raw).toMatch(/<dialog aria-labelledby="outcome-V_01-heading" data-ssr-open=""/);
    expect(render(source)).not.toContain("<dialog");
    // The open outcome's group is expanded on small screens, so closing returns to a visible link.
    expect(raw).toMatch(/aria-expanded="true" aria-controls="group-group-s1"/);
  });

  it("server-renders a deep-linked outcome inline for the split view too, as a region rather than a dialog", () => {
    const raw = render(source, { path: "/dictionary/V_01" });
    // CSS shows the inline panel from `lg` and the sheet below it until the page knows its width.
    expect(raw).toMatch(/<div style="[^"]*--cat-band:[^"]*" class="dictionary-panel /);
    expect(raw).toContain('<h2 id="entry-V_01-heading"');
    expect(raw).toMatch(/aria-labelledby="entry-V_01-heading" role="region"/);
    const panel = raw.slice(raw.indexOf('class="dictionary-panel'), raw.indexOf("<dialog"));
    expect(panel).not.toContain("Close");
    expect(panel).toContain("Copy link");
    expect(panel).toContain("Next →");
    expect(raw).not.toContain("Select an outcome");
  });

  it("shows a quiet placeholder beside the index when no outcome is selected, without selecting one", () => {
    const raw = render(source);
    expect(text(raw)).toContain("Select an outcome");
    expect(text(raw)).toContain("80 outcome domains · 2 categories · 9 group domains");
    expect(raw).not.toContain("dictionary-panel");
    expect(raw).not.toContain('aria-current="true"');
  });

  it("puts the category's colour in the entry's band, with legible text", () => {
    const raw = render(source, { path: "/dictionary/V_01" });
    expect(raw).toMatch(/--cat-band:#[0-9A-F]{6};--cat-band-text:#FFFFFF/);
    expect(raw).toContain("bg-[var(--cat-band)] text-[var(--cat-band-text)]");
  });

  it("sorts A–Z within each group, and offers best match only while searching", () => {
    const alpha = text(render(source, { search: "sort=alpha" }));
    expect(alpha).toContain("Dictionary order");
    expect(alpha).not.toContain("Best match");
    const searching = render(source, { search: "q=zest&sort=relevance" });
    expect(text(searching)).toContain("Best match");
    expect(searching).toContain('aria-label="Outcomes, best match first"');
    // The old "source" value still means dictionary order.
    expect(filtersFromSearchParams({ sort: "source" }).sort).toBe("auto");
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
    // The menu: the published languages by their own names only, without counts or status.
    expect(html).toMatch(/<option value="en" lang="en">English<\/option><option value="fr" lang="fr" selected="">Français<\/option><\/select>/);
    expect(html).not.toContain("(French)");
    const options = [...html.matchAll(/<option value="[a-z-]+" lang="[a-z-]+"[^>]*>([^<]*)<\/option>/gi)].map((m) => m[1]);
    expect(options).toEqual(["English", "Français"]);
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
