import { json, cors } from './_utils'

export async function onRequest(context) {
  const { env } = context
  if (context.request.method === 'OPTIONS') return cors()

  // 创建配送点表
  await env.DB.prepare(`
    CREATE TABLE IF NOT EXISTS delivery_points (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      fee REAL DEFAULT 10,
      threshold REAL DEFAULT 1000,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1
    )
  `).run()

  // 插入默认配送点（如果表为空）
  const count = await env.DB.prepare('SELECT COUNT(*) as c FROM delivery_points').first()
  if (!count || count.c === 0) {
    const points = [
      ['日出康城站', '港铁日出康城站', 10, 1000, 1],
      ['科技大学', '香港科技大学', 10, 1000, 2],
      ['坑口地铁站', '港铁坑口站', 10, 1000, 3],
      ['宝琳站', '港铁宝琳站', 10, 1000, 4],
      ['将军澳站', '港铁将军澳站', 10, 1000, 5],
      ['调景岭站', '港铁调景岭站', 10, 1000, 6],
    ]
    for (const [name, addr, fee, th, sort] of points) {
      await env.DB.prepare(
        'INSERT INTO delivery_points (name, address, fee, threshold, sort_order) VALUES (?, ?, ?, ?, ?)'
      ).bind(name, addr, fee, th, sort).run()
    }
  }

  // orders表加delivery_point_id字段（如果不存在）
  try {
    await env.DB.prepare(`ALTER TABLE orders ADD COLUMN delivery_point_id INTEGER`).run()
  } catch (e) {
    // 字段已存在，忽略
  }

  // 科技大学起送门槛改为500
  await env.DB.prepare("UPDATE delivery_points SET threshold = 500 WHERE name = '科技大学'").run()

  return json({ message: 'setup done', points: count?.c || 0 })
}
