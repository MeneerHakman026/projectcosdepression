import { type ReactNode } from "react";

type SectionWidth = "narrow" | "default" | "wide";

const WIDTH_CLASSES: Record<SectionWidth, string> = {
  narrow: "max-w-2xl 3xl:max-w-[46rem]",
  default: "max-w-5xl 3xl:max-w-6xl 4xl:max-w-7xl",
  wide: "max-w-6xl 3xl:max-w-7xl 4xl:max-w-[100rem]",
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
      <div className={`mx-auto ${WIDTH_CLASSES[width]} px-6 py-16 md:py-24 ${className}`}>
        {children}
      </div>
    </section>
  );
}
