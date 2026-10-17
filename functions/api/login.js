import { verifyPassword, generateToken, json, cors, readBody } from './_utils.js'
import { publicAccount } from './_account.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const body = await readBody(request) || {}
  if (typeof body.username !== 'string' || typeof body.password !== 'string' || !body.username.trim() || !body.password) return json({ code: 'CREDENTIALS_REQUIRED' }, 400)
  const user = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(body.username.trim().toLowerCase()).first()
  if (!user || !await verifyPassword(body.password, user.password_hash)) return json({ code: 'INVALID_CREDENTIALS' }, 401)
  if (user.account_status === 'disabled') return json({ code: 'ACCOUNT_DISABLED' }, 403)
  const token = generateToken()
  const saved = await env.DB.prepare("UPDATE users SET token = ? WHERE id = ? AND password_hash = ? AND account_status = 'active'").bind(token, user.id, user.password_hash).run()
  if (saved.meta?.changes === 0) return json({ code: 'ACCOUNT_UPDATED' }, 409)
  return json({ ...publicAccount(user), token })
}
