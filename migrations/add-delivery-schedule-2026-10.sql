-- Existing points start in normal progress mode. Orders and thresholds are untouched.
ALTER TABLE delivery_points ADD COLUMN group_formed INTEGER NOT NULL DEFAULT 0 CHECK (group_formed IN (0, 1));
ALTER TABLE delivery_points ADD COLUMN delivery_date TEXT NOT NULL DEFAULT '';
