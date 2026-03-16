CREATE TABLE guestbook_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE banned_emails (
  email TEXT PRIMARY KEY,
  reason TEXT,
  banned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_guestbook_created_at ON guestbook_entries(created_at DESC);
CREATE INDEX idx_guestbook_email ON guestbook_entries(email);
