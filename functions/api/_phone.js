export function normalizePhone(value) {
  const raw = String(value ?? '').trim().replace(/[\s()-]/g, '')
  if (!/^\+?\d{8,15}$/.test(raw)) return null
  const digits = raw.replace(/^\+/, '')
  if (digits.length === 8) return `852${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `86${digits}`
  if (digits.length === 11 && digits.startsWith('852')) return digits
  if (digits.length === 13 && digits.startsWith('86')) return digits
  return raw.startsWith('+') ? digits : null
}

export function phoneAliases(phoneKey) {
  if (!phoneKey) return []
  if (phoneKey.startsWith('852') && phoneKey.length === 11) return [phoneKey, phoneKey.slice(3)]
  if (phoneKey.startsWith('86') && phoneKey.length === 13) return [phoneKey, phoneKey.slice(2)]
  return [phoneKey]
}

export const phoneDigitsSql = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', ''), '(', ''), ')', '')"
