import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, isValidSessionToken } from "@/lib/admin/auth";

// Gates every /admin/* route (including the CSV export route handler) behind
// a valid admin session cookie. This is the first line of defense; every
// Server Action and Route Handler under /admin also re-checks the session
// itself (see lib/admin/session.ts) since a Proxy matcher change could
// silently stop covering a given path.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!isValidSessionToken(token)) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
