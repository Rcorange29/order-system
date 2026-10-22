import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPackingListHtml } from '../src/admin/packingList.js'

const order = (id, point, items, status = 'paid', payment_status = 'confirmed', extra = {}) => ({
  id, status, payment_status, delivery_point_name: point, items, public_no: id, remark: extra.remark || '',
})

test('packing list: one big block per order (10 items still inside one block), grouped by pickup point', () => {
  const orders = [
    order(1, '旺角A', [
      { product: { name: '白蘑菇' }, variant: '半磅', price: 12, quantity: 2 },
      { product: { name: '白菜' }, variant: '', price: 15, quantity: 3 },
    ], 'paid'),
    order(2, '藍田', [{ product: { name: '白蘑菇' }, variant: '半磅', price: 12, quantity: 1 }], 'paid'),
  ]
  const html = buildPackingListHtml(orders)
  // 大格子数 = 订单数（同一订单多个商品不拆格）
  const blocks = html.match(/<div class="order-block">[\s\S]*?<\/div>\s*<\/div>/g) || []
  assert.equal(blocks.length, 2)
  // 按自提点分组，点标题出现
  assert.ok(html.includes('自提点：旺角A'))
  assert.ok(html.includes('自提点：藍田'))
  // 订单 01（旺角A）的块内同时含白蘑菇与白菜，未拆格
  const orderOne = blocks.find(b => b.includes('订单 01'))
  assert.ok(orderOne.includes('白蘑菇'))
  assert.ok(orderOne.includes('白菜'))
  // 每单合计
  assert.ok(html.includes('共 5 份 · 合计 ¥69.00'))
  assert.ok(html.includes('共 1 份 · 合计 ¥12.00'))
  // 总计
  assert.ok(html.includes('总计：6 份 · ¥81.00'))
})

test('packing list: 10-item single order stays in ONE block', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ product: { name: `商品${i + 1}` }, variant: '', price: 1, quantity: 1 }))
  const orders = [order(1, '旺角A', items, 'paid')]
  const html = buildPackingListHtml(orders)
  const blocks = html.match(/class="order-block"/g)
  assert.equal(blocks.length, 1)
  assert.equal((html.match(/class="order-block"/g) || []).length, 1)
  for (let i = 1; i <= 10; i++) assert.ok(html.includes(`商品${i}`))
})

test('packing list: remark shown once in order head', () => {
  const orders = [order(1, '旺角A', [
    { product: { name: '白菜' }, variant: '', price: 15, quantity: 2 },
    { product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 },
  ], 'paid', 'confirmed', { remark: '少放葱' })]
  const html = buildPackingListHtml(orders)
  assert.ok(html.includes('备注：少放葱'))
})

test('packing list: excludes cancelled and completed orders', () => {
  const orders = [
    order(1, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 }], 'cancelled'),
    order(2, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 1 }], 'completed'),
    order(3, '旺角A', [{ product: { name: '白蘑菇' }, variant: '', price: 12, quantity: 2 }], 'paid'),
  ]
  const html = buildPackingListHtml(orders)
  assert.ok(!html.includes('订单数：3'))
  assert.equal((html.match(/class="order-block"/g) || []).length, 1)
})

test('packing list: empty active orders produces sheet with zero order count', () => {
  const html = buildPackingListHtml([order(1, '旺角A', [], 'cancelled')])
  assert.ok(html.includes('订单数：0'))
})

test('packing list: status filter label is included in header', () => {
  const orders = [order(1, '旺角A', [{ product: { name: '白菜' }, variant: '', price: 15, quantity: 1 }])]
  const html = buildPackingListHtml(orders, { statusFilter: 'paid', statusText: { paid: '拼团中' } })
  assert.ok(html.includes('拼团中'))
})
