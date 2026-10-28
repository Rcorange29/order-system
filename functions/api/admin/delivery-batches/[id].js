import { getAdminUser, json, cors } from '../../_utils.js'

export async function onRequest({ request, env, params }) {
  if (request.method === 'OPTIONS') return cors()
  if (!['GET', 'PATCH'].includes(request.method)) return json({ error: 'Method not allowed' }, 405)
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)
  const id = Number(params.id)
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: '批次编号无效' }, 400)
  const batch = await env.DB.prepare('SELECT * FROM delivery_batches WHERE id = ?').bind(id).first()
  if (!batch) return json({ error: '批次不存在' }, 404)
  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT snapshot FROM delivery_batch_orders WHERE batch_id = ? ORDER BY order_id').bind(id).all()
    const orders = results.map(row => JSON.parse(row.snapshot)).sort((a,b) => Number(a.public_no ?? a.id) - Number(b.public_no ?? b.id))
    return json({ batch, orders })
  }
  if (batch.status !== 'locked') return json({ error: '这个批次已经归档' }, 409)
  const total = await env.DB.prepare('SELECT COUNT(*) AS count FROM delivery_batch_orders WHERE batch_id = ?').bind(id).first()
  const ready = await env.DB.prepare("SELECT COUNT(*) AS count FROM orders WHERE delivery_batch_id = ? AND status = 'paid' AND payment_status = 'confirmed'").bind(id).first()
  if (!Number(total.count) || Number(total.count) !== Number(ready.count)) return json({ error: '批次订单状态已变化，请先核对' }, 409)
  await env.DB.batch([
    env.DB.prepare("UPDATE orders SET status = 'shipped', updated_at = datetime('now', '+8 hours') WHERE delivery_batch_id = ? AND status = 'paid' AND payment_status = 'confirmed'").bind(id),
    env.DB.prepare("UPDATE delivery_batches SET status = 'archived', archived_at = datetime('now', '+8 hours') WHERE id = ? AND status = 'locked'").bind(id)
  ])
  return json({ ok: true })
}
