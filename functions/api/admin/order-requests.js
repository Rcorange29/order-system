import { getAdminUser, json, cors, readBody } from '../_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      `SELECT r.*, o.order_no, o.customer, o.phone, o.total, o.delivery_fee, o.status AS order_status,
              p.name AS delivery_point_name FROM order_requests r
       JOIN orders o ON o.id = r.order_id LEFT JOIN delivery_points p ON p.id = o.delivery_point_id
       ORDER BY CASE WHEN r.status = 'pending' THEN 0 ELSE 1 END, r.id DESC LIMIT 200`
    ).all()
    return json(results)
  }
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405)
  const body = await readBody(request)
  const id = Number(body.id)
  const decision = body.decision
  const note = String(body.note || '').trim().slice(0, 500)
  if (!Number.isInteger(id) || id < 1 || !['approve', 'reject'].includes(decision)) return json({ error: '处理内容无效' }, 400)

  const entry = await env.DB.prepare(
    `SELECT r.*, o.status AS order_status, o.payment_status, o.delivery_point_id
     FROM order_requests r JOIN orders o ON o.id = r.order_id WHERE r.id = ?`
  ).bind(id).first()
  if (!entry) return json({ error: '申请不存在' }, 404)
  if (entry.status !== 'pending') return json({ error: '申请已处理' }, 409)
  if (entry.order_status !== 'paid' || entry.payment_status !== 'confirmed' || !entry.delivery_point_id) {
    return json({ error: '订单状态已变化，请重新核对' }, 409)
  }

  if (decision === 'approve') {
    const updateOrder = entry.type === 'delivery_upgrade'
      ? env.DB.prepare("UPDATE orders SET delivery_point_id = NULL, address = ?, delivery_fee = 30, updated_at = datetime('now', '+8 hours') WHERE id = ? AND status = 'paid' AND payment_status = 'confirmed' AND delivery_point_id IS NOT NULL")
        .bind(entry.address, entry.order_id)
      : env.DB.prepare("UPDATE orders SET status = 'cancelled', payment_status = 'refunded', updated_at = datetime('now', '+8 hours') WHERE id = ? AND status = 'paid' AND payment_status = 'confirmed' AND delivery_point_id IS NOT NULL")
        .bind(entry.order_id)
    const markRequest = env.DB.prepare("UPDATE order_requests SET status = 'approved', admin_note = ?, handled_by = ?, handled_at = datetime('now', '+8 hours') WHERE id = ? AND status = 'pending'")
      .bind(note, admin.id, id)
    const statements = [updateOrder, markRequest]
    if (entry.type === 'refund') {
      statements.push(env.DB.prepare("UPDATE coupon_grants SET used_order_no = NULL, used_at = NULL WHERE used_order_no = (SELECT order_no FROM orders WHERE id = ?) ").bind(entry.order_id))
    }
    await env.DB.batch(statements)
  } else {
    await env.DB.prepare("UPDATE order_requests SET status = 'rejected', admin_note = ?, handled_by = ?, handled_at = datetime('now', '+8 hours') WHERE id = ? AND status = 'pending'")
      .bind(note, admin.id, id).run()
  }
  return json({ ok: true })
}
