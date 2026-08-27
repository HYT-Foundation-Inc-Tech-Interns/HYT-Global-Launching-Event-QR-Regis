import { NextRequest, NextResponse } from "next/server";
import { appendScanLog, decrementGuestScanLimit } from "@/lib/sheets";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const passportId = String(body?.passportId || "").trim();
    if (!passportId) {
      return NextResponse.json({ error: "passportId is required." }, { status: 400 });
    }

    const result = await decrementGuestScanLimit(passportId);
    if (!result.ok) {
      const messages = {
        not_found: "Guest not found.",
        inactive: "This guest account is inactive.",
        expired: "This guest account has expired.",
        unlimited: "VIP.",
        exhausted: "This guest has no scans remaining.",
      } as const;
      return NextResponse.json({ error: messages[result.reason] }, { status: result.reason === "not_found" ? 404 : 409 });
    }

    await appendScanLog({
      timestamp: new Date().toISOString(),
      passportId,
      guestName: result.guest.fullName,
      station: "NFC Passport",
      action: "NFC Scan",
      scannerPage: "/passport/[passportId]?source=nfc",
    });

    return NextResponse.json({ guest: result.guest, remaining: result.remaining });
  } catch (error) {
    console.error("POST /api/nfc/scan failed:", error);
    return NextResponse.json({ error: "Could not process the NFC scan." }, { status: 500 });
  }
}