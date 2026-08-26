import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { D1Database } from "@cloudflare/workers-types";

export interface AdminCredential {
  username: string;
  passwordHash: string;
  passwordSalt: string;
}

declare global {
  interface CloudflareEnv {
    DB: D1Database;
  }
}

export async function getAdminLoginCredentials(
  username: string
): Promise<AdminCredential | null> {
  const { env } = await getCloudflareContext({ async: true });
  const row = await env.DB
    .prepare(
      "SELECT username, password_hash AS passwordHash, password_salt AS passwordSalt FROM admins WHERE username = ?1 LIMIT 1"
    )
    .bind(username)
    .first<AdminCredential>();

  return row ?? null;
}