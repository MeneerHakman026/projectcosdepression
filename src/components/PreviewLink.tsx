import Link from "next/link";

type PreviewLinkProps = {
  href: string;
  title: string;
  description: string;
  index: number;
};

export default function PreviewLink({ href, title, description, index }: PreviewLinkProps) {
  return (
    <li className="border-b border-border py-5 first:pt-0 last:border-b-0 xl:py-7">
      <Link href={href} className="group flex items-start justify-between gap-4 xl:gap-8">
        <span className="flex items-start gap-4 xl:gap-6">
          {/* Ordinal — desktop-only editorial cue, tying the four destinations
              into a numbered sequence now that the section has room for one. */}
          <span
            aria-hidden="true"
            className="hidden pt-1 text-body tabular-nums text-ink-muted/50 xl:block xl:text-lead"
          >
            {String(index).padStart(2, "0")}
          </span>
          <span>
            <span className="block text-body font-semibold text-ink transition-colors group-hover:text-accent xl:text-subheading">
              {title}
            </span>
            <span className="mt-1 block max-w-md text-body leading-relaxed text-ink-muted xl:mt-2 xl:text-lead">
              {description}
            </span>
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent xl:mt-2"
        >
          →
        </span>
      </Link>
    </li>
  );
}
