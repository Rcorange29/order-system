-- Existing administrators retain full access until explicitly assigned another role.
ALTER TABLE users ADD COLUMN admin_role TEXT NOT NULL DEFAULT 'owner' CHECK (admin_role IN ('owner', 'catalog_editor'));
