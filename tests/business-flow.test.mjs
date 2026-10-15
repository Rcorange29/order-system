import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequest as requestService } from '../functions/api/orders/request.js'
import { onRequest as manageRequests } from '../functions/api/admin/order-requests.js'
import { onRequest as getStats } from '../functions/api/stats.js'
import { onRequest as announcements } from '../functions/api/announcements.js'

function makeDb({ order = { id: 3, status: 'paid', payment_status: 'confirmed', delivery_point_id: 2 }, pending = null, request = null } = {}) {
  const queries = []
  const db = {
    queries,
    prepare(sql) {
      queries.push({ sql })
      const statement = {
        bind(...values) { return { ...statement, values } },
        async first() {
          if (sql.includes('FROM users WHERE token')) return { id: 7, is_admin: 1 }
          if (sql.includes('FROM orders WHERE id = ? AND user_id = ?')) return order
          if (sql.includes('FROM order_requests WHERE order_id = ?')) return pending
          if (sql.includes('FROM order_requests r JOIN orders')) return request
          if (sql.includes('FROM delivery_points WHERE id = ?')) return { id: 2, threshold: 1000 }
          if (sql.includes('COALESCE(SUM(total)')) return { confirmed_total: 600, confirmed_count: 3 }
          return null
        },
        async all() { return { results: [] } },
        async run() { queries.push({ sql, values: this.values || [] }); return { success: true } }
      }
      return statement
    },
    async batch(statements) { statements.forEach(s => queries.push({ sql: s.sql, values: s.values || [] })); return statements.map(() => ({ success: true })) }
  }
  return db
}

function call(handler, db, path, method, body) {
  return handler({
    request: new Request(`https://example.com${path}`, {
      method,
      headers: { Authorization: 'Bearer valid', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined
    }), env: { DB: db }
  })
}

test('pickup service requests require a paid waiting order and an address for home delivery', async () => {
  const unpaid = makeDb({ order: { id: 3, status: 'pending', payment_status: 'pending', delivery_point_id: 2 } })
  assert.equal((await call(requestService, unpaid, '/api/orders/request', 'POST', { order_id: 3, type: 'refund' })).status, 409)
  const db = makeDb()
  assert.equal((await call(requestService, db, '/api/orders/request', 'POST', { order_id: 3, type: 'delivery_upgrade', address: 'x' })).status, 400)
  assert.equal((await call(requestService, db, '/api/orders/request', 'POST', { order_id: 3, type: 'delivery_upgrade', address: 'Room 123, Kowloon' })).status, 201)
  assert.ok(db.queries.some(q => q.sql.includes('INSERT INTO order_requests') && q.values?.[3] === 'Room 123, Kowloon'))
})

test('refund approval requires a waiting paid order and records a cancelled refunded order', async () => {
  const request = { id: 4, order_id: 3, type: 'refund', status: 'pending', order_status: 'paid', payment_status: 'confirmed', delivery_point_id: 2 }
  const db = makeDb({ request })
  assert.equal((await call(manageRequests, db, '/api/admin/order-requests', 'PUT', { id: 4, decision: 'approve' })).status, 200)
  assert.ok(db.queries.some(q => q.sql.includes("payment_status = 'refunded'")))
  assert.ok(db.queries.some(q => q.sql.includes("status = 'approved'")))
})

test('group progress counts paid waiting orders across days, and announcements target a point', async () => {
  const db = makeDb()
  const response = await call(getStats, db, '/api/stats?point=2', 'GET')
  assert.equal((await response.json()).confirmed_total, 600)
  const progressQuery = db.queries.find(q => q.sql.includes('COALESCE(SUM(total)'))?.sql
  assert.match(progressQuery, /status = 'paid'/)
  assert.doesNotMatch(progressQuery, /date\(created_at\)/)
  const announcementsDb = makeDb()
  let readSql = ''
  let readPoint = null
  announcementsDb.prepare = sql => {
    readSql = sql
    return { bind: point => ({ all: async () => { readPoint = point; return { results: [] } } }) }
  }
  await call(announcements, announcementsDb, '/api/announcements?point=2', 'GET')
  assert.match(readSql, /delivery_point_id IS NULL OR delivery_point_id = \?/)
  assert.equal(readPoint, 2)
})
