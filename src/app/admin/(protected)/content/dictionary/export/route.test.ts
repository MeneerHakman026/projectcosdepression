import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({ signedIn: false }));

vi.mock("@/lib/admin/session", () => ({
  requireAdminSession: async () => {
    if (!session.signedIn) throw new Error("NEXT_REDIRECT:/admin/login");
    return { name: "Tester" };
  },
}));
vi.mock("@/lib/dictionary/roles", () => ({
  participantRoles: async () => [{ code: "PwD", label: "People with depression" }],
}));
// The blank template needs no data: any database access fails the test.
vi.mock("@/lib/dictionary/server", () => ({
  dictionary: new Proxy({}, { get: () => () => Promise.reject(new Error("database must not be used")) }),
}));

const { GET } = await import("./route");
const request = (query: string) => new NextRequest(`http://localhost/admin/content/dictionary/export?${query}`);

describe("Excel template download", () => {
  beforeEach(() => {
    session.signedIn = false;
  });

  it("requires an admin session", async () => {
    await expect(GET(request("scope=blank"))).rejects.toThrow("NEXT_REDIRECT");
  });

  it("downloads the blank template without any dictionary data", async () => {
    session.signedIn = true;
    const response = await GET(request("scope=blank"));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="cos-d-outcome-dictionary-template-en-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(await response.arrayBuffer()) as unknown as ExcelJS.Buffer);
    expect(workbook.worksheets.map((s) => s.name)).toEqual(["Instructions", "en"]);
  });
});
