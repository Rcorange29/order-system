// 共享工具函数

// 从 Authorization header 解析用户
export async function getAuthUser(request, env) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const stmt = env.DB.prepare('SELECT * FROM users WHERE token = ?')
  const user = await stmt.bind(token).first()
  return user || null
}

// 解析并验证管理员
export async function getAdminUser(request, env) {
  const user = await getAuthUser(request, env)
  if (!user || !user.is_admin) return null
  return user
}

// 密码哈希（PBKDF2 via Web Crypto）
export async function hashPassword(password) {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  return btoa(String.fromCharCode(...salt)) + '$' + btoa(String.fromCharCode(...new Uint8Array(hash)))
}

export async function verifyPassword(password, stored) {
  const [saltB64, hashB64] = stored.split('$')
  const salt = Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  )
  const computed = btoa(String.fromCharCode(...new Uint8Array(hash)))
  return computed === hashB64
}

export function generateToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }
  })
}

export function cors() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' } })
}

export async function readBody(request) {
  return await request.json().catch(() => ({}))
}
