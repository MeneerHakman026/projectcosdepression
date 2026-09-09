import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "About",
  description: "About the COS-D project.",
};

export default function AboutPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="About the project"
        description="An introduction to COS-D, who it involves, and why it matters will appear here."
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. About page content will be added once
          available.
        </p>
      </Section>
    </>
  );
}
