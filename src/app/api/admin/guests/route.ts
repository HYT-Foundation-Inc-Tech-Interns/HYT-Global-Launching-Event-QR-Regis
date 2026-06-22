/**
 * GET /api/admin/guests
 *
 * Returns every registered guest plus a few summary numbers for the
 * admin dashboard.
 */

import { NextResponse } from "next/server";
import { getAllGuests } from "@/lib/sheets";
import { TOTAL_FLOORS } from "@/lib/stations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guests = await getAllGuests();

    const totalGuests = guests.length;
    const completedAll = guests.filter(
      (g) => g.completedCount >= TOTAL_FLOORS
    ).length;
    const rewardsClaimed = guests.filter(
      (g) => g.status === "Reward Claimed"
    ).length;

    return NextResponse.json({
      summary: { totalGuests, completedAll, rewardsClaimed, totalFloors: TOTAL_FLOORS },
      guests,
    });
  } catch (err) {
    console.error("GET /api/admin/guests failed:", err);
    return NextResponse.json(
      { error: "Could not load guests. Please try again." },
      { status: 500 }
    );
  }
}
