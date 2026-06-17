import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Coarse UX gate only: bounce clearly-unauthenticated visitors to /login
 * without a DB hit. The real security boundary is server-side — every
 * portal layout calls requireRole() and every action/query is scoped.
 */
export default function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  const isPortal =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/hod") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/student");

  if (isPortal && !sessionCookie) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname === "/login" && sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/hod/:path*", "/teacher/:path*", "/student/:path*", "/login"],
};
