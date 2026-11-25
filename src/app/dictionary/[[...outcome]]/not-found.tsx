import Link from "next/link";
import Section from "@/components/Section";

export default function OutcomeNotFound() {
  return (
    <Section width="narrow">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">Outcome Dictionary</p>
      <h1 className="mt-2 text-heading font-bold tracking-tight text-ink">This outcome isn&apos;t in the dictionary</h1>
      <p className="mt-4 text-body leading-relaxed text-ink-muted">
        The link may be mistyped, or the outcome may have been removed or renamed in a newer version of the dictionary.
      </p>
      <p className="mt-8">
        <Link href="/dictionary" className="btn">
          Browse the Outcome Dictionary
        </Link>
      </p>
    </Section>
  );
}
