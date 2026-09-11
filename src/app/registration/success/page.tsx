import type { Metadata } from "next";
import Link from "next/link";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Expression of interest received",
  description: "Thank you for your interest in COS-D.",
};

export default function RegistrationSuccessPage() {
  return (
    <>
      <Hero
        eyebrow="Expression of Interest"
        title="Thank you for your interest in COS-D."
        description="We'll contact you when the COS-D survey opens."
      />
      <Section width="narrow" divider>
        <Link
          href="/"
          className="text-ink underline underline-offset-2 hover:text-accent"
        >
          Return to the homepage
        </Link>
      </Section>
    </>
  );
}
