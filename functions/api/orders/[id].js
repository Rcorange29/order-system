import { getAuthUser, json, cors, readBody } from '../_utils.js'

const PAYMENT_METHODS = new Set(['wechat_transfer', 'alipay_transfer', 'fps_transfer'])

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
    if (!PAYMENT_METHODS.has(body.payment_method)) return json({ error: '请选择微信、支付宝或转数快付款' }, 400)
    const order = await env.DB.prepare('SELECT id, user_id, payment_status, payment_currency FROM orders WHERE id = ?').bind(id).first()
    if (!order) return json({ error: '订单不存在' }, 404)
    if (order.user_id !== String(user.id)) return json({ error: '无权修改该订单' }, 403)
    if (order.payment_currency === 'HKD' && ['wechat_transfer', 'alipay_transfer'].includes(body.payment_method)) return json({ error: '微信和支付宝仅支持人民币付款，请改选转数快' }, 400)
    if (order.payment_currency === 'CNY' && body.payment_method === 'fps_transfer') return json({ error: '转数快仅支持港币付款，请改选微信或支付宝' }, 400)
    if (!['pending', 'paid'].includes(order.payment_status)) return json({ error: '该订单已完成付款，无法更改支付方式' }, 409)
    await env.DB.prepare("UPDATE orders SET payment_method = ?, updated_at = datetime('now', '+8 hours') WHERE id = ?").bind(body.payment_method, id).run()
    return json({ ok: true, payment_method: body.payment_method })
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
