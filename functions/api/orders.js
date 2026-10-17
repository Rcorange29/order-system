import { normalizeContactPhone } from './_contacts.js'
import { getAuthUser, json, cors, readBody } from './_utils.js'

const MAX_ITEMS = 100
const MAX_QUANTITY = 99
const PAYMENT_METHODS = new Set(['wechat_transfer', 'alipay_transfer', 'fps_transfer'])

function validMoney(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function cents(value) {
  return Math.round(value * 100)
}

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()

  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT o.id, o.order_no, n.number as public_no, o.user_id, o.customer, o.phone, o.contact_wechat_id, o.contact_whatsapp, o.address, o.status, o.total, o.delivery_fee, o.remark, o.payment_method, o.payment_status, o.payment_currency, o.payment_amount, o.payment_screenshot, o.delivery_point_id, o.created_at, o.updated_at, p.name as delivery_point_name FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id LEFT JOIN delivery_points p ON o.delivery_point_id = p.id WHERE o.user_id = ? ORDER BY o.id DESC'
    ).bind(String(user.id)).all()
    const orders = []
    for (const order of results) {
      const { results: items } = await env.DB.prepare(
        'SELECT oi.*, pr.name as product_name, pr.image as product_image FROM order_items oi LEFT JOIN products pr ON oi.product_id = pr.id WHERE oi.order_id = ?'
      ).bind(order.id).all()
      const request = await env.DB.prepare('SELECT type, status, admin_note, created_at FROM order_requests WHERE order_id = ? ORDER BY id DESC LIMIT 1').bind(order.id).first()
      orders.push({ ...order, request, items: items.map(i => ({ ...i, product: { id: i.product_id, name: i.product_name, image: i.product_image } })) })
    }
    return json(orders)
  }
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_ITEMS) {
    return json({ error: '请选择商品（最多100项）' }, 400)
  }
  if (!PAYMENT_METHODS.has(body.payment_method)) return json({ error: '请选择微信、支付宝或转数快付款' }, 400)
  const paymentCurrency = body.payment_currency || 'CNY'
  if (!['CNY', 'HKD'].includes(paymentCurrency)) return json({ error: '付款币种无效' }, 400)
  if (paymentCurrency === 'HKD' && ['wechat_transfer', 'alipay_transfer'].includes(body.payment_method)) return json({ error: '微信和支付宝仅支持人民币付款，请改选转数快' }, 400)
  if (paymentCurrency === 'CNY' && body.payment_method === 'fps_transfer') return json({ error: '转数快仅支持港币付款，请改选微信或支付宝' }, 400)
  if (!['pickup', 'delivery'].includes(body.delivery_type)) return json({ error: '配送方式无效' }, 400)

  let point = null
  if (body.delivery_type === 'pickup') {
    point = await env.DB.prepare('SELECT * FROM delivery_points WHERE id = ? AND is_active = 1')
      .bind(body.delivery_point_id || null).first()
    if (!point) return json({ error: '请选择有效的自取点' }, 400)
  } else if (!String(body.address || '').trim()) {
    return json({ error: '请填写配送地址', code: 'ADDRESS_REQUIRED' }, 400)
  }
  if (body.phone && normalizeContactPhone(body.phone) === null) return json({ code: 'INVALID_PHONE' }, 400)

  const items = []
  let subtotalCents = 0
  for (const item of body.items) {
    if (!item || typeof item !== 'object' || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY || !Number.isInteger(Number(item.product_id))) {
      return json({ error: '商品数量或编号无效' }, 400)
    }
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1')
      .bind(item.product_id).first()
    if (!product) return json({ error: '商品已下架或不存在，请刷新购物车' }, 400)

    let variants = []
    try { variants = product.variants ? JSON.parse(product.variants) : [] } catch { return json({ error: '商品规格配置有误' }, 500) }
    if (!Array.isArray(variants)) return json({ error: '商品规格配置有误' }, 500)
    const variant = String(item.variant || '')
    const selected = variants.length ? variants.find(v => v && v.label === variant) : null
    if ((variant && !selected) || (!variants.length && variant)) return json({ error: '商品规格无效' }, 400)
    const price = Number(selected ? selected.price : product.price)
    if (!validMoney(price)) return json({ error: '商品价格配置有误' }, 500)
    const unitCents = cents(price)
    subtotalCents += unitCents * item.quantity
    if (!Number.isSafeInteger(subtotalCents)) return json({ error: '订单金额过大' }, 400)
    items.push({ product_id: product.id, quantity: item.quantity, variant, price: unitCents / 100 })
  }

  // 自取点订单始终免运费；门槛只决定该点何时统一配送。
  const deliveryFee = point ? 0 : 30

  let coupon = null
  let discountCents = 0
  if (body.coupon_grant_id !== undefined && body.coupon_grant_id !== null) {
    const grantId = Number(body.coupon_grant_id)
    if (!Number.isInteger(grantId) || grantId <= 0) return json({ error: '优惠券无效' }, 400)
    coupon = await env.DB.prepare('SELECT g.id, c.min_spend, c.discount_amount FROM coupon_grants g JOIN coupon_campaigns c ON c.id = g.campaign_id WHERE g.id = ? AND g.user_id = ? AND g.used_order_no IS NULL').bind(grantId, user.id).first()
    if (!coupon) return json({ error: '优惠券不存在或已使用' }, 409)
    if (subtotalCents < cents(Number(coupon.min_spend))) return json({ error: `商品金额需满 ¥${coupon.min_spend} 才能使用此券` }, 400)
    discountCents = cents(Number(coupon.discount_amount))
    if (!validMoney(Number(coupon.discount_amount)) || discountCents >= subtotalCents) return json({ error: '优惠券配置有误' }, 500)
  }

  const dbUser = await env.DB.prepare('SELECT username, phone, wechat_id, whatsapp FROM users WHERE id = ?').bind(user.id).first()
  if (!body.phone && !dbUser?.phone && !dbUser?.wechat_id && !dbUser?.whatsapp) return json({ code: 'CONTACT_REQUIRED' }, 400)
  const rateRow = paymentCurrency === 'HKD' ? await env.DB.prepare("SELECT value FROM settings WHERE key = 'exchange_rate'").first() : null
  const exchangeRate = Number(rateRow?.value || 1.2)
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 100) return json({ error: '汇率设置无效' }, 500)
  const amountCents = subtotalCents - discountCents + cents(deliveryFee)
  const paymentAmount = Math.round(amountCents * (paymentCurrency === 'HKD' ? exchangeRate : 1)) / 100
  if (body.expected_cny_total !== undefined && cents(Number(body.expected_cny_total)) !== amountCents) return json({ error: '商品价格已更新，请刷新页面后重新确认金额' }, 409)
  if (body.expected_payment_amount !== undefined && cents(Number(body.expected_payment_amount)) !== cents(paymentAmount)) return json({ error: '汇率或金额已更新，请刷新页面后重新确认金额' }, 409)
  const orderNo = 'ZZ' + crypto.randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()
  const statements = [env.DB.prepare(
    `INSERT INTO orders (order_no, user_id, customer, phone, address, status, total, delivery_fee, remark, payment_method, payment_status, delivery_point_id, coupon_discount, coupon_grant_id, payment_currency, payment_amount, contact_wechat_id, contact_whatsapp, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+8 hours'))`
  ).bind(
    orderNo, String(user.id), String(body.customer || dbUser?.username || '').trim(),
    normalizeContactPhone(body.phone || dbUser?.phone || '') || '', String(body.address || '').trim(),
    'pending', (subtotalCents - discountCents) / 100, deliveryFee, String(body.remark || ''),
    body.payment_method, 'pending', point?.id || null, discountCents / 100, coupon?.id || null, paymentCurrency, paymentAmount, dbUser?.wechat_id || '', dbUser?.whatsapp || ''
  )]
  for (const item of items) {
    statements.push(env.DB.prepare(
      'INSERT INTO order_items (order_id, product_id, quantity, price, variant) VALUES ((SELECT id FROM orders WHERE order_no = ?), ?, ?, ?, ?)'
    ).bind(orderNo, item.product_id, item.quantity, item.price, item.variant))
  }
  statements.push(env.DB.prepare('INSERT INTO order_numbers (order_id) VALUES ((SELECT id FROM orders WHERE order_no = ?))').bind(orderNo))
  if (coupon) {
    const reserved = await env.DB.prepare("UPDATE coupon_grants SET used_order_no = ?, used_at = datetime('now', '+8 hours') WHERE id = ? AND user_id = ? AND used_order_no IS NULL").bind(orderNo, coupon.id, user.id).run()
    if (reserved.meta.changes !== 1) return json({ error: '优惠券已被使用，请刷新后重试' }, 409)
  }
  try {
    await env.DB.batch(statements)
  } catch (error) {
    if (coupon) await env.DB.prepare('UPDATE coupon_grants SET used_order_no = NULL, used_at = NULL WHERE id = ? AND used_order_no = ?').bind(coupon.id, orderNo).run()
    throw error
  }
  const order = await env.DB.prepare(
    'SELECT o.*, n.number as public_no, p.name as delivery_point_name FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id LEFT JOIN delivery_points p ON o.delivery_point_id = p.id WHERE o.order_no = ?'
  ).bind(orderNo).first()
  return json({ ...order, items }, 201)
}
