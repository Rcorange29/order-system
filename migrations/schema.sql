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
  coupon_discount REAL DEFAULT 0,
  coupon_grant_id INTEGER,
  delivery_fee REAL DEFAULT 0,
  delivery_point_id INTEGER,
  remark TEXT DEFAULT '',
  payment_method TEXT DEFAULT 'wechat_transfer',
  payment_status TEXT DEFAULT 'pending',
  payment_currency TEXT NOT NULL DEFAULT 'CNY',
  payment_amount REAL,
  payment_screenshot TEXT,
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  updated_at TEXT DEFAULT (datetime('now', '+8 hours'))
);

-- Customer-facing serial numbers; keeps numbering stable when an order is deleted.
CREATE TABLE IF NOT EXISTS order_numbers (
  number INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL UNIQUE
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
  fee REAL DEFAULT 0,
  threshold REAL DEFAULT 1000,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS order_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('delivery_upgrade', 'refund')),
  address TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT DEFAULT '',
  handled_by INTEGER,
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  handled_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_requests_pending ON order_requests(order_id) WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_point_id INTEGER,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  FOREIGN KEY (delivery_point_id) REFERENCES delivery_points(id)
);
CREATE TABLE IF NOT EXISTS coupon_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  min_spend REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  is_published INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now', '+8 hours'))
);
CREATE TABLE IF NOT EXISTS coupon_grants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  granted_by INTEGER NOT NULL,
  granted_at TEXT DEFAULT (datetime('now', '+8 hours')),
  used_order_no TEXT,
  used_at TEXT,
  UNIQUE(campaign_id, user_id),
  FOREIGN KEY (campaign_id) REFERENCES coupon_campaigns(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS coupon_claims (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  screenshot TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT DEFAULT '',
  created_at TEXT DEFAULT (datetime('now', '+8 hours')),
  reviewed_at TEXT,
  reviewed_by INTEGER,
  UNIQUE(campaign_id, user_id),
  FOREIGN KEY (campaign_id) REFERENCES coupon_campaigns(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT OR IGNORE INTO coupon_campaigns (id, title, details, min_spend, discount_amount, is_published)
VALUES (1, '分享团购，集赞领券', '在任意社交媒体分享团购并附网站链接，单篇集满10个赞后上传截图，审核通过领取满¥15减¥5优惠券。包括但不限于朋友圈、小红书、抖音、Facebook、Instagram、Threads、X。每人限领一次，跨平台不重复领取。', 15, 5, 1);
INSERT OR IGNORE INTO delivery_points (name, address, fee, threshold, sort_order) VALUES
  ('日出康城站', '港铁日出康城站', 0, 1000, 1),
  ('科技大学', '香港科技大学', 0, 500, 2),
  ('坑口地铁站', '港铁坑口站', 0, 1000, 3),
  ('宝琳站', '港铁宝琳站', 0, 1000, 4),
  ('将军澳站', '港铁将军澳站', 0, 1000, 5),
  ('调景岭站', '港铁调景岭站', 0, 1000, 6);
