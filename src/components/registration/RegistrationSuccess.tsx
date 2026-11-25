import Link from "next/link";
import Hero from "@/components/Hero";
import Section from "@/components/Section";
import type { RegistrationContent } from "@/content/registration/schema";

/** Thank-you page shown after an Expression of Interest is submitted. */
export default function RegistrationSuccess({ content }: { content: RegistrationContent }) {
  const { intro, success } = content;
  return (
    <>
      <Hero eyebrow={intro.eyebrow} title={success.heading} description={success.description} />
      <Section width="narrow" divider>
        <Link href="/" className="text-ink underline underline-offset-2 hover:text-accent">
          {success.homeLinkLabel}
        </Link>
      </Section>
    </>
  );
}
