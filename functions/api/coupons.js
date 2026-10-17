import { cors, getAuthUser, json, readBody } from './_utils.js'

const MAX_BYTES = 1024 * 1024
const IMAGE_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  const user = await getAuthUser(request, env)
  if (request.method === 'POST') {
    if (!user) return json({ error: '请先登录' }, 401)
    if (Number(request.headers.get('Content-Length')) > MAX_BYTES * 1.4 + 1024) return json({ error: '图片不能超过1MB' }, 413)
    const body = await readBody(request)
    const campaignId = Number(body.campaign_id)
    const campaign = await env.DB.prepare('SELECT id FROM coupon_campaigns WHERE id = ? AND is_published = 1').bind(campaignId).first()
    if (!campaign) return json({ error: '活动不存在' }, 404)
    const match = typeof body.screenshot === 'string' && body.screenshot.match(IMAGE_DATA_URL)
    if (!match) return json({ error: '请上传 PNG、JPEG 或 WebP 截图' }, 400)
    const encoded = match[2]
    const bytes = Math.floor(encoded.length * 3 / 4) - (encoded.endsWith('==') ? 2 : encoded.endsWith('=') ? 1 : 0)
    if (bytes < 1 || bytes > MAX_BYTES) return json({ error: '图片不能超过1MB' }, 413)
    let image
    try { image = atob(encoded) } catch { return json({ error: '图片内容无效' }, 400) }
    const valid = match[1] === 'png' ? image.startsWith('\x89PNG\r\n\x1a\n') && image.length > 24
      : match[1] === 'jpeg' ? image.startsWith('\xff\xd8\xff') && image.endsWith('\xff\xd9')
        : image.startsWith('RIFF') && image.slice(8, 12) === 'WEBP' && image.length > 16
    if (!valid) return json({ error: '图片内容无效' }, 400)
    const existing = await env.DB.prepare('SELECT id, status FROM coupon_claims WHERE campaign_id = ? AND user_id = ?').bind(campaignId, user.id).first()
    if (existing?.status === 'approved') return json({ error: '你已领取本活动优惠券' }, 409)
    if (existing?.status === 'pending') return json({ error: '截图正在审核中' }, 409)
    if (existing) {
      await env.DB.prepare("UPDATE coupon_claims SET screenshot = ?, status = 'pending', admin_note = '', created_at = datetime('now', '+8 hours'), reviewed_at = NULL, reviewed_by = NULL WHERE id = ?").bind(body.screenshot, existing.id).run()
    } else {
      await env.DB.prepare('INSERT INTO coupon_claims (campaign_id, user_id, screenshot) VALUES (?, ?, ?)').bind(campaignId, user.id, body.screenshot).run()
    }
    return json({ success: true }, 201)
  }
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  const campaigns = await env.DB.prepare('SELECT id, title, details, title_zh_hk, title_en, details_zh_hk, details_en, min_spend, discount_amount, created_at FROM coupon_campaigns WHERE is_published = 1 ORDER BY id DESC').all()
  let grants = { results: [] }
  let claims = { results: [] }
  if (user) {
    grants = await env.DB.prepare('SELECT g.id, g.granted_at, g.used_order_no, c.id AS campaign_id, c.title, c.details, c.title_zh_hk, c.title_en, c.details_zh_hk, c.details_en, c.min_spend, c.discount_amount FROM coupon_grants g JOIN coupon_campaigns c ON c.id = g.campaign_id WHERE g.user_id = ? ORDER BY g.id DESC').bind(user.id).all()
    claims = await env.DB.prepare('SELECT campaign_id, status, admin_note, created_at FROM coupon_claims WHERE user_id = ?').bind(user.id).all()
  }
  return json({ campaigns: campaigns.results, grants: grants.results, claims: claims.results })
}
