import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import RegistrationForm from "@/components/RegistrationForm";

export const metadata: Metadata = {
  title: "Expression of interest",
  description:
    "Leave your contact details and we'll let you know when the COS-D survey opens for participation.",
};

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
          <RegistrationForm />

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
