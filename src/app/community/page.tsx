import type { Metadata } from "next";
import Hero from "@/components/Hero";
import Section from "@/components/Section";

export const metadata: Metadata = {
  title: "Community",
  description: "Testimonials and stories from people involved in COS-D.",
};

export default function CommunityPage() {
  return (
    <>
      <Hero
        eyebrow="COS-D"
        title="Community"
        description="Testimonials and stories from people involved in COS-D will appear here."
      />
      <Section width="narrow" divider>
        <p className="leading-relaxed text-ink-muted">
          This page is a placeholder. Testimonials will be added once
          available.
        </p>
      </Section>
    </>
  );
}
