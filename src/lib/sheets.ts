/**
 * Google Sheets helper functions.
 *
 * This file is the ONLY place that talks to Google Sheets. All API routes
 * import from here. The frontend never touches Google Sheets directly.
 *
 * The "Guests" tab is treated like a tiny database table. Each guest is
 * one row. Columns A..P map to the fields described in the README.
 *
 * Guests tab columns (A..P):
 *   A  Passport ID
 *   B  Full Name
 *   C  Email
 *   D  Phone
 *   E  School/Company
 *   F  Guest Type
 *   G  Passport Link
 *   H  Floor 1
 *   I  Floor 2
 *   J  Floor 3
 *   K  Floor 4
 *   L  Floor 5
 *   M  Completed Count
 *   N  Status
 *   O  Registered At
 *   P  Last Updated
 */

import { google } from "googleapis";
import type { Guest, GuestStatus, RegistrationInput, ScanLog } from "./types";
import { TOTAL_FLOORS } from "./stations";

// --- Sheet tab names. Change these if you renamed your tabs. ---
const GUESTS_TAB = "Guests";
const SCAN_LOGS_TAB = "Scan Logs";

// The value we write into a floor cell once a guest completes it.
const COMPLETED_VALUE = "Completed";

// Total number of columns in the Guests tab (A..P = 16).
const GUEST_COLUMNS = 16;

/**
 * Build an authenticated Google Sheets client using the service account
 * credentials from environment variables.
 *
 * We create a fresh client per request. This is simple and safe for an
 * event-sized workload.
 */
function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // The private key is stored with literal "\n" in the env var, so we
  // convert those back into real newlines here.
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !key) {
    throw new Error(
      "Missing Google credentials. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in .env.local"
    );
  }

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("Missing GOOGLE_SHEET_ID in .env.local");
  }
  return id;
}

/**
 * Convert one spreadsheet row (array of cell values) into a Guest object.
 * Empty/missing cells are handled gracefully.
 */
function rowToGuest(row: string[]): Guest {
  // Read the 5 floor cells (columns H..L = indexes 7..11).
  const floors: boolean[] = [];
  for (let i = 0; i < TOTAL_FLOORS; i++) {
    const cell = (row[7 + i] || "").trim().toLowerCase();
    floors.push(cell === COMPLETED_VALUE.toLowerCase());
  }

  const completedCount = Number(row[12]) || floors.filter(Boolean).length;

  return {
    passportId: row[0] || "",
    fullName: row[1] || "",
    email: row[2] || "",
    phone: row[3] || "",
    organization: row[4] || "",
    guestType: row[5] || "",
    passportLink: row[6] || "",
    floors,
    completedCount,
    status: (row[13] as GuestStatus) || "Incomplete",
    registeredAt: row[14] || "",
    lastUpdated: row[15] || "",
  };
}

/**
 * Read every guest row from the Guests tab.
 * Row 1 is the header, so we start reading from row 2.
 */
export async function getAllGuests(): Promise<Guest[]> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${GUESTS_TAB}!A2:P`,
  });

  const rows = res.data.values || [];
  // Skip fully empty rows.
  return rows.filter((r) => r[0]).map((r) => rowToGuest(r as string[]));
}

/**
 * Find a single guest by Passport ID.
 * Returns both the guest and the spreadsheet row number (needed for updates),
 * or null if not found.
 */
export async function findGuestRow(
  passportId: string
): Promise<{ guest: Guest; rowNumber: number } | null> {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: getSheetId(),
    range: `${GUESTS_TAB}!A2:P`,
  });

  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if ((rows[i][0] || "").trim() === passportId.trim()) {
      // +2 because: arrays are 0-based AND we skipped the header row.
      return { guest: rowToGuest(rows[i] as string[]), rowNumber: i + 2 };
    }
  }
  return null;
}

/** Convenience wrapper that returns just the Guest (or null). */
export async function getGuestById(passportId: string): Promise<Guest | null> {
  const result = await findGuestRow(passportId);
  return result ? result.guest : null;
}

/**
 * Generate the next sequential Passport ID, e.g. "HYT-2026-0001".
 * We count the existing rows and add 1. The year prefix can be changed
 * via the PASSPORT_YEAR constant below.
 */
const PASSPORT_PREFIX = "HYT";
const PASSPORT_YEAR = "2026";

export async function generateNextPassportId(): Promise<string> {
  const guests = await getAllGuests();
  const next = guests.length + 1;
  const padded = String(next).padStart(4, "0");
  return `${PASSPORT_PREFIX}-${PASSPORT_YEAR}-${padded}`;
}

/**
 * Add a new guest to the Guests tab.
 * Returns the fully-built Guest object that was saved.
 */
export async function appendGuest(
  input: RegistrationInput
): Promise<Guest> {
  const sheets = getSheetsClient();
  const passportId = await generateNextPassportId();
  const now = new Date().toISOString();
  const passportLink = `/passport/${passportId}`;

  // Build the row in the exact column order (A..P).
  const row = [
    passportId, // A Passport ID
    input.fullName, // B Full Name
    input.email, // C Email
    input.phone, // D Phone
    input.organization, // E School/Company
    input.guestType, // F Guest Type
    passportLink, // G Passport Link
    "", // H Floor 1 (empty = not completed)
    "", // I Floor 2
    "", // J Floor 3
    "", // K Floor 4
    "", // L Floor 5
    "0", // M Completed Count
    "Incomplete", // N Status
    now, // O Registered At
    now, // P Last Updated
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${GUESTS_TAB}!A:P`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [row] },
  });

  return {
    passportId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    organization: input.organization,
    guestType: input.guestType,
    passportLink,
    floors: new Array(TOTAL_FLOORS).fill(false),
    completedCount: 0,
    status: "Incomplete",
    registeredAt: now,
    lastUpdated: now,
  };
}

/**
 * Mark a floor as completed for a guest and recompute the completed count
 * and status. Returns an object describing what happened.
 *
 * - If the guest does not exist -> { ok: false, reason: "not_found" }
 * - If the floor was already completed -> { ok: false, reason: "already_completed" }
 * - On success -> { ok: true, guest }
 */
export async function stampFloor(
  passportId: string,
  floorIndex: number // 0-based (0 = Floor 1)
): Promise<
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" | "already_completed" | "invalid_floor"; guest?: Guest }
> {
  if (floorIndex < 0 || floorIndex >= TOTAL_FLOORS) {
    return { ok: false, reason: "invalid_floor" };
  }

  const found = await findGuestRow(passportId);
  if (!found) {
    return { ok: false, reason: "not_found" };
  }

  const { guest, rowNumber } = found;

  // Prevent duplicate stamps.
  if (guest.floors[floorIndex]) {
    return { ok: false, reason: "already_completed", guest };
  }

  const sheets = getSheetsClient();
  const now = new Date().toISOString();

  // Floor columns start at H (index 7). Floor 1 -> column H, Floor 2 -> I, etc.
  // We convert the 0-based floor index to a column letter.
  const floorColumnLetter = String.fromCharCode("H".charCodeAt(0) + floorIndex);

  // Update the floor cell to "Completed".
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${GUESTS_TAB}!${floorColumnLetter}${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[COMPLETED_VALUE]] },
  });

  // Recompute progress.
  const newFloors = [...guest.floors];
  newFloors[floorIndex] = true;
  const completedCount = newFloors.filter(Boolean).length;
  const allDone = completedCount >= TOTAL_FLOORS;

  // Do not downgrade a guest who already claimed their reward.
  const newStatus: GuestStatus =
    guest.status === "Reward Claimed"
      ? "Reward Claimed"
      : allDone
      ? "Completed"
      : "Incomplete";

  // Update Completed Count (M), Status (N), and Last Updated (P).
  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${GUESTS_TAB}!M${rowNumber}:P${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      // M Completed Count | N Status | O Registered At (unchanged) | P Last Updated
      values: [[String(completedCount), newStatus, guest.registeredAt, now]],
    },
  });

  return {
    ok: true,
    guest: {
      ...guest,
      floors: newFloors,
      completedCount,
      status: newStatus,
      lastUpdated: now,
    },
  };
}

/**
 * Mark a guest's reward as claimed. Only allowed if they have completed
 * all floors.
 */
export async function claimReward(
  passportId: string
): Promise<
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" | "not_completed" }
> {
  const found = await findGuestRow(passportId);
  if (!found) return { ok: false, reason: "not_found" };

  const { guest, rowNumber } = found;
  if (guest.completedCount < TOTAL_FLOORS) {
    return { ok: false, reason: "not_completed" };
  }

  const sheets = getSheetsClient();
  const now = new Date().toISOString();

  await sheets.spreadsheets.values.update({
    spreadsheetId: getSheetId(),
    range: `${GUESTS_TAB}!N${rowNumber}:P${rowNumber}`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [["Reward Claimed", guest.registeredAt, now]],
    },
  });

  return {
    ok: true,
    guest: { ...guest, status: "Reward Claimed", lastUpdated: now },
  };
}

/**
 * Append a row to the Scan Logs tab. Used for an audit trail of every
 * scan/stamp action.
 */
export async function appendScanLog(log: ScanLog): Promise<void> {
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: getSheetId(),
    range: `${SCAN_LOGS_TAB}!A:F`,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [
        [
          log.timestamp,
          log.passportId,
          log.guestName,
          log.station,
          log.action,
          log.scannerPage,
        ],
      ],
    },
  });
}
