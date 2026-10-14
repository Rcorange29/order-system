import { json, cors, readBody, getAdminUser } from './_utils'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()

  if (request.method === 'GET') {
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('category_id')
    const keyword = url.searchParams.get('keyword')
    let sql = `SELECT p.*, c.name as category_name, c.icon as category_icon FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1`
    const params = []
    if (categoryId) { sql += ' AND p.category_id = ?'; params.push(categoryId) }
    if (keyword) { sql += ' AND p.name LIKE ?'; params.push('%' + keyword + '%') }
    sql += ' ORDER BY p.sort_order ASC, p.id DESC'
    const { results } = await env.DB.prepare(sql).bind(...params).all()
    const products = results.map(p => ({
      ...p,
      is_new: !!p.is_new,
      is_hot: !!p.is_hot,
      is_active: p.is_active !== 0,
      category: p.category_name ? { id: p.category_id, name: p.category_name, icon: p.category_icon } : null
    }))
    return json(products)
  }

  if (request.method === 'POST') {
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '需要管理员权限' }, 403)
    const body = await readBody(request)
    const result = await env.DB.prepare(
      'INSERT INTO products (name, price, original_price, image, category_id, stock, is_new, is_hot, description, unit, variants, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      body.name || '', body.price || 0, body.original_price || 0, body.image || '',
      body.category_id || null, body.stock || 0, body.is_new ? 1 : 0, body.is_hot ? 1 : 0, body.description || '', body.unit || '/斤', body.variants || null, body.is_active !== false ? 1 : 0
    ).run()
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(result.meta.last_row_id).first()
    return json({ ...product, is_new: !!product.is_new, is_hot: !!product.is_hot }, 201)
  }

  return json({ error: 'Method not allowed' }, 405)
}
