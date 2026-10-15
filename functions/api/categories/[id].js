import { json, cors, readBody, getAdminUser } from '../_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  const id = context.params.id
  if (request.method === 'OPTIONS') return cors()

  if (request.method === 'GET') {
    const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
    if (!category) return json({ error: 'not found' }, 404)
    return json(category)
  }

  if (request.method === 'PUT') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const body = await readBody(request)
    await env.DB.prepare('UPDATE categories SET name=?, icon=?, sort=? WHERE id=?')
      .bind(body.name, body.icon || '', body.sort || 0, id).run()
    const category = await env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id).first()
    return json(category)
  }

  if (request.method === 'DELETE') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const used = await env.DB.prepare('SELECT id FROM products WHERE category_id = ? LIMIT 1').bind(id).first()
    if (used) return json({ error: '该分类仍有商品，请先调整商品分类' }, 409)
    await env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
    return json({ message: 'deleted' })
  }

  return json({ error: 'Method not allowed' }, 405)
}
