CREATE TABLE flagged_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  ip TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE banned_emails ADD COLUMN ip TEXT;

CREATE INDEX idx_banned_emails_ip ON banned_emails(ip);
CREATE INDEX idx_flagged_entries_ip ON flagged_entries(ip);
