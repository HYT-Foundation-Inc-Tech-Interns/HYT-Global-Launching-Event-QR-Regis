import { createSign, pbkdf2Sync, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function loadEnvFile() {
  try {
    const text = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^"|"$/g, "").replace(/\\n/g, "\n");
    }
  } catch {
    // Environment variables may be provided by the shell or CI instead.
  }
}

loadEnvFile();

const remote = process.argv.includes("--remote");
const dryRun = process.argv.includes("--dry-run");
const sheetId = process.env.GOOGLE_SHEET_ID;
const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!sheetId || !serviceAccount || !privateKey) {
  console.error("Missing GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, or GOOGLE_PRIVATE_KEY.");
  process.exit(1);
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(JSON.stringify({
    iss: serviceAccount,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const input = `${header}.${claim}`;
  const signer = createSign("RSA-SHA256");
  signer.update(input);
  const assertion = `${input}.${signer.sign(privateKey, "base64url")}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${await response.text()}`);
  return (await response.json()).access_token;
}

async function readRange(token, range) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Could not read ${range}: ${await response.text()}`);
  return (await response.json()).values || [];
}

function sqlString(value) {
  if (value === null || value === undefined || value === "") return "NULL";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "NULL";
}

function sqlBoolean(value, fallback = true) {
  if (value === undefined || value === "") return fallback ? "1" : "0";
  return String(value).trim().toLowerCase() === "false" ? "0" : "1";
}

function guestSql(row) {
  const floors = JSON.stringify(Array.from({ length: 5 }, (_, index) =>
    String(row[7 + index] || "").trim().toLowerCase() === "completed"
  ));
  return `INSERT OR REPLACE INTO guests
    (passport_id, full_name, email, phone, organization, guest_type, course, purpose,
     scan_limit_days, scan_enabled, account_active, valid_until, floors, completed_count,
     status, registered_at, last_updated)
    VALUES (${sqlString(row[0])}, ${sqlString(row[1])}, ${sqlString(row[2])},
      ${sqlString(row[3])}, ${sqlString(row[4])}, ${sqlString(row[5])}, ${sqlString(row[16])},
      ${sqlString(row[17])}, ${sqlInteger(row[18])}, ${sqlBoolean(row[19])}, ${sqlBoolean(row[20])},
      ${sqlString(row[21])}, ${sqlString(floors)}, ${sqlInteger(row[12])}, ${sqlString(row[13])},
      ${sqlString(row[14])}, ${sqlString(row[15])});`;
}

function settingsSql(row) {
  const course = String(row[0] || "").trim();
  if (!course) return "";
  const limit = String(row[1] || "").trim();
  return `INSERT OR REPLACE INTO admin_settings
    (course, scan_limit_days, valid_until, active, updated_at)
    VALUES (${sqlString(course)}, ${limit ? sqlInteger(limit) : "NULL"},
      ${sqlString(row[2] || "")}, ${sqlBoolean(row[3])}, CURRENT_TIMESTAMP);`;
}

function scanLogSql(row) {
  if (!row[0] || !row[1]) return "";
  return `INSERT INTO scan_logs
    (timestamp, passport_id, guest_name, station, action, scanner_page, nfc_id)
    VALUES (${sqlString(row[0])}, ${sqlString(row[1])}, ${sqlString(row[2])},
      ${sqlString(row[3])}, ${sqlString(row[4])}, ${sqlString(row[5])}, ${sqlString(row[6])});`;
}

function adminSql(row) {
  const username = String(row[0] || "").trim();
  const password = String(row[1] || "");
  if (!username || !password) return "";
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password.trim(), salt, 100_000, 32, "sha256");
  return `INSERT INTO admins (username, password_hash, password_salt)
    VALUES (${sqlString(username)}, ${sqlString(hash.toString("base64url"))},
      ${sqlString(salt.toString("base64url"))})
    ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash,
      password_salt = excluded.password_salt;`;
}

const token = await getAccessToken();
const [guests, settings, scanLogs, admins] = await Promise.all([
  readRange(token, "Guests!A2:V"),
  readRange(token, "Admin Settings!A2:D"),
  readRange(token, "Scan Logs!A2:G"),
  readRange(token, "Admin Login!A2:C"),
]);

const statements = [
  ...settings.map(settingsSql),
  ...guests.filter((row) => row[0]).map(guestSql),
  ...scanLogs.map(scanLogSql),
  ...admins.map(adminSql),
].filter(Boolean);

console.log(`Prepared ${guests.filter((row) => row[0]).length} guests, ${settings.filter((row) => row[0]).length} settings, ${scanLogs.filter((row) => row[0] && row[1]).length} scan logs, and ${admins.filter((row) => row[0] && row[1]).length} admins.`);
if (dryRun) process.exit(0);

const sqlFile = join(process.cwd(), `.sheets-import-${Date.now()}.sql`);
writeFileSync(sqlFile, `${statements.join("\n")}\n`);
const result = spawnSync(
  process.execPath,
  [join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js"), "d1", "execute", "hytglobal_db", remote ? "--remote" : "--local", "--file", sqlFile],
  { stdio: "inherit" },
);
unlinkSync(sqlFile);
process.exit(result.status ?? 1);