import { getAdminUser, json, cors, readBody } from './_utils.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method === 'GET') {
    const url = new URL(request.url)
    const admin = url.searchParams.get('all') === '1' ? await getAdminUser(request, env) : null
    if (url.searchParams.get('all') === '1' && !admin) return json({ error: '需要管理员权限' }, 403)
    const pointId = Number(url.searchParams.get('point')) || 0
    const sql = admin
      ? 'SELECT * FROM announcements ORDER BY id DESC LIMIT 100'
      : 'SELECT id, delivery_point_id, title, content, created_at FROM announcements WHERE is_published = 1 AND (delivery_point_id IS NULL OR delivery_point_id = ?) ORDER BY id DESC LIMIT 20'
    const { results } = admin ? await env.DB.prepare(sql).all() : await env.DB.prepare(sql).bind(pointId).all()
    return json(results)
  }
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)
  const body = await readBody(request)
  if (request.method === 'POST' || request.method === 'PUT') {
    const title = String(body.title || '').trim()
    const content = String(body.content || '').trim()
    const pointId = body.delivery_point_id ? Number(body.delivery_point_id) : null
    if (!title || title.length > 100 || !content || content.length > 2000 || (pointId !== null && (!Number.isInteger(pointId) || pointId < 1))) {
      return json({ error: '请填写标题和公告内容' }, 400)
    }
    if (pointId !== null) {
      const point = await env.DB.prepare('SELECT id FROM delivery_points WHERE id = ?').bind(pointId).first()
      if (!point) return json({ error: '服务点不存在' }, 400)
    }
    if (request.method === 'POST') {
      await env.DB.prepare('INSERT INTO announcements (delivery_point_id, title, content, is_published) VALUES (?, ?, ?, ?)')
        .bind(pointId, title, content, body.is_published === false ? 0 : 1).run()
    } else {
      const id = Number(body.id)
      if (!Number.isInteger(id) || id < 1) return json({ error: '公告编号无效' }, 400)
      await env.DB.prepare('UPDATE announcements SET delivery_point_id = ?, title = ?, content = ?, is_published = ? WHERE id = ?')
        .bind(pointId, title, content, body.is_published === false ? 0 : 1, id).run()
    }
    return json({ ok: true })
  }
  if (request.method === 'DELETE') {
    const id = Number(body.id)
    if (!Number.isInteger(id) || id < 1) return json({ error: '公告编号无效' }, 400)
    await env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(id).run()
    return json({ ok: true })
  }
  return json({ error: 'Method not allowed' }, 405)
}
