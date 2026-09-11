"use server";

import { redirect } from "next/navigation";
import { sql } from "@/lib/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SubmitExpressionOfInterestInput = {
  firstName: string;
  email: string;
  country: string;
  ageGroup: string;
  preferredLanguage: string;
  consent: boolean;
};

export type SubmitExpressionOfInterestErrors = {
  firstName?: string;
  email?: string;
  consent?: string;
};

export type SubmitExpressionOfInterestResult =
  | { status: "validation_error"; errors: SubmitExpressionOfInterestErrors }
  | { status: "server_error"; message: string };

export async function submitExpressionOfInterest(
  input: SubmitExpressionOfInterestInput
): Promise<SubmitExpressionOfInterestResult> {
  const firstName = input.firstName.trim();
  const email = input.email.trim();

  const errors: SubmitExpressionOfInterestErrors = {};
  if (!firstName) {
    errors.firstName = "Enter your first name.";
  }
  if (!email) {
    errors.email = "Enter your email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!input.consent) {
    errors.consent =
      "Please confirm that you have read and understood the Privacy Policy.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "validation_error", errors };
  }

  try {
    await sql`
      INSERT INTO expressions_of_interest
        (first_name, email, country, age_group, preferred_language, consent_given)
      VALUES
        (${firstName}, ${email}, ${input.country || null}, ${input.ageGroup || null}, ${input.preferredLanguage || null}, ${input.consent})
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
