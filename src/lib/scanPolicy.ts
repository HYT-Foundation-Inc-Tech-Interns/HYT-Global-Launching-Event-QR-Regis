import type { Guest } from "./types";

export interface ScanPolicy {
  enabled: boolean;
  maxDays: number | null;
  dailyScans: number | null;
}

export function hasDailyAttendanceQuota(guestType: string): boolean {
  return ["worker", "visitor", "vip", "employee"].includes(guestType.trim().toLowerCase());
}

export function getValidityLabel(
  guest: Pick<Guest, "guestType" | "course" | "scanLimitDays" | "scanEnabled" | "accountActive" | "validUntil">,
): string {
  if (guest.accountActive === false) return "Account inactive";
  if (guest.validUntil) return `Valid until ${guest.validUntil}`;
  if (hasDailyAttendanceQuota(guest.guestType)) return "2 attendance scans per day";
  const policy = getScanPolicy(guest);
  if (guest.guestType === "Trainor" && policy.enabled) {
    return "Valid while active (administrator controlled)";
  }
  if (policy.maxDays === 1) return "Valid for 1 training day";
  if (policy.maxDays !== null) return `Valid for ${policy.maxDays} training days`;
  return "Validity disabled";
}

/** Scan limits are attendance days, not raw QR attempts. */
export function getScanPolicy(guest: Pick<Guest, "guestType" | "course" | "scanLimitDays" | "scanEnabled">): ScanPolicy {
  if (guest.scanEnabled === false) return { enabled: false, maxDays: 0, dailyScans: 0 };
  if (hasDailyAttendanceQuota(guest.guestType)) return { enabled: true, maxDays: null, dailyScans: 2 };
  if (guest.scanLimitDays !== null) return { enabled: true, maxDays: guest.scanLimitDays, dailyScans: null };
  if (guest.guestType === "Trainor") return { enabled: true, maxDays: null, dailyScans: null };

  const course = guest.course.toLowerCase();
  if (course.includes("barista")) return { enabled: true, maxDays: 4, dailyScans: null };
  if (course.includes("hilot")) return { enabled: true, maxDays: 5, dailyScans: null };
  if (course.includes("housekeeping")) return { enabled: true, maxDays: 35, dailyScans: null };
  return { enabled: true, maxDays: 1, dailyScans: null };
}

export function isGuestAccountActive(guest: Pick<Guest, "accountActive" | "validUntil">): boolean {
  if (guest.accountActive === false) return false;
  if (!guest.validUntil) return true;
  return guest.validUntil >= new Date().toISOString().slice(0, 10);
}

export function getAccountStatus(
  guest: Pick<Guest, "accountActive" | "validUntil">,
): "Active" | "Inactive" | "Expired" {
  if (guest.accountActive === false) return "Inactive";
  if (guest.validUntil && guest.validUntil < new Date().toISOString().slice(0, 10)) return "Expired";
  return "Active";
}