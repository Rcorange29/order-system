import { verifyPassword, generateToken, json, cors, readBody } from './_utils.js'
import { normalizePhone, phoneAliases, phoneDigitsSql } from './_phone.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  if (!body.phone || !body.password) return json({ error: '请输入手机号和密码' }, 400)
  const phoneKey = normalizePhone(body.phone)
  if (!phoneKey) return json({ error: '仅支持香港手机号：请输入4至9开头的8位号码，可加+852区号' }, 400)

  const aliases = phoneAliases(phoneKey)
  const { results: candidates } = await env.DB.prepare(`SELECT * FROM users WHERE username = ? OR legacy_login_phone = ? OR ${phoneDigitsSql} IN (${aliases.map(() => '?').join(', ')}) LIMIT 20`)
    .bind(`+${phoneKey}`, `+${phoneKey}`, ...aliases).all()
  const matches = []
  for (const candidate of candidates) {
    if (await verifyPassword(body.password, candidate.password_hash)) matches.push(candidate)
  }
  if (matches.length !== 1) return json({ error: matches.length ? '该手机号对应多个旧账号，请联系老板协助处理' : '手机号或密码错误' }, 401)

  const user = matches[0]
  if (user.account_status === 'disabled') return json({ error: '账号已停用，请联系老板处理', code: 'ACCOUNT_DISABLED' }, 403)

  const token = generateToken()
  const saved = await env.DB.prepare("UPDATE users SET token = ? WHERE id = ? AND password_hash = ? AND account_status = 'active'").bind(token, user.id, user.password_hash).run()
  if (saved.meta?.changes === 0) return json({ error: '账号信息已更新，请重新登录', code: 'ACCOUNT_UPDATED' }, 409)

  return json({ token, username: user.username, phone: user.phone, address_storage_key: user.address_storage_key || user.username })
}
