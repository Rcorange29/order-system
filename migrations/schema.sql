-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT DEFAULT '',
  token TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '',
  sort INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

-- 商品表
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL DEFAULT 0,
  original_price REAL DEFAULT 0,
  image TEXT DEFAULT '',
  category_id INTEGER,
  stock INTEGER DEFAULT 0,
  is_new INTEGER DEFAULT 0,
  is_hot INTEGER DEFAULT 0,
  description TEXT DEFAULT '',
  unit TEXT DEFAULT '/斤',
  variants TEXT,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE NOT NULL,
  user_id TEXT DEFAULT '',
  customer TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  total REAL DEFAULT 0,
  delivery_fee REAL DEFAULT 0,
  delivery_point_id INTEGER,
  remark TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'cash_on_delivery',
  payment_status TEXT DEFAULT 'pending',
  payment_screenshot TEXT,
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

-- 订单项表
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER DEFAULT 1,
  price REAL DEFAULT 0,
  variant TEXT DEFAULT '',
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '1.2');

CREATE TABLE IF NOT EXISTS delivery_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  address TEXT,
  fee REAL DEFAULT 10,
  threshold REAL DEFAULT 1000,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);
INSERT OR IGNORE INTO delivery_points (name, address, fee, threshold, sort_order) VALUES
  ('日出康城站', '港铁日出康城站', 10, 1000, 1),
  ('科技大学', '香港科技大学', 10, 500, 2),
  ('坑口地铁站', '港铁坑口站', 10, 1000, 3),
  ('宝琳站', '港铁宝琳站', 10, 1000, 4),
  ('将军澳站', '港铁将军澳站', 10, 1000, 5),
  ('调景岭站', '港铁调景岭站', 10, 1000, 6);
