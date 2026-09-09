import Link from "next/link";

type PreviewLinkProps = {
  href: string;
  title: string;
  description: string;
};

export default function PreviewLink({ href, title, description }: PreviewLinkProps) {
  return (
    <li className="border-b border-border py-5 first:pt-0 last:border-b-0">
      <Link href={href} className="group flex items-start justify-between gap-4">
        <span>
          <span className="block text-base font-semibold text-ink transition-colors group-hover:text-accent">
            {title}
          </span>
          <span className="mt-1 block text-sm leading-relaxed text-ink-muted">
            {description}
          </span>
        </span>
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
        >
          →
        </span>
      </Link>
    </li>
  );
}
