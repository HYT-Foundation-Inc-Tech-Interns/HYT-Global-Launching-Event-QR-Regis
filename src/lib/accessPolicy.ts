import type { Guest } from "./types";

export function canAccessEventScan(guest: Pick<Guest, "guestType">): boolean {
  return guest.guestType === "VIP";
}

export function canScanStation(
  guest: Pick<Guest, "guestType">,
  floor: number,
): boolean {
  return canAccessEventScan(guest) && floor >= 1 && floor <= 3;
}