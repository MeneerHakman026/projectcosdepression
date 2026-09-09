type TestimonialCardProps = {
  quote: string;
  role: string;
  accent: "teal" | "mint" | "navy";
};

const ACCENT_CLASSES: Record<TestimonialCardProps["accent"], string> = {
  teal: "border-teal",
  mint: "border-mint",
  navy: "border-navy",
};

export default function TestimonialCard({ quote, role, accent }: TestimonialCardProps) {
  return (
    <figure className={`flex h-full flex-col gap-5 border-t-4 pt-5 ${ACCENT_CLASSES[accent]}`}>
      <blockquote className="text-base leading-relaxed text-ink">
        <p>&ldquo;{quote}&rdquo;</p>
      </blockquote>
      <figcaption className="mt-auto text-sm font-medium text-ink-muted">{role}</figcaption>
    </figure>
  );
}
