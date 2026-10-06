import { hashPassword, generateToken, json, cors, readBody } from './_utils'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  if (!body.username || !body.password) return json({ error: '账号和密码不能为空' }, 400)
  if (!body.phone || body.phone.length < 8) return json({ error: '请填写正确的手机号' }, 400)

  const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first()
  if (existing) return json({ error: '账号已存在' }, 409)

  const passwordHash = await hashPassword(body.password)
  const token = generateToken()
  const result = await env.DB.prepare('INSERT INTO users (username, password_hash, phone, token) VALUES (?, ?, ?, ?)')
    .bind(body.username, passwordHash, body.phone || '', token).run()

  return json({ token, username: body.username, phone: body.phone || '' }, 201)
}
