-- Run with scripts/migrate-account-content.mjs (idempotent, supports --dry-run).
ALTER TABLE announcements ADD COLUMN title_zh_hk TEXT;
ALTER TABLE announcements ADD COLUMN title_en TEXT;
ALTER TABLE announcements ADD COLUMN content_zh_hk TEXT;
ALTER TABLE announcements ADD COLUMN content_en TEXT;
ALTER TABLE coupon_campaigns ADD COLUMN title_zh_hk TEXT;
ALTER TABLE coupon_campaigns ADD COLUMN title_en TEXT;
ALTER TABLE coupon_campaigns ADD COLUMN details_zh_hk TEXT;
ALTER TABLE coupon_campaigns ADD COLUMN details_en TEXT;
ALTER TABLE orders ADD COLUMN contact_wechat_id TEXT NOT NULL DEFAULT '';
ALTER TABLE orders ADD COLUMN contact_whatsapp TEXT NOT NULL DEFAULT '';
