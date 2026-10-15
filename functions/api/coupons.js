import { cors, getAuthUser, json } from './_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  const user = await getAuthUser(request, env)
  const campaigns = await env.DB.prepare('SELECT id, title, details, created_at FROM coupon_campaigns WHERE is_published = 1 ORDER BY id DESC').all()
  let grants = { results: [] }
  if (user) {
    grants = await env.DB.prepare('SELECT g.id, g.granted_at, c.id AS campaign_id, c.title, c.details FROM coupon_grants g JOIN coupon_campaigns c ON c.id = g.campaign_id WHERE g.user_id = ? ORDER BY g.id DESC').bind(user.id).all()
  }
  return json({ campaigns: campaigns.results, grants: grants.results })
}
