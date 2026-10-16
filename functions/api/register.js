import { hashPassword, generateToken, json, cors, readBody } from './_utils.js'
import { normalizePhone, phoneAliases, phoneDigitsSql } from './_phone.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  if (!body.password) return json({ error: '请填写密码' }, 400)
  const phoneKey = normalizePhone(body.phone)
  if (!phoneKey) return json({ error: '请输入香港8位、内地11位，或带国际区号的手机号' }, 400)

  const aliases = phoneAliases(phoneKey)
  const existing = await env.DB.prepare(`SELECT id FROM users WHERE username = ? OR ${phoneDigitsSql} IN (${aliases.map(() => '?').join(', ')}) LIMIT 1`)
    .bind(`+${phoneKey}`, ...aliases).first()
  if (existing) return json({ error: '该手机号已注册，请直接登录；如不是你的账号，请联系老板' }, 409)

  const passwordHash = await hashPassword(body.password)
  const token = generateToken()
  try {
    await env.DB.prepare('INSERT INTO users (username, password_hash, phone, token) VALUES (?, ?, ?, ?)')
      .bind(`+${phoneKey}`, passwordHash, `+${phoneKey}`, token).run()
  } catch {
    return json({ error: '该手机号已注册，请直接登录；如不是你的账号，请联系老板' }, 409)
  }

  return json({ token, username: `+${phoneKey}`, phone: `+${phoneKey}` }, 201)
}
