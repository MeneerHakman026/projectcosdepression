import Link from "next/link";
import type { EoiButtonLink } from "@/lib/eoi-button";

type SurveyButtonProps = {
  /**
   * The resolved site-wide Expression of Interest button (label and
   * destination), from getEoiButton() in lib/eoi-button.server.ts. Every
   * EOI button takes it from there, so they always agree.
   */
  button: EoiButtonLink;
  variant?: "primary" | "secondary";
  compact?: boolean;
  className?: string;
};

export default function SurveyButton({ button, variant = "primary", compact = false, className = "" }: SurveyButtonProps) {
  const classes = [
    "btn",
    variant === "primary" && "btn-primary",
    compact && "btn-compact",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (button.external) {
    // An ordinary link in the same tab: the visitor is moving on to the
    // study's own registration site. No redirect through this site, and no
    // window.opener access (that only applies to target="_blank" links,
    // which this deliberately isn't).
    return (
      <a href={button.href} className={classes}>
        {button.label}
      </a>
    );
  }

  return (
    <Link href={button.href} className={classes}>
      {button.label}
    </Link>
  );
}
