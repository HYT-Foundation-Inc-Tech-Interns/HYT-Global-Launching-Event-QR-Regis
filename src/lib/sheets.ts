/**
 * Google Sheets helper functions.
 *
 * This file is the ONLY place that talks to Google Sheets. All API routes
 * import from here. The frontend never touches Google Sheets directly.
 *
 * The "Guests" tab is treated like a tiny database table. Each guest is
 * one row. Columns A..V map to the fields described below.
 *
 * Guests tab columns (A..V):
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
 *   Q  Course
 *   R  Purpose
 *   S  Scan Limit (days; blank = unlimited)
 *   T  Scan Enabled (set FALSE to disable)
 *   U  Account Active (set FALSE to disable the guest account)
 *   V  Valid Until (YYYY-MM-DD; blank = no expiry)
 */

import type { CourseSetting, Guest, GuestStatus, RegistrationInput, ScanLog } from "./types";
import { TOTAL_FLOORS } from "./stations";
import { hasDailyAttendanceQuota, hasOneDayValidity } from "./scanPolicy";

// SPREADSHEET DATABASE PLUGIN INTEGRATION POINT:
// Put any Google Sheets, Airtable, or other spreadsheet-database plugin/client
// setup in this file. Keep credentials and all reads/writes on the server;
// API routes should continue to import the functions below instead of letting
// browser components connect to the spreadsheet directly.

/*
 * Transport note:
 * We talk to the Google Sheets REST API directly with `fetch`, and sign the
 * service-account JWT with Web Crypto (crypto.subtle). We deliberately avoid
 * the `googleapis` SDK because its HTTP layer (gaxios) is not compatible with
 * the Cloudflare Workers runtime. This approach runs on both Node and Workers.
 */

// --- Sheet tab names. Change these if you renamed your tabs. ---
const GUESTS_TAB = "Guests";
const SCAN_LOGS_TAB = "Scan Logs";
const ADMIN_SETTINGS_TAB = "Admin Settings";
const ADMIN_LOGIN_TABS = ["Admin Login"];

// The value we write into a floor cell once a guest completes it.
const COMPLETED_VALUE = "Completed";

// Total number of columns in the Guests tab (A..V = 22).
const GUEST_COLUMNS = 22;
const ADMIN_TABS = 3;
function getSheetId(): string {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) {
    throw new Error("Missing GOOGLE_SHEET_ID in .env.local");
  }
  return id;
}

// --- Service-account auth (Web Crypto, Workers-compatible) ---------------

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";
const ADMIN_SETTINGS_SHEET_ID = 987654321;

// Cache the access token between calls within an isolate to avoid re-signing
// on every Sheets request. Tokens are valid for ~1 hour.
let cachedToken: { token: string; expiresAt: number } | null = null;

function base64urlFromBytes(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlFromString(str: string): string {
  return base64urlFromBytes(new TextEncoder().encode(str));
}

/** Decode a PEM (PKCS#8) private key into the raw bytes Web Crypto expects. */
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Build, sign, and exchange a service-account JWT for an OAuth access token.
 * Uses crypto.subtle (available on both Node 18+ and Cloudflare Workers).
 */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt > now + 60) {
    return cachedToken.token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  // The private key is stored with literal "\n" in the env var, so we
  // convert those back into real newlines here.
  const pem = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !pem) {
    throw new Error(
      "Missing Google credentials. Check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY."
    );
  }

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: email,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  };
  const signingInput = `${base64urlFromString(JSON.stringify(header))}.${base64urlFromString(
    JSON.stringify(claim)
  )}`;

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signingInput)
  );
  const assertion = `${signingInput}.${base64urlFromBytes(new Uint8Array(signature))}`;

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!res.ok) {
    throw new Error(`Google token request failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in?: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600),
  };
  return data.access_token;
}

// --- Sheets REST helpers (replace googleapis client methods) -------------

/** GET a range and return its 2D array of cell values (empty if none). */
async function valuesGet(range: string): Promise<string[][]> {
  const token = await getAccessToken();
  const url = `${SHEETS_BASE}/${getSheetId()}/values/${encodeURIComponent(range)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`Sheets get failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { values?: string[][] };
  return data.values ?? [];
}

/** Append rows to a range (equivalent to values.append). */
async function valuesAppend(
  range: string,
  values: string[][],
  valueInputOption = "USER_ENTERED"
): Promise<void> {
  const token = await getAccessToken();
  const url = `${SHEETS_BASE}/${getSheetId()}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=${valueInputOption}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    throw new Error(`Sheets append failed (${res.status}): ${await res.text()}`);
  }
}

/** Overwrite a range (equivalent to values.update). */
async function valuesUpdate(
  range: string,
  values: string[][],
  valueInputOption = "USER_ENTERED"
): Promise<void> {
  const token = await getAccessToken();
  const url = `${SHEETS_BASE}/${getSheetId()}/values/${encodeURIComponent(
    range
  )}?valueInputOption=${valueInputOption}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) {
    throw new Error(`Sheets update failed (${res.status}): ${await res.text()}`);
  }
}

async function valuesClear(range: string): Promise<void> {
  const token = await getAccessToken();
  const url = `${SHEETS_BASE}/${getSheetId()}/values/${encodeURIComponent(range)}:clear`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    throw new Error(`Sheets clear failed (${res.status}): ${await res.text()}`);
  }
}

async function ensureAdminSettingsTab(): Promise<void> {
  const token = await getAccessToken();
  const spreadsheetId = getSheetId();
  const metadataResponse = await fetch(
    `${SHEETS_BASE}/${spreadsheetId}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!metadataResponse.ok) {
    throw new Error(`Sheets metadata request failed (${metadataResponse.status}): ${await metadataResponse.text()}`);
  }
  const metadata = (await metadataResponse.json()) as { sheets?: { properties?: { title?: string } }[] };
  if (metadata.sheets?.some((sheet) => sheet.properties?.title === ADMIN_SETTINGS_TAB)) return;

  const response = await fetch(`${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { sheetId: ADMIN_SETTINGS_SHEET_ID, title: ADMIN_SETTINGS_TAB } } }] }),
  });
  if (!response.ok && response.status !== 400) {
    throw new Error(`Sheets tab creation failed (${response.status}): ${await response.text()}`);
  }
  await valuesUpdate(`${ADMIN_SETTINGS_TAB}!A1:D1`, [["Course", "Scan Limit Days", "Valid Until", "Active"]]);
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
    course: row[16] || "",
    purpose: row[17] || "",
    scanLimitDays: row[18]?.trim() ? Math.max(0, Number(row[18])) : null,
    scanEnabled: (row[19] || "TRUE").trim().toLowerCase() !== "false",
    accountActive: (row[20] || "TRUE").trim().toLowerCase() !== "false",
    validUntil: (row[21] || "").trim(),
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
  const rows = await valuesGet(`${GUESTS_TAB}!A2:V`);
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
  const rows = await valuesGet(`${GUESTS_TAB}!A2:V`);
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

/** Return the calendar days on which a guest has an accepted scan. */
export async function getGuestScanDays(passportId: string): Promise<string[]> {
  const rows = await valuesGet(`${SCAN_LOGS_TAB}!A2:F`);
  return Array.from(
    new Set(
      rows
        .filter((row) => row[1] === passportId && row[4] === "Stamped")
        .map((row) => (row[0] || "").slice(0, 10))
        .filter(Boolean),
    ),
  );
}

export async function getGuestScanCountToday(passportId: string): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await valuesGet(`${SCAN_LOGS_TAB}!A2:F`);
  return rows.filter(
    (row) => row[1] === passportId &&
      (row[4] === "Admin Scan" || row[4] === "NFC Scan") &&
      (row[0] || "").slice(0, 10) === today,
  ).length;
}

/**
 * Generate the next sequential Passport ID, e.g. "HYT-2026-0001".
 * We count the existing rows and add 1. The year prefix can be changed
 * via the PASSPORT_YEAR constant below.
 */
const PASSPORT_PREFIX = "HYT";
const PASSPORT_YEAR = "2026";

/**
 * A short random secret appended to each Passport ID so the IDs are not
 * guessable by simply incrementing the sequence number. 4 bytes -> 8 hex
 * chars (~4.3 billion combinations), which is plenty to stop casual snooping
 * at a one-day event without needing a database or login.
 */
function randomToken(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function generateNextPassportId(): Promise<string> {
  const guests = await getAllGuests();
  const next = guests.length + 1;
  const padded = String(next).padStart(4, "0");
  // e.g. "HYT-2026-0007-9f3ac71b" — sequential part stays human-readable,
  // the random suffix makes the full ID unguessable.
  return `${PASSPORT_PREFIX}-${PASSPORT_YEAR}-${padded}-${randomToken()}`;
}

async function getNextGuestRowNumber(): Promise<number> {
  const rows = await valuesGet(`${GUESTS_TAB}!A2:A`);
  const firstEmptyIndex = rows.findIndex((row) => !(row[0] || "").trim());
  return firstEmptyIndex === -1 ? rows.length + 2 : firstEmptyIndex + 2;
}

/**
 * Add a new guest to the Guests tab.
 * Returns the fully-built Guest object that was saved.
 */
export async function appendGuest(
  input: RegistrationInput,
  courseSetting?: CourseSetting | null,
): Promise<Guest> {
  const passportId = await generateNextPassportId();
  const now = new Date().toISOString();
  const passportLink = `/passport/${passportId}`;
  const dailyQuota = hasDailyAttendanceQuota(input.guestType);
  const scanLimitDays = dailyQuota ? 2 : courseSetting?.scanLimitDays ?? null;
  const validUntil = hasOneDayValidity(input.guestType) ? now.slice(0, 10) : courseSetting?.validUntil || "";
  const settingActive = courseSetting?.active !== false;
  const dateActive = !validUntil || validUntil >= now.slice(0, 10);
  const accountActive = settingActive && dateActive;
  const scanEnabled = accountActive && (scanLimitDays === null || scanLimitDays > 0);

  // Build the row in the exact column order (A..V).
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
    input.course || "", // Q Course
    input.purpose || "", // R Purpose
    scanLimitDays === null ? "" : String(scanLimitDays), // S Scan Limit
    scanEnabled ? "TRUE" : "FALSE", // T Scan Enabled
    accountActive ? "TRUE" : "FALSE", // U Account Active
    validUntil, // V Valid Until
  ];

  const rowNumber = await getNextGuestRowNumber();
  await valuesUpdate(`${GUESTS_TAB}!A${rowNumber}:V${rowNumber}`, [row]);

  return {
    passportId,
    fullName: input.fullName,
    email: input.email,
    phone: input.phone,
    organization: input.organization,
    guestType: input.guestType,
    course: input.course || "",
    purpose: input.purpose || "",
    scanLimitDays,
    scanEnabled,
    accountActive,
    validUntil,
    passportLink,
    floors: new Array(TOTAL_FLOORS).fill(false),
    completedCount: 0,
    status: "Incomplete",
    registeredAt: now,
    lastUpdated: now,
  };
}

function rowToCourseSetting(row: string[]): CourseSetting | null {
  const course = String(row[0] || "").trim();
  if (!course) return null;
  const rawLimit = String(row[1] || "").trim();
  const parsedLimit = rawLimit ? Number(rawLimit) : null;
  return {
    course,
    scanLimitDays: parsedLimit !== null && Number.isFinite(parsedLimit) ? Math.max(0, parsedLimit) : null,
    validUntil: String(row[2] || "").trim(),
    active: String(row[3] || "TRUE").trim().toLowerCase() !== "false",
  };
}

export async function getCourseSettings(): Promise<CourseSetting[]> {
  try {
    const rows = await valuesGet(`${ADMIN_SETTINGS_TAB}!A2:D`);
    return rows.map((row) => rowToCourseSetting(row)).filter((setting): setting is CourseSetting => setting !== null);
  } catch {
    return [];
  }
}

export async function getCourseSetting(course: string): Promise<CourseSetting | null> {
  const normalizedCourse = course.trim().toLowerCase();
  if (!normalizedCourse) return null;
  const setting = (await getCourseSettings()).find(
    (candidate) => candidate.course.toLowerCase() === normalizedCourse,
  );
  return setting || null;
}

export async function saveCourseSettings(settings: CourseSetting[]): Promise<void> {
  await ensureAdminSettingsTab();
  await valuesClear(`${ADMIN_SETTINGS_TAB}!A2:D100`);
  if (settings.length === 0) return;
  await valuesUpdate(
    `${ADMIN_SETTINGS_TAB}!A2:D${settings.length + 1}`,
    settings.map((setting) => [
      setting.course.trim(),
      setting.scanLimitDays === null ? "" : String(setting.scanLimitDays),
      setting.validUntil,
      setting.active ? "TRUE" : "FALSE",
    ]),
  );
}

export async function decrementGuestScanLimit(
  passportId: string,
): Promise<
  | { ok: true; guest: Guest; remaining: number }
  | { ok: false; reason: "not_found" | "inactive" | "expired" | "unlimited" | "exhausted" }
> {
  const found = await findGuestRow(passportId);
  if (!found) return { ok: false, reason: "not_found" };

  const { guest, rowNumber } = found;
  const today = new Date().toISOString().slice(0, 10);
  if (!guest.accountActive) return { ok: false, reason: "inactive" };
  if (guest.validUntil && guest.validUntil < today) return { ok: false, reason: "expired" };
  if (hasDailyAttendanceQuota(guest.guestType)) {
    const scansToday = await getGuestScanCountToday(passportId);
    const dailyLimit = 2;
    if (scansToday >= dailyLimit) return { ok: false, reason: "exhausted" };
    return { ok: true, remaining: dailyLimit - scansToday - 1, guest };
  }
  if (guest.scanLimitDays === null) {
    // Unlimited scan access (e.g. Trainor, Intern)
    return { ok: true, remaining: -1, guest };
  }
  if (guest.scanLimitDays <= 0) return { ok: false, reason: "exhausted" };

  const remaining = guest.scanLimitDays - 1;
  const now = new Date().toISOString();
  await valuesUpdate(`${GUESTS_TAB}!S${rowNumber}:T${rowNumber}`, [[
    String(remaining),
    remaining > 0 ? "TRUE" : "FALSE",
  ]]);
  await valuesUpdate(`${GUESTS_TAB}!P${rowNumber}`, [[now]]);

  return {
    ok: true,
    remaining,
    guest: {
      ...guest,
      scanLimitDays: remaining,
      scanEnabled: remaining > 0,
      lastUpdated: now,
    },
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

  const now = new Date().toISOString();

  // Floor columns start at H (index 7). Floor 1 -> column H, Floor 2 -> I, etc.
  // We convert the 0-based floor index to a column letter.
  const floorColumnLetter = String.fromCharCode("H".charCodeAt(0) + floorIndex);

  // Update the floor cell to "Completed".
  await valuesUpdate(`${GUESTS_TAB}!${floorColumnLetter}${rowNumber}`, [
    [COMPLETED_VALUE],
  ]);

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
  // M Completed Count | N Status | O Registered At (unchanged) | P Last Updated
  await valuesUpdate(`${GUESTS_TAB}!M${rowNumber}:P${rowNumber}`, [
    [String(completedCount), newStatus, guest.registeredAt, now],
  ]);

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

  const now = new Date().toISOString();

  await valuesUpdate(`${GUESTS_TAB}!N${rowNumber}:P${rowNumber}`, [
    ["Reward Claimed", guest.registeredAt, now],
  ]);

  return {
    ok: true,
    guest: { ...guest, status: "Reward Claimed", lastUpdated: now },
  };
}

/**
 * Toggle a guest's account active status (enable/disable).
 * Returns the updated guest on success.
 */
export async function toggleGuestAccountActive(
  passportId: string,
  accountActive: boolean
): Promise<
  | { ok: true; guest: Guest }
  | { ok: false; reason: "not_found" }
> {
  const found = await findGuestRow(passportId);
  if (!found) return { ok: false, reason: "not_found" };

  const { guest, rowNumber } = found;
  const now = new Date().toISOString();

  // Column U is accountActive (index 20)
  await valuesUpdate(`${GUESTS_TAB}!U${rowNumber}:P${rowNumber}`, [
    [accountActive ? "TRUE" : "FALSE", now],
  ]);

  return {
    ok: true,
    guest: { ...guest, accountActive, lastUpdated: now },
  };
}

/**
 * Append a row to the Scan Logs tab. Used for an audit trail of every
 * scan/stamp action. Column G stores the NFC ID when the scan came from NFC.
 */
export async function appendScanLog(log: ScanLog): Promise<void> {
  await valuesAppend(`${SCAN_LOGS_TAB}!A:G`, [
    [
      log.timestamp,
      log.passportId,
      log.guestName,
      log.station,
      log.action,
      log.scannerPage,
      log.nfcId || "",
    ],
  ]);
}

/**
-m  * Read admin login credentials from the dedicated admin tab.
 * Expected format starting at row 1:
 *   A1 = username
 *   B1 = password
 *   C1 = optional created date
 *
 * Multiple users can exist in the sheet; the function checks all rows and
 * matches the submitted username/password pair.
 */
export async function getAdminLoginCredentials(
  username?: string,
  password?: string
): Promise<{ username: string; password: string } | null> {
  for (const tab of ADMIN_LOGIN_TABS) {
    try {
      const rows = await valuesGet(`${tab}!A1:B`);

      for (const row of rows) {
        const sheetUsername = String(row[0] ?? "").trim();
        const sheetPassword = String(row[1] ?? "").trim();

        if (!sheetUsername && !sheetPassword) continue;

        if (username && password) {
          if (
            sheetUsername === username.trim() &&
            sheetPassword === password.trim()
          ) {
            return { username: sheetUsername, password: sheetPassword };
          }
          continue;
        }

        if (sheetUsername && sheetPassword) {
          return { username: sheetUsername, password: sheetPassword };
        }
      }
    } catch {
      // The admin credentials tab may not exist yet or may not be shared.
      // Fall through to the next possible tab name.
    }
  }
  return null;
}
