import { type ReactNode } from "react";
import Section from "./Section";

type HeroProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
};

export default function Hero({ eyebrow, title, description, children }: HeroProps) {
  return (
    <Section width="default">
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-accent">
          {eyebrow}
        </p>
      )}
      <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      {description && (
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
      {children && <div className="mt-8">{children}</div>}
    </Section>
  );
}
