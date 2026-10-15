import { json, cors } from './_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()

  const url = new URL(request.url)
  const pointId = url.searchParams.get('point')

  // 查配送点信息
  let point = null
  if (pointId) {
    point = await env.DB.prepare('SELECT * FROM delivery_points WHERE id = ?').bind(pointId).first()
  }
  const threshold = point?.threshold ?? 1000

  // 统计尚待配送的已收款订单；凑单不按自然日清零，发货后退出进度。
  let sql = `
    SELECT
      COALESCE(SUM(total), 0) as confirmed_total,
      COUNT(*) as confirmed_count
    FROM orders
    WHERE payment_status = 'confirmed' AND status = 'paid'
  `
  const params = []
  if (pointId) {
    sql += ' AND delivery_point_id = ?'
    params.push(pointId)
  }
  const summary = await env.DB.prepare(sql).bind(...params).first()

  const total = summary?.confirmed_total || 0
  return json({
    confirmed_total: total,
    confirmed_count: summary?.confirmed_count || 0,
    threshold,
    remaining: Math.max(0, threshold - total),
    reached: total >= threshold,
    delivery_fee: 0,
    point_name: point?.name || null
  })
}
