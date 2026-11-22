CREATE TABLE IF NOT EXISTS tenants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hostname TEXT NOT NULL UNIQUE,
  brand_name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT 'Kosakata anak 1-5 tahun',
  icon_url TEXT NOT NULL DEFAULT '',
  favicon_url TEXT NOT NULL DEFAULT '',
  theme_preset TEXT NOT NULL DEFAULT 'teal',
  primary_color TEXT NOT NULL DEFAULT '#007C91',
  accent_color TEXT NOT NULL DEFAULT '#86DC62',
  lynk_url TEXT NOT NULL DEFAULT '',
  lynk_merchant_key TEXT NOT NULL DEFAULT '',
  email_from TEXT NOT NULL DEFAULT '',
  portal_token TEXT NOT NULL UNIQUE,
  active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenants_hostname ON tenants(hostname);
CREATE INDEX IF NOT EXISTS idx_tenants_portal_token ON tenants(portal_token);

ALTER TABLE licenses ADD COLUMN tenant_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_licenses_tenant_id ON licenses(tenant_id);
