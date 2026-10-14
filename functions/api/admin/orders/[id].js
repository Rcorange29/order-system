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

    await env.DB.prepare(
      'UPDATE orders SET status=?, customer=?, phone=?, address=?, remark=?, payment_status=?, updated_at=datetime(\'now\', \'+8 hours\') WHERE id=?'
    ).bind(
      body.status || order.status,
      body.customer || order.customer,
      body.phone || order.phone,
      body.address || order.address,
      body.remark || order.remark,
      body.payment_status || order.payment_status,
      id
    ).run()
    const updated = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
    return json(updated)
  }

  if (request.method === 'DELETE') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    await env.DB.prepare('DELETE FROM order_items WHERE order_id = ?').bind(id).run()
    await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run()
    return json({ message: 'deleted' })
  }

  return json({ error: 'Method not allowed' }, 405)
}
