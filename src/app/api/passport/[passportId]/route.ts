/**
 * GET /api/passport/[passportId]
 *
 * Looks up a guest by Passport ID and returns their information and
 * completion status. Used by the passport dashboard page.
 */

import { NextRequest, NextResponse } from "next/server";
import { getGuestById } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { passportId: string } }
) {
  try {
    const guest = await getGuestById(params.passportId);

    if (!guest) {
      return NextResponse.json(
        { error: "Passport not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ guest });
  } catch (err) {
    console.error("GET /api/passport failed:", err);
    return NextResponse.json(
      { error: "Could not load passport. Please try again." },
      { status: 500 }
    );
  }
}
