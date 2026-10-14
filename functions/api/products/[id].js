import { json, cors, readBody, getAdminUser } from '../_utils'

export async function onRequest(context) {
  const { request, env } = context
  const id = context.params.id
  if (request.method === 'OPTIONS') return cors()

  if (request.method === 'GET') {
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
    if (!product) return json({ error: 'not found' }, 404)
    return json({ ...product, is_new: !!product.is_new, is_hot: !!product.is_hot })
  }

  if (request.method === 'PUT') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const body = await readBody(request)
    await env.DB.prepare(
      'UPDATE products SET name=?, price=?, original_price=?, image=?, category_id=?, stock=?, is_new=?, is_hot=?, description=?, unit=? WHERE id=?'
    ).bind(
      body.name, body.price, body.original_price, body.image, body.category_id,
      body.stock, body.is_new ? 1 : 0, body.is_hot ? 1 : 0, body.description || '', body.unit || '/斤', id
    ).run()
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
    return json({ ...product, is_new: !!product.is_new, is_hot: !!product.is_hot })
  }

  if (request.method === 'DELETE') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id).run()
    return json({ message: 'deleted' })
  }

  return json({ error: 'Method not allowed' }, 405)
}
