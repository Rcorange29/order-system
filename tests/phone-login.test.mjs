import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { onRequest as register } from '../functions/api/register.js'
import { onRequest as login } from '../functions/api/login.js'
import { hashPassword } from '../functions/api/_utils.js'

function setup() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, phone TEXT, token TEXT, is_admin INTEGER DEFAULT 0)')
  const DB = {
    prepare(sql) {
      return {
        bind(...values) {
          const statement = sqlite.prepare(sql)
          return {
            async first() { return statement.get(...values) || null },
            async all() { return { results: statement.all(...values) } },
            async run() { statement.run(...values); return { success: true } }
          }
        }
      }
    }
  }
  const request = (handler, body) => handler({
    request: new Request('https://example.com/api/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    env: { DB }
  })
  return { sqlite, request }
}

test('phone-only signup accepts common formats and blocks a second account for the same number', async () => {
  const { sqlite, request } = setup()
  const signup = await request(register, { phone: '9123 4567', password: 'TestOnly!123' })
  assert.equal(signup.status, 201)
  assert.equal((await signup.json()).phone, '+85291234567')
  const signedIn = await request(login, { phone: '+852 9123-4567', password: 'TestOnly!123' })
  assert.equal(signedIn.status, 200)
  assert.equal((await signedIn.json()).phone, '+85291234567')
  assert.equal((await request(register, { phone: '+85291234567', password: 'Different!123' })).status, 409)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1)
  sqlite.close()
})

test('existing username accounts can sign in using their saved phone and original password', async () => {
  const { sqlite, request } = setup()
  const passwordHash = await hashPassword('OldPassword!123')
  sqlite.prepare('INSERT INTO users (username, password_hash, phone) VALUES (?, ?, ?)').run('old_customer', passwordHash, '12345678')
  const signedIn = await request(login, { phone: '1234 5678', password: 'OldPassword!123' })
  assert.equal(signedIn.status, 200)
  assert.equal((await signedIn.json()).username, 'old_customer')
  assert.equal((await request(register, { phone: '+85212345678', password: 'OtherPassword!123' })).status, 409)
  sqlite.close()
})
