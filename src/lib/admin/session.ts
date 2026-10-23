import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  readSessionToken,
  type AdminSession,
} from "./auth";

/** Shown in content history when a session has no editor name. */
export const UNNAMED_EDITOR = "Admin";

/**
 * Redirects to the login page unless a valid admin session cookie is
 * present. Called from the protected admin layout AND from every Server
 * Action / Route Handler that touches personal data — Proxy alone isn't
 * sufficient, since a Proxy matcher change could silently stop covering a
 * given path (see node_modules/next/dist/docs .../proxy.md).
 */
export async function requireAdminSession(): Promise<AdminSession> {
  const store = await cookies();
  const session = readSessionToken(store.get(SESSION_COOKIE_NAME)?.value);
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}

/** The name content edits are attributed to, for the current session. */
export function editorNameOf(session: AdminSession): string {
  return session.editorName ?? UNNAMED_EDITOR;
}

export async function establishAdminSession(editorName?: string | null): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(editorName), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
