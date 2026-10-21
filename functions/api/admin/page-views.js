import { json, cors, getAdminUser } from '../_utils.js'

// 浏览量统计（仅管理员）：今日、累计、近 14 天
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)

  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
  const todayRow = await env.DB.prepare('SELECT count FROM page_views WHERE view_date = ?').bind(today).first()
  const totalRow = await env.DB.prepare('SELECT COALESCE(SUM(count), 0) AS total FROM page_views').first()
  const { results } = await env.DB.prepare('SELECT view_date, count FROM page_views ORDER BY view_date DESC LIMIT 14').all()
  return json({ today: todayRow?.count || 0, total: totalRow.total, recent: results.reverse() })
}
