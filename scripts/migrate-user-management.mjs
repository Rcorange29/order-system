import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { normalizePhone } from '../functions/api/_phone.js'

const remote = process.argv.includes('--remote')
const dry = process.argv.includes('--dry-run')
const persist = process.argv.find(arg => arg.startsWith('--persist-to='))
const wrangler = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url))
function execute(sql) {
  const args = [wrangler, 'd1', 'execute', 'order-db', remote ? '--remote' : '--local', `--command=${sql}`, '--json']
  if (persist) args.push(persist)
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error('D1 operation failed: ' + (result.stderr || result.stdout).slice(-1800))
  return JSON.parse(result.stdout)[0]
}
const existing = new Set(execute('PRAGMA table_info(users)').results.map(c => c.name))
if (!existing.size) throw new Error('Missing users table; initialize the base schema first.')
const source = readFileSync(new URL('../migrations/2026-10-17-user-management.sql', import.meta.url), 'utf8').replace(/^--.*$/gm, '')
const statements = source.split(';').map(s => s.trim()).filter(Boolean)
const plan = statements.filter(sql => {
  const match = sql.match(/^ALTER TABLE users ADD COLUMN (\w+)/)
  return !match || !existing.has(match[1])
})
// Freeze the old login phone before an admin edits contact details or usernames.
const users = execute('SELECT id, username, phone' + (existing.has('legacy_login_phone') ? ', legacy_login_phone' : '') + ' FROM users').results
let aliases = 0
for (const user of users) {
  if (user.legacy_login_phone) continue
  const phone = normalizePhone(user.phone) || normalizePhone(user.username)
  if (phone) { plan.push(`UPDATE users SET legacy_login_phone = '+${phone}' WHERE id = ${Number(user.id)} AND legacy_login_phone = ''`); aliases++ }
}
console.log(`${dry ? 'DRY RUN' : 'APPLY'}: order-db (${remote ? 'remote' : 'local'}), ${plan.length} statements; ${aliases} legacy login aliases. No passwords, orders, or admin privileges will be rewritten.`)
// Do not print phone values to logs.
for (const sql of plan) {
  if (sql.startsWith('UPDATE users SET legacy_login_phone')) continue
  console.log(sql.replace(/\s+/g, ' '))
}
if (!dry) for (const sql of plan) execute(sql)
console.log(dry ? 'Read-only preview complete.' : 'Migration complete.')
