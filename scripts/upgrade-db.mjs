import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const remote = process.argv.includes('--remote')
const dryRun = process.argv.includes('--dry-run')
const location = remote ? '--remote' : '--local'
const persistTo = process.argv.find(arg => arg.startsWith('--persist-to='))
const catalogRepair = process.argv.includes('--repair-catalog')
  ? readFileSync(new URL('../migrations/product-catalog-repair.sql', import.meta.url), 'utf8')
  : ''
const categoryRepair = process.argv.includes('--simplify-categories')
  ? readFileSync(new URL('../migrations/reclassify-produce-2026-10.sql', import.meta.url), 'utf8')
  : ''

function execute(sql) {
  const args = [wrangler, 'd1', 'execute', 'order-db', location, `--command=${sql}`, '--json']
  if (persistTo) args.push(persistTo)
  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8'
  })
  if (result.status !== 0) throw new Error(result.stderr || result.stdout || 'D1 command failed')
  return JSON.parse(result.stdout)
}

function rows(sql) {
  return execute(sql)[0]?.results || []
}

const columns = {
  products: {
    unit: "TEXT DEFAULT '/斤'",
    variants: 'TEXT',
    is_active: 'INTEGER DEFAULT 1',
    sort_order: 'INTEGER DEFAULT 0'
  },
  orders: {
    delivery_fee: 'REAL DEFAULT 0',
    delivery_point_id: 'INTEGER',
    payment_screenshot: 'TEXT',
    payment_currency: "TEXT NOT NULL DEFAULT 'CNY'",
    payment_amount: 'REAL',
    coupon_discount: 'REAL DEFAULT 0',
    coupon_grant_id: 'INTEGER'
  },
  order_items: { variant: "TEXT DEFAULT ''" },
}

const statements = [
  'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS order_numbers (number INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL UNIQUE)',
  'INSERT OR IGNORE INTO order_numbers (order_id) SELECT id FROM orders ORDER BY id',
  `CREATE TABLE IF NOT EXISTS order_requests (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER NOT NULL, user_id TEXT NOT NULL, type TEXT NOT NULL CHECK (type IN ('delivery_upgrade', 'refund')), address TEXT DEFAULT '', status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')), admin_note TEXT DEFAULT '', handled_by INTEGER, created_at TEXT DEFAULT (datetime('now', '+8 hours')), handled_at TEXT, FOREIGN KEY (order_id) REFERENCES orders(id))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_order_requests_pending ON order_requests(order_id) WHERE status = 'pending'`,
  `CREATE TABLE IF NOT EXISTS announcements (id INTEGER PRIMARY KEY AUTOINCREMENT, delivery_point_id INTEGER, title TEXT NOT NULL, content TEXT NOT NULL, is_published INTEGER NOT NULL DEFAULT 1, created_at TEXT DEFAULT (datetime('now', '+8 hours')), FOREIGN KEY (delivery_point_id) REFERENCES delivery_points(id))`,
  `CREATE TABLE IF NOT EXISTS delivery_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    address TEXT,
    fee REAL DEFAULT 0,
    threshold REAL DEFAULT 1000,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  )`
]

for (const [table, required] of Object.entries(columns)) {
  const existing = new Set(rows(`PRAGMA table_info(${table})`).map(row => row.name))
  if (existing.size === 0) {
    throw new Error(`Missing base table: ${table}. Run db:init for a new database.`)
  }
  for (const [name, definition] of Object.entries(required)) {
    if (!existing.has(name)) statements.push(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}
statements.push("INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '1.2')")
statements.push("UPDATE orders SET payment_currency = 'CNY', payment_amount = ROUND(total + COALESCE(delivery_fee, 0), 2) WHERE payment_amount IS NULL AND payment_method IN ('wechat_transfer', 'alipay_transfer')")
statements.push('UPDATE delivery_points SET fee = 0 WHERE fee <> 0')
statements.push("UPDATE delivery_points SET threshold = 500 WHERE name = '科技大学' AND threshold <> 500")
// Existing product prices, images, descriptions, units and variants are merchant-owned data.
// A schema upgrade must never rewrite them unless explicitly requested.
statements.push(...catalogRepair.split('\n').filter(line => line.startsWith('UPDATE products ')))
if (categoryRepair) statements.push(categoryRepair)
statements.push("UPDATE orders SET delivery_fee = 0 WHERE delivery_point_id IS NOT NULL AND status = 'pending' AND payment_status = 'pending' AND delivery_fee <> 0")

console.log(`Database: order-db (${remote ? 'remote' : 'local'})`)
for (const sql of statements) {
  console.log(sql.replace(/\s+/g, ' ').trim())
  if (!dryRun) execute(sql)
}
if (!dryRun && Number(rows('SELECT COUNT(*) AS count FROM delivery_points')[0]?.count) === 0) {
  const points = [
    ['日出康城站', '港铁日出康城站', 1000],
    ['科技大学', '香港科技大学', 500],
    ['坑口地铁站', '港铁坑口站', 1000],
    ['宝琳站', '港铁宝琳站', 1000],
    ['将军澳站', '港铁将军澳站', 1000],
    ['调景岭站', '港铁调景岭站', 1000]
  ]
  for (const [index, [name, address, threshold]] of points.entries()) {
    execute(`INSERT INTO delivery_points (name, address, fee, threshold, sort_order) VALUES (
      '${name}', '${address}', 0, ${threshold}, ${index + 1})`)
  }
}
console.log(dryRun ? 'Preview complete; no changes made.' : 'Database upgrade complete.')
