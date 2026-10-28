import { json, cors, readBody, getAdminUser } from '../../_utils.js'
import { normalizeContactPhone, validWechatId } from '../../_contacts.js'

export async function onRequest(context) {
  const { request, env } = context
  const id = context.params.id
  if (request.method === 'OPTIONS') return cors()

  if (request.method === 'GET') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const order = await env.DB.prepare('SELECT o.*, n.number as public_no FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id WHERE o.id = ?').bind(id).first()
    if (!order) return json({ error: 'not found' }, 404)
    const { results: items } = await env.DB.prepare(
      'SELECT oi.*, p.name as product_name, p.image as product_image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
    ).bind(id).all()
    return json({ ...order, items: items.map(i => ({ ...i, product: { id: i.product_id, name: i.product_name, image: i.product_image } })) })
  }

  // Update delivery notes separately so an old form cannot overwrite payment/status.
  if (request.method === 'PATCH') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    if (!order) return json({ error: 'not found' }, 404)
    if (order.delivery_batch_id) return json({ error: '订单已锁定在配送批次，不能修改收货资料' }, 409)
    const body = await readBody(request)
    const limits = { customer: 80, phone: 32, contact_wechat_id: 20, contact_whatsapp: 32, address: 500, remark: 1000 }
    if (Object.keys(body).some(key => !Object.hasOwn(limits, key))) return json({ error: '这里只能修改收货人、联系方式、地址和备注' }, 400)
    const fields = [], values = []
    for (const key of Object.keys(limits)) {
      if (!Object.hasOwn(body, key)) continue
      if (typeof body[key] !== 'string' || body[key].length > limits[key]) return json({ error: '收货信息格式或长度无效' }, 400)
      let value = body[key].trim()
      if (key === 'customer' && !value) return json({ error: '收货人不能为空' }, 400)
      if (key === 'contact_wechat_id' && !validWechatId(value)) return json({ error: '微信号格式无效' }, 400)
      if (['phone', 'contact_whatsapp'].includes(key) && value !== String(order[key] || '')) {
        value = normalizeContactPhone(value)
        if (value === null) return json({ error: '联系电话仅支持+852香港手机号或+86内地手机号' }, 400)
      }
      if (key === 'address' && !order.delivery_point_id && value.length < 4) return json({ error: '配送到家的地址至少填写4个字' }, 400)
      fields.push(key + ' = ?'); values.push(value)
    }
    if (!fields.length) return json({ error: '没有需要保存的字段' }, 400)
    await env.DB.prepare(`UPDATE orders SET ${fields.join(', ')}, updated_at=datetime('now', '+8 hours') WHERE id = ?`).bind(...values, id).run()
    return json({ message: '收货信息与备注已保存' })
  }

  if (request.method === 'PUT') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const body = await readBody(request)
    const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    if (!order) return json({ error: 'not found' }, 404)
    if (order.delivery_batch_id && !(order.status === 'shipped' && body.status === 'completed' && Object.keys(body).every(key => key === 'status'))) {
      return json({ error: '订单已锁定在配送批次；归档后仅可标记完成' }, 409)
    }
    const validStatuses = new Set(['pending', 'awaiting_confirmation', 'paid', 'shipped', 'completed', 'cancelled'])
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
      body.customer ?? order.customer,
      body.phone ?? order.phone,
      body.address ?? order.address,
      body.remark ?? order.remark,
      nextPayment,
      id
    ).run()
    const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    return json(updated)
  }

  if (request.method === 'DELETE') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const order = await env.DB.prepare('SELECT delivery_batch_id FROM orders WHERE id = ?').bind(id).first()
    if (order?.delivery_batch_id) return json({ error: '已归入配送批次的订单不能删除' }, 409)
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
