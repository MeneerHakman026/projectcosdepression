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

export const MAX_EDITOR_NAME_LENGTH = 60;

/** Trims and bounds a self-reported editor name; empty becomes null. */
export function normalizeEditorName(name: string | null | undefined): string | null {
  const trimmed = (name ?? "").replace(/\s+/g, " ").trim().slice(0, MAX_EDITOR_NAME_LENGTH);
  return trimmed || null;
}

/**
 * Signs a new session token that expires after SESSION_MAX_AGE_SECONDS.
 * The editor's name (entered at sign-in, used to attribute content edits)
 * is carried inside the signed payload so it can't be altered afterwards.
 * Throws if ADMIN_SESSION_SECRET isn't configured — callers only reach this
 * after a successful password check, so failing loudly here is correct.
 */
export function createSessionToken(editorName?: string | null): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not set.");
  }
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const name = normalizeEditorName(editorName);
  const payload = name ? `${expiresAt}:${Buffer.from(name).toString("base64url")}` : String(expiresAt);
  return `${payload}.${sign(payload, secret)}`;
}

export type AdminSession = {
  /** Null for sessions created before names were recorded, or left blank. */
  editorName: string | null;
};

/**
 * Verifies a session token's signature and expiry and returns its contents.
 * Returns null (rather than throwing) whenever the secret is missing or the
 * token is malformed, so an unconfigured deployment fails closed instead of
 * erroring out. Accepts both "<expiry>" and "<expiry>:<name>" payloads, so
 * sessions issued before editor names existed stay valid.
 */
export function readSessionToken(token: string | undefined | null): AdminSession | null {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || !token) return null;

  const separatorIndex = token.lastIndexOf(".");
  if (separatorIndex === -1) return null;

  const payload = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload, secret))) return null;

  const [expiry, encodedName] = payload.split(":", 2);
  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return null;

  const editorName = encodedName
    ? normalizeEditorName(Buffer.from(encodedName, "base64url").toString("utf8"))
    : null;
  return { editorName };
}

export function isValidSessionToken(token: string | undefined | null): boolean {
  return readSessionToken(token) !== null;
}

/** Constant-time comparison against ADMIN_PASSWORD. Fails closed if unset. */
export function verifyAdminPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}
