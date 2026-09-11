import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin/session";
import { buildEoiCsv, fetchEoiRecords, type EoiFilters } from "@/lib/admin/eoi";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await requireAdminSession();

  const { searchParams } = request.nextUrl;
  const filters: EoiFilters = {
    search: searchParams.get("q")?.trim() || undefined,
    country: searchParams.get("country") || undefined,
    ageGroup: searchParams.get("ageGroup") || undefined,
    preferredLanguage: searchParams.get("language") || undefined,
  };

  const records = await fetchEoiRecords(filters);
  const csv = buildEoiCsv(records);
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cos-d-eoi-${today}.csv"`,
    },
  });
}
