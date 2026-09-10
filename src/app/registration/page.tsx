import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import { COUNTRIES } from "@/lib/countries";

export const metadata: Metadata = {
  title: "Expression of interest",
  description:
    "Leave your contact details and we'll let you know when the COS-D survey opens for participation.",
};

const AGE_GROUPS = ["18 to 29", "30 to 39", "40 to 49", "50 to 64", "65+"];
const LANGUAGES = ["English", "French", "German", "Italian", "Spanish"];

const fieldClasses =
  "mt-2 w-full border border-border bg-paper px-4 py-3 text-body text-ink";
const labelClasses = "block text-sm font-medium text-ink";
const optionalTag = <span className="font-normal text-ink-muted">(optional)</span>;
const requiredMark = (
  <>
    <span aria-hidden="true" className="text-accent">
      {" "}
      *
    </span>
    <span className="sr-only"> (required)</span>
  </>
);

export default function RegistrationPage() {
  return (
    <>
      <Hero
        eyebrow="Expression of Interest"
        title="Interested in taking part in COS-D?"
        description="The COS-D survey is not open yet. You can leave your contact details and we will let you know when participation becomes available."
      >
        <div className="max-w-2xl border-l-4 border-teal pl-5 xl:max-w-3xl">
          <p className="text-body leading-relaxed text-ink-muted">
            Submitting an Expression of Interest is not registration for the
            COS-D survey and does not affect your eligibility to take part
            later.
          </p>
        </div>
      </Hero>

      <Section width="wide" divider>
        <div className="lg:grid lg:grid-cols-[1.4fr_1fr] lg:items-start lg:gap-x-[clamp(3rem,-1.5rem+9vw,6rem)]">
          {/* Expression of interest form */}
          <div>
            <h2 className="text-subheading font-semibold text-ink">
              Expression of interest form
            </h2>

            <form className="mt-6 space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className={labelClasses}>
                    First name
                    {requiredMark}
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    className={fieldClasses}
                  />
                </div>

                <div>
                  <label htmlFor="email" className={labelClasses}>
                    Email address
                    {requiredMark}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={fieldClasses}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="country" className={labelClasses}>
                  Country of residence {optionalTag}
                </label>
                <select
                  id="country"
                  name="country"
                  defaultValue=""
                  className={fieldClasses}
                >
                  <option value="">Select a country</option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>

              <fieldset>
                <legend className={labelClasses}>
                  Age group {optionalTag}
                </legend>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                  {AGE_GROUPS.map((group) => (
                    <label
                      key={group}
                      className="flex items-center gap-2 py-1.5 text-body text-ink"
                    >
                      <input
                        type="radio"
                        name="ageGroup"
                        value={group}
                        className="h-4 w-4 accent-accent"
                      />
                      {group}
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={labelClasses}>
                  Preferred language {optionalTag}
                </legend>
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                  {LANGUAGES.map((lang) => (
                    <label
                      key={lang}
                      className="flex items-center gap-2 py-1.5 text-body text-ink"
                    >
                      <input
                        type="radio"
                        name="preferredLanguage"
                        value={lang}
                        className="h-4 w-4 accent-accent"
                      />
                      {lang}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex items-start gap-3 border-t border-border pt-6">
                <input
                  id="consent"
                  name="consent"
                  type="checkbox"
                  required
                  className="mt-1 h-5 w-5 shrink-0 accent-accent"
                />
                <label
                  htmlFor="consent"
                  className="text-sm leading-relaxed text-ink-muted"
                >
                  I have read and understood the{" "}
                  <Link
                    href="/privacy"
                    className="text-ink underline underline-offset-2 hover:text-accent"
                  >
                    Privacy Policy
                  </Link>{" "}
                  and consent to the processing of my personal data as
                  described in it.
                  {requiredMark}
                </label>
              </div>

              {/*
                Submission behaviour (validation, sending, success state) is
                out of scope for this task — see WEBSITE_REQUIREMENTS.md
                prompt 3. `type="button"` keeps this control inert so no
                data is transmitted or a success state faked.
              */}
              <button type="button" className="btn">
                Submit expression of interest
              </button>
            </form>
          </div>

          {/* Supporting information */}
          <div className="mt-composition-gap lg:mt-0">
            <h2 className="text-subheading font-semibold text-ink">
              Before you submit
            </h2>
            <ul className="mt-4 space-y-3 text-body leading-relaxed text-ink-muted">
              <li>Submitting an Expression of Interest is voluntary.</li>
              <li>
                Your first name, email address and consent are required if
                you choose to submit an Expression of Interest.
              </li>
              <li>
                Country of residence, age group and preferred language are
                optional.
              </li>
              <li>
                We collect this information so we can let you know when the
                COS-D survey becomes available.
              </li>
              <li>
                Optional background information helps give us an indication
                of the range and characteristics of people expressing
                interest.
              </li>
              <li>
                Expression of Interest data is kept for no longer than 14
                days after the Expression of Interest period closes.
              </li>
            </ul>

            <p className="mt-6 text-body leading-relaxed text-ink-muted">
              Read the full{" "}
              <Link
                href="/privacy"
                className="text-ink underline underline-offset-2 hover:text-accent"
              >
                Privacy Policy
              </Link>{" "}
              for more detail on how your information is used and protected,
              or contact us at{" "}
              <a
                href="mailto:project.cosdepression@gmail.com"
                className="text-ink underline underline-offset-2 hover:text-accent"
              >
                project.cosdepression@gmail.com
              </a>
              .
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
