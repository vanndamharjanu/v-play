CREATE TABLE IF NOT EXISTS licenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  ref_id TEXT UNIQUE,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  product_name TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  max_devices INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(customer_email);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);

CREATE TABLE IF NOT EXISTS license_devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_id INTEGER NOT NULL,
  device_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT NOT NULL DEFAULT '',
  activated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (license_id, device_id),
  FOREIGN KEY (license_id) REFERENCES licenses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS webhook_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  ref_id TEXT,
  customer_email TEXT,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
