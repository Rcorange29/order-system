import { getAuthUser, json, cors, readBody } from '../_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '请先登录' }, 401)
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  const id = Number(body.order_id)
  if (!Number.isInteger(id) || id < 1 || !['delivery_upgrade', 'refund'].includes(body.type)) {
    return json({ error: '申请内容无效' }, 400)
  }
  const order = await env.DB.prepare('SELECT id, status, payment_status, delivery_point_id, delivery_batch_id FROM orders WHERE id = ? AND user_id = ?')
    .bind(id, String(user.id)).first()
  if (!order) return json({ error: '订单不存在' }, 404)
  if (order.delivery_batch_id) return json({ error: '此订单已纳入本次配送，请联系客服处理后续变更' }, 409)
  if (order.status !== 'paid' || order.payment_status !== 'confirmed' || !order.delivery_point_id) {
    return json({ error: '只有已付款、待统一配送的自取订单可申请' }, 409)
  }
  const address = String(body.address || '').trim()
  if (body.type === 'delivery_upgrade' && (address.length < 5 || address.length > 300)) {
    return json({ error: '请填写完整的送货地址' }, 400)
  }
  const pending = await env.DB.prepare("SELECT id FROM order_requests WHERE order_id = ? AND status = 'pending'").bind(id).first()
  if (pending) return json({ error: '这笔订单已有待处理申请' }, 409)
  try {
    await env.DB.prepare('INSERT INTO order_requests (order_id, user_id, type, address) VALUES (?, ?, ?, ?)')
      .bind(id, String(user.id), body.type, body.type === 'delivery_upgrade' ? address : '').run()
  } catch {
    return json({ error: '申请未提交，请刷新后重试' }, 409)
  }
  return json({ ok: true }, 201)
}
