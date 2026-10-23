import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, isValidSessionToken, readSessionToken } from "./auth";

const SECRET = "test-secret";

function legacyToken(expiresAt: number) {
  const payload = String(expiresAt);
  return `${payload}.${createHmac("sha256", SECRET).update(payload).digest("base64url")}`;
}

describe("admin session tokens", () => {
  beforeEach(() => vi.stubEnv("ADMIN_SESSION_SECRET", SECRET));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("carries the editor's name inside the signed token", () => {
    expect(readSessionToken(createSessionToken("Chris Veal"))).toEqual({ editorName: "Chris Veal" });
  });

  it("normalises and bounds names", () => {
    expect(readSessionToken(createSessionToken("  Chris \n  V  "))).toEqual({ editorName: "Chris V" });
    expect(readSessionToken(createSessionToken("x".repeat(500)))?.editorName).toHaveLength(60);
    expect(readSessionToken(createSessionToken(""))).toEqual({ editorName: null });
  });

  it("keeps sessions issued before names existed valid", () => {
    expect(readSessionToken(legacyToken(Date.now() + 60_000))).toEqual({ editorName: null });
  });

  it("rejects a token whose name was altered", () => {
    const token = createSessionToken("Chris");
    const [payload, signature] = [token.slice(0, token.lastIndexOf(".")), token.slice(token.lastIndexOf(".") + 1)];
    const [expiry] = payload.split(":");
    const forged = `${expiry}:${Buffer.from("Someone else").toString("base64url")}.${signature}`;
    expect(isValidSessionToken(forged)).toBe(false);
  });

  it("rejects expired, unsigned or garbage tokens", () => {
    vi.useFakeTimers();
    const token = createSessionToken("Chris");
    vi.advanceTimersByTime(13 * 60 * 60 * 1000);
    expect(isValidSessionToken(token)).toBe(false);
    expect(isValidSessionToken(undefined)).toBe(false);
    expect(isValidSessionToken("garbage")).toBe(false);
    expect(isValidSessionToken("123.abc")).toBe(false);
  });

  it("fails closed when the secret isn't configured", () => {
    const token = createSessionToken("Chris");
    vi.stubEnv("ADMIN_SESSION_SECRET", "");
    expect(isValidSessionToken(token)).toBe(false);
  });
});
