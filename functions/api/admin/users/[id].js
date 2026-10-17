import { json, cors, getAdminUser, readBody, hashPassword } from '../../_utils.js'
import { validateProfile } from '../../_contacts.js'
import { normalizePhone } from '../../_phone.js'
import { userSummarySql } from '../_users.js'

export async function onRequest({ request, env, params }) {
  if (request.method === 'OPTIONS') return cors()
  if (!['GET', 'PATCH'].includes(request.method)) return json({ error: 'Method not allowed' }, 405)
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '需要管理员权限' }, 403)
  const id = Number(params.id)
  if (!Number.isSafeInteger(id) || id < 1) return json({ error: '用户编号无效' }, 400)
  const user = await env.DB.prepare(`${userSummarySql} WHERE u.id = ? GROUP BY u.id`).bind(id).first()
  if (!user) return json({ error: '用户不存在' }, 404)

  if (request.method === 'GET') {
    const { results: orders } = await env.DB.prepare(`SELECT o.id, o.order_no, n.number AS public_no,
      o.status, o.payment_status, o.payment_currency, o.payment_amount, o.total, o.delivery_fee, o.created_at
      FROM orders o LEFT JOIN order_numbers n ON n.order_id = o.id WHERE o.user_id = ? ORDER BY o.id DESC`).bind(String(id)).all()
    return json({ user, orders })
  }

  const body = await readBody(request) || {}
  if (['is_admin', 'password_hash', 'token', 'legacy_login_phone', 'address_storage_key'].some(k => Object.hasOwn(body, k))) return json({ error: '不能通过用户管理修改权限或内部登录字段' }, 400)
  let statement, fields
  if (body.action === 'profile') {
    const validation = validateProfile(body)
    if (validation.error) return json({ error: validation.error }, 400)
    const next = validation.value
    if (user.username === 'jchengat' && next.username !== 'jchengat') return json({ error: '主管理员 jchengat 的账号名不能修改' }, 409)
    const duplicate = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND id <> ?').bind(next.username, id).first()
    if (duplicate) return json({ error: '该用户名已存在，请换一个' }, 409)
    fields = Object.keys(next).filter(key => next[key] !== user[key])
    statement = env.DB.prepare(`UPDATE users SET username = ?, wechat_id = ?, whatsapp = ?, phone = ?,
      address_storage_key = CASE WHEN address_storage_key = '' THEN username ELSE address_storage_key END,
      legacy_login_phone = CASE WHEN legacy_login_phone = '' THEN ? ELSE legacy_login_phone END,
      token = CASE WHEN username <> ? THEN NULL ELSE token END WHERE id = ?`)
      .bind(next.username, next.wechat_id, next.whatsapp, next.phone, (normalizePhone(user.phone) || normalizePhone(user.username)) ? '+' + (normalizePhone(user.phone) || normalizePhone(user.username)) : '', next.username, id)
  } else if (body.action === 'reset_password') {
    if (typeof body.new_password !== 'string' || body.new_password.length < 1 || body.new_password.length > 128) return json({ error: '新密码需为1–128个字符' }, 400)
    statement = env.DB.prepare('UPDATE users SET password_hash = ?, token = NULL WHERE id = ?').bind(await hashPassword(body.new_password), id)
    fields = ['password']
  } else if (body.action === 'status') {
    if (!['active', 'disabled'].includes(body.account_status)) return json({ error: '账号状态无效' }, 400)
    if (user.is_admin && body.account_status === 'disabled') return json({ error: '管理员账号不能在此禁用，避免失去后台访问权限' }, 409)
    statement = env.DB.prepare('UPDATE users SET account_status = ?, token = NULL WHERE id = ?').bind(body.account_status, id)
    fields = ['account_status']
  } else return json({ error: '操作无效' }, 400)

  try {
    await env.DB.batch([statement, env.DB.prepare('INSERT INTO admin_user_audit (admin_id, user_id, action, changed_fields) VALUES (?, ?, ?, ?)').bind(admin.id, id, body.action, JSON.stringify(fields))])
  } catch (error) {
    if (/UNIQUE constraint failed.*users.username/i.test(String(error))) return json({ error: '该用户名已存在，请换一个' }, 409)
    return json({ error: '保存失败，未完成本次修改，请稍后重试' }, 500)
  }
  const updated = await env.DB.prepare(`${userSummarySql} WHERE u.id = ? GROUP BY u.id`).bind(id).first()
  return json({ user: updated, session_revoked: body.action !== 'profile' || fields.includes('username') })
}
