import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEoiTestSql, type EoiTestSql } from "../../../test/pglite-sql";

// --- Stand-ins ---------------------------------------------------------------
const db = vi.hoisted(() => ({ current: null as unknown as EoiTestSql }));
vi.mock("@/lib/db", () => ({
  sql: Object.assign((...args: Parameters<EoiTestSql>) => db.current(...args), {
    query: (text: string, params?: unknown[]) => db.current.query(text, params),
  }),
}));

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

import { buildEoiCsv, fetchEoiFacets, fetchEoiRecords } from "@/lib/admin/eoi";
import { validateSubmission } from "@/lib/registration/submission";
import { submitExpressionOfInterest } from "./actions";

const VALID = {
  firstName: "Alex",
  email: "alex@example.org",
  ageGroup: "30 to 39",
  preferredLanguage: "French",
  consent: true,
};

async function rows() {
  return db.current.query(
    `SELECT first_name, email, country, age_group, preferred_language, consent_given FROM expressions_of_interest ORDER BY id`
  );
}

describe("Expression of Interest submission (without Country)", () => {
  beforeEach(async () => {
    ({ sql: db.current } = await createEoiTestSql());
  });

  it("stores a submission without a country and shows the thank-you page", async () => {
    await expect(submitExpressionOfInterest(VALID)).rejects.toMatchObject({ url: "/registration/success" });
    expect(await rows()).toEqual([
      {
        first_name: "Alex",
        email: "alex@example.org",
        country: null,
        age_group: "30 to 39",
        preferred_language: "French",
        consent_given: true,
      },
    ]);
  });

  it("accepts a submission with only the required fields", async () => {
    await expect(submitExpressionOfInterest({ ...VALID, ageGroup: "", preferredLanguage: "" })).rejects.toMatchObject({
      url: "/registration/success",
    });
    expect(await rows()).toMatchObject([{ country: null, age_group: null, preferred_language: null }]);
  });

  it("ignores a country sent by a page that was open during the deploy", async () => {
    const fromOldPage = { ...VALID, country: "France" } as typeof VALID;
    await expect(submitExpressionOfInterest(fromOldPage)).rejects.toMatchObject({ url: "/registration/success" });
    expect((await rows())[0].country).toBeNull();
  });

  it("still requires consent, checked on the server", async () => {
    const result = await submitExpressionOfInterest({ ...VALID, consent: false });
    expect(result).toEqual({
      status: "validation_error",
      errors: { consent: "Please confirm that you have read and understood the Privacy Policy." },
    });
    // A non-boolean "consent" is not consent.
    const forged = await submitExpressionOfInterest({ ...VALID, consent: "yes" as unknown as boolean });
    expect(forged).toMatchObject({ status: "validation_error", errors: { consent: expect.any(String) } });
    expect(await rows()).toEqual([]);
  });

  it("validates name and email on the server", async () => {
    const result = await submitExpressionOfInterest({ ...VALID, firstName: "  ", email: "not-an-email" });
    expect(result).toEqual({
      status: "validation_error",
      errors: { firstName: "Enter your first name.", email: "Enter a valid email address." },
    });
    expect(await submitExpressionOfInterest({ ...VALID, email: "" })).toMatchObject({
      errors: { email: "Enter your email address." },
    });
    expect(await rows()).toEqual([]);
  });

  it("rejects malformed input without crashing", async () => {
    for (const input of [null, undefined, "text", { firstName: 42, email: ["a@b.co"], consent: true }]) {
      expect(await submitExpressionOfInterest(input as never)).toMatchObject({ status: "validation_error" });
    }
    expect(await rows()).toEqual([]);
  });

  it("reports a friendly error if the database is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    db.current = Object.assign(
      async () => {
        throw new Error("connection refused");
      },
      { query: async () => [] }
    ) as unknown as EoiTestSql;
    const result = await submitExpressionOfInterest(VALID);
    expect(result).toMatchObject({ status: "server_error" });
    expect(JSON.stringify(result)).not.toMatch(/connection refused/);
  });

  it("trims what it stores", () => {
    const result = validateSubmission({ ...VALID, firstName: "  Alex ", email: " alex@example.org " });
    expect(result).toMatchObject({ ok: true, values: { firstName: "Alex", email: "alex@example.org" } });
  });
});

describe("Admin EOI listing and CSV export with and without Country", () => {
  beforeEach(async () => {
    ({ sql: db.current } = await createEoiTestSql());
    // An earlier submission that still has a country.
    await db.current.query(
      `INSERT INTO expressions_of_interest (first_name, email, country, age_group, preferred_language, consent_given, submitted_at)
       VALUES ('Sam', 'sam@example.org', 'Netherlands', '50 to 64', 'English', true, '2026-10-01T10:00:00Z')`
    );
  });

  it("keeps existing records and their country when new ones arrive without one", async () => {
    await expect(submitExpressionOfInterest(VALID)).rejects.toMatchObject({ url: "/registration/success" });

    const records = await fetchEoiRecords({});
    expect(records.map((r) => [r.firstName, r.country])).toEqual([
      ["Alex", null],
      ["Sam", "Netherlands"],
    ]);
    expect((await fetchEoiFacets()).countries).toEqual(["Netherlands"]);
    expect((await fetchEoiRecords({ country: "Netherlands" })).map((r) => r.firstName)).toEqual(["Sam"]);
  });

  it("exports the same CSV columns as before, leaving Country empty for new records", async () => {
    await expect(submitExpressionOfInterest(VALID)).rejects.toMatchObject({ url: "/registration/success" });
    const lines = buildEoiCsv(await fetchEoiRecords({}))
      .replace(/^﻿/, "")
      .split("\r\n");

    expect(lines[0]).toBe("First name,Email,Country,Age group,Preferred language,Consent,Submitted at");
    expect(lines[1]).toMatch(/^Alex,alex@example\.org,,30 to 39,French,Yes,\d{4}-/);
    expect(lines[2]).toBe("Sam,sam@example.org,Netherlands,50 to 64,English,Yes,2026-10-01T10:00:00.000Z");
    expect(lines).toHaveLength(4); // header, two rows, trailing CRLF
  });
});
