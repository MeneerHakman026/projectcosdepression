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
      <Section width="narrow" divider>
        <h2 className="text-subheading font-semibold text-ink">
          Follow us on Instagram
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-muted">
          For updates and behind-the-scenes glimpses of the COS-D community
          between page updates, follow along on Instagram.
        </p>
        <a
          href="https://www.instagram.com/project.cosd"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="COS-D on Instagram"
          className="btn btn-primary mt-6"
        >
          Follow @project.cosd
        </a>
      </Section>
    </>
  );
}
