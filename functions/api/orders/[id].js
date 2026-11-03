import { getAuthUser, json, cors, readBody } from '../_utils.js'

// Existing Alipay orders remain readable, but customers cannot select it again.
const PAYMENT_METHODS = new Set(['wechat_transfer', 'fps_transfer'])

export async function onRequest(context) {
  const { request, env } = context
  const id = context.params.id
  if (request.method === 'OPTIONS') return cors()
  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)

  if (request.method === 'PATCH') {
    const body = await readBody(request)
    if (body.action === 'cancel') {
      const order = await env.DB.prepare('SELECT id, user_id, status, payment_status FROM orders WHERE id = ?').bind(id).first()
      if (!order) return json({ error: '订单不存在' }, 404)
      if (order.user_id !== String(user.id)) return json({ error: '无权操作该订单' }, 403)
      if (order.status !== 'pending' || order.payment_status !== 'pending') return json({ error: '该订单不在待付款阶段，无法自行取消，请联系老板' }, 409)
      await env.DB.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now', '+8 hours') WHERE id = ? AND status = 'pending'").bind(id).run()
      return json({ ok: true, status: 'cancelled' })
    }
    const order = await env.DB.prepare('SELECT id, user_id, status, payment_status, payment_method, payment_currency, payment_screenshot, total, delivery_fee FROM orders WHERE id = ?').bind(id).first()
    if (!order) return json({ error: '订单不存在' }, 404)
    if (order.user_id !== String(user.id)) return json({ error: '无权修改该订单' }, 403)
    if (order.status !== 'pending' || order.payment_status !== 'pending' || order.payment_screenshot) return json({ error: '只有待付款且未上传凭证的订单可以更改付款币种或方式' }, 409)
    const currency = body.payment_currency ?? order.payment_currency ?? 'CNY'
    if (!['CNY', 'HKD'].includes(currency)) return json({ error: '付款币种无效' }, 400)
    const method = body.payment_method ?? (currency !== order.payment_currency ? currency === 'HKD' ? 'fps_transfer' : 'wechat_transfer' : order.payment_method)
    if (!PAYMENT_METHODS.has(method)) return json({ error: '目前请选择微信或转数快付款' }, 400)
    if (currency === 'HKD' && method !== 'fps_transfer') return json({ error: '港币订单请使用转数快付款' }, 400)
    if (currency === 'CNY' && method !== 'wechat_transfer') return json({ error: '人民币订单请使用微信付款' }, 400)
    const amountCents = Math.round(Number(order.total) * 100) + Math.round(Number(order.delivery_fee || 0) * 100)
    if (!Number.isSafeInteger(amountCents) || amountCents < 0) return json({ error: '订单金额无效' }, 409)
    const rateRow = currency === 'HKD' ? await env.DB.prepare("SELECT value FROM settings WHERE key = 'exchange_rate'").first() : null
    const exchangeRate = Number(rateRow?.value || 1.2)
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0 || exchangeRate > 100) return json({ error: '汇率设置无效' }, 500)
    const paymentAmount = Math.round(amountCents * (currency === 'HKD' ? exchangeRate : 1)) / 100
    const updated = await env.DB.prepare("UPDATE orders SET payment_currency = ?, payment_method = ?, payment_amount = ?, updated_at = datetime('now', '+8 hours') WHERE id = ? AND user_id = ? AND status = 'pending' AND payment_status = 'pending' AND COALESCE(payment_screenshot, '') = '' AND payment_currency = ? AND payment_method = ?")
      .bind(currency, method, paymentAmount, id, String(user.id), order.payment_currency, order.payment_method).run()
    if (updated.meta?.changes !== 1) return json({ error: '订单已变化，请刷新后重试' }, 409)
    return json({ ok: true, payment_method: method, payment_currency: currency, payment_amount: paymentAmount })
  }

  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const order = await env.DB.prepare('SELECT o.*, n.number AS public_no, p.name AS delivery_point_name FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id LEFT JOIN delivery_points p ON p.id = o.delivery_point_id WHERE o.id = ?').bind(id).first()
  if (!order) return json({ error: 'not found' }, 404)
  if (order.user_id !== String(user.id)) return json({ error: '无权查看该订单' }, 403)

  const { results: items } = await env.DB.prepare(
    'SELECT oi.*, p.name as product_name, p.image as product_image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
  ).bind(id).all()
  const serviceRequest = await env.DB.prepare('SELECT type, status, admin_note, created_at FROM order_requests WHERE order_id = ? ORDER BY id DESC LIMIT 1').bind(id).first()

  return json({
    ...order,
    request: serviceRequest,
    items: items.map(i => ({ ...i, product: { id: i.product_id, name: i.product_name, image: i.product_image } }))
  })
}
