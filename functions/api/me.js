import { getAuthUser, json, cors } from './_utils.js'

export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return cors()
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405)

  const user = await getAuthUser(request, env)
  if (!user) return json({ error: '未登录' }, 401)

  return json({ id: user.id, username: user.username, phone: user.phone, address_storage_key: user.address_storage_key || user.username })
}
