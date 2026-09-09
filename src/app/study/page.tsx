import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Study & FAQs",
  description: "Study information and frequently asked questions for COS-D.",
};

export default function StudyPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="Study information & FAQs"
        description="Details about the study and answers to common questions will appear here."
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. Study information and FAQ content will
          be added once available.
        </p>
      </Section>
    </>
  );
}
