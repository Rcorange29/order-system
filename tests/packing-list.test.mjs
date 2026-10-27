import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPackingListHtml, getPackableOrders } from '../src/admin/packingList.js'

const order = (id, pointId, items, extra = {}) => ({
  id, public_no: id, delivery_point_id: pointId, status: 'paid', payment_status: 'confirmed', items,
  ...extra
})
const item = (name, variant, quantity) => ({ product: { name }, variant, quantity, price: 99 })
const build = (orders, pointId = '2') =>
  buildPackingListHtml(orders, { pointId, pointName: '科技大学', deliveryDate: '2026-10-28' })

test('one service point per sheet, one block per order, and no prices or payment details', () => {
  const html = build([
    order(2, 2, [item('小番茄', '500g', 2), item('鸡蛋', '10只装', 1)], { contact_wechat_id: 'chen123' }),
    order(1, 1, [item('苹果', '大果', 3)], { phone: '+85291234567' }),
  ])
  assert.match(html, /科技大学｜10月28日配货单｜共 1 单/)
  assert.equal((html.match(/class="order-block"/g) || []).length, 1)
  assert.match(html, /订单 02/)
  assert.match(html, /微信：chen123/)
  assert.match(html, /商品及规格/)
  assert.match(html, /小番茄.*500g/)
  assert.match(html, /鸡蛋.*10只装/)
  assert.match(html, /max-width: 170mm/)
  assert.match(html, /@page \{ size: A4 portrait/)
  assert.equal((html.match(/class="item-check"/g) || []).length, 2)
  assert.match(html, /class="num">×2/)
  assert.doesNotMatch(html, /苹果|订单 01|¥|单价|小计|合计|收款状态|付款方式/)
})

test('contact shows WeChat, then WhatsApp, then phone, using account fallback for old orders', () => {
  const html = build([
    order(1, 2, [item('苹果', '', 1)], { contact_wechat_id: 'wechat-one', contact_whatsapp: '+85290000001', phone: '+85290000002' }),
    order(2, 2, [item('苹果', '', 1)], { user_whatsapp: '+85290000003', phone: '+85290000004' }),
    order(3, 2, [item('苹果', '', 1)], { user_phone: '+85290000005' }),
  ])
  assert.match(html, /订单 01<\/strong><span class="contact">— 微信：wechat-one/)
  assert.match(html, /订单 02<\/strong><span class="contact">— WhatsApp：\+85290000003/)
  assert.match(html, /订单 03<\/strong><span class="contact">— 电话：\+85290000005/)
  assert.doesNotMatch(html, /90000001|90000002|90000004/)
})

test('only confirmed paid orders awaiting delivery are included', () => {
  const orders = [
    order(1, 2, [item('苹果', '', 1)]),
    order(2, 2, [item('苹果', '', 1)], { status: 'pending' }),
    order(3, 2, [item('苹果', '', 1)], { payment_status: 'pending' }),
    order(4, 2, [item('苹果', '', 1)], { status: 'shipped' }),
    order(5, 2, [item('苹果', '', 1)], { status: 'completed' }),
    order(6, 2, [item('苹果', '', 1)], { status: 'cancelled' }),
  ]
  assert.deepEqual(getPackableOrders(orders, '2').map(o => o.id), [1])
  assert.equal((build(orders).match(/class="order-block"/g) || []).length, 1)
  assert.equal(getPackableOrders(orders, '').length, 0)
})

test('many items remain inside one order block and customer text is escaped', () => {
  const items = Array.from({ length: 10 }, (_, index) => item(`商品${index + 1}`, '', 1))
  const html = build([order(1, 2, items, { contact_wechat_id: '<unsafe&name>' })])
  assert.equal((html.match(/class="order-block"/g) || []).length, 1)
  for (let i = 1; i <= 10; i++) assert.match(html, new RegExp(`商品${i}`))
  assert.match(html, /&lt;unsafe&amp;name&gt;/)
  assert.doesNotMatch(html, /<unsafe&name>/)
})

test('customer remarks appear on the correct order and are escaped', () => {
  const html = build([
    order(1, 2, [item('苹果', '', 1)], { remark: '轻放\n不要压坏 <果>' }),
    order(2, 2, [item('鸡蛋', '', 1)]),
  ])
  const first = html.indexOf('订单 01')
  const second = html.indexOf('订单 02')
  assert.match(html.slice(first, second), /顾客备注：<\/strong>轻放\n不要压坏 &lt;果&gt;/)
  assert.doesNotMatch(html.slice(second), /顾客备注/)
  assert.doesNotMatch(html, /<果>/)
})

test('staff note starts empty in each new slip and remains visible when printed', () => {
  const orders = [order(1, 2, [item('苹果', '', 1)])]
  for (const html of [build(orders), build(orders)]) {
    assert.match(html, /<div class="staff-note-input" contenteditable="plaintext-only"[^>]*><\/div>/)
    assert.match(html, /@media print \{[^}]*staff-note-hint \{ display: none; \}/)
    assert.match(html, /重新打开配货单后此处为空/)
  }
})

test('home delivery prints separately from pickup points', () => {
  const orders = [order(1, null, [item('苹果', '', 2)]), order(2, 2, [item('鸡蛋', '', 1)])]
  const html = buildPackingListHtml(orders, { pointId: 'home', pointName: '送货到家' })
  assert.match(html, /送货到家配货单｜共 1 单/)
  assert.match(html, /订单 01/)
  assert.doesNotMatch(html, /订单 02/)
})
