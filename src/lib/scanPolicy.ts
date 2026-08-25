import type { Guest } from "./types";

export interface ScanPolicy {
  enabled: boolean;
  maxDays: number | null;
}

export function getValidityLabel(
  guest: Pick<Guest, "guestType" | "course" | "scanEnabled">,
): string {
  const policy = getScanPolicy(guest);
  if (guest.guestType === "Trainor" && policy.enabled) {
    return "Valid while active (administrator controlled)";
  }
  if (policy.maxDays === 1) return "Valid for 1 training day";
  if (policy.maxDays !== null) return `Valid for ${policy.maxDays} training days`;
  return "Validity disabled";
}

/** Scan limits are attendance days, not raw QR attempts. */
export function getScanPolicy(guest: Pick<Guest, "guestType" | "course" | "scanEnabled">): ScanPolicy {
  if (guest.scanEnabled === false) return { enabled: false, maxDays: 0 };
  if (guest.guestType === "Trainor") return { enabled: true, maxDays: null };

  const course = guest.course.toLowerCase();
  if (course.includes("barista")) return { enabled: true, maxDays: 4 };
  if (course.includes("hilot")) return { enabled: true, maxDays: 5 };
  if (course.includes("housekeeping")) return { enabled: true, maxDays: 35 };
  return { enabled: true, maxDays: 1 };
}