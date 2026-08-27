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
import { getGuestById, getGuestScanDays, stampFloor, appendScanLog } from "@/lib/sheets";
import { getStationById } from "@/lib/stations";
import { getScanPolicy, isGuestAccountActive } from "@/lib/scanPolicy";
import { canScanStation } from "@/lib/accessPolicy";

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

    const currentGuest = await getGuestById(passportId);
    if (!currentGuest) {
      return NextResponse.json(
        { error: "Guest not found. Please check the QR code." },
        { status: 404 },
      );
    }

    if (!isGuestAccountActive(currentGuest)) {
      return NextResponse.json(
        { error: "This guest account is inactive or expired." },
        { status: 403 },
      );
    }

    if (!canScanStation(currentGuest, station.floor)) {
      return NextResponse.json(
        { error: "QR floor scanning is available only to VIP guests on floors 1–3." },
        { status: 403 },
      );
    }

    const policy = getScanPolicy(currentGuest);
    const scanDays = await getGuestScanDays(passportId);
    const today = new Date().toISOString().slice(0, 10);
    const hasScannedToday = scanDays.includes(today);

    if (!policy.enabled || (policy.maxDays !== null && !hasScannedToday && scanDays.length >= policy.maxDays)) {
      return NextResponse.json(
        { error: "This passport is no longer active for scans." },
        { status: 403 },
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
        // A repeat scan is valid for an unlimited trainor or on a new
        // attendance day for a limited trainee. Same-day duplicates remain blocked.
        if (policy.maxDays === null || !hasScannedToday) {
          await appendScanLog({
            timestamp: new Date().toISOString(),
            passportId,
            guestName: result.guest?.fullName || currentGuest.fullName,
            station: station.name,
            action: "Stamped",
            scannerPage,
          });
          return NextResponse.json({ guest: result.guest || currentGuest });
        }
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
