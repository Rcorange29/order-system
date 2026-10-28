import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { getAdminUser } from '../functions/api/_utils.js'
import { onRequest as order } from '../functions/api/admin/orders/[id].js'
import { onRequest as requests } from '../functions/api/admin/order-requests.js'
import { onRequest as products } from '../functions/api/products.js'

function setup() {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync(new URL('../migrations/schema.sql', import.meta.url), 'utf8'))
  db.prepare('INSERT INTO users (username, password_hash, token, is_admin, admin_role) VALUES (?, ?, ?, 1, ?)').run('jchengat', 'hash', 'owner-token', 'owner')
  db.prepare('INSERT INTO users (username, password_hash, token, is_admin, admin_role) VALUES (?, ?, ?, 1, ?)').run('Jenny', 'hash', 'editor-token', 'catalog_editor')
  const DB = { prepare(sql) { return { bind(...args) { return { first: async () => db.prepare(sql).get(...args) || null } } } } }
  const request = (path, method, token) => new Request(`https://example.com${path}`, { method, headers: { Authorization: `Bearer ${token}` } })
  return { db, DB, request }
}

test('migration adds admin role with owner default for existing accounts', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, is_admin INTEGER)')
  db.exec("INSERT INTO users VALUES (1, 'jchengat', 1)")
  db.exec(readFileSync(new URL('../migrations/add-admin-role-2026-10.sql', import.meta.url), 'utf8'))
  assert.equal(db.prepare('SELECT admin_role FROM users WHERE id = 1').get().admin_role, 'owner')
  db.close()
})

test('catalog editor can read admin pages and write products but cannot mutate orders or other admin data', async () => {
  const { db, DB, request } = setup()
  const allowed = ['/api/admin/orders', '/api/admin/orders/1', '/api/admin/users', '/api/admin/users/2', '/api/admin/settings', '/api/admin/order-requests', '/api/announcements', '/api/categories', '/api/products']
  for (const path of allowed) assert.ok(await getAdminUser(request(path, 'GET', 'editor-token'), { DB }), path)
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const path of ['/api/admin/orders/1', '/api/admin/order-requests', '/api/admin/users/2', '/api/admin/settings', '/api/admin/delivery-schedule', '/api/announcements', '/api/categories', '/api/seed-products']) {
      assert.equal(await getAdminUser(request(path, method, 'editor-token'), { DB }), null, `${method} ${path}`)
      assert.ok(await getAdminUser(request(path, method, 'owner-token'), { DB }), `owner ${method} ${path}`)
    }
  }
  for (const path of ['/api/products', '/api/products/12']) for (const method of ['POST', 'PUT', 'DELETE']) {
    assert.ok(await getAdminUser(request(path, method, 'editor-token'), { DB }), `${method} ${path}`)
  }
  assert.equal((await order({request:request('/api/admin/orders/1', 'DELETE', 'editor-token'), env:{DB}, params:{id:'1'}})).status, 403)
  assert.equal((await requests({request:request('/api/admin/order-requests', 'PUT', 'editor-token'), env:{DB}})).status, 403)
  // Product write reaches product validation/DB instead of being denied by role. No data is modified.
  assert.ok(await getAdminUser(request('/api/products', 'POST', 'editor-token'), { DB }))
  db.close()
})
