import type { ResearchMetricContent } from "@/content/home/schema";

const ACCENT_CLASSES = ["border-teal", "border-mint", "border-navy", "border-accent"];

/**
 * Displays the evidence behind COS-D (docs/CONTENT_SOURCES.md §3) — earlier
 * research findings, not current COS-D participation. Keep those two kinds
 * of number visually and verbally distinct; see ParticipationStat for the
 * latter.
 */
export default function ResearchMetrics({ metrics }: { metrics: ResearchMetricContent[] }) {
  return (
    <div className="grid gap-grid-gap sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={`${index}-${metric.label}`}
          className={`border-t-4 pt-5 ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]}`}
        >
          <p className="text-display font-bold tracking-tight text-ink">{metric.value}</p>
          <p className="mt-2 text-body font-semibold text-ink">{metric.label}</p>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{metric.context}</p>
          <p className="mt-4 text-xs text-ink-muted/70">
            {metric.sourceLabel}, {metric.year}
          </p>
        </div>
      ))}
    </div>
  );
}
