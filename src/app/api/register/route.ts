/**
 * POST /api/register
 *
 * Receives guest registration data, generates a unique Passport ID,
 * saves the guest to Google Sheets, and returns the new guest record
 * (including the passport link).
 */

import { NextRequest, NextResponse } from "next/server";
import { appendGuest } from "@/lib/sheets";
import type { RegistrationInput } from "@/lib/types";

// Always run on the server at request time (never statically cached).
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<RegistrationInput>;

    // Basic validation. Full name and email are required; the rest are optional.
    if (!body.fullName || !body.email) {
      return NextResponse.json(
        { error: "Full name and email are required." },
        { status: 400 }
      );
    }

    const guestType = String(body.guestType || "Visitor").trim();
    const course = String(body.course || "").trim();
    if (guestType === "Trainor" && !course) {
      return NextResponse.json(
        { error: "Trainors must select the course they teach." },
        { status: 400 },
      );
    }

    const guest = await appendGuest({
      fullName: String(body.fullName).trim(),
      email: String(body.email).trim(),
      phone: String(body.phone || "").trim(),
      organization: String(body.organization || "").trim(),
      guestType,
      course,
      purpose: String(body.purpose || "").trim(),
    });

    return NextResponse.json({ guest }, { status: 201 });
  } catch (err) {
    console.error("POST /api/register failed:", err);
    return NextResponse.json(
      { error: "Could not register guest. Please try again." },
      { status: 500 }
    );
  }
}
