import { json, cors, readBody, getAdminUser } from './_utils'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()

  if (request.method === 'GET') {
    const { results } = await env.DB.prepare('SELECT * FROM categories ORDER BY sort ASC').all()
    return json(results)
  }

  if (request.method === 'POST') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const body = await readBody(request)
    const result = await env.DB.prepare('INSERT INTO categories (name, icon, sort) VALUES (?, ?, ?)')
      .bind(body.name || '', body.icon || '', body.sort || 0).run()
    const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(result.meta.last_row_id).first()
    return json(category, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}
