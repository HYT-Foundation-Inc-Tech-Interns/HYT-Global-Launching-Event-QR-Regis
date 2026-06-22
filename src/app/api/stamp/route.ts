/**
 * POST /api/stamp
 *
 * Marks a floor/station as completed for a guest. This is called by the
 * staff scanner pages after a QR code is scanned and the staff confirms.
 *
 * Request body: { passportId: string, stationId: string, scannerPage?: string }
 *
 * Behaviour:
 *  - Checks the guest exists.
 *  - Prevents duplicate stamps (returns 409 if already completed).
 *  - Updates the correct floor column, completed count, and status.
 *  - Writes an entry to the Scan Logs tab.
 */

import { NextRequest, NextResponse } from "next/server";
import { stampFloor, appendScanLog } from "@/lib/sheets";
import { getStationById } from "@/lib/stations";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passportId: string = String(body.passportId || "").trim();
    const stationId: string = String(body.stationId || "").trim();
    const scannerPage: string = String(body.scannerPage || stationId);

    if (!passportId || !stationId) {
      return NextResponse.json(
        { error: "passportId and stationId are required." },
        { status: 400 }
      );
    }

    const station = getStationById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: `Unknown station: ${stationId}` },
        { status: 400 }
      );
    }

    // Convert the 1-based floor number to a 0-based index for the helper.
    const result = await stampFloor(passportId, station.floor - 1);

    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json(
          { error: "Guest not found. Please check the QR code." },
          { status: 404 }
        );
      }
      if (result.reason === "already_completed") {
        // Still log the duplicate attempt for the audit trail.
        await appendScanLog({
          timestamp: new Date().toISOString(),
          passportId,
          guestName: result.guest?.fullName || "",
          station: station.name,
          action: "Already Completed",
          scannerPage,
        });
        return NextResponse.json(
          {
            error: "This guest already completed this floor.",
            alreadyCompleted: true,
            guest: result.guest,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Invalid floor." },
        { status: 400 }
      );
    }

    // Success - log it.
    await appendScanLog({
      timestamp: new Date().toISOString(),
      passportId,
      guestName: result.guest.fullName,
      station: station.name,
      action: "Stamped",
      scannerPage,
    });

    return NextResponse.json({ guest: result.guest });
  } catch (err) {
    console.error("POST /api/stamp failed:", err);
    return NextResponse.json(
      { error: "Could not record the stamp. Please try again." },
      { status: 500 }
    );
  }
}
