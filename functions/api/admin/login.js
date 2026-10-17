import { verifyPassword, generateToken, json, cors, readBody } from '../_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const body = await readBody(request)
  if (!body.username || !body.password) return json({ error: '账号和密码不能为空' }, 400)

  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(body.username).first()
  if (!user) return json({ error: '账号或密码错误' }, 401)

  const valid = await verifyPassword(body.password, user.password_hash)
  if (!valid) return json({ error: '账号或密码错误' }, 401)

  if (!user.is_admin || user.account_status === 'disabled') return json({ error: '无管理员权限或账号已停用' }, 403)

  const token = generateToken()
  await env.DB.prepare('UPDATE users SET token = ? WHERE id = ?').bind(token, user.id).run()

  return json({ token, username: user.username, is_admin: true })
}
