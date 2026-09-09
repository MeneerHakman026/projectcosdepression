type ParticipationStatProps = {
  /**
   * Real, current COS-D participation count. Leave unset until Chris
   * confirms the Step 2 survey has opened and supplies a real figure (see
   * docs/CONTENT_SOURCES.md, "Requires confirmation from Chris", item 1).
   *
   * Do not fill this with PROCEED's 3,003 participants, or with Step 2's
   * recruitment targets (2,000 / 500 / 300) — both describe something other
   * than current COS-D enrolment (see CONTENT_SOURCES.md §3, rows 1 and 17).
   */
  count?: number;
  label?: string;
};

export default function ParticipationStat({
  count,
  label = "people have taken part in COS-D's Step 2 survey so far.",
}: ParticipationStatProps) {
  if (count == null) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-subheading font-semibold text-ink">
          Recruitment hasn&apos;t opened yet
        </p>
        <p className="max-w-xs text-sm leading-relaxed text-ink-muted">
          The Step 2 survey isn&apos;t live yet. Once it is, real participation
          figures will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-5xl font-bold tracking-tight text-ink sm:text-6xl">
        {count.toLocaleString()}
      </p>
      <p className="max-w-xs text-base leading-relaxed text-ink-muted">{label}</p>
    </div>
  );
}
