"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { submitExpressionOfInterest } from "@/app/registration/actions";
import { AGE_GROUPS, LANGUAGES, validateSubmission, type SubmissionErrors } from "@/lib/registration/submission";

const fieldClasses =
  "mt-2 w-full border border-border bg-paper px-4 py-3 text-body text-ink";
const fieldErrorClasses = "border-red-600";
const labelClasses = "block text-sm font-medium text-ink";
const errorTextClasses = "mt-2 text-sm text-red-700";
const optionalTag = <span className="font-normal text-ink-muted">(optional)</span>;
const requiredMark = (
  <>
    <span aria-hidden="true" className="text-accent">
      {" "}
      *
    </span>
    <span className="sr-only"> (required)</span>
  </>
);

type FormErrors = SubmissionErrors;

/**
 * The Expression of Interest form. Developer-owned: fields, validation
 * (lib/registration/submission.ts), the consent statement and storage are
 * not editable in the CMS. Only the heading above it comes from content.
 *
 * `previewOnly` (admin preview) shows the form but never submits it, so
 * previewing the page can't create a real Expression of Interest.
 */
export default function RegistrationForm({ heading, previewOnly = false }: { heading: string; previewOnly?: boolean }) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
    setFirstName(event.target.value);
    if (errors.firstName) {
      setErrors((prev) => ({ ...prev, firstName: undefined }));
    }
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    setEmail(event.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  }

  function handleConsentChange(event: ChangeEvent<HTMLInputElement>) {
    setConsent(event.target.checked);
    if (errors.consent) {
      setErrors((prev) => ({ ...prev, consent: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = { firstName, email, ageGroup, preferredLanguage, consent };
    const checked = validateSubmission(input);
    const nextErrors: FormErrors = checked.ok ? {} : checked.errors;

    setErrors(nextErrors);

    if (nextErrors.firstName) {
      firstNameRef.current?.focus();
      return;
    }
    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.consent) {
      consentRef.current?.focus();
      return;
    }

    if (previewOnly) {
      setSubmitError("This is a preview: the form can't be submitted here.");
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await submitExpressionOfInterest(input);

      if (result.status === "validation_error") {
        setErrors(result.errors);
        if (result.errors.firstName) {
          firstNameRef.current?.focus();
        } else if (result.errors.email) {
          emailRef.current?.focus();
        } else if (result.errors.consent) {
          consentRef.current?.focus();
        }
        setIsSubmitting(false);
        return;
      }

      if (result.status === "server_error") {
        setSubmitError(result.message);
        setIsSubmitting(false);
        return;
      }
    } catch {
      setSubmitError(
        "Something went wrong while submitting your form. Please try again later."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="text-subheading font-semibold text-ink">{heading}</h2>

      {submitError && (
        <p
          role="alert"
          className="mt-4 border border-red-600 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {submitError}
        </p>
      )}

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className={labelClasses}>
              First name
              {requiredMark}
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={handleFirstNameChange}
              ref={firstNameRef}
              aria-invalid={errors.firstName ? true : undefined}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              className={`${fieldClasses} ${errors.firstName ? fieldErrorClasses : ""}`}
            />
            {errors.firstName && (
              <p id="firstName-error" className={errorTextClasses}>
                {errors.firstName}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="email" className={labelClasses}>
              Email address
              {requiredMark}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={handleEmailChange}
              ref={emailRef}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={`${fieldClasses} ${errors.email ? fieldErrorClasses : ""}`}
            />
            {errors.email && (
              <p id="email-error" className={errorTextClasses}>
                {errors.email}
              </p>
            )}
          </div>
        </div>

        <fieldset>
          <legend className={labelClasses}>Age group {optionalTag}</legend>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {AGE_GROUPS.map((group) => (
              <label
                key={group}
                className="flex items-center gap-2 py-1.5 text-body text-ink"
              >
                <input
                  type="radio"
                  name="ageGroup"
                  value={group}
                  checked={ageGroup === group}
                  onChange={(event) => setAgeGroup(event.target.value)}
                  className="h-4 w-4 accent-accent"
                />
                {group}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className={labelClasses}>
            Preferred language {optionalTag}
          </legend>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            {LANGUAGES.map((lang) => (
              <label
                key={lang}
                className="flex items-center gap-2 py-1.5 text-body text-ink"
              >
                <input
                  type="radio"
                  name="preferredLanguage"
                  value={lang}
                  checked={preferredLanguage === lang}
                  onChange={(event) => setPreferredLanguage(event.target.value)}
                  className="h-4 w-4 accent-accent"
                />
                {lang}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="border-t border-border pt-6">
          <div className="flex items-start gap-3">
            <input
              id="consent"
              name="consent"
              type="checkbox"
              required
              checked={consent}
              onChange={handleConsentChange}
              ref={consentRef}
              aria-invalid={errors.consent ? true : undefined}
              aria-describedby={errors.consent ? "consent-error" : undefined}
              className="mt-1 h-5 w-5 shrink-0 accent-accent"
            />
            <label
              htmlFor="consent"
              className="text-sm leading-relaxed text-ink-muted"
            >
              I have read and understood the{" "}
              <Link
                href="/privacy"
                className="text-ink underline underline-offset-2 hover:text-accent"
              >
                Privacy Policy
              </Link>{" "}
              and consent to the processing of my personal data as described
              in it.
              {requiredMark}
            </label>
          </div>
          {errors.consent && (
            <p id="consent-error" className={`${errorTextClasses} pl-8`}>
              {errors.consent}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`btn ${isSubmitting ? "cursor-not-allowed opacity-60" : ""}`}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting…" : "Submit expression of interest"}
        </button>
      </form>
    </div>
  );
}
