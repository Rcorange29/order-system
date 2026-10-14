import { getAuthUser, json, cors, readBody } from '../_utils'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)

  const body = await readBody(request)
  const orderId = body.order_id
  const screenshot = body.screenshot // base64 data URL

  if (!orderId || !screenshot) return json({ error: '缺少参数' }, 400)

  // verify order belongs to user
  const order = await env.DB.prepare('SELECT id FROM orders WHERE id = ? AND user_id = ?')
    .bind(orderId, String(user.id)).first()
  if (!order) return json({ error: '订单不存在' }, 404)

  await env.DB.prepare('UPDATE orders SET payment_screenshot = ? WHERE id = ?')
    .bind(screenshot, orderId).run()

  return json({ ok: true })
}
