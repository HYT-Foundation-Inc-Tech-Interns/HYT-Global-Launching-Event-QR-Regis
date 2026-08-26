import { randomBytes, pbkdf2Sync } from "node:crypto";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const args = new Map();
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (key?.startsWith("--") && value) args.set(key.slice(2), value);
}

const username = args.get("username")?.trim();
const password = args.get("password");
const useLocalDatabase = process.argv.includes("--local");
if (!username || !password) {
  console.error(
    'Usage: npm run create-admin -- --username admin --password "choose-a-password" [--local]'
  );
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, 100_000, 32, "sha256");
const quote = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = `INSERT INTO admins (username, password_hash, password_salt) VALUES (${quote(
  username
)}, ${quote(hash.toString("base64url"))}, ${quote(salt.toString("base64url"))}) ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash, password_salt = excluded.password_salt`;

const result = spawnSync(
  process.execPath,
  [
    join(process.cwd(), "node_modules", "wrangler", "bin", "wrangler.js"),
    "d1",
    "execute",
    "hytglobal_db",
    useLocalDatabase ? "--local" : "--remote",
    "--command",
    sql,
  ],
  { stdio: "inherit" }
);
process.exit(result.status ?? 1);