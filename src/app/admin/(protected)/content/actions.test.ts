import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// --- Next.js runtime stand-ins -------------------------------------------
const cookieJar = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieJar.has(name) ? { name, value: cookieJar.get(name)! } : undefined),
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

const cache = vi.hoisted(() => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => cache);

// --- CMS storage stand-in --------------------------------------------------
const cms = vi.hoisted(() => ({
  saveDraft: vi.fn(),
  publish: vi.fn(),
  restoreRevision: vi.fn(),
}));
vi.mock("@/lib/cms/server", () => ({ cms }));

import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/admin/auth";
import { HOME_DEFAULTS } from "@/content/home/defaults";
import { publishDraft, restoreRevision, saveDraft } from "./actions";

function signIn(name: string) {
  cookieJar.set(SESSION_COOKIE_NAME, createSessionToken(name));
}

describe("content server actions", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-secret");
    cookieJar.clear();
    vi.clearAllMocks();
  });
  afterEach(() => vi.unstubAllEnvs());

  describe("authorization", () => {
    const calls = [
      ["saveDraft", () => saveDraft("home", 0, HOME_DEFAULTS)],
      ["publishDraft", () => publishDraft("home", 1)],
      ["restoreRevision", () => restoreRevision("home", 1, 1)],
    ] as const;

    it.each(calls)("%s redirects to sign-in without a session and changes nothing", async (_name, call) => {
      await expect(call()).rejects.toMatchObject({ url: "/admin/login" });
      expect(cms.saveDraft).not.toHaveBeenCalled();
      expect(cms.publish).not.toHaveBeenCalled();
      expect(cms.restoreRevision).not.toHaveBeenCalled();
      expect(cache.updateTag).not.toHaveBeenCalled();
    });

    it.each(calls)("%s rejects a forged session cookie", async (_name, call) => {
      cookieJar.set(SESSION_COOKIE_NAME, `${Date.now() + 60_000}.not-a-real-signature`);
      await expect(call()).rejects.toMatchObject({ url: "/admin/login" });
      expect(cms.saveDraft).not.toHaveBeenCalled();
      expect(cms.publish).not.toHaveBeenCalled();
    });
  });

  it("saves drafts attributed to the signed-in editor, without touching the public cache", async () => {
    signIn("Chris");
    cms.saveDraft.mockResolvedValue({ ok: true, version: 1, savedAt: "2026-01-01T00:00:00.000Z", revisionNumber: 1 });

    const result = await saveDraft("home", 0, HOME_DEFAULTS);

    expect(result).toMatchObject({ ok: true, version: 1 });
    expect(cms.saveDraft).toHaveBeenCalledWith(expect.objectContaining({ slug: "home" }), {
      content: HOME_DEFAULTS,
      expectedVersion: 0,
      author: "Chris",
    });
    expect(cache.updateTag).not.toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalledWith("/");
  });

  it("invalidates the public page only after a successful publish", async () => {
    signIn("Chris");
    cms.publish.mockResolvedValue({ ok: true, revisionNumber: 2, publishedAt: "2026-01-01T00:00:00.000Z" });

    await publishDraft("home", 1);

    expect(cms.publish).toHaveBeenCalledWith(expect.objectContaining({ slug: "home" }), {
      expectedVersion: 1,
      author: "Chris",
    });
    expect(cache.updateTag).toHaveBeenCalledWith("cms:page:home");
    expect(cache.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("leaves the public cache alone when publishing fails", async () => {
    signIn("Chris");
    cms.publish.mockResolvedValue({ ok: false, reason: "conflict", message: "conflict" });

    expect(await publishDraft("home", 1)).toMatchObject({ ok: false, reason: "conflict" });
    expect(cache.updateTag).not.toHaveBeenCalled();
    expect(cache.revalidatePath).not.toHaveBeenCalledWith("/");
  });

  it("rejects unknown pages and malformed arguments", async () => {
    signIn("Chris");
    expect(await saveDraft("not-a-page", 0, {})).toMatchObject({ ok: false, reason: "not_found" });
    expect(await saveDraft("home", -1, {})).toMatchObject({ ok: false, reason: "not_found" });
    expect(await publishDraft("home", 1.5)).toMatchObject({ ok: false, reason: "not_found" });
    expect(await restoreRevision("home", Number.NaN, 1)).toMatchObject({ ok: false, reason: "not_found" });
    expect(cms.saveDraft).not.toHaveBeenCalled();
  });

  it("returns a friendly error instead of throwing when storage fails", async () => {
    signIn("Chris");
    vi.spyOn(console, "error").mockImplementation(() => {});
    cms.saveDraft.mockRejectedValue(new Error("connection reset"));

    const result = await saveDraft("home", 0, HOME_DEFAULTS);
    expect(result).toMatchObject({ ok: false, reason: "error" });
    expect(result.ok === false && result.message).not.toMatch(/connection reset/);
  });
});
