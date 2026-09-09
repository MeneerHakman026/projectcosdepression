import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Media & Webinars",
  description: "Videos, webinars, and media coverage related to COS-D.",
};

export default function MediaPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="Media & webinars"
        description="Videos, webinars and media coverage related to COS-D will appear here."
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. Media content will be added once
          available, including embedded video where appropriate.
        </p>
      </Section>
    </>
  );
}
