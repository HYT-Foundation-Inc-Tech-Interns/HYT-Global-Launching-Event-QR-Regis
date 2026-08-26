/**
 * Server-only helpers for the shared admin password.
 *
 * Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in .env.local (and in the
 * deployment environment). Never prefix either variable with NEXT_PUBLIC_.
 *
 * If no environment credentials exist, the app falls back to Google Sheet
 * credentials stored in a tab such as "Admin Login" with:
 *   A1 = username
 *   B1 = password
 *   C1 = created date
 */

import { getAdminLoginCredentials } from "./admin-db";

export const ADMIN_SESSION_COOKIE = "hyt_admin_session";
const SESSION_LIFETIME_SECONDS = 8 * 60 * 60;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

function getSessionSecret(): string | null {
  return process.env.ADMIN_SESSION_SECRET || "hyt-admin-session-secret-fallback";
}

async function sign(value: string): Promise<string | null> {
  const secret = getSessionSecret();
  if (!secret) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index++) difference |= left[index] ^ right[index];
  return difference === 0;
}

/** Creates a signed, time-limited cookie value after a successful login. */
export async function createAdminSession(): Promise<string | null> {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_LIFETIME_SECONDS;
  const random = new Uint8Array(16);
  crypto.getRandomValues(random);
  const payload = `${expiresAt}.${toBase64Url(random)}`;
  const signature = await sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

/** Validates a cookie without exposing the password or secret to the browser. */
export async function isValidAdminSession(session: string | undefined): Promise<boolean> {
  if (!session) return false;
  const [expiresAtValue, nonce, signature, ...extra] = session.split(".");
  if (!expiresAtValue || !nonce || !signature || extra.length > 0) return false;
  if (!/^\d+$/.test(expiresAtValue) || Number(expiresAtValue) < Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = await sign(`${expiresAtValue}.${nonce}`);
  const suppliedBytes = fromBase64Url(signature);
  const expectedBytes = expectedSignature ? fromBase64Url(expectedSignature) : null;
  return Boolean(suppliedBytes && expectedBytes && equalBytes(suppliedBytes, expectedBytes));
}

/**
 * Validate admin credentials by reading the D1 admins table.
 */
export async function isCorrectAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const trimmedUsername = username.trim();
  const trimmedPassword = password.trim();
  if (!trimmedUsername || !trimmedPassword) return false;

  const databaseCredentials = await getAdminLoginCredentials(trimmedUsername);
  if (!databaseCredentials) return false;

  const salt = fromBase64Url(databaseCredentials.passwordSalt);
  const expectedHash = fromBase64Url(databaseCredentials.passwordHash);
  if (!salt || !expectedHash) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(trimmedPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedHash = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: salt as BufferSource, iterations: 100_000, hash: "SHA-256" },
      key,
      expectedHash.length * 8
    )
  );
  return equalBytes(derivedHash, expectedHash);
}

export const adminSessionMaxAge = SESSION_LIFETIME_SECONDS;
