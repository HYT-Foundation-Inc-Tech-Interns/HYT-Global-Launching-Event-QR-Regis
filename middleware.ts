import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  // The login page itself must remain public or unauthenticated users would
  // be redirected back to it forever.
  if (
    request.nextUrl.pathname === "/admin/login" ||
    request.nextUrl.pathname === "/api/admin/login"
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (await isValidAdminSession(session)) return NextResponse.next();

  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    return NextResponse.json({ error: "Admin authentication required." }, { status: 401 });
  }

  const loginUrl = new URL("/admin/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
