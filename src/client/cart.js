import { useEffect, useState } from 'react'
import { storage } from '../storage.js'

const CART_STORAGE_KEY = 'jenny_cart_v1'
const ownerKey = user => user?.id ? `user:${user.id}` : 'guest'

export function sanitizeCart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, quantity]) =>
    /^[1-9]\d*(?:::.+)?$/.test(key) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 99
  ).slice(0, 100))
}

export function readSavedCarts() {
  try {
    const saved = JSON.parse(storage.getItem(CART_STORAGE_KEY) || 'null')
    if (saved?.version !== 1 || !saved.carts || typeof saved.carts !== 'object' || Array.isArray(saved.carts)) return {}
    return Object.fromEntries(Object.entries(saved.carts)
      .filter(([key]) => key === 'guest' || /^user:[1-9]\d*$/.test(key))
      .map(([key, items]) => [key, sanitizeCart(items)]))
  } catch { return {} }
}

export function saveCarts(carts) {
  storage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, carts }))
}

export function adoptGuestCart(carts, user) {
  const key = ownerKey(user)
  const merged = { ...sanitizeCart(carts[key]) }
  for (const [item, quantity] of Object.entries(sanitizeCart(carts.guest))) {
    merged[item] = Math.min((merged[item] || 0) + quantity, 99)
  }
  return { ...carts, guest: {}, [key]: sanitizeCart(merged) }
}

export function usePersistentCart(user) {
  const [carts, setCarts] = useState(readSavedCarts)
  const key = ownerKey(user)
  useEffect(() => { saveCarts(carts) }, [carts])
  const setCart = update => setCarts(previous => {
    const current = previous[key] || {}
    return { ...previous, [key]: sanitizeCart(typeof update === 'function' ? update(current) : update) }
  })
  return {
    cart: carts[key] || {},
    setCart,
    adoptGuest: account => setCarts(previous => adoptGuestCart(previous, account)),
    clearGuest: () => setCarts(previous => ({ ...previous, guest: {} }))
  }
}
