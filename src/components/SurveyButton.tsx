import { type ReactNode } from "react";
import { SURVEY_URL } from "@/lib/site-config";

type SurveyButtonProps = {
  variant?: "primary" | "secondary";
  compact?: boolean;
  className?: string;
  children?: ReactNode;
};

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

  return (
    <a href={SURVEY_URL} className={classes}>
      {children ?? "Take the survey"}
    </a>
  );
}
