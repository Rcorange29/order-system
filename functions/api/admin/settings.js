export async function onRequest(context) {
  const { request, env } = context
  if (request.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } })
  try {
    const auth = request.headers.get('Authorization')
    if (!auth || !auth.startsWith('Bearer ')) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    const token = auth.slice(7)
    const u = await env.DB.prepare("SELECT id FROM users WHERE token=? AND role='admin'").bind(token).first()
    if (!u) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    if (request.method === 'GET') {
      const row = await env.DB.prepare("SELECT value FROM settings WHERE key='exchange_rate'").first()
      return new Response(JSON.stringify({ exchange_rate: parseFloat(row?.value || '1.2') }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
    }
    const body = await request.json()
    await env.DB.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('exchange_rate', ?)").bind(String(body.exchange_rate)).run()
    return new Response(JSON.stringify({ ok: true, exchange_rate: body.exchange_rate }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
