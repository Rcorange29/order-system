export async function onRequest(context) {
  const { env } = context
  try {
    const row = await env.DB.prepare("SELECT value FROM settings WHERE key='exchange_rate'").first()
    return new Response(JSON.stringify({ exchange_rate: parseFloat(row?.value || '1.2') }), { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  } catch(e) {
    return new Response(JSON.stringify({ exchange_rate: 1.2 }), { headers: { 'Content-Type': 'application/json' } })
  }
}
