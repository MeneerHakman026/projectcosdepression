import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Publications",
  description: "Papers, preprints, and other outputs from COS-D.",
};

export default function PublicationsPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="Publications"
        description="A list of papers, preprints, and other outputs from this project will appear here."
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. Publications will be listed here as
          they become available.
        </p>
      </Section>
    </>
  );
}
