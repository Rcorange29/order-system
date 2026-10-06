import { json, cors, getAdminUser } from '../_utils'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  let sql = 'SELECT o.*, u.username, u.phone as user_phone, p.name as delivery_point_name FROM orders o LEFT JOIN users u ON o.user_id = u.id LEFT JOIN delivery_points p ON o.delivery_point_id = p.id'
  const params = []
  if (status) { sql += ' WHERE o.status = ?'; params.push(status) }
  sql += ' ORDER BY o.id DESC'

  const { results } = await env.DB.prepare(sql).bind(...params).all()
  const orders = []
  for (const order of results) {
    const { results: items } = await env.DB.prepare(
      'SELECT oi.*, p.name as product_name, p.image as product_image FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?'
    ).bind(order.id).all()
    orders.push({
      ...order,
      items: items.map(i => ({ ...i, product: { id: i.product_id, name: i.product_name, image: i.product_image } }))
    })
  }
  return json(orders)
}
