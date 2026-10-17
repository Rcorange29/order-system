-- Additive admin management migration. Use scripts/migrate-user-management.mjs
-- to preview and apply against both old and already-upgraded databases.
ALTER TABLE users ADD COLUMN wechat_id TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN whatsapp TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'disabled'));
ALTER TABLE users ADD COLUMN address_storage_key TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN legacy_login_phone TEXT NOT NULL DEFAULT '';
UPDATE users SET address_storage_key = username WHERE address_storage_key = '';
CREATE TABLE IF NOT EXISTS admin_user_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  changed_fields TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours'))
);
CREATE INDEX IF NOT EXISTS idx_users_legacy_login_phone ON users(legacy_login_phone);
CREATE INDEX IF NOT EXISTS idx_admin_user_audit_user ON admin_user_audit(user_id, id);
