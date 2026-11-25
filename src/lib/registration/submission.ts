/**
 * Validation for the Expression of Interest form, shared by the browser
 * (components/RegistrationForm.tsx) and the server action
 * (app/registration/actions.ts). The server always re-validates: the
 * browser check is only for fast feedback.
 *
 * Developer-owned: the fields, their rules and the consent requirement are
 * deliberately not editable in the CMS.
 */

export const AGE_GROUPS = ["18 to 29", "30 to 39", "40 to 49", "50 to 64", "65+"];
export const LANGUAGES = ["English", "French", "German", "Italian", "Spanish"];

// Standard "good enough" shape check (something@something.tld). Not
// exhaustive RFC 5322 validation — that would reject or accept the wrong
// things either way and isn't the goal here.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONSENT_REQUIRED_MESSAGE = "Please confirm that you have read and understood the Privacy Policy.";

export type SubmissionErrors = {
  firstName?: string;
  email?: string;
  consent?: string;
};

export type SubmissionValues = {
  firstName: string;
  email: string;
  ageGroup: string | null;
  preferredLanguage: string | null;
  consent: true;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Checks a submission and returns the values to store. Accepts unknown
 * input because it runs on whatever a browser sent. Fields that aren't part
 * of the form any more (such as the removed "country") are ignored, so a
 * page that was open during a deploy can still submit.
 */
export function validateSubmission(
  input: unknown
): { ok: true; values: SubmissionValues } | { ok: false; errors: SubmissionErrors } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const firstName = text(raw.firstName);
  const email = text(raw.email);
  const consent = raw.consent === true;

  const errors: SubmissionErrors = {};
  if (!firstName) {
    errors.firstName = "Enter your first name.";
  }
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!consent) {
    errors.consent = CONSENT_REQUIRED_MESSAGE;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    values: {
      firstName,
      email,
      ageGroup: text(raw.ageGroup) || null,
      preferredLanguage: text(raw.preferredLanguage) || null,
      consent: true,
    },
  };
}
