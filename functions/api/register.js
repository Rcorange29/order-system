import { hashPassword, generateToken, json, cors, readBody } from './_utils.js'
import { validateProfile } from './_contacts.js'
import { publicAccount } from './_account.js'

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  const body = await readBody(request) || {}
  const profile = validateProfile(body)
  if (profile.error) return json(profile, 400)
  if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 128) return json({ code: 'INVALID_PASSWORD' }, 400)
  const { username, phone, wechat_id, whatsapp } = profile.value
  if (await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(username).first()) return json({ code: 'USERNAME_TAKEN' }, 409)
  const passwordHash = await hashPassword(body.password)
  const token = generateToken()
  try {
    const result = await env.DB.prepare('INSERT INTO users (username, password_hash, phone, wechat_id, whatsapp, token, address_storage_key) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(username, passwordHash, phone, wechat_id, whatsapp, token, username).run()
    return json({ ...publicAccount({ id: result.meta?.last_row_id, ...profile.value }), token }, 201)
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) return json({ code: 'USERNAME_TAKEN' }, 409)
    throw error
  }
}
