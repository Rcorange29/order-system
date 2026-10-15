import { cors, getAdminUser, json, readBody } from '../_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)
  if (request.method === 'GET') {
    const claims = await env.DB.prepare("SELECT q.id, q.campaign_id, q.user_id, q.screenshot, q.status, q.admin_note, q.created_at, q.reviewed_at, u.username, u.phone, c.title FROM coupon_claims q JOIN users u ON u.id = q.user_id JOIN coupon_campaigns c ON c.id = q.campaign_id ORDER BY CASE q.status WHEN 'pending' THEN 0 ELSE 1 END, q.id DESC LIMIT 100").all()
    return json(claims.results)
  }
  if (request.method !== 'PUT') return json({ error: 'Method not allowed' }, 405)
  const body = await readBody(request)
  const id = Number(body.id)
  const decision = body.decision
  if (!Number.isInteger(id) || !['approve', 'reject'].includes(decision)) return json({ error: '请求无效' }, 400)
  const claim = await env.DB.prepare('SELECT id, campaign_id, user_id, status FROM coupon_claims WHERE id = ?').bind(id).first()
  if (!claim) return json({ error: '申请不存在' }, 404)
  if (claim.status !== 'pending') return json({ error: '申请已处理' }, 409)
  const status = decision === 'approve' ? 'approved' : 'rejected'
  if (status === 'approved') {
    await env.DB.prepare('INSERT OR IGNORE INTO coupon_grants (campaign_id, user_id, granted_by) VALUES (?, ?, ?)').bind(claim.campaign_id, claim.user_id, admin.id).run()
  }
  await env.DB.prepare("UPDATE coupon_claims SET status = ?, admin_note = ?, reviewed_at = datetime('now', '+8 hours'), reviewed_by = ? WHERE id = ? AND status = 'pending'").bind(status, String(body.note || '').slice(0, 500), admin.id, id).run()
  return json({ success: true })
}
