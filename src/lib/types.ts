/**
 * Shared TypeScript types for the HYT Digital Passport app.
 * These describe the shape of data passed between the backend
 * (Google Sheets) and the frontend.
 */

// A guest can be in one of three states during the event.
export type GuestStatus = "Incomplete" | "Completed" | "Reward Claimed";

// The main guest record. This matches one row in the "Guests" sheet tab.
export interface Guest {
  passportId: string; // e.g. "HYT-2026-0001"
  fullName: string;
  email: string;
  phone: string;
  organization: string; // School / Company
  guestType: string; // e.g. Student, VIP, Staff, Visitor
  course: string;
  purpose: string;
  scanLimitDays: number | null;
  scanEnabled: boolean;
  accountActive: boolean;
  validUntil: string;
  passportLink: string; // e.g. "/passport/HYT-2026-0001"

  // One boolean per floor (index 0 = Floor 1, ... index 4 = Floor 5).
  // true = the guest has completed that floor's station.
  floors: boolean[];

  completedCount: number; // how many floors are completed (0-5)
  status: GuestStatus;
  registeredAt: string; // ISO timestamp
  lastUpdated: string; // ISO timestamp
}

// Data submitted by the registration form.
export interface RegistrationInput {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  guestType: string;
  course?: string;
  purpose?: string;
}

export interface CourseSetting {
  course: string;
  scanLimitDays: number | null;
  validUntil: string;
  active: boolean;
}

// One row in the "Scan Logs" sheet tab.
export interface ScanLog {
  timestamp: string;
  passportId: string;
  guestName: string;
  station: string; // floor / station label
  action: string; // e.g. "Stamped", "Already Completed", "Reward Claimed"
  scannerPage: string; // which scanner page performed the action
}
