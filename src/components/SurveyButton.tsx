import { type ReactNode } from "react";
import Link from "next/link";
import { SURVEY_URL } from "@/lib/site-config";

type SurveyButtonProps = {
  /** Defaults to the site-wide Expression of Interest destination. */
  href?: string;
  variant?: "primary" | "secondary";
  compact?: boolean;
  className?: string;
  children?: ReactNode;
};

export default function SurveyButton({
  href = SURVEY_URL,
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

  const label = children ?? "Expression of interest";

  // Kept so a placeholder URL ("#") still degrades to the inert "not yet
  // open" state instead of rendering a dead link.
  if (href === "#") {
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
    <Link href={href} className={classes}>
      {label}
    </Link>
  );
}
