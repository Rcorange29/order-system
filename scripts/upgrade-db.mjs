import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
const remote = process.argv.includes('--remote')
const dryRun = process.argv.includes('--dry-run')
const location = remote ? '--remote' : '--local'
const persistTo = process.argv.find(arg => arg.startsWith('--persist-to='))

function execute(sql) {
  const args = [wrangler, 'd1', 'execute', 'order-db', location, '--command', sql, '--json']
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
    payment_screenshot: 'TEXT'
  },
  order_items: { variant: "TEXT DEFAULT ''" }
}

const statements = [
  'CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  `CREATE TABLE IF NOT EXISTS delivery_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    address TEXT,
    fee REAL DEFAULT 10,
    threshold REAL DEFAULT 1000,
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1
  )`
]

for (const [table, required] of Object.entries(columns)) {
  const existing = new Set(rows(`PRAGMA table_info(${table})`).map(row => row.name))
  if (existing.size === 0) throw new Error(`Missing base table: ${table}. Run db:init for a new database.`)
  for (const [name, definition] of Object.entries(required)) {
    if (!existing.has(name)) statements.push(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`)
  }
}
statements.push("INSERT OR IGNORE INTO settings (key, value) VALUES ('exchange_rate', '1.2')")

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
      '${name}', '${address}', 10, ${threshold}, ${index + 1})`)
  }
}
console.log(dryRun ? 'Preview complete; no changes made.' : 'Database upgrade complete.')
