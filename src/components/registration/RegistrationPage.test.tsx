import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { REGISTRATION_DEFAULTS } from "@/content/registration/defaults";
import type { RegistrationContent } from "@/content/registration/schema";
import RegistrationPage from "./RegistrationPage";
import RegistrationSuccess from "./RegistrationSuccess";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));
// The form posts through a server action; rendering doesn't call it.
vi.mock("@/app/registration/actions", () => ({ submitExpressionOfInterest: vi.fn() }));

const text = (html: string) =>
  html.replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

function edited(change: (draft: RegistrationContent) => void): RegistrationContent {
  const draft = structuredClone(REGISTRATION_DEFAULTS);
  change(draft);
  return draft;
}

describe("RegistrationPage", () => {
  const html = renderToStaticMarkup(<RegistrationPage content={REGISTRATION_DEFAULTS} />);
  const visible = text(html);

  it("renders all of the page's editorial text", () => {
    const { intro, form, beforeYouSubmit } = REGISTRATION_DEFAULTS;
    for (const fragment of [
      intro.eyebrow,
      intro.heading,
      intro.description,
      intro.note,
      form.heading,
      beforeYouSubmit.heading,
      ...beforeYouSubmit.points,
      "Read the full Privacy Policy for more detail on how your information is used and protected, or contact us at project.cosdepression@gmail.com.",
    ]) {
      expect(visible).toContain(fragment);
    }
  });

  it("keeps the privacy and contact links", () => {
    expect(html).toContain('<a href="/privacy" class="text-ink underline underline-offset-2 hover:text-accent">Privacy Policy</a>');
    expect(html).toContain('href="mailto:project.cosdepression@gmail.com"');
  });

  it("no longer asks for a country", () => {
    expect(html).not.toMatch(/name="country"/);
    expect(visible).not.toMatch(/country/i);
  });

  it("keeps the required fields and the consent statement", () => {
    expect(html).toMatch(/id="firstName"[^>]*required/);
    expect(html).toMatch(/id="email"[^>]*required/);
    expect(html).toMatch(/id="consent"[^>]*type="checkbox"[^>]*required|type="checkbox"[^>]*id="consent"|id="consent"[^>]*required/);
    expect(visible).toContain(
      "I have read and understood the Privacy Policy and consent to the processing of my personal data as described in it."
    );
    expect(html).toContain('name="ageGroup"');
    expect(html).toContain('name="preferredLanguage"');
  });

  it("shows edited wording", () => {
    const changed = renderToStaticMarkup(
      <RegistrationPage
        content={edited((c) => {
          c.intro.heading = "Join the COS-D study";
          c.beforeYouSubmit.points = ["Only one point now."];
        })}
      />
    );
    expect(changed).toContain("Join the COS-D study");
    expect(text(changed)).toContain("Only one point now.");
    expect(text(changed)).not.toContain(REGISTRATION_DEFAULTS.beforeYouSubmit.points[0]);
  });

  it("never renders editor text as HTML", () => {
    const changed = renderToStaticMarkup(
      <RegistrationPage content={edited((c) => (c.beforeYouSubmit.points[0] = '<script>alert(1)</script>'))} />
    );
    expect(changed).not.toContain("<script>");
    expect(changed).toContain("&lt;script&gt;");
  });
});

describe("RegistrationSuccess", () => {
  it("renders the thank-you wording", () => {
    const visible = text(renderToStaticMarkup(<RegistrationSuccess content={REGISTRATION_DEFAULTS} />));
    expect(visible).toContain("Thank you for your interest in COS-D.");
    expect(visible).toContain("We'll contact you when the COS-D survey opens.");
    expect(visible).toContain("Return to the homepage");
  });
});
