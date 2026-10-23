import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/lib/cms/validation";
import { HOME_DEFAULTS } from "./defaults";
import { homeContentSchema, type HomeContent } from "./schema";

function withChanges(change: (draft: HomeContent) => void): HomeContent {
  const draft = structuredClone(HOME_DEFAULTS);
  change(draft);
  return draft;
}

function errorsFor(content: unknown) {
  const result = homeContentSchema.safeParse(content);
  return result.success ? {} : toFieldErrors(result.error);
}

describe("homeContentSchema", () => {
  it("accepts the built-in homepage content unchanged", () => {
    const result = homeContentSchema.safeParse(HOME_DEFAULTS);
    expect(result.success).toBe(true);
    // Validation must not alter any existing wording or figures.
    expect(result.data).toEqual(HOME_DEFAULTS);
  });

  it("keeps every research figure exactly as sourced", () => {
    expect(HOME_DEFAULTS.evidence.metrics.map((metric) => [metric.value, metric.sourceLabel, metric.year])).toEqual([
      ["80", "Chevance et al.", "2020"],
      ["<25%", "Veal et al.", "2024/2026"],
      ["388", "Veal et al.", "2024"],
      ["9%", "Veal et al.", "2024"],
    ]);
    expect(HOME_DEFAULTS.development.participation.count).toBeNull();
  });

  it("requires headings", () => {
    expect(errorsFor(withChanges((c) => (c.hero.heading = "   ")))).toHaveProperty(["hero.heading"]);
  });

  it("rejects unsafe button links", () => {
    const errors = errorsFor(withChanges((c) => (c.hero.primaryCta.href = "javascript:alert(1)")));
    expect(errors).toHaveProperty(["hero.primaryCta.href"]);
  });

  it("rejects unsafe links inside formatted text", () => {
    const errors = errorsFor(withChanges((c) => (c.about.body = "See [this](data:text/html,hi).")));
    expect(errors["about.body"]?.[0]).toMatch(/isn't allowed/);
  });

  it("rejects remote images", () => {
    expect(errorsFor(withChanges((c) => (c.hero.image.src = "https://example.com/a.png")))).toHaveProperty([
      "hero.image.src",
    ]);
  });

  it("requires every research figure to cite a source", () => {
    const errors = errorsFor(withChanges((c) => (c.evidence.metrics[0].citations = [])));
    expect(errors).toHaveProperty(["evidence.metrics.0.citations"]);
  });

  it("rejects citations of sources that aren't in the list", () => {
    const errors = errorsFor(withChanges((c) => (c.references = c.references.filter((r) => r.id !== "veal-2024"))));
    expect(errors).toHaveProperty(["evidence.metrics.1.citations.1.referenceId"]);
    expect(errors).toHaveProperty(["evidence.metrics.2.citations.0.referenceId"]);
  });

  it("rejects duplicate source IDs", () => {
    const errors = errorsFor(withChanges((c) => c.references.push({ ...c.references[0] })));
    expect(errors).toHaveProperty([`references.${HOME_DEFAULTS.references.length}.id`]);
  });

  it("rejects a malformed DOI but allows it to be blank", () => {
    expect(errorsFor(withChanges((c) => (c.references[0].doi = "not-a-doi")))).toHaveProperty(["references.0.doi"]);
    expect(errorsFor(withChanges((c) => (c.references[0].doi = "10.1234/example.5678")))).toEqual({});
  });

  it("stops a button pointing at a hidden section", () => {
    const errors = errorsFor(withChanges((c) => (c.about.visible = false)));
    expect(errors).toHaveProperty(["hero.secondaryCta.href"]);
  });

  it("limits list sizes so layouts can't be broken", () => {
    const errors = errorsFor(
      withChanges((c) => (c.evidence.metrics = Array.from({ length: 9 }, () => c.evidence.metrics[0])))
    );
    expect(errors).toHaveProperty(["evidence.metrics"]);
  });

  it("rejects unknown colour choices", () => {
    const content = withChanges((c) => ((c.development.steps[0] as { accent: string }).accent = "red"));
    expect(errorsFor(content)).toHaveProperty(["development.steps.0.accent"]);
  });
});
