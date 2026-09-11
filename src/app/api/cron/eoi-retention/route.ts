import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { computeDeletionDate, getEoiSettings } from "@/lib/admin/settings";

export const dynamic = "force-dynamic";

/**
 * Runs once daily via Vercel Cron (see vercel.json). Permanently deletes all
 * expressions_of_interest rows once the retention deadline (closing date +
 * 14 days) has passed. Safe to call repeatedly — deleting from an already
 * empty table is a no-op.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { closesAt } = await getEoiSettings();
  const deletionDate = computeDeletionDate(closesAt);

  if (!deletionDate || new Date() < deletionDate) {
    return NextResponse.json({ deleted: false, reason: "retention period not yet reached" });
  }

  await sql`DELETE FROM expressions_of_interest`;

  return NextResponse.json({
    deleted: true,
    deletionDate: deletionDate.toISOString(),
  });
}
