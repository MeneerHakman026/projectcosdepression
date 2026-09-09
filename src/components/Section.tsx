import { type ReactNode } from "react";

type SectionWidth = "narrow" | "default" | "wide";

const WIDTH_CLASSES: Record<SectionWidth, string> = {
  narrow: "max-w-narrow",
  default: "max-w-default",
  wide: "max-w-wide",
};

type SectionProps = {
  children: ReactNode;
  width?: SectionWidth;
  divider?: boolean;
  className?: string;
  id?: string;
};

export default function Section({
  children,
  width = "default",
  divider = false,
  className = "",
  id,
}: SectionProps) {
  return (
    <section id={id} className={divider ? "border-t border-border" : undefined}>
      <div className={`mx-auto ${WIDTH_CLASSES[width]} px-gutter py-16 md:py-24 ${className}`}>
        {children}
      </div>
    </section>
  );
}
