export function normalizePhone(value) {
  const raw = String(value ?? '').trim().replace(/[\s()-]/g, '')
  const match = raw.match(/^(?:\+?852)?([4-9]\d{7})$/)
  return match ? `852${match[1]}` : null
}

export function phoneAliases(phoneKey) {
  if (!phoneKey) return []
  if (phoneKey.startsWith('852') && phoneKey.length === 11) return [phoneKey, phoneKey.slice(3)]
  return [phoneKey]
}

export const phoneDigitsSql = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '')"
