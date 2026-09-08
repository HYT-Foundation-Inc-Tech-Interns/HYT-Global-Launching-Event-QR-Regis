CREATE TABLE IF NOT EXISTS admin_settings (
  course TEXT PRIMARY KEY,
  scan_limit_days INTEGER,
  valid_until TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO admin_settings (course, scan_limit_days, valid_until, active) VALUES
  ('Barista NC II', 4, '', TRUE),
  ('Hilot (Wellness) Massage NC II', 5, '', TRUE),
  ('Events Management Services NC III', 1, '', TRUE);