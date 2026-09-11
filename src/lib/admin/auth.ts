import { createHmac, timingSafeEqual } from "crypto";

// Pure crypto helpers with no Next.js dependency, so they can be imported
// from both `proxy.ts` (which only has access to NextRequest/NextResponse)
// and from Server Components/Actions/Route Handlers (via lib/admin/session.ts).

export const SESSION_COOKIE_NAME = "cosd_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Signs a new session token that expires after SESSION_MAX_AGE_SECONDS.
 * Throws if ADMIN_SESSION_SECRET isn't configured — callers only reach this
 * after a successful password check, so failing loudly here is correct.
 */
export function createSessionToken(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set.");
  }
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

/**
 * Verifies a session token's signature and expiry. Returns false (rather
 * than throwing) whenever the secret is missing or the token is malformed,
 * so an unconfigured deployment fails closed instead of erroring out.
 */
export function isValidSessionToken(token: string | undefined | null): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return false;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return false;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!payload || !signature) return false;
  if (!safeEqual(signature, sign(payload, secret))) return false;

  const expiresAt = Number(payload);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  return true;
}

/** Constant-time comparison against ADMIN_PASSWORD. Fails closed if unset. */
export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}
