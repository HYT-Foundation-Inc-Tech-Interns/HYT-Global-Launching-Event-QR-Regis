/**
 * GET /api/passport/[passportId]
 *
 * Looks up a guest by Passport ID and returns their information and
 * completion status. Used by the passport dashboard page.
 */

import { NextRequest, NextResponse } from "next/server";
import { getGuestById } from "@/lib/sheets";
import { isGuestAccountActive } from "@/lib/scanPolicy";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ passportId: string }> }
) {
  try {
    const { passportId } = await params;
    const guest = await getGuestById(passportId);

    if (!guest) {
      return NextResponse.json(
        { error: "Passport not found." },
        { status: 404 }
      );
    }

    if (!isGuestAccountActive(guest)) {
      return NextResponse.json(
        { error: "This guest account is inactive or expired." },
        { status: 403 },
      );
    }

    // Strip contact PII (email/phone) from this public endpoint. The staff
    // scanner only needs name, organization, and progress, so we never send
    // email/phone over the wire here. The admin dashboard (which is access-
    // controlled) uses /api/admin/guests for the full record.
    const publicGuest = { ...guest, email: "", phone: "" };

    return NextResponse.json({ guest: publicGuest });
  } catch (err) {
    console.error("GET /api/passport failed:", err);
    return NextResponse.json(
      { error: "Could not load passport. Please try again." },
      { status: 500 }
    );
  }
}
