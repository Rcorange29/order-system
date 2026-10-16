import { verifyPassword, generateToken, json, cors, readBody } from './_utils.js'
import { normalizePhone, phoneAliases, phoneDigitsSql } from './_phone.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  if (!body.phone || !body.password) return json({ error: '请输入手机号和密码' }, 400)
  const phoneKey = normalizePhone(body.phone)
  if (!phoneKey) return json({ error: '手机号格式不正确' }, 400)

  const aliases = phoneAliases(phoneKey)
  const { results: candidates } = await env.DB.prepare(`SELECT * FROM users WHERE username = ? OR ${phoneDigitsSql} IN (${aliases.map(() => '?').join(', ')}) LIMIT 20`)
    .bind(`+${phoneKey}`, ...aliases).all()
  const matches = []
  for (const candidate of candidates) {
    if (await verifyPassword(body.password, candidate.password_hash)) matches.push(candidate)
  }
  if (matches.length !== 1) return json({ error: matches.length ? '该手机号对应多个旧账号，请联系老板协助处理' : '手机号或密码错误' }, 401)

  const user = matches[0]

  const token = generateToken()
  await env.DB.prepare('UPDATE users SET token = ? WHERE id = ?').bind(token, user.id).run()

  return json({ token, username: user.username, phone: user.phone })
}
