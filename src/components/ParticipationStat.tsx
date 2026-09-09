/**
 * PLACEHOLDER CONTENT.
 * No real participation figure has been supplied yet (see
 * docs/WEBSITE_REQUIREMENTS.md §18, "Participant count / study statistics").
 * Deliberately rendered as an unfilled figure, rather than an invented
 * number, so this can never be mistaken for a real statistic.
 */
export default function ParticipationStat() {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-5xl font-bold tracking-tight text-ink sm:text-6xl">[ number ]</p>
      <p className="max-w-xs text-base leading-relaxed text-ink-muted">
        people have taken part in COS-D so far.
      </p>
      <p className="text-xs text-ink-muted/80">
        Placeholder — actual participation figures will be added once available.
      </p>
    </div>
  );
}
