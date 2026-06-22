/**
 * POST /api/admin/claim
 *
 * Marks a guest's reward as "Reward Claimed". Only works if the guest has
 * completed all floors. Used by the admin dashboard claiming action.
 *
 * Request body: { passportId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { claimReward, appendScanLog } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passportId: string = String(body.passportId || "").trim();

    if (!passportId) {
      return NextResponse.json(
        { error: "passportId is required." },
        { status: 400 }
      );
    }

    const result = await claimReward(passportId);

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Guest not found." }, { status: 404 });
      }
      return NextResponse.json(
        { error: "Guest has not completed all floors yet." },
        { status: 409 }
      );
    }

    await appendScanLog({
      timestamp: new Date().toISOString(),
      passportId,
      guestName: result.guest.fullName,
      station: "Claiming Booth",
      action: "Reward Claimed",
      scannerPage: "/admin/dashboard",
    });

    return NextResponse.json({ guest: result.guest });
  } catch (err) {
    console.error("POST /api/admin/claim failed:", err);
    return NextResponse.json(
      { error: "Could not claim reward. Please try again." },
      { status: 500 }
    );
  }
}
