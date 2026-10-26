export const hongKongToday = (now = new Date()) => new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)

export function validDeliveryDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value
}

export const activeSchedule = (point, today = hongKongToday()) =>
  Boolean(point?.group_formed && validDeliveryDate(point.delivery_date) && point.delivery_date >= today)
