import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionMaxAge,
  createAdminSession,
  isCorrectAdminCredentials,
} from "@/lib/admin-auth";

function safeDestination(value: string): string {
  return value.startsWith("/admin/") && !value.startsWith("//") ? value : "/admin/dashboard";
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!(await isCorrectAdminCredentials(username, password))) {
    return NextResponse.json({ error: "Incorrect admin username or password." }, { status: 401 });
  }

  const session = await createAdminSession();
  if (!session) {
    console.error("Admin login is not configured: missing ADMIN_SESSION_SECRET.");
    return NextResponse.json({ error: "Admin login is not configured." }, { status: 503 });
  }

  const response = NextResponse.json({ destination: safeDestination(String(body?.next ?? "")) });
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: session,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: adminSessionMaxAge,
  });
  return response;
}
