import { getAuthUser, json, cors, readBody } from '../_utils.js'

const MAX_BYTES = 1024 * 1024
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)
  if (Number(request.headers.get('Content-Length')) > MAX_BYTES * 1.4 + 1024) {
    return json({ error: '图片不能超过1MB' }, 413)
  }

  const body = await readBody(request)
  const match = typeof body.screenshot === 'string' && body.screenshot.match(IMAGE_DATA_URL)
  if (!body.order_id || !match) return json({ error: '请上传 PNG、JPEG 或 WebP 图片' }, 400)
  const encoded = match[2]
  const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
  if (bytes < 1 || bytes > MAX_BYTES) return json({ error: '图片不能超过1MB' }, 413)
  let image
  try { image = atob(encoded) } catch { return json({ error: '图片内容无效' }, 400) }
  const signature = match[1] === 'png'
    ? image.startsWith('\x89PNG\r\n\x1a\n') && image.length > 24
    : match[1] === 'jpeg'
      ? image.startsWith('\xff\xd8\xff') && image.endsWith('\xff\xd9')
      : image.startsWith('RIFF') && image.slice(8, 12) === 'WEBP' && image.length > 16
  if (!signature) return json({ error: '图片内容无效' }, 400)

  const order = await env.DB.prepare('SELECT id, payment_method, payment_status, status FROM orders WHERE id = ? AND user_id = ?')
    .bind(body.order_id, String(user.id)).first()
  if (!order) return json({ error: '订单不存在' }, 404)
  if (order.payment_method === 'cash_on_delivery' || order.payment_status === 'confirmed' || order.payment_status === 'refunded' || order.status === 'cancelled') {
    return json({ error: '该订单不能上传付款凭证' }, 409)
  }
  await env.DB.prepare('UPDATE orders SET payment_screenshot = ? WHERE id = ?')
    .bind(body.screenshot, order.id).run()
  return json({ ok: true })
}
