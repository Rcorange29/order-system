import { getAuthUser, json, cors } from '../_utils'

export async function onRequest(context) {
  const { request, env } = context
  const id = context.params.id
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
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
