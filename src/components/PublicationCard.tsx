type PublicationCardProps = {
  title: string;
  authors: string;
  venue?: string;
  year?: string | number;
  href?: string;
};

export default function PublicationCard({
  title,
  authors,
  venue,
  year,
  href,
}: PublicationCardProps) {
  const meta = [venue, year].filter(Boolean).join(" · ");

  return (
    <article className="border-b border-border py-6 first:pt-0 last:border-b-0">
      <h3 className="text-lg font-semibold text-ink">
        {href ? (
          <a
            href={href}
            className="text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
          >
            {title}
          </a>
        ) : (
          title
        )}
      </h3>
      <p className="mt-1 text-sm text-ink-muted">{authors}</p>
      {meta && <p className="mt-1 text-sm text-ink-muted">{meta}</p>}
    </article>
  );
}
