import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPackingListCsv } from '../src/admin/packingList.js'

const order = (id, point, items, status = 'paid', payment_status = 'confirmed') => ({ id, status, payment_status, delivery_point_name: point, items })

test('packing list: aggregates same product across orders and points', () => {
  const orders = [
    order(1, '旺角A', [{ product: { name: '白蘑菇' }, variant: '半磅', price: 12, quantity: 2 }]),
    order(2, '旺角A', [{ product: { name: '白蘑菇' }, variant: '半磅', price: 12, quantity: 1 }]),
    order(3, '藍田', [{ product: { name: '白菜' }, variant: '', price: 15, quantity: 3 }]),
  ]
  const { csv, rows, points, orders: n } = buildPackingListCsv(orders)
  assert.equal(n, 3)
  assert.equal(rows, 2)
  assert.equal(points, 2)
  assert.ok(csv.includes('白蘑菇'))
  assert.ok(csv.includes('旺角A'))
  assert.ok(csv.includes('藍田'))
  const lines = csv.split('\n')
  const white = lines.find(l => l.includes('白蘑菇'))
  // 白蘑菇：旺角A 3 份，藍田 0，合计份数 3，金额 36.00
  assert.ok(white.includes('3'))
  assert.ok(white.includes('36.00'))
  const total = lines.find(l => l.includes('合计金额'))
  const last = lines[lines.length - 1]
  assert.ok(last.includes('6')) // 总份数 6
  assert.ok(last.includes('81.00')) // 3*12 + 3*15 = 81
})

test('packing list: excludes cancelled and completed orders', () => {
  const orders = [
    order(1, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 }], 'cancelled'),
    order(2, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 }], 'completed'),
    order(3, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 2 }], 'paid'),
  ]
  const { csv, orders: n } = buildPackingListCsv(orders)
  assert.equal(n, 1)
  assert.ok(csv.includes('2'))
  assert.ok(!csv.includes('订单数：3'))
})

test('packing list: empty active orders returns empty order count', () => {
  const { orders: n, rows } = buildPackingListCsv([order(1, '旺角A', [], 'cancelled')])
  assert.equal(n, 0)
  assert.equal(rows, 0)
})

test('packing list: status filter label is included in header', () => {
  const orders = [order(1, '旺角A', [{ product: { name: '白菜' }, variant: '', price: 15, quantity: 1 }])]
  const { csv } = buildPackingListCsv(orders, { statusFilter: 'paid', statusText: { paid: '拼团中' } })
  assert.ok(csv.includes('拼团中'))
})
