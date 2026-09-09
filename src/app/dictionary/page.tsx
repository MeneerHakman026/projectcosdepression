import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Depression Dictionary",
  description: "Plain-language explanations of terms used by COS-D.",
};

export default function DictionaryPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="Depression Dictionary"
        description="Plain-language explanations of terms used throughout the study will appear here."
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. Dictionary entries will be added once
          available.
        </p>
      </Section>
    </>
  );
}
