import Hero from "@/components/Hero";
import RegistrationForm from "@/components/RegistrationForm";
import RichText from "@/components/RichText";
import Section from "@/components/Section";
import type { RegistrationContent } from "@/content/registration/schema";

/**
 * Expression of Interest page layout. The wording comes from `content`
 * (Admin → Content → Registration; defaults in
 * content/registration/defaults.ts). The form itself is code-owned and not
 * editable — see components/RegistrationForm.tsx. Rendered by both the
 * public page and the admin preview.
 */
export default function RegistrationPage({
  content,
  previewOnly = false,
}: {
  content: RegistrationContent;
  /** Admin preview: the form is shown but can't be submitted. */
  previewOnly?: boolean;
}) {
  const { intro, form, beforeYouSubmit } = content;

  return (
    <>
      <Hero eyebrow={intro.eyebrow} title={intro.heading} description={intro.description}>
        <div className="max-w-2xl border-l-4 border-teal pl-5 xl:max-w-3xl">
          <p className="text-body leading-relaxed text-ink-muted">
            <RichText text={intro.note} />
          </p>
        </div>
      </Hero>

      <Section width="wide" divider>
        <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-x-[clamp(3rem,-1.5rem+9vw,6rem)]">
          {/* Expression of interest form */}
          <RegistrationForm heading={form.heading} previewOnly={previewOnly} />

          {/* Supporting information */}
          <div className="mt-composition-gap lg:mt-0">
            <h2 className="text-subheading font-semibold text-ink">{beforeYouSubmit.heading}</h2>
            <ul className="mt-4 space-y-3 text-body leading-relaxed text-ink-muted">
              {beforeYouSubmit.points.map((point, index) => (
                <li key={index}>
                  <RichText text={point} />
                </li>
              ))}
            </ul>

            <p className="mt-6 text-body leading-relaxed text-ink-muted">
              <RichText text={beforeYouSubmit.closing} />
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
