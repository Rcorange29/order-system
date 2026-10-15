import { cors, getAdminUser, json, readBody } from '../_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)
  if (request.method === 'GET') {
    const campaigns = await env.DB.prepare('SELECT c.*, COUNT(g.id) AS grant_count FROM coupon_campaigns c LEFT JOIN coupon_grants g ON g.campaign_id = c.id GROUP BY c.id ORDER BY c.id DESC').all()
    return json(campaigns.results)
  }
  const body = await readBody(request)
  if (request.method === 'POST') {
    const title = String(body.title || '').trim()
    const details = String(body.details || '').trim()
    if (!title || title.length > 100 || details.length > 2000) return json({ error: '请填写活动名称，内容不超过 2000 字' }, 400)
    const minSpend = Number(body.min_spend)
    const discount = Number(body.discount_amount)
    if (!Number.isFinite(minSpend) || !Number.isFinite(discount) || minSpend <= 0 || discount <= 0 || discount >= minSpend || !Number.isInteger(minSpend * 100) || !Number.isInteger(discount * 100)) return json({ error: '请填写有效的满减金额' }, 400)
    const result = await env.DB.prepare('INSERT INTO coupon_campaigns (title, details, min_spend, discount_amount, is_published) VALUES (?, ?, ?, ?, ?)').bind(title, details, minSpend, discount, body.is_published ? 1 : 0).run()
    return json({ id: result.meta.last_row_id }, 201)
  }
  if (request.method === 'PUT') {
    const id = Number(body.id)
    const existing = await env.DB.prepare('SELECT id FROM coupon_campaigns WHERE id = ?').bind(id).first()
    if (!existing) return json({ error: '活动不存在' }, 404)
    const title = String(body.title || '').trim()
    const details = String(body.details || '').trim()
    if (!title || title.length > 100 || details.length > 2000) return json({ error: '请填写活动名称，内容不超过 2000 字' }, 400)
    const minSpend = Number(body.min_spend)
    const discount = Number(body.discount_amount)
    if (!Number.isFinite(minSpend) || !Number.isFinite(discount) || minSpend <= 0 || discount <= 0 || discount >= minSpend || !Number.isInteger(minSpend * 100) || !Number.isInteger(discount * 100)) return json({ error: '请填写有效的满减金额' }, 400)
    await env.DB.prepare('UPDATE coupon_campaigns SET title = ?, details = ?, min_spend = ?, discount_amount = ?, is_published = ? WHERE id = ?').bind(title, details, minSpend, discount, body.is_published ? 1 : 0, id).run()
    return json({ success: true })
  }
  if (request.method === 'PATCH') {
    const campaignId = Number(body.campaign_id)
    const campaign = await env.DB.prepare('SELECT id FROM coupon_campaigns WHERE id = ?').bind(campaignId).first()
    if (!campaign) return json({ error: '活动不存在' }, 404)
    const userId = Number(body.user_id)
    if (!Number.isInteger(userId) || userId <= 0) return json({ error: '请选择用户' }, 400)
    const user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first()
    if (!user) return json({ error: '用户不存在' }, 404)
    const result = await env.DB.prepare('INSERT OR IGNORE INTO coupon_grants (campaign_id, user_id, granted_by) VALUES (?, ?, ?)').bind(campaignId, userId, admin.id).run()
    return json({ success: true, already_granted: result.meta.changes === 0 })
  }
  return json({ error: 'Method not allowed' }, 405)
}
