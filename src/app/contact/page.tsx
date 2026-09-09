import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch about COS-D.",
};

export default function ContactPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="Contact"
        description="CHRIS IS A BADASS"
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. Contact details will be added in a
          future update.
        </p>
      </Section>
    </>
  );
}
