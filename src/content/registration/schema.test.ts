import { describe, expect, it } from "vitest";
import { toFieldErrors } from "@/lib/cms/validation";
import { REGISTRATION_DEFAULTS } from "./defaults";
import { registrationContentSchema, type RegistrationContent } from "./schema";

function withChanges(change: (draft: RegistrationContent) => void): RegistrationContent {
  const draft = structuredClone(REGISTRATION_DEFAULTS);
  change(draft);
  return draft;
}

function errorsFor(content: unknown) {
  const result = registrationContentSchema.safeParse(content);
  return result.success ? {} : toFieldErrors(result.error);
}

describe("registrationContentSchema", () => {
  it("accepts the built-in registration content unchanged", () => {
    expect(registrationContentSchema.parse(REGISTRATION_DEFAULTS)).toEqual(REGISTRATION_DEFAULTS);
  });

  it("carries over the page's original wording exactly", () => {
    // Copied from app/registration/page.tsx and success/page.tsx before
    // the page became editable.
    expect(REGISTRATION_DEFAULTS.intro).toEqual({
      eyebrow: "Expression of Interest",
      heading: "Interested in taking part in COS-D?",
      description:
        "The COS-D survey is not open yet. You can leave your contact details and we will let you know when participation becomes available.",
      note: "Submitting an Expression of Interest is not registration for the COS-D survey and does not affect your eligibility to take part later.",
    });
    expect(REGISTRATION_DEFAULTS.form.heading).toBe("Expression of interest form");
    expect(REGISTRATION_DEFAULTS.beforeYouSubmit.heading).toBe("Before you submit");
    expect(REGISTRATION_DEFAULTS.beforeYouSubmit.points).toEqual([
      "Submitting an Expression of Interest is voluntary.",
      "Your first name, email address and consent are required if you choose to submit an Expression of Interest.",
      // Was "Country of residence, age group and preferred language are
      // optional." — Country was removed from the form.
      "Age group and preferred language are optional.",
      "We collect this information so we can let you know when the COS-D survey becomes available.",
      "Optional background information helps give us an indication of the range and characteristics of people expressing interest.",
      "Expression of Interest data is kept for no longer than 14 days after the Expression of Interest period closes.",
    ]);
    expect(REGISTRATION_DEFAULTS.seo).toEqual({
      title: "Expression of interest",
      description:
        "Leave your contact details and we'll let you know when the COS-D survey opens for participation.",
    });
    expect(REGISTRATION_DEFAULTS.success).toEqual({
      heading: "Thank you for your interest in COS-D.",
      description: "We'll contact you when the COS-D survey opens.",
      homeLinkLabel: "Return to the homepage",
    });
  });

  it("no longer mentions the removed Country field", () => {
    expect(JSON.stringify(REGISTRATION_DEFAULTS)).not.toMatch(/country/i);
  });

  it("requires headings", () => {
    expect(errorsFor(withChanges((c) => (c.intro.heading = " ")))).toHaveProperty(["intro.heading"]);
    expect(errorsFor(withChanges((c) => (c.beforeYouSubmit.heading = "")))).toHaveProperty([
      "beforeYouSubmit.heading",
    ]);
  });

  it("rejects unsafe links in the explanatory text", () => {
    const errors = errorsFor(
      withChanges((c) => (c.beforeYouSubmit.closing = "Read the [policy](javascript:void).")
    ));
    expect(errors["beforeYouSubmit.closing"]?.[0]).toMatch(/isn't allowed/);
    expect(
      errorsFor(withChanges((c) => (c.beforeYouSubmit.points[0] = "[x](data:text/html,hi)")))
    ).toHaveProperty(["beforeYouSubmit.points.0"]);
  });

  it("keeps between 1 and 12 points", () => {
    expect(errorsFor(withChanges((c) => (c.beforeYouSubmit.points = [])))).toHaveProperty(["beforeYouSubmit.points"]);
    expect(
      errorsFor(withChanges((c) => (c.beforeYouSubmit.points = Array.from({ length: 13 }, () => "Point"))))
    ).toHaveProperty(["beforeYouSubmit.points"]);
  });

  it("has no fields that control the form itself", () => {
    // Anything an editor (or a crafted request) adds is dropped, so form
    // fields, validation, consent and storage can't be set from content.
    const parsed = registrationContentSchema.parse({
      ...REGISTRATION_DEFAULTS,
      form: { heading: "Form", fields: ["country"], endpoint: "/api/x", requireConsent: false },
      retentionDays: 365,
    });
    expect(parsed.form).toEqual({ heading: "Form" });
    expect(parsed).not.toHaveProperty("retentionDays");
  });
});
