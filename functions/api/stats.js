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
  const fee = point?.fee ?? 10
  const rateRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'exchange_rate'").first()
  const exchangeRate = Number(rateRow?.value || 1.2)
  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) return json({ error: '汇率配置有误' }, 500)

  // 统计今天该配送点已确认收款的订单总额
  let sql = `
    SELECT
      COALESCE(SUM(total), 0) as confirmed_total,
      COUNT(*) as confirmed_count
    FROM orders
    WHERE payment_status = 'confirmed'
      AND date(created_at) = date('now', '+8 hours')
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
    threshold: threshold / exchangeRate,
    remaining: Math.max(0, threshold / exchangeRate - total),
    reached: total * exchangeRate >= threshold,
    delivery_fee: fee / exchangeRate,
    point_name: point?.name || null
  })
}
