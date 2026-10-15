import test from 'node:test'
import assert from 'node:assert/strict'
import { onRequest as orders } from '../functions/api/orders.js'
import { onRequest as uploadProof } from '../functions/api/orders/upload-proof.js'
import { onRequest as adminOrders } from '../functions/api/admin/orders.js'
import { onRequest as adminSettings } from '../functions/api/admin/settings.js'
import { onRequest as stats } from '../functions/api/stats.js'
import { onRequest as products } from '../functions/api/products.js'

const PNG_PROOF = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pR8AAAAASUVORK5CYII='

function database(overrides = {}) {
  const state = { batches: [], queries: [] }
  const product = overrides.product || { id: 1, name: '苹果', price: 9, variants: JSON.stringify([{ label: '大盒', price: 15 }]), is_active: 1 }
  return {
    state,
    prepare(sql) {
      return {
        bind(...values) {
          const statement = { sql, values }
          state.queries.push(statement)
          return {
            ...statement,
            async first() {
              if (sql.includes('FROM users WHERE token')) return { id: 7, username: 'buyer', is_admin: 1 }
              if (sql.includes('SELECT username, phone FROM users')) return { username: 'buyer', phone: '12345678' }
              if (sql.includes('FROM products WHERE id')) return overrides.product === null ? null : product
              if (sql.includes('FROM delivery_points WHERE id')) return overrides.point === null ? null : { id: 2, fee: 10, threshold: 1000, is_active: 1 }
              if (sql.includes('COALESCE(SUM(total)')) return { t: overrides.confirmedTotal ?? 100, confirmed_total: overrides.confirmedTotal ?? 100, confirmed_count: 1 }
              if (sql.includes('FROM orders WHERE id = ? AND user_id = ?')) return overrides.proofOrder || { id: 5, payment_method: 'wechat_transfer', payment_status: 'pending' }
              if (sql.includes('SELECT value FROM settings')) return { value: '1.2' }
              if (sql.includes('WHERE o.order_no =')) return { id: 5, order_no: values[0], total: 30, delivery_fee: 10 }
              return null
            },
            async all() { return { results: [] } },
            async run() { return { success: true } }
          }
        },
        async first() { return { value: '1.2' } },
        async all() { return { results: [] } }
      }
    },
    async batch(statements) { state.batches.push(statements); return statements.map(() => ({ success: true })) }
  }
}

function call(handler, db, path, method, body) {
  return handler({ request: new Request('https://example.com' + path, {
    method,
    headers: { Authorization: 'Bearer valid', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  }), env: { DB: db }, params: { id: '5' } })
}

function orderBody(items = [{ product_id: 1, quantity: 2, variant: '大盒' }]) {
  return { items, delivery_type: 'pickup', delivery_point_id: 2, payment_method: 'wechat_transfer' }
}

test('rejects empty, negative and excessive orders before writing', async () => {
  const db = database()
  for (const items of [[], [null], [{ product_id: 1, quantity: -2, variant: '大盒' }], [{ product_id: 1, quantity: 100, variant: '大盒' }]]) {
    const response = await call(orders, db, '/api/orders', 'POST', orderBody(items))
    assert.equal(response.status, 400)
  }
  assert.equal(db.state.batches.length, 0)
})

test('uses the selected server-side variant price and stores the variant', async () => {
  const db = database()
  const response = await call(orders, db, '/api/orders', 'POST', { ...orderBody(), items: [{ product_id: 1, quantity: 2, variant: '大盒', price: 0.01 }] })
  assert.equal(response.status, 201)
  const [insertOrder, insertItem] = db.state.batches[0]
  assert.equal(insertOrder.values[6], 30)
  assert.equal(insertOrder.values[7], 0)
  assert.equal(insertItem.values[3], 15)
  assert.equal(insertItem.values[4], '大盒')
})

test('rejects an unavailable product or pickup point', async () => {
  assert.equal((await call(orders, database({ product: null }), '/api/orders', 'POST', orderBody())).status, 400)
  assert.equal((await call(orders, database({ point: null }), '/api/orders', 'POST', orderBody())).status, 400)
})

test('always waives pickup fee while the group waits for the threshold', async () => {
  const db = database({ confirmedTotal: 990 })
  const response = await call(orders, db, '/api/orders', 'POST', orderBody())
  assert.equal(response.status, 201)
  assert.equal(db.state.batches[0][0].values[7], 0)
})

test('uses RMB 30 home-delivery fee and RMB 1000 pickup threshold', async () => {
  const db = database({ confirmedTotal: 800 })
  const response = await call(orders, db, '/api/orders', 'POST', {
    ...orderBody(), delivery_type: 'delivery', delivery_point_id: null, address: 'Test address', phone: '12345678'
  })
  assert.equal(response.status, 201)
  assert.equal(db.state.batches[0][0].values[7], 30)
  const progress = await call(stats, db, '/api/stats?point=2', 'GET')
  assert.equal(progress.status, 200)
  const data = await progress.json()
  assert.equal(data.threshold, 1000)
  assert.equal(data.reached, false)
})

test('hides downlisted products from customers while keeping them in admin management', async () => {
  const db = database()
  await products({ request: new Request('https://example.com/api/products'), env: { DB: db } })
  assert.ok(db.state.queries.some(query => query.sql.includes('COALESCE(p.is_active, 1) = 1')))
  await call(products, db, '/api/products?all=1', 'GET')
  assert.ok(db.state.queries.some(query => query.sql.includes('ORDER BY p.is_active DESC') && !query.sql.includes('COALESCE(p.is_active, 1) = 1')))
})

test('limits proof type and locks confirmed orders', async () => {
  const invalid = await call(uploadProof, database(), '/api/orders/upload-proof', 'POST', { order_id: 5, screenshot: 'data:image/svg+xml;base64,PHN2Zz4=' })
  assert.equal(invalid.status, 400)
  const confirmed = await call(uploadProof, database({ proofOrder: { id: 5, payment_method: 'wechat_transfer', payment_status: 'confirmed' } }), '/api/orders/upload-proof', 'POST', { order_id: 5, screenshot: PNG_PROOF })
  assert.equal(confirmed.status, 409)
})

test('accepts a valid proof for an unpaid transfer order', async () => {
  const db = database()
  const response = await call(uploadProof, db, '/api/orders/upload-proof', 'POST', {
    order_id: 5, screenshot: PNG_PROOF
  })
  assert.equal(response.status, 200)
  assert.ok(db.state.queries.some(query => query.sql.includes('UPDATE orders SET payment_screenshot')))
})

test('filters admin order history by user and validates exchange rate', async () => {
  const db = database()
  const response = await call(adminOrders, db, '/api/admin/orders?user_id=7', 'GET')
  assert.equal(response.status, 200)
  const listQuery = db.state.queries.find(q => q.sql.includes('FROM orders o'))
  assert.match(listQuery.sql, /o\.user_id = \?/)
  assert.deepEqual(listQuery.values, ['7'])
  const badRate = await call(adminSettings, db, '/api/admin/settings', 'POST', { exchange_rate: -1 })
  assert.equal(badRate.status, 400)
})
