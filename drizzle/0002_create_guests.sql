CREATE TABLE IF NOT EXISTS guests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  passport_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organization TEXT,
  guest_type TEXT NOT NULL,
  course TEXT,
  purpose TEXT,
  scan_limit_days INTEGER,
  scan_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  account_active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_until TEXT,
  floors TEXT NOT NULL DEFAULT '[]',
  completed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Incomplete',
  registered_at TEXT NOT NULL,
  last_updated TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_guests_passport_id ON guests(passport_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
