// Login identifiers and contact details are deliberately independent.
export function normalizeContactPhone(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim().replace(/[\s()-]/g, '')
  if (!raw) return ''
  let match = raw.match(/^(?:\+?852)?([4-9]\d{7})$/)
  if (match) return `+852${match[1]}`
  match = raw.match(/^(?:\+?86)?(1[3-9]\d{9})$/)
  return match ? `+86${match[1]}` : null
}
export function normalizeWhatsapp(value) {
  if (typeof value !== 'string') return null
  const raw = value.trim().replace(/[\s()-]/g, '')
  if (!raw) return ''
  let match = raw.match(/^(?:\+?852)?([4-9]\d{7})$/)
  if (match) return `+852${match[1]}`
  match = raw.match(/^(?:\+?86)?(1[3-9]\d{9})$/)
  return match ? `+86${match[1]}` : null
}
export function validWechatId(value) {
  return typeof value === 'string' && (!value || /^[A-Za-z][A-Za-z0-9_-]{5,19}$/.test(value))
}
export function validateProfile(body) {
  if (typeof body.username !== 'string' || !/^[A-Za-z0-9_\u4e00-\u9fff.@+-]{2,40}$/.test(body.username.trim())) return { error: '用户名需为2–40位中文、字母、数字或 _ . @ + -，不能含空格', code: 'INVALID_USERNAME' }
  if (typeof body.wechat_id !== 'string' || typeof body.whatsapp !== 'string' || typeof body.phone !== 'string') return { error: '请填写完整的联系方式字段，未使用的可留空', code: 'INVALID_CONTACT_FIELDS' }
  const wechat_id = body.wechat_id.trim()
  if (!validWechatId(wechat_id)) return { error: '微信ID需为6–20位，以字母开头，只含字母、数字、下划线或短横线', code: 'INVALID_WECHAT' }
  const whatsapp = normalizeWhatsapp(body.whatsapp)
  const phone = normalizeContactPhone(body.phone)
  if (whatsapp === null || phone === null) return { error: '号码仅支持香港8位手机号码（+852）', code: 'INVALID_PHONE' }
  if (!wechat_id && !whatsapp && !phone) return { error: '微信ID、WhatsApp、手机号至少填写一项', code: 'CONTACT_REQUIRED' }
  return { value: { username: body.username.trim().toLowerCase(), wechat_id, whatsapp, phone } }
}
