import { json, cors, readBody, getAdminUser } from '../../_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  const id = context.params.id
  if (request.method === 'OPTIONS') return cors()

  if (request.method === 'GET') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    if (!order) return json({ error: 'not found' }, 404)
    const { results: items } = await env.DB.prepare(
      'SELECT oi.*, p.name as product_name, p.image as product_image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
    ).bind(id).all()
    return json({ ...order, items: items.map(i => ({ ...i, product: { id: i.product_id, name: i.product_name, image: i.product_image } })) })
  }

  if (request.method === 'PUT') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const body = await readBody(request)
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    if (!order) return json({ error: 'not found' }, 404)
    const validStatuses = new Set(['pending', 'paid', 'shipped', 'completed', 'cancelled'])
    const validPayments = new Set(['pending', 'paid', 'confirmed', 'refunded'])
    const nextStatus = body.status ?? order.status
    const nextPayment = body.payment_status ?? order.payment_status
    if (!validStatuses.has(nextStatus) || !validPayments.has(nextPayment)) return json({ error: '订单状态无效' }, 400)
    if (nextPayment === 'refunded' && nextStatus !== 'cancelled') return json({ error: '已退款订单必须取消' }, 400)
    if (nextStatus === 'shipped' || nextStatus === 'completed') {
      if (nextPayment !== 'confirmed') return json({ error: '请先确认收款' }, 409)
    }
    if (nextStatus === 'cancelled' && order.payment_status === 'confirmed' && nextPayment !== 'refunded') {
      return json({ error: '已收款订单请先完成退款申请' }, 409)
    }
    if (order.payment_status === 'refunded' && nextPayment !== 'refunded') return json({ error: '已退款订单不能重新收款' }, 409)
    if (nextStatus === 'paid' && nextPayment !== 'confirmed') return json({ error: '请先确认收款' }, 409)
    if (nextStatus !== order.status && nextStatus !== 'paid') {
      const pending = await env.DB.prepare("SELECT id FROM order_requests WHERE order_id = ? AND status = 'pending'").bind(id).first()
      if (pending) return json({ error: '请先处理这笔订单的配送或退款申请' }, 409)
    }

    await env.DB.prepare(
      'UPDATE orders SET status=?, customer=?, phone=?, address=?, remark=?, payment_status=?, updated_at=datetime(\'now\', \'+8 hours\') WHERE id=?'
    ).bind(
      nextStatus,
      body.customer || order.customer,
      body.phone || order.phone,
      body.address || order.address,
      body.remark || order.remark,
      nextPayment,
      id
    ).run()
    const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    return json(updated)
  }

  if (request.method === 'DELETE') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const pending = await env.DB.prepare("SELECT id FROM order_requests WHERE order_id = ? AND status = 'pending'").bind(id).first()
    if (pending) return json({ error: '请先处理这笔订单的配送或退款申请' }, 409)
    await env.DB.batch([
      env.DB.prepare('DELETE FROM order_requests WHERE order_id = ?').bind(id),
      env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id),
      env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id)
    ])
    return json({ message: 'deleted' })
  }

  return json({ error: 'Method not allowed' }, 405)
}
