import { NextRequest, NextResponse } from "next/server";
import { appendScanLog, decrementGuestScanLimit } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passportId = String(body?.passportId || "").trim();
    const nfcId = String(body?.nfcId || "").trim();
    if (!passportId) {
      return NextResponse.json({ error: "passportId is required." }, { status: 400 });
    }

    const result = await decrementGuestScanLimit(passportId);
    if (!result.ok) {
      const messages = {
        not_found: "Guest not found. Please check the QR code.",
        inactive: "This guest account is inactive.",
        expired: "This guest account has expired.",
        unlimited: "This guest has no scan limit to reduce.",
        exhausted: "This guest has no scans remaining.",
      } as const;
      const status = result.reason === "not_found" ? 404 : 409;
      return NextResponse.json({ error: messages[result.reason] }, { status });
    }

    const scannedAt = new Date().toISOString();
    await appendScanLog({
      timestamp: scannedAt,
      passportId,
      nfcId: nfcId || undefined,
      guestName: result.guest.fullName,
      station: nfcId ? "Admin NFC Scanner" : "Admin QR Scanner",
      action: nfcId ? "NFC Scan" : "Admin Scan",
      scannerPage: "/admin/scan",
    });

    return NextResponse.json({
      guest: { ...result.guest, scanLimitDays: result.remaining, scanEnabled: result.remaining > 0 },
      remaining: result.remaining,
      scannedAt,
    });
  } catch (error) {
    console.error("POST /api/admin/scan failed:", error);
    return NextResponse.json({ error: "Could not process the admin scan." }, { status: 500 });
  }
}