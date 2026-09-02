/**
 * D1 Database helper functions.
 *
 * This file is the ONLY place that talks to D1. All API routes
 * import from here. The frontend never touches D1 directly.
 */

import type { CourseSetting, Guest, GuestStatus, RegistrationInput, ScanLog } from "./types";
import { TOTAL_FLOORS } from "./stations";
import { hasDailyAttendanceQuota, hasOneDayValidity } from "./scanPolicy";
import {
  generatePassportId,
  getAllGuests,
  findGuestByPassportId,
  createGuest,
  updateGuestScanLimit,
  markFloorCompleted,
  markRewardClaimed,
  toggleGuestAccountActive,
  getGuestScanCountToday,
} from "./guest-db";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

// --- Passport ID Management ---

export async function generateNewPassportId(): Promise<string> {
  return generatePassportId();
}

// --- Guest Management ---

/**
 * Get all guests from the database.
 */
export async function getAllGuestsFromDb(): Promise<Guest[]> {
  return getAllGuests();
}

/**
 * Find a guest by passport ID and return guest + row info (for compatibility).
 */
export async function findGuestRow(
  passportId: string
): Promise<{ guest: Guest; rowNumber: number } | null> {
  const guest = await findGuestByPassportId(passportId);
  if (!guest) return null;
  return { guest, rowNumber: 0 }; // rowNumber not needed for D1
}

/**
 * Register a new guest with a generated passport ID.
 */
export async function appendGuest(
  input: RegistrationInput,
  courseSetting?: CourseSetting | null
): Promise<Guest> {
  const passportId = await generateNewPassportId();

  // Determine scan limits based on guest type
  const dailyQuota = hasDailyAttendanceQuota(input.guestType);
  const validUntil = hasOneDayValidity(input.guestType)
    ? new Date().toISOString().slice(0, 10)
    : courseSetting?.validUntil || "";

  const scanLimitDays = dailyQuota
    ? 2
    : input.guestType === "Trainor" || input.guestType === "Intern"
    ? null
    : courseSetting?.scanLimitDays ?? null;

  const guest = await createGuest(
    passportId,
    input.fullName,
    input.email,
    input.phone || "",
    input.organization || "",
    input.guestType,
    input.course || "",
    input.purpose || "",
    scanLimitDays,
    validUntil
  );

  return guest;
}

/**
 * Decrement a guest's scan limit or check daily quota.
 * Returns remaining scans after decrement.
 */
export async function decrementGuestScanLimit(
  passportId: string
): Promise<
  | { ok: true; guest: Guest; remaining: number }
  | { ok: false; reason: "not_found" | "inactive" | "expired" | "unlimited" | "exhausted" }
> {
  const guest = await findGuestByPassportId(passportId);
  if (!guest) return { ok: false, reason: "not_found" };

  const today = new Date().toISOString().slice(0, 10);
  if (!guest.accountActive) return { ok: false, reason: "inactive" };
  if (guest.validUntil && guest.validUntil < today) return { ok: false, reason: "expired" };

  // Check daily attendance quota
  if (hasDailyAttendanceQuota(guest.guestType)) {
    const scansToday = await getGuestScanCountToday(passportId);
    const dailyLimit = 2;
    if (scansToday >= dailyLimit) return { ok: false, reason: "exhausted" };
    return { ok: true, remaining: dailyLimit - scansToday - 1, guest };
  }

  // Unlimited scans (Trainor, Intern)
  if (guest.scanLimitDays === null) return { ok: false, reason: "unlimited" };

  // Decrement scan limit
  if (guest.scanLimitDays <= 0) return { ok: false, reason: "exhausted" };

  const remaining = guest.scanLimitDays - 1;
  const updatedGuest = await updateGuestScanLimit(passportId, remaining);

  return {
    ok: true,
    remaining,
    guest: updatedGuest || guest,
  };
}

/**
 * Mark a floor as completed for a guest.
 */
export async function stampFloor(
  passportId: string,
  floorIndex: number
): Promise<
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" | "already_completed" | "invalid_floor"; guest?: Guest }
> {
  if (floorIndex < 0 || floorIndex >= TOTAL_FLOORS) {
    return { ok: false, reason: "invalid_floor" };
  }

  const guest = await findGuestByPassportId(passportId);
  if (!guest) return { ok: false, reason: "not_found" };

  if (guest.floors[floorIndex]) {
    return { ok: false, reason: "already_completed", guest };
  }

  const updatedGuest = await markFloorCompleted(passportId, floorIndex);
  return { ok: true, guest: updatedGuest || guest };
}

/**
 * Mark a guest's reward as claimed.
 */
export async function claimReward(
  passportId: string
): Promise<
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" | "not_completed" }
> {
  const guest = await findGuestByPassportId(passportId);
  if (!guest) return { ok: false, reason: "not_found" };

  if (guest.completedCount < TOTAL_FLOORS) {
    return { ok: false, reason: "not_completed" };
  }

  const updatedGuest = await markRewardClaimed(passportId);
  return { ok: true, guest: updatedGuest || guest };
}

/**
 * Toggle a guest's account active status.
 */
export async function toggleGuestAccountActiveDb(
  passportId: string,
  accountActive: boolean
): Promise<
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" }
> {
  const updatedGuest = await toggleGuestAccountActive(passportId, accountActive);
  if (!updatedGuest) return { ok: false, reason: "not_found" };
  return { ok: true, guest: updatedGuest };
}

/**
 * Append a scan log entry (for audit trail).
 * Placeholder - implement as needed.
 */
export async function appendScanLog(log: ScanLog): Promise<void> {
  // TODO: Create a scan_logs table if needed for audit trail
  console.log("Scan logged:", log);
}

/**
 * Get admin login credentials (from admins table).
 */
export async function getAdminLoginCredentials(
  username?: string,
  password?: string
): Promise<{ username: string; password: string } | null> {
  const { env } = await getCloudflareContext({ async: true });

  if (username && password) {
    const row = await env.DB
      .prepare(
        "SELECT username, password_salt AS passwordSalt, password_hash AS passwordHash FROM admins WHERE username = ?1"
      )
      .bind(username)
      .first<any>();

    return row ? { username: row.username, password } : null;
  }

  // Return first admin if no username/password provided
  const row = await env.DB
    .prepare("SELECT username, password_salt AS passwordSalt, password_hash AS passwordHash FROM admins LIMIT 1")
    .first<any>();

  return row ? { username: row.username, password: "" } : null;
}

/**
 * Get course settings from admin settings.
 * Placeholder - implement admin settings table if needed.
 */
export async function getCourseSettings(): Promise<CourseSetting[]> {
  // TODO: Create admin_settings table and populate from there
  return [
    { course: "Barista NC II", scanLimitDays: 4, validUntil: "", active: true },
    { course: "Hilot (Wellness) Massage NC II", scanLimitDays: 5, validUntil: "", active: true },
    { course: "Events Management Services NC III", scanLimitDays: 1, validUntil: "", active: true },
  ];
}

/**
 * Save course settings.
 * Placeholder - implement admin settings table if needed.
 */
export async function saveCourseSettings(settings: CourseSetting[]): Promise<CourseSetting[]> {
  // TODO: Update admin_settings table
  return settings;
}

export async function getCourseSetting(course: string): Promise<CourseSetting | null> {
  const settings = await getCourseSettings();
  return (
    settings.find((s) =>
      s.course.toLowerCase() === course.toLowerCase()
    ) || null
  );
}
