import { NextResponse, type NextRequest } from "next/server";

/**
 * Routing only — this is NOT the security boundary.
 *
 * Middleware runs on the edge runtime, which can't read the signing secret from
 * disk, so it checks only that a session cookie is *present* and sends anonymous
 * visitors somewhere sensible. Every route that touches data calls requireUser()
 * in the node runtime, which verifies the signature properly. A forged cookie
 * gets past this and fails there.
 */
const PROTECTED = ["/chat", "/schema", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const needsSession = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (!needsSession) return NextResponse.next();

  const hasCookie = Boolean(request.cookies.get("askdb_session")?.value);
  if (hasCookie) return NextResponse.next();

  const signin = new URL("/signin", request.url);
  signin.searchParams.set("next", pathname);
  return NextResponse.redirect(signin);
}

export const config = {
  matcher: ["/chat/:path*", "/schema/:path*", "/settings/:path*"],
};
