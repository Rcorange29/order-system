import { getAdminUser, json, cors, readBody } from '../_utils.js'
import { validDeliveryDate } from '../_delivery-schedule.js'

const keyFor = value => value === 'home' ? 'home' : String(Number(value))

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405)
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(`SELECT b.*, COUNT(bo.order_id) AS order_count
      FROM delivery_batches b LEFT JOIN delivery_batch_orders bo ON bo.batch_id = b.id
      GROUP BY b.id ORDER BY b.delivery_date DESC, b.id DESC`).all()
    return json(results)
  }

  const body = await readBody(request)
  const pointKey = keyFor(body.point_key)
  if ((pointKey !== 'home' && (!Number.isSafeInteger(Number(pointKey)) || Number(pointKey) < 1)) || !validDeliveryDate(body.delivery_date)) {
    return json({ error: '请选择服务点和有效配送日期' }, 400)
  }
  const point = pointKey === 'home' ? null : await env.DB.prepare('SELECT id, name FROM delivery_points WHERE id = ?').bind(Number(pointKey)).first()
  if (pointKey !== 'home' && !point) return json({ error: '服务点不存在' }, 404)
  const existing = await env.DB.prepare('SELECT id FROM delivery_batches WHERE point_key = ? AND delivery_date = ?').bind(pointKey, body.delivery_date).first()
  if (existing) return json({ error: '该服务点和日期已经有一个批次，请打开已有批次' }, 409)
  const { results: orders } = await env.DB.prepare(`SELECT o.*, n.number AS public_no,
    u.username, u.wechat_id AS user_wechat_id, u.whatsapp AS user_whatsapp, u.phone AS user_phone
    FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id LEFT JOIN users u ON o.user_id = u.id
    WHERE COALESCE(CAST(o.delivery_point_id AS TEXT), 'home') = ?
      AND o.delivery_batch_id IS NULL AND o.status = 'paid' AND o.payment_status = 'confirmed'
    ORDER BY n.number ASC, o.id ASC`).bind(pointKey).all()
  if (!orders.length) return json({ error: '该服务点没有已确认收款、尚未归批的拼团订单' }, 409)
  const ids = orders.map(order => order.id)
  const pending = await env.DB.prepare(`SELECT id FROM order_requests WHERE status = 'pending' AND order_id IN (${ids.map(() => '?').join(',')}) LIMIT 1`).bind(...ids).first()
  if (pending) return json({ error: '请先处理本批订单的配送或退款申请' }, 409)

  const statements = [env.DB.prepare('INSERT INTO delivery_batches (point_key, point_name, delivery_date) VALUES (?, ?, ?)').bind(pointKey, point?.name || '送货到家', body.delivery_date)]
  for (const order of orders) {
    const { results: items } = await env.DB.prepare(`SELECT oi.product_id, oi.quantity, oi.price, oi.variant, p.name AS product_name
      FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? ORDER BY oi.id`).bind(order.id).all()
    const snapshot = JSON.stringify({ ...order, payment_amount: Number(order.payment_amount ?? (Number(order.total) + Number(order.delivery_fee || 0))), items })
    statements.push(env.DB.prepare(`UPDATE orders SET delivery_batch_id = (SELECT id FROM delivery_batches WHERE point_key = ? AND delivery_date = ?)
      WHERE id = ? AND delivery_batch_id IS NULL AND status = 'paid' AND payment_status = 'confirmed'
      AND NOT EXISTS (SELECT 1 FROM order_requests WHERE order_id = ? AND status = 'pending')`).bind(pointKey, body.delivery_date, order.id, order.id))
    statements.push(env.DB.prepare(`INSERT INTO delivery_batch_orders (batch_id, order_id, snapshot)
      SELECT o.delivery_batch_id, o.id, ? FROM orders o WHERE o.id = ? AND o.delivery_batch_id =
      (SELECT id FROM delivery_batches WHERE point_key = ? AND delivery_date = ?)`).bind(snapshot, order.id, pointKey, body.delivery_date))
  }
  try { await env.DB.batch(statements) }
  catch { return json({ error: '锁定批次失败，请刷新后重试' }, 409) }
  const batch = await env.DB.prepare('SELECT * FROM delivery_batches WHERE point_key = ? AND delivery_date = ?').bind(pointKey, body.delivery_date).first()
  const count = await env.DB.prepare('SELECT COUNT(*) AS count FROM delivery_batch_orders WHERE batch_id = ?').bind(batch.id).first()
  if (Number(count.count) !== orders.length) {
    await env.DB.batch([
      env.DB.prepare('UPDATE orders SET delivery_batch_id = NULL WHERE delivery_batch_id = ?').bind(batch.id),
      env.DB.prepare('DELETE FROM delivery_batch_orders WHERE batch_id = ?').bind(batch.id),
      env.DB.prepare('DELETE FROM delivery_batches WHERE id = ?').bind(batch.id)
    ])
    return json({ error: '有订单状态发生变化，请刷新后重新锁定' }, 409)
  }
  return json({ ...batch, order_count: orders.length }, 201)
}
