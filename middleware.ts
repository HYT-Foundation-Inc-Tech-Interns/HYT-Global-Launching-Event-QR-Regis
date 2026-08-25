import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAdminPage = path.startsWith("/admin") && path !== "/admin/login";
  const isAdminApi = path.startsWith("/api/admin") && path !== "/api/admin/login";

  if ((isAdminPage || isAdminApi) && request.cookies.get("hyt_admin_session")?.value !== "authenticated") {
    if (isAdminApi) {
      return NextResponse.json({ error: "Administrator login required." }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
