import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPackingListCsv } from '../src/admin/packingList.js'

const order = (id, point, items, status = 'paid', payment_status = 'confirmed', extra = {}) => ({
  id, status, payment_status, delivery_point_name: point, items, public_no: id, remark: extra.remark || '',
})

test('packing list: one block per order, each item on its own row, with per-order total', () => {
  const orders = [
    order(1, '旺角A', [
      { product: { name: '白蘑菇' }, variant: '半磅', price: 12, quantity: 2 },
      { product: { name: '白菜' }, variant: '', price: 15, quantity: 3 },
    ], 'paid'),
    order(2, '藍田', [{ product: { name: '白蘑菇' }, variant: '半磅', price: 12, quantity: 1 }], 'paid'),
  ]
  const { csv, orders: n } = buildPackingListCsv(orders)
  assert.equal(n, 2)
  assert.ok(csv.includes('配货表（逐单明细）'))
  assert.ok(csv.includes('01 合计'))
  assert.ok(csv.includes('02 合计'))
  const itemRows = csv.split('\n').filter(l => l.includes('白蘑菇') || l.includes('白菜'))
  assert.equal(itemRows.length, 3)
  const t1 = csv.split('\n').find(l => l.startsWith('"01 合计"'))
  assert.ok(t1.includes('5'))
  assert.ok(t1.includes('69.00'))
  const total = csv.split('\n')[csv.split('\n').length - 1]
  assert.ok(total.startsWith('"总计"'))
  assert.ok(total.includes('6'))
  assert.ok(total.includes('81.00'))
})

test('packing list: remark only on first item row of an order', () => {
  const orders = [
    order(1, '旺角A', [
      { product: { name: '白菜' }, variant: '', price: 15, quantity: 2 },
      { product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 },
    ], 'paid', 'confirmed', { remark: '少放葱' }),
  ]
  const { csv } = buildPackingListCsv(orders)
  const lines = csv.split('\n').filter(l => l.includes('少放葱'))
  assert.equal(lines.length, 1)
})

test('packing list: excludes cancelled and completed orders', () => {
  const orders = [
    order(1, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 }], 'cancelled'),
    order(2, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 }], 'completed'),
    order(3, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 2 }], 'paid'),
  ]
  const { csv, orders: n } = buildPackingListCsv(orders)
  assert.equal(n, 1)
  assert.ok(!csv.includes('订单数：3'))
  assert.ok(csv.includes('03 合计'))
})

test('packing list: empty active orders returns empty order count', () => {
  const { orders: n } = buildPackingListCsv([order(1, '旺角A', [], 'cancelled')])
  assert.equal(n, 0)
})

test('packing list: status filter label is included in header', () => {
  const orders = [order(1, '旺角A', [{ product: { name: '白菜' }, variant: '', price: 15, quantity: 1 }])]
  const { csv } = buildPackingListCsv(orders, { statusFilter: 'paid', statusText: { paid: '拼团中' } })
  assert.ok(csv.includes('拼团中'))
})
