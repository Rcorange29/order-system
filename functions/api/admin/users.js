import { json, cors, getAdminUser } from '../_utils.js'
import { userSummarySql } from './_users.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)
  if (!await getAdminUser(request, env)) return json({ error: '需要管理员权限' }, 403)
  const { results } = await env.DB.prepare(`${userSummarySql} GROUP BY u.id ORDER BY u.created_at DESC, u.id DESC`).all()
  return json(results)
}
