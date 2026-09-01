import { NextRequest, NextResponse } from "next/server";
import { isCorrectAdminCredentials } from "@/lib/admin-auth";
import { toggleGuestAccountActive } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passportId = String(body?.passportId || "").trim();
    const accountActive = Boolean(body?.accountActive);
    const adminUsername = String(body?.adminUsername || "").trim();
    const adminPassword = String(body?.adminPassword || "");

    if (!passportId) {
      return NextResponse.json({ error: "passportId is required." }, { status: 400 });
    }

    if (!adminUsername || !adminPassword) {
      return NextResponse.json(
        { error: "Admin credentials are required." },
        { status: 401 }
      );
    }

    // Verify admin credentials
    const isValid = await isCorrectAdminCredentials(adminUsername, adminPassword);
    if (!isValid) {
      return NextResponse.json(
        { error: "Incorrect admin credentials." },
        { status: 401 }
      );
    }

    // Toggle the account status
    const result = await toggleGuestAccountActive(passportId, accountActive);

    if (!result.ok) {
      return NextResponse.json({ error: "Guest not found." }, { status: 404 });
    }

    return NextResponse.json({
      guest: result.guest,
      message: accountActive ? "Account enabled successfully." : "Account disabled successfully.",
    });
  } catch (error) {
    console.error("POST /api/admin/toggle-account failed:", error);
    return NextResponse.json(
      { error: "Could not toggle account status." },
      { status: 500 }
    );
  }
}

