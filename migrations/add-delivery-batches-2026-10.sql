ALTER TABLE orders ADD COLUMN delivery_batch_id INTEGER;
CREATE TABLE IF NOT EXISTS delivery_batches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  point_key TEXT NOT NULL,
  point_name TEXT NOT NULL,
  delivery_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'locked' CHECK (status IN ('locked', 'archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now', '+8 hours')),
  archived_at TEXT,
  UNIQUE(point_key, delivery_date)
);
CREATE TABLE IF NOT EXISTS delivery_batch_orders (
  batch_id INTEGER NOT NULL,
  order_id INTEGER NOT NULL UNIQUE,
  snapshot TEXT NOT NULL,
  PRIMARY KEY (batch_id, order_id)
);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_batch ON orders(delivery_batch_id);
