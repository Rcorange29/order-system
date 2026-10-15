import { getAdminUser, json, cors, readBody } from '../_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed' }, 405)
  if (!await getAdminUser(request, env)) return json({ error: '需要管理员权限' }, 403)
  if (request.method === 'GET') {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key='exchange_rate'").first()
    return json({ exchange_rate: Number(row?.value || 1.2) })
  }
  const body = await readBody(request)
  const rate = Number(body.exchange_rate)
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) return json({ error: '汇率必须大于0且不超过100' }, 400)
  await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('exchange_rate', ?)").bind(String(rate)).run()
  return json({ ok: true, exchange_rate: rate })
}
