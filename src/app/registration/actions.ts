"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { validateSubmission, type SubmissionErrors } from "@/lib/registration/submission";

export type SubmitExpressionOfInterestInput = {
  firstName: string;
  email: string;
  ageGroup: string;
  preferredLanguage: string;
  consent: boolean;
};

export type SubmitExpressionOfInterestErrors = SubmissionErrors;

export type SubmitExpressionOfInterestResult =
  | { status: "validation_error"; errors: SubmitExpressionOfInterestErrors }
  | { status: "server_error"; message: string };

/**
 * Stores an Expression of Interest. The form no longer asks for a country:
 * new rows leave the (nullable) `country` column empty, and existing rows
 * keep whatever country they were submitted with.
 */
export async function submitExpressionOfInterest(
  input: SubmitExpressionOfInterestInput
): Promise<SubmitExpressionOfInterestResult> {
  const result = validateSubmission(input);
  if (!result.ok) {
    return { status: "validation_error", errors: result.errors };
  }
  const { firstName, email, ageGroup, preferredLanguage, consent } = result.values;

  try {
    await sql`
      INSERT INTO expressions_of_interest
        (first_name, email, age_group, preferred_language, consent_given)
      VALUES
        (${firstName}, ${email}, ${ageGroup}, ${preferredLanguage}, ${consent})
    `;
  } catch (error) {
    console.error("Failed to insert expression of interest:", error);
    return {
      status: "server_error",
      message:
        "Something went wrong while submitting your form. Please try again later.",
    };
  }

  redirect("/registration/success");
}
