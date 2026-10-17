import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
const remote = process.argv.includes('--remote')
const dry = process.argv.includes('--dry-run')
const persist = process.argv.find(a => a.startsWith('--persist-to='))
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
function execute(sql) {
  const args = [wrangler, 'd1', 'execute', 'order-db', remote ? '--remote' : '--local', `--command=${sql}`, '--json']
  if (persist) args.push(persist)
  const result = spawnSync(process.execPath, args, { encoding: 'utf8', maxBuffer: 64*1024*1024 })
  if (result.status !== 0) throw new Error('D1 operation failed; check Wrangler authentication and database configuration.')
  return JSON.parse(result.stdout)[0].results
}
const statements = readFileSync(new URL('../migrations/2026-10-17-account-and-content-languages.sql', import.meta.url), 'utf8').replace(/^--.*$/gm, '').split(';').map(s => s.trim()).filter(Boolean)
const columns = {}
for (const table of ['announcements', 'coupon_campaigns', 'orders']) columns[table] = new Set(execute(`PRAGMA table_info(${table})`).map(c => c.name))
const plan = statements.filter(sql => { const [, table, column] = sql.match(/^ALTER TABLE (\w+) ADD COLUMN (\w+)/); return !columns[table].has(column) })
console.log(`${dry ? 'DRY RUN' : 'APPLY'}: ${remote ? 'remote' : 'local'}; ${plan.length} missing columns. Existing merchant content, accounts and orders are not rewritten.`)
for (const sql of plan) { console.log(sql); if (!dry) execute(sql) }
console.log(dry ? 'Read-only preview complete.' : 'Migration complete.')
