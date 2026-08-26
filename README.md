# 🛂 HYT Digital Passport

A QR-based **digital passport and registration system** for events, built with
**Next.js + TypeScript + Tailwind CSS**, using **Google Sheets as the database**.

Guests register at the entrance, receive a unique QR digital passport, and
collect a digital "stamp" at each floor's station. After completing all floors
they become eligible for a certificate of participation or souvenir.

---

## ✨ Features

| Area | Path | What it does |
| --- | --- | --- |
| Guest Registration | `/register` | Collects guest details, generates a Passport ID, shows the passport |
| Digital Passport | `/passport/[passportId]` | QR code, progress bar, floor stamps, **guest self-scan button**, download as image |
| Floor Completion | `/complete/[floor]` | Where guests land after scanning a floor poster with their native camera |
| Station QR Images | `/admin/station-codes` | Protected, labeled QR images for staff to save |
| Admin Dashboard | `/admin/dashboard` | Totals, searchable guest list, mark reward as claimed |
| Administrator Portal | `/admin/login` | Password-protected staff access |
| Staff Scanner (backup) | `/admin/scan/floor-1` … `floor-5` | Optional: staff scans a guest's passport instead |

The **frontend never touches Google Sheets directly.** All reads/writes go
through backend API routes under `/api/*`, which use a Google service account.

Admin credentials are stored in the Cloudflare D1 `admins` table. Apply the
migration, then optionally create or reset an admin with:

```powershell
npx wrangler d1 migrations apply hytglobal_db --remote
npm run create-admin -- --username admin --password "choose-a-long-unique-password"
```

Set `ADMIN_SESSION_SECRET` as a server-only deployment secret. The password is
stored as a PBKDF2 hash and never in plaintext.

The spreadsheet database integration belongs in `src/lib/sheets.ts`, marked
with `SPREADSHEET DATABASE PLUGIN INTEGRATION POINT`. Do not place spreadsheet
credentials in a client component or use `NEXT_PUBLIC_` for them.

## 🔄 How guests collect stamps

Guests scan the **floor's posted QR code themselves** — no staff needed:

1. Guest registers and opens their passport on their own phone.
2. At each floor there is a printed QR poster (printed from
   `/admin/station-codes`).
3. The guest either:
   - taps **Scan Station QR** on their passport page and scans the poster, **or**
   - scans the poster with their phone's native camera, which opens
     `/complete/floor-N` and recognises them automatically.
4. The matching floor is stamped on their passport instantly. Duplicate scans
   are blocked.

> The station QR codes encode a URL like `https://your-site/complete/floor-2`,
> so they work with both the in-app scanner and any native camera app.

---

## 🧱 Tech Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** for styling
- **googleapis** – Google Sheets API client (backend only)
- **qrcode.react** – QR code generation
- **html5-qrcode** – camera-based QR scanning
- **html-to-image** – download passport as a PNG

---

## 📁 Folder Structure

```
.
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── globals.css             # Tailwind + base styles
│   │   ├── register/page.tsx       # Guest registration form
│   │   ├── passport/[passportId]/page.tsx   # Passport dashboard
│   │   ├── admin/
│   │   │   ├── dashboard/page.tsx  # Admin dashboard
│   │   │   ├── materials/page.tsx  # Materials checklist
│   │   │   └── scan/[floor]/page.tsx        # Staff scanner (all floors)
│   │   └── api/
│   │       ├── register/route.ts             # POST register
│   │       ├── passport/[passportId]/route.ts# GET passport
│   │       ├── stamp/route.ts                # POST stamp a floor
│   │       └── admin/
│   │           ├── guests/route.ts           # GET all guests
│   │           └── claim/route.ts            # POST mark reward claimed
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── FloorList.tsx
│   │   ├── PassportCard.tsx        # QR + download
│   │   └── QrScanner.tsx           # Camera scanner
│   └── lib/
│       ├── types.ts                # Shared TypeScript types
│       ├── stations.ts             # ⭐ Edit floors/stations here
│       └── sheets.ts               # ⭐ All Google Sheets logic here
├── .env.local.example              # Copy to .env.local and fill in
├── package.json
└── README.md
```

> ⭐ The two files you are most likely to edit for your event are
> `src/lib/stations.ts` (floor names/icons) and `src/lib/sheets.ts`
> (sheet/tab names).

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up your environment variables (see below)
cp .env.local.example .env.local
#   then edit .env.local with your Google credentials + Sheet ID

# 3. Run the dev server
npm run dev
```

Open <http://localhost:3000>.

> 📷 **Camera note:** Browsers only allow camera access on `https://` **or**
> `http://localhost`. The scanner pages work on `localhost` during
> development. For staff phones/tablets on the event Wi-Fi, deploy to a
> hosting provider with HTTPS (e.g. Vercel) or use a tunnel like `ngrok`.

---

## ☁️ Step 1 — Create a Google Cloud Service Account

A **service account** lets the backend read/write your sheet without a human
login.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create (or select) a **project**, e.g. "HYT Passport".
3. In the search bar, open **APIs & Services → Library**, search for
   **Google Sheets API**, and click **Enable**.
4. Go to **APIs & Services → Credentials → Create Credentials → Service account**.
   - Give it a name like `hyt-passport`.
   - Click **Done** (no extra roles needed for Sheets sharing).
5. Click the new service account → **Keys** tab → **Add Key → Create new key →
   JSON**. A `.json` file downloads. **Keep this file private.**

From that JSON file you need two values:

| JSON field | Goes into env var |
| --- | --- |
| `client_email` | `GOOGLE_SERVICE_ACCOUNT_EMAIL` |
| `private_key` | `GOOGLE_PRIVATE_KEY` |

---

## 📄 Step 2 — Create & Connect the Google Sheet

1. Create a new Google Sheet. Its ID is in the URL:
   `https://docs.google.com/spreadsheets/d/`**`THIS_IS_THE_ID`**`/edit`
   → put it in `GOOGLE_SHEET_ID`.
2. Click **Share** and share the sheet with the **service account email**
   (`client_email` from the JSON) as an **Editor**. This is the step people
   most often forget!
3. Create **three tabs** named exactly: `Guests`, `Scan Logs`, `Stations`.

### Tab 1: `Guests` — add this header row (row 1, columns A→T)

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O | P | Q | R | S | T |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Passport ID | Full Name | Email | Phone | School/Company | Guest Type | Passport Link | Floor 1 | Floor 2 | Floor 3 | Floor 4 | Floor 5 | Completed Count | Status | Registered At | Last Updated | Course | Purpose | Scan Limit (days) | Scan Enabled |

### Tab 2: `Scan Logs` — header row (columns A→F)

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Timestamp | Passport ID | Guest Name | Floor/Station | Action | Staff/Scanner Page |

### Tab 3: `Stations` — header row (columns A→F) — *reference only*

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| Station ID | Floor | Station Name | Activity Name | Stamp Icon | Scanner Link |

> The app reads station info from `src/lib/stations.ts`, so the `Stations`
> tab is optional/reference. You can paste the same values there for staff to
> see. Suggested rows:
>
> ```
> floor-1 | 1 | Registration / Welcome Station          | Check-in & Welcome        | 🎫 | /admin/scan/floor-1
> floor-2 | 2 | Food & Beverage Experience              | Tasting & Service Demo    | 🍽️ | /admin/scan/floor-2
> floor-3 | 3 | Housekeeping Professional Room           | Housekeeping Skills       | 🛎️ | /admin/scan/floor-3
> floor-4 | 4 | Events Management Room                   | Event Planning Challenge  | 🎉 | /admin/scan/floor-4
> floor-5 | 5 | Computer Servicing / Contact Center Sim. | Tech & Support Simulation | 💻 | /admin/scan/floor-5
> ```

---

## 🔐 Step 3 — Environment Variables

Copy `.env.local.example` to `.env.local` and fill it in:

```env
GOOGLE_SHEET_ID=your-google-sheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=hyt-passport@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_BASE_URL=http://localhost:3000
ADMIN_PASSWORD=choose-a-private-admin-password
```

**About `GOOGLE_PRIVATE_KEY`:** copy the whole `private_key` value from the
JSON. It contains `\n` characters — keep them as literal `\n` text and wrap the
whole value in double quotes, exactly as shown. The code converts `\n` back
into real newlines at runtime (`src/lib/sheets.ts`).

> Never commit `.env.local` and never expose these values to the frontend.
> Only `NEXT_PUBLIC_*` variables reach the browser.

---

## 🔌 API Reference

| Method | Route | Body / Params | Returns |
| --- | --- | --- | --- |
| `POST` | `/api/register` | `{ fullName, email, phone, organization, guestType, course?, purpose? }` | `{ guest }` with new Passport ID + link |
| `GET` | `/api/passport/[passportId]` | — | `{ guest }` |
| `POST` | `/api/stamp` | `{ passportId, stationId, scannerPage? }` | `{ guest }` (409 if already stamped) |
| `GET` | `/api/admin/guests` | — | `{ summary, guests }` |
| `POST` | `/api/admin/claim` | `{ passportId }` | `{ guest }` (409 if not all floors done) |

---

## 🛠️ How to Customize for Your Event

- **Floors / station names / icons:** edit `src/lib/stations.ts`. If you change
  the number of floors, also adjust the `Guests` sheet Floor columns and the
  table in `src/lib/sheets.ts` column comments.
- **Passport ID format:** edit `PASSPORT_PREFIX` / `PASSPORT_YEAR` in
  `src/lib/sheets.ts`.
- **Brand colors:** edit `tailwind.config.ts` (`brand.blue/purple/gold`).
- **Guest types in the form:** edit `GUEST_TYPES` in `src/app/register/page.tsx`.

---

## 🚢 Deploying (recommended: Vercel)

1. Push this project to GitHub.
2. Import it into [Vercel](https://vercel.com).
3. Add the same environment variables in **Project → Settings → Environment
   Variables**.
4. Set `NEXT_PUBLIC_BASE_URL` to your production domain.
5. Deploy. HTTPS is automatic, so the camera scanner works on staff devices.

---

## ⚠️ Notes & Limitations (MVP)

- Admin routes use a shared, eight-hour password session. Set
  `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` before deploying.
- Passport IDs are sequential based on row count. For a single registration
  desk this is fine; very high concurrent registrations could theoretically
  collide — acceptable for an MVP.
- Google Sheets has rate limits (~60 reads/min per user by default). Fine for a
  typical event; for very large crowds consider a real database later.
