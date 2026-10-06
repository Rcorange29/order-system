import { getAuthUser, json, cors, readBody } from './_utils'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()

  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare(
      'SELECT o.*, p.name as delivery_point_name FROM orders o LEFT JOIN delivery_points p ON o.delivery_point_id = p.id WHERE o.user_id = ? ORDER BY o.id DESC'
    ).bind(String(user.id)).all()

    const orders = []
    for (const order of results) {
      const { results: items } = await env.DB.prepare(
        'SELECT oi.*, pr.name as product_name, pr.image as product_image FROM order_items oi LEFT JOIN products pr ON oi.product_id = pr.id WHERE oi.order_id = ?'
      ).bind(order.id).all()
      orders.push({
        ...order,
        items: items.map(i => ({ ...i, product: { id: i.product_id, name: i.product_name, image: i.product_image } }))
      })
    }
    return json(orders)
  }

  if (request.method === 'POST') {
    const body = await readBody(request)
    const dbUser = await env.DB.prepare('SELECT username, phone FROM users WHERE id = ?').bind(String(user.id)).first()
    const orderNo = 'ZZ' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000) + Math.floor(Math.random() * 1000)

    let total = 0
    const items = []
    for (const item of body.items || []) {
      const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(item.product_id).first()
      if (product) {
        items.push({ product_id: item.product_id, quantity: item.quantity, price: product.price })
        total += product.price * item.quantity
      }
    }

    const paymentMethod = body.payment_method || 'cash_on_delivery'
    const pointId = body.delivery_point_id || null

    // 计算运费
    const deliveryType = body.delivery_type || 'pickup'
    let deliveryFee = 10
    if (deliveryType === 'delivery') {
      deliveryFee = 30  // 配送到家固定30元
    } else if (pointId) {
      const point = await env.DB.prepare('SELECT * FROM delivery_points WHERE id = ?').bind(pointId).first()
      if (point) {
        const summary = await env.DB.prepare(
          `SELECT COALESCE(SUM(total), 0) as t FROM orders 
           WHERE payment_status = 'confirmed' AND delivery_point_id = ? 
           AND date(created_at) = date('now', '+8 hours')`
        ).bind(pointId).first()
        const todayTotal = (summary?.t || 0) + total
        deliveryFee = todayTotal >= point.threshold ? 0 : point.fee
      }
    }

    const result = await env.DB.prepare(
      `INSERT INTO orders (order_no, user_id, customer, phone, address, status, total, delivery_fee, remark, payment_method, payment_status, delivery_point_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+8 hours'))`
    ).bind(
      orderNo, String(user.id), (body.customer || dbUser?.username || ''), (body.phone || dbUser?.phone || ''), body.address || '',
      'pending', total, deliveryFee, body.remark || '', paymentMethod, 'pending', pointId
    ).run()

    const orderId = result.meta.last_row_id
    for (const item of items) {
      await env.DB.prepare('INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)')
        .bind(orderId, item.product_id, item.quantity, item.price).run()
    }

    const order = await env.DB.prepare(
      `SELECT o.*, p.name as delivery_point_name FROM orders o LEFT JOIN delivery_points p ON o.delivery_point_id = p.id WHERE o.id = ?`
    ).bind(orderId).first()
    return json({ ...order, items }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}
