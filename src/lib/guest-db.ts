/**
 * D1 Database helpers for guest operations.
 * Replaces Google Sheets with local D1 database.
 */

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";
import type { Guest, GuestStatus } from "./types";

declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

/**
 * Generate a unique passport ID in format HYT-YYYY-XXXX
 * where YYYY is the year and XXXX is a 4-digit sequential number.
 */
export async function generatePassportId(): Promise<string> {
  const { env } = await getCloudflareContext({ async: true });
  const year = new Date().getFullYear();
  
  // Get the count of guests registered this year
  const result = await env.DB
    .prepare("SELECT COUNT(*) as count FROM guests WHERE registered_at LIKE ?1")
    .bind(`${year}-%`)
    .first<{ count: number }>();
  
  const count = (result?.count ?? 0) + 1;
  const paddedCount = String(count).padStart(4, "0");
  return `HYT-${year}-${paddedCount}`;
}

/**
 * Convert database row to Guest object.
 */
function rowToGuest(row: any): Guest {
  const floors = row.floors ? JSON.parse(row.floors) : [];
  return {
    passportId: row.passport_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone || "",
    organization: row.organization || "",
    guestType: row.guest_type,
    course: row.course || "",
    purpose: row.purpose || "",
    scanLimitDays: row.scan_limit_days,
    scanEnabled: Boolean(row.scan_enabled),
    accountActive: Boolean(row.account_active),
    validUntil: row.valid_until || "",
    passportLink: `/passport/${row.passport_id}`,
    floors,
    completedCount: row.completed_count,
    status: row.status as GuestStatus,
    registeredAt: row.registered_at,
    lastUpdated: row.last_updated,
  };
}

/**
 * Get all guests from the database.
 */
export async function getAllGuests(): Promise<Guest[]> {
  const { env } = await getCloudflareContext({ async: true });
  const rows = await env.DB
    .prepare("SELECT * FROM guests ORDER BY registered_at DESC")
    .all<any>();
  
  return (rows.results || []).map(rowToGuest);
}

/**
 * Find a guest by passport ID.
 */
export async function findGuestByPassportId(passportId: string): Promise<Guest | null> {
  const { env } = await getCloudflareContext({ async: true });
  const row = await env.DB
    .prepare("SELECT * FROM guests WHERE passport_id = ?1")
    .bind(passportId)
    .first<any>();
  
  return row ? rowToGuest(row) : null;
}

/**
 * Find a guest by email.
 */
export async function findGuestByEmail(email: string): Promise<Guest | null> {
  const { env } = await getCloudflareContext({ async: true });
  const row = await env.DB
    .prepare("SELECT * FROM guests WHERE email = ?1")
    .bind(email.toLowerCase())
    .first<any>();
  
  return row ? rowToGuest(row) : null;
}

/**
 * Create a new guest record.
 */
export async function createGuest(
  passportId: string,
  fullName: string,
  email: string,
  phone: string,
  organization: string,
  guestType: string,
  course: string,
  purpose: string,
  scanLimitDays: number | null,
  validUntil: string
): Promise<Guest> {
  const { env } = await getCloudflareContext({ async: true });
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `INSERT INTO guests (
        passport_id, full_name, email, phone, organization, guest_type,
        course, purpose, scan_limit_days, account_active, valid_until,
        floors, completed_count, status, registered_at, last_updated
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16)`
    )
    .bind(
      passportId,
      fullName,
      email.toLowerCase(),
      phone,
      organization,
      guestType,
      course,
      purpose,
      scanLimitDays,
      1, // account_active = TRUE
      validUntil,
      JSON.stringify([false, false, false, false, false]), // floors (5 floors)
      0, // completed_count
      "Incomplete", // status
      now,
      now
    )
    .run();

  return findGuestByPassportId(passportId) as Promise<Guest>;
}

/**
 * Update a guest's scan limit.
 */
export async function updateGuestScanLimit(
  passportId: string,
  newScanLimit: number
): Promise<Guest | null> {
  const { env } = await getCloudflareContext({ async: true });
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE guests 
       SET scan_limit_days = ?1, scan_enabled = ?2, last_updated = ?3 
       WHERE passport_id = ?4`
    )
    .bind(newScanLimit, newScanLimit > 0 ? 1 : 0, now, passportId)
    .run();

  return findGuestByPassportId(passportId);
}

/**
 * Mark a floor as completed for a guest.
 */
export async function markFloorCompleted(
  passportId: string,
  floorIndex: number // 0-based
): Promise<Guest | null> {
  const guest = await findGuestByPassportId(passportId);
  if (!guest) return null;
  if (guest.floors[floorIndex]) return guest; // Already completed

  const { env } = await getCloudflareContext({ async: true });
  const now = new Date().toISOString();
  
  const newFloors = [...guest.floors];
  newFloors[floorIndex] = true;
  const completedCount = newFloors.filter(Boolean).length;
  
  const newStatus: GuestStatus =
    guest.status === "Reward Claimed"
      ? "Reward Claimed"
      : completedCount >= 5
      ? "Completed"
      : "Incomplete";

  await env.DB
    .prepare(
      `UPDATE guests 
       SET floors = ?1, completed_count = ?2, status = ?3, last_updated = ?4
       WHERE passport_id = ?5`
    )
    .bind(
      JSON.stringify(newFloors),
      completedCount,
      newStatus,
      now,
      passportId
    )
    .run();

  return findGuestByPassportId(passportId);
}

/**
 * Mark a guest's reward as claimed.
 */
export async function markRewardClaimed(passportId: string): Promise<Guest | null> {
  const { env } = await getCloudflareContext({ async: true });
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE guests 
       SET status = ?1, last_updated = ?2
       WHERE passport_id = ?3`
    )
    .bind("Reward Claimed", now, passportId)
    .run();

  return findGuestByPassportId(passportId);
}

/**
 * Toggle a guest's account active status.
 */
export async function toggleGuestAccountActive(
  passportId: string,
  accountActive: boolean
): Promise<Guest | null> {
  const { env } = await getCloudflareContext({ async: true });
  const now = new Date().toISOString();

  await env.DB
    .prepare(
      `UPDATE guests 
       SET account_active = ?1, last_updated = ?2
       WHERE passport_id = ?3`
    )
    .bind(accountActive ? 1 : 0, now, passportId)
    .run();

  return findGuestByPassportId(passportId);
}

/**
 * Get today's scan count for a guest.
 */
export async function getGuestScanCountToday(passportId: string): Promise<number> {
  const { env } = await getCloudflareContext({ async: true });
  const today = new Date().toISOString().slice(0, 10);
  
  // Note: This would need a scan_logs table to track scans by date
  // For now, returning 0 as a placeholder
  return 0;
}
