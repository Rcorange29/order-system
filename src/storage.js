// Browsers can deny storage access; malformed saved data must not stop rendering.
const memory = new Map()
export const storage = {
  getItem(key) {
    try { return window.localStorage.getItem(key) ?? memory.get(key) ?? null }
    catch { return memory.get(key) ?? null }
  },
  setItem(key, value) {
    memory.set(key, String(value))
    try { window.localStorage.setItem(key, String(value)) } catch {}
  },
  removeItem(key) {
    memory.delete(key)
    try { window.localStorage.removeItem(key) } catch {}
  }
}
export function readStoredArray(key) {
  try {
    const value = JSON.parse(storage.getItem(key) || '[]')
    return Array.isArray(value) ? value : []
  } catch { return [] }
}
