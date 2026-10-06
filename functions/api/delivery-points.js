import { json, cors } from './_utils'

export async function onRequest(context) {
  const { env } = context
  if (context.request.method === 'OPTIONS') return cors()

  const { results } = await env.DB.prepare(
    'SELECT * FROM delivery_points WHERE is_active = 1 ORDER BY sort_order'
  ).all()

  return json(results || [])
}
