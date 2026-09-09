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

### Database tables

The application uses four independent tables. Guest records do not contain
passwords, and admin records are never returned by public guest endpoints.

#### `admins`

Stores administrator login credentials. Admins are created from the terminal.

| Column | Type | Rules | Purpose |
| --- | --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment | Internal admin identifier |
| `username` | TEXT | Required, unique | Admin login name |
| `password_hash` | TEXT | Required | PBKDF2 password hash |
| `password_salt` | TEXT | Required | Unique salt used for password verification |
| `created_at` | TEXT | Required, defaults to current timestamp | Creation time |

#### `guests`

Stores public registration data, passport information, event progress, and
account status. Guest passwords are intentionally not stored.

| Column | Type | Rules | Purpose |
| --- | --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment | Internal guest identifier |
| `passport_id` | TEXT | Required, unique | QR/NFC passport identifier, such as `HYT-2026-0001-a1b2c3d4` |
| `full_name` | TEXT | Required | Guest name |
| `email` | TEXT | Required | Guest email address |
| `phone` | INTEGER | Optional | Guest phone value; imported spreadsheet values are normalized by the app |
| `organization` | TEXT | Optional | School or company |
| `guest_type` | TEXT | Required | Selected role, such as Trainee, Trainor, VIP, or Visitor |
| `course` | TEXT | Optional | Course selected by a trainee or trainor |
| `purpose` | TEXT | Optional | Purpose supplied by a Visitor |
| `scan_limit_days` | INTEGER | Optional | Remaining or configured training scan days |
| `scan_enabled` | BOOLEAN | Required, defaults to TRUE | Whether scanning is enabled |
| `account_active` | BOOLEAN | Required, defaults to TRUE | Whether the passport account is active |
| `valid_until` | TEXT | Optional | Expiration date in `YYYY-MM-DD` format |
| `floors` | TEXT | Required, defaults to `[]` | JSON array of completed floor flags |
| `completed_count` | INTEGER | Required, defaults to `0` | Number of completed floors |
| `status` | TEXT | Required, defaults to `Incomplete` | `Incomplete`, `Completed`, or `Reward Claimed` |
| `registered_at` | TEXT | Required | Registration timestamp |
| `last_updated` | TEXT | Required | Last guest record update timestamp |
| `created_at` | TEXT | Required, defaults to current timestamp | Database insertion time |

Indexes:

- `idx_guests_passport_id` speeds up QR, NFC, and passport lookups.
- `idx_guests_email` speeds up email searches.

#### `scan_logs`

Stores the audit history for guest scans, station stamps, NFC scans, and reward
claims. The website uses D1 for scan-limit calculations.

| Column | Type | Rules | Purpose |
| --- | --- | --- | --- |
| `id` | INTEGER | Primary key, auto-increment | Internal log identifier |
| `timestamp` | TEXT | Required | Time of the action |
| `passport_id` | TEXT | Required | Guest passport identifier |
| `nfc_id` | TEXT | Optional | NFC value when the action came from NFC |
| `guest_name` | TEXT | Required | Guest name captured in the audit record |
| `station` | TEXT | Required | Floor or station name |
| `action` | TEXT | Required | Action such as `Stamped`, `Admin Scan`, or `Reward Claimed` |
| `scanner_page` | TEXT | Required | Page or scanner that performed the action |

Index:

- `idx_scan_logs_passport_timestamp` supports per-guest scan history and daily limits.

#### `admin_settings`

Stores course settings used when new guests register. This table is the only
source used by the website for active course categories and course defaults.

| Column | Type | Rules | Purpose |
| --- | --- | --- | --- |
| `course` | TEXT | Primary key | Course name and registration category |
| `scan_limit_days` | INTEGER | Optional | Default training scan limit |
| `valid_until` | TEXT | Required, defaults to empty text | Course validity date |
| `active` | BOOLEAN | Required, defaults to TRUE | Whether the course appears during registration |
| `updated_at` | TEXT | Required, defaults to current timestamp | Last settings update time |

The database has no shared `people` table. `admins` and `guests` are separate
roles. Only `admins` contain password hashes and salts.

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
├── drizzle/                         # D1 database migrations
│   ├── 0001_create_admins.sql
│   │                                  # Admin usernames and password hashes
│   ├── 0002_create_guests.sql         # Guest profiles and passport records
│   ├── 0003_create_scan_logs.sql      # Guest scan audit history
│   └── 0004_create_admin_settings.sql # Database course settings
├── public/                           # Static images and branding assets
│   ├── hyt-global-institute.png       # Institute logo for image contexts
│   ├── hyt-global-institute.svg       # Scalable institute logo
│   └── roofdeck.jpg                   # Landing-page background image
├── scripts/                          # Terminal automation scripts
│   └── create-admin.mjs               # Creates or resets a terminal-only admin
├── src/
│   ├── app/                          # Next.js pages, layouts, and API routes
│   │   ├── api/                      # Server-side HTTP endpoints
│   │   │   ├── admin/                # Authenticated administrator endpoints
│   │   │   │   ├── claim/route.ts     # Marks a completed reward as claimed
│   │   │   │   ├── guests/route.ts    # Returns the admin guest list
│   │   │   │   ├── login/route.ts     # Creates an admin session
│   │   │   │   ├── scan/route.ts      # Processes an admin guest scan
│   │   │   │   ├── settings/route.ts  # Reads and saves course settings
│   │   │   │   └── toggle-account/route.ts # Enables or disables a guest
│   │   │   ├── course-settings/route.ts # Public list of active courses
│   │   │   ├── passport/[passportId]/route.ts # Public passport lookup
│   │   │   ├── register/route.ts      # Creates a guest in D1
│   │   │   └── stamp/route.ts         # Records a floor completion
│   │   ├── admin/                    # Protected administrator pages
│   │   │   ├── dashboard/page.tsx      # Guest totals, search, and claiming
│   │   │   ├── login/
│   │   │   │   ├── LoginForm.tsx       # Admin username/password form
│   │   │   │   └── page.tsx            # Admin login page
│   │   │   ├── scan/
│   │   │   │   ├── [floor]/page.tsx    # Staff scanner for one floor
│   │   │   │   └── page.tsx            # General admin QR/NFC scanner
│   │   │   ├── settings/page.tsx       # Course settings editor
│   │   │   └── station-codes/page.tsx  # Printable station QR codes
│   │   ├── complete/[floor]/page.tsx  # Native-camera station completion page
│   │   ├── passport/[passportId]/page.tsx # Guest digital passport page
│   │   ├── register/page.tsx           # Guest registration form
│   │   ├── globals.css                 # Tailwind and global styles
│   │   ├── head.tsx                    # Document head metadata
│   │   ├── layout.tsx                  # Root application layout
│   │   └── page.tsx                    # Public landing page
│   ├── components/                    # Reusable UI components
│   │   ├── FloorList.tsx               # Displays completed floor stations
│   │   ├── Header.tsx                  # Shared application header
│   │   ├── HomeGate.tsx                # Controls public home entry state
│   │   ├── LandingCta.tsx              # Landing-page registration/passport CTA
│   │   ├── NfcPassportWriter.tsx       # Writes a passport URL to NFC
│   │   ├── PasscodeVerification.tsx    # Confirms sensitive admin actions
│   │   ├── PassportCard.tsx             # Displays passport details and QR
│   │   ├── PassportScanner.tsx          # Guest self-scans station QR codes
│   │   ├── ProfileMenu.tsx              # Shows remembered passport profile
│   │   ├── ProgressBar.tsx              # Displays floor completion progress
│   │   ├── QrScanner.tsx                # Camera QR decoding component
│   │   ├── RememberPassport.tsx          # Stores passport ID on the device
│   │   ├── ScannerBoundary.tsx           # Error boundary around camera scanning
│   │   └── StampIcon.tsx                 # Visual stamp/status icon
│   └── lib/                          # Database, policy, and shared domain logic
│       ├── accessPolicy.ts            # Guest access rules by role
│       ├── admin-auth.ts              # Password verification and sessions
│       ├── admin-db.ts                # Admin credential queries
│       ├── guest-db.ts                # D1 guest and scan-log operations
│       ├── passport-id.ts             # QR/NFC passport ID extraction
│       ├── scanPolicy.ts              # Scan limits and validity rules
│       ├── sheets-new.ts              # D1-facing application helpers
│       ├── sheets.ts                  # Optional Google Sheets mirror
│       ├── stations.ts                # Event station definitions
│       └── types.ts                   # Shared TypeScript types
├── .env.local.example                 # Environment variable template
├── middleware.ts                      # Protects administrator routes
├── next-env.d.ts                      # Next.js TypeScript declarations
├── next.config.js                     # Next.js configuration
├── open-next.config.ts                # OpenNext Cloudflare configuration
├── package.json                       # Scripts and dependencies
├── package-lock.json                  # Locked dependency versions
├── postcss.config.js                  # PostCSS configuration
├── tailwind.config.ts                 # Tailwind theme configuration
├── tsconfig.json                      # TypeScript configuration
└── wrangler.jsonc                     # Worker and D1 bindings
```

Generated or machine-specific folders are intentionally omitted from this
tree: `node_modules/`, `.next/`, `.open-next/`, `.wrangler/`, and `.git/`.
