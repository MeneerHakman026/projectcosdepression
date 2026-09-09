type TriMarkProps = {
  className?: string;
};

/**
 * Small three-segment colour mark (teal / mint / navy) used as a quiet,
 * abstract nod to the COS-D logo's three tears coming together — without
 * repeating the literal tear icon throughout the page.
 */
export default function TriMark({ className = "" }: TriMarkProps) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-1 w-12 overflow-hidden ${className}`}
    >
      <span className="w-1/3 bg-teal" />
      <span className="w-1/3 bg-mint" />
      <span className="w-1/3 bg-navy" />
    </span>
  );
}
