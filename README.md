# HYT Digital Passport

HYT Digital Passport is a QR-based event registration and attendance system built with Next.js, TypeScript, Tailwind CSS, and Cloudflare D1.

The architecture is **D1-first**:

- The website reads guests, admin accounts, course settings, and scan logs from D1.
- New guests are written to D1 first.
- Google Sheets is an optional mirror for guest rows and scan logs. A Sheets failure must not block registration.
- Admin passwords are stored only as PBKDF2 hashes and salts in D1.

## Features

| Area | Route | Description |
| --- | --- | --- |
| Guest registration | `/register` | Requires an explicit role and creates a D1 guest record. |
| Digital passport | `/passport/[passportId]` | Shows the guest QR code, progress, and event status. |
| Floor completion | `/complete/[floor]` | Handles native-camera station QR links. |
| Admin dashboard | `/admin/dashboard` | Lists guests and manages reward claims. |
| Course settings | `/admin/settings` | Manages database-backed course limits and validity dates. |
| Station QR codes | `/admin/station-codes` | Generates QR posters for event stations. |
| Admin scanner | `/admin/scan` | Scans guest QR codes or NFC passport tags. |
| Floor staff scanner | `/admin/scan/[floor]` | Looks up and stamps a guest at a specific floor. |
| Admin login | `/admin/login` | Protects administrator routes with a signed session cookie. |

## Requirements

- Node.js 20 or newer
- npm
- Wrangler 4
- A Cloudflare account for remote D1/deployment
- Google Sheets service-account credentials only if Sheets mirroring or Google import is needed

## Install and run locally

```powershell
cd D:\OneDrive\Desktop\internshet\HYT-Global-Launching-Event-QR-Regis
npm install
npm run dev
```

The development server uses Turbopack because the project is stored in OneDrive. Open:

```text
http://localhost:3000
```

If port 3000 is already occupied, stop the old project server or use another port:

```powershell
npm run dev -- --port 3001
```

## Environment variables

Create `.env.local` in the project root. Never commit it.

```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret

# Needed only for Google Sheets mirroring/imports.
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_SERVICE_ACCOUNT_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

`GOOGLE_PRIVATE_KEY` must be the `private_key` field from a Google service-account JSON file. An `AIza...` API key is not a private key and will fail with an OpenSSL decoder error.

If credentials were exposed, revoke them in Google Cloud and create new ones.

## D1 database

The configured database is `hytglobal_db`. Its binding is `DB`, configured in [wrangler.jsonc](wrangler.jsonc).

Migrations:

| File | Creates |
| --- | --- |
| `0001_create_admins.sql` | Admin usernames, password hashes, and salts |
| `0002_create_guests.sql` | Guest passport and registration data |
| `0003_create_scan_logs.sql` | Scan audit records |
| `0004_create_admin_settings.sql` | Database-backed course settings |

Apply migrations locally:

```powershell
npx wrangler d1 migrations apply hytglobal_db --local
```

Apply migrations to Cloudflare D1:

```powershell
npx wrangler d1 migrations apply hytglobal_db --remote
```

Check migration state:

```powershell
npx wrangler d1 migrations list hytglobal_db --local
npx wrangler d1 migrations list hytglobal_db --remote
```

Inspect tables:

```powershell
npx wrangler d1 execute hytglobal_db --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

Expected application tables:

```text
admins
guests
scan_logs
admin_settings
```

Local and remote D1 are separate databases. A local migration or local admin does not appear in Cloudflare until the equivalent `--remote` command is run.

## Create an administrator

Admins are created from the terminal, not from a public page:

```powershell
npm run create-admin -- --username admin --password "choose-a-long-unique-password" --local
```

For the global Cloudflare database:

```powershell
npm run create-admin -- --username admin --password "choose-a-long-unique-password"
```

Verify the remote account without exposing its password:

```powershell
npx wrangler d1 execute hytglobal_db --remote --command "SELECT id, username, created_at FROM admins ORDER BY id;"
```

Set `ADMIN_SESSION_SECRET` in the deployment environment before using admin login in production.

## Course settings

Course settings are stored in D1, not Google Sheets. The admin page manages:

- Course name
- Scan limit in days
- Valid-until date
- Active/inactive state

The public registration page loads active course names from `/api/course-settings`. Editing a Sheet does not change the website.

## Google Sheets mirror

If Google credentials are configured, newly registered guests and D1 guest updates are mirrored to the `Guests` tab. Scan logs are mirrored to `Scan Logs`.

D1 remains authoritative. If Google Sheets is unavailable:

- Registration still succeeds in D1.
- The website continues using D1.
- The mirror error is logged by the server.

Use these exact tabs and column layouts if mirroring is enabled.

### `Guests`

The first row is the header. Guest data uses columns `A:V`:

| Column | Field |
| --- | --- |
| A | Passport ID |
| B | Full Name |
| C | Email |
| D | Phone |
| E | School/Company |
| F | Guest Type |
| G | Passport Link |
| H:L | Floor 1 through Floor 5 |
| M | Completed Count |
| N | Status |
| O | Registered At |
| P | Last Updated |
| Q | Course |
| R | Purpose |
| S | Scan Limit (days) |
| T | Scan Enabled |
| U | Account Active |
| V | Valid Until |

### `Scan Logs`

| Column | Field |
| --- | --- |
| A | Timestamp |
| B | Passport ID |
| C | Guest Name |
| D | Floor/Station |
| E | Action |
| F | Staff/Scanner Page |
| G | NFC ID |

Share the Sheet with the service-account email as **Editor**. The service account must have Google Sheets API access.

## Import existing guests

Existing guest records can be migrated from a downloaded spreadsheet. Download the workbook from Google Sheets using **File -> Download -> Microsoft Excel (.xlsx)**, then use the guest importer when it is present in the project:

```powershell
npm run import-guests -- "C:\path\to\guests.xlsx" --remote --dry-run
npm run import-guests -- "C:\path\to\guests.xlsx" --remote
```

The workbook must contain a tab named `Guests`. The importer upserts guests by `passport_id` and does not modify admins, course settings, or scan logs. Always run `--dry-run` first.

If the `import-guests` script is absent after a branch change, restore it before running the commands above; do not manually re-enter the rows.

## Passport IDs, QR, and NFC

New D1 registrations use this format:

```text
HYT-2026-0001-a1b2c3d4
```

The numeric sequence is readable and the eight-character hexadecimal suffix makes IDs harder to guess. The database stores the value as a unique `TEXT` column.

The passport QR encodes the passport ID. Admin scanners accept the suffixed format. The NFC writer stores a URL like:

```text
https://your-site.example/passport/HYT-2026-0001-a1b2c3d4
```

NFC writing requires a compatible Android browser and HTTPS in production.

## Guest flow

1. The guest opens `/register`.
2. The guest explicitly selects a role; no role is selected by default.
3. Course is shown for trainee/trainor roles.
4. Purpose is shown for Visitor registrations.
5. The guest receives a D1 passport record and QR code.
6. The guest scans station QR posters or uses the passport self-scanner.
7. D1 records floor completion and scan logs.

The server validates roles and required fields; browser validation alone is not trusted.

## API reference

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/register` | Creates a guest in D1 and mirrors it to Sheets when configured. |
| `GET` | `/api/course-settings` | Returns active database courses for registration. |
| `GET` | `/api/passport/[passportId]` | Returns a public, PII-reduced passport. |
| `POST` | `/api/stamp` | Stamps a station for a guest. |
| `GET` | `/api/admin/guests` | Returns the admin guest list. |
| `POST` | `/api/admin/scan` | Processes an admin guest scan. |
| `POST` | `/api/admin/claim` | Marks a completed guest reward as claimed. |
| `POST` | `/api/admin/toggle-account` | Enables or disables a guest account. |
| `GET/PUT` | `/api/admin/settings` | Reads and updates D1 course settings. |
| `POST` | `/api/admin/login` | Creates an admin session. |

All `/api/admin/*` routes require a valid admin session except the login route.

## Testing and validation

```powershell
npx tsc --noEmit
npm run build
```

If Next reports `EINVAL: invalid argument, readlink` or missing `.next` chunks on Windows/OneDrive, stop old Next processes, remove generated output, and restart with the project directory active:

```powershell
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
cd D:\OneDrive\Desktop\internshet\HYT-Global-Launching-Event-QR-Regis
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue
npm run dev
```

## Deployment

The project is configured for OpenNext/Cloudflare:

```powershell
npm run deploy
```

Before deployment:

1. Apply remote D1 migrations.
2. Create the remote admin account.
3. Configure `ADMIN_SESSION_SECRET` as a server-side secret.
4. Configure Google credentials only if Sheets mirroring is required.
5. Confirm the deployed Worker uses the `DB` binding from `wrangler.jsonc`.

## Project structure

```text
.
├── drizzle/
│   ├── 0001_create_admins.sql
│   ├── 0002_create_guests.sql
│   ├── 0003_create_scan_logs.sql
│   └── 0004_create_admin_settings.sql
├── public/
│   ├── hyt-global-institute.png
│   ├── hyt-global-institute.svg
│   └── roofdeck.jpg
├── scripts/
│   └── create-admin.mjs
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/
│   │   │   │   ├── claim/route.ts
│   │   │   │   ├── guests/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── scan/route.ts
│   │   │   │   ├── settings/route.ts
│   │   │   │   └── toggle-account/route.ts
│   │   │   ├── course-settings/route.ts
│   │   │   ├── passport/[passportId]/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── stamp/route.ts
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── login/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── scan/
│   │   │   │   ├── [floor]/page.tsx
│   │   │   │   └── page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── station-codes/page.tsx
│   │   ├── complete/[floor]/page.tsx
│   │   ├── passport/[passportId]/page.tsx
│   │   ├── register/page.tsx
│   │   ├── globals.css
│   │   ├── head.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── FloorList.tsx
│   │   ├── Header.tsx
│   │   ├── HomeGate.tsx
│   │   ├── LandingCta.tsx
│   │   ├── NfcPassportWriter.tsx
│   │   ├── PasscodeVerification.tsx
│   │   ├── PassportCard.tsx
│   │   ├── PassportScanner.tsx
│   │   ├── ProfileMenu.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── QrScanner.tsx
│   │   ├── RememberPassport.tsx
│   │   ├── ScannerBoundary.tsx
│   │   └── StampIcon.tsx
│   └── lib/
│       ├── accessPolicy.ts
│       ├── admin-auth.ts
│       ├── admin-db.ts
│       ├── guest-db.ts
│       ├── passport-id.ts
│       ├── scanPolicy.ts
│       ├── sheets-new.ts
│       ├── sheets.ts
│       ├── stations.ts
│       └── types.ts
├── .env.local.example
├── middleware.ts
├── next-env.d.ts
├── next.config.js
├── open-next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
└── wrangler.jsonc
```

