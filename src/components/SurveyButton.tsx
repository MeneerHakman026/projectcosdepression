import { type ReactNode } from "react";
import { SURVEY_URL } from "@/lib/site-config";

type SurveyButtonProps = {
  variant?: "primary" | "secondary";
  compact?: boolean;
  className?: string;
  children?: ReactNode;
};

/**
 * The external survey isn't live yet — SURVEY_URL is still the "#"
 * placeholder in site-config.ts. Until Chris supplies the real URL, every
 * instance of this button (homepage, header, mobile nav) renders as an
 * inert "not yet open" state instead of linking anywhere, so the site never
 * implies a survey exists that a visitor could actually take. Once
 * SURVEY_URL is set to a real address, every instance becomes a working
 * link automatically — no other change needed.
 */
const SURVEY_IS_LIVE = SURVEY_URL !== "#";

export default function SurveyButton({
  variant = "primary",
  compact = false,
  className = "",
  children,
}: SurveyButtonProps) {
  const classes = [
    "btn",
    variant === "primary" && "btn-primary",
    compact && "btn-compact",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const label = children ?? "Take the survey";

  if (!SURVEY_IS_LIVE) {
    return (
      <span aria-disabled="true" className={`${classes} cursor-not-allowed opacity-60`}>
        <span aria-hidden="true">{label}</span>
        <span aria-hidden="true" className="text-[0.625rem] font-semibold normal-case tracking-normal">
          (soon)
        </span>
        <span className="sr-only">The survey is not open yet.</span>
      </span>
    );
  }

  return (
    <a href={SURVEY_URL} className={classes}>
      {label}
    </a>
  );
}
