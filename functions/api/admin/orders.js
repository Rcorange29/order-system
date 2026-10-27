import { json, cors, getAdminUser } from '../_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)

  const url = new URL(request.url)
  const status = url.searchParams.get('status')
  const userId = url.searchParams.get('user_id')
  let sql = 'SELECT o.id, o.order_no, n.number as public_no, o.user_id, o.customer, o.phone, o.contact_wechat_id, o.contact_whatsapp, o.address, o.status, o.total, o.delivery_fee, o.remark, o.payment_method, o.payment_status, o.payment_currency, o.payment_amount, o.delivery_point_id, o.created_at, o.updated_at, u.username, u.phone as user_phone, u.wechat_id as user_wechat_id, u.whatsapp as user_whatsapp, p.name as delivery_point_name FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id LEFT JOIN users u ON o.user_id = u.id LEFT JOIN delivery_points p ON o.delivery_point_id = p.id'
  const params = []
  const filters = []
  if (status) { filters.push('o.status = ?'); params.push(status) }
  if (userId) { filters.push('o.user_id = ?'); params.push(userId) }
  if (filters.length) sql += ' WHERE ' + filters.join(' AND ')
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
