import { getAdminUser, json, cors, readBody } from '../_utils.js'
import { hongKongToday, validDeliveryDate } from '../_delivery-schedule.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  if (!await getAdminUser(request, env)) return json({ error: '需要管理员权限' }, 403)
  const body = await readBody(request) || {}
  const id = Number(body.delivery_point_id)
  if (!Number.isSafeInteger(id) || id < 1 || typeof body.group_formed !== 'boolean') {
    return json({ error: '请选择服务点和有效状态' }, 400)
  }
  const point = await env.DB.prepare('SELECT id, threshold, is_active FROM delivery_points WHERE id = ?').bind(id).first()
  if (!point || !point.is_active) return json({ error: '服务点不存在或已停用' }, 404)
  let date = ''
  if (body.group_formed) {
    if (!validDeliveryDate(body.delivery_date) || body.delivery_date < hongKongToday()) {
      return json({ error: '请选择今天或以后的有效配送日期（香港时间）' }, 400)
    }
    const summary = await env.DB.prepare("SELECT COALESCE(SUM(total), 0) AS confirmed_total FROM orders WHERE delivery_point_id = ? AND payment_status = 'confirmed' AND status = 'paid'").bind(id).first()
    if (Number(summary?.confirmed_total || 0) < Number(point.threshold || 1000)) {
      return json({ error: '该服务点尚未达到起送金额，请先核对已确认的订单' }, 409)
    }
    date = body.delivery_date
  }
  await env.DB.prepare("UPDATE delivery_points SET group_formed = ?, delivery_date = ? WHERE id = ? AND is_active = 1")
    .bind(body.group_formed ? 1 : 0, date, id).run()
  return json({ ok: true, delivery_point_id: id, group_formed: body.group_formed, delivery_date: date })
}
