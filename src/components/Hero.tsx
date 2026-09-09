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
      <h1 className="max-w-3xl text-display-lg font-bold tracking-tight text-ink xl:max-w-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-5 max-w-2xl text-lead leading-relaxed text-ink-muted xl:max-w-3xl">
          {description}
        </p>
      )}
      {children && <div className="mt-8">{children}</div>}
    </Section>
  );
}
