import { json, cors, getAdminUser } from '../_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)

  // Get all users with their order count and total spent
  const users = await env.DB.prepare(`
    SELECT u.id, u.username, u.phone, u.created_at,
      COUNT(o.id) as order_count,
      COALESCE(SUM(CASE WHEN o.payment_status = 'confirmed' THEN o.total + COALESCE(o.delivery_fee, 0) ELSE 0 END), 0) as total_spent,
      MAX(o.created_at) as last_order_at
    FROM users u
    LEFT JOIN orders o ON u.id = o.user_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all()

  return json(users.results)
}
