import { json, cors, readBody } from './_utils.js'

// 浏览量统计：页面打开时静默上报一次（无需登录）。按香港时区（UTC+8）记日期。
// visitor=1 表示该设备当日首次访问（访客数 UV）；其余只累计打开次数（PV）。
export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const body = await readBody(request) || {}
  const visitor = body.visitor === 1 ? 1 : 0
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
  await env.DB.prepare('INSERT INTO page_views (view_date, count, visitors) VALUES (?, 1, ?) ON CONFLICT(view_date) DO UPDATE SET count = count + 1, visitors = visitors + ?')
    .bind(today, visitor, visitor).run()
  return json({ ok: true })
}
