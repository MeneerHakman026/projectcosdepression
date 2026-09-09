type PlaceholderImageProps = {
  /** Visible, plain-language description of what will go here. Not alt text — real alt text is written when a real image is added. */
  label: string;
  aspect?: string;
  className?: string;
};

/**
 * Stand-in for real photography, which has not been supplied yet (final
 * image style is still to be determined — see docs/WEBSITE_REQUIREMENTS.md
 * §8). Deliberately styled as an obvious placeholder (dashed border, visible
 * caption) so it can't be mistaken for finished content.
 */
export default function PlaceholderImage({
  label,
  aspect = "aspect-[4/3]",
  className = "",
}: PlaceholderImageProps) {
  return (
    <div
      className={`flex ${aspect} w-full items-center justify-center border border-dashed border-border bg-paper p-6 text-center ${className}`}
    >
      <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
        <span className="block text-xs font-semibold uppercase tracking-wide text-ink-muted/80">
          Image placeholder
        </span>
        {label}
      </p>
    </div>
  );
}
