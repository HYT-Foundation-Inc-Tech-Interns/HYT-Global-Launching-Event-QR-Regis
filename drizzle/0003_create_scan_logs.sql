CREATE TABLE IF NOT EXISTS scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL,
  passport_id TEXT NOT NULL,
  nfc_id TEXT,
  guest_name TEXT NOT NULL,
  station TEXT NOT NULL,
  action TEXT NOT NULL,
  scanner_page TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_passport_timestamp
  ON scan_logs(passport_id, timestamp);