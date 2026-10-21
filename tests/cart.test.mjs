import test from 'node:test'
import assert from 'node:assert/strict'
import { storage } from '../src/storage.js'
import { readSavedCarts, saveCarts, sanitizeCart, adoptGuestCart } from '../src/client/cart.js'

test('cart survives reload with variants and quantities, without saving stale prices', () => {
  const carts = { guest: { '95': 2, '13::1条': 3 }, 'user:1': { '20': 1 } }
  saveCarts(carts)
  assert.deepEqual(readSavedCarts(), carts)
  assert.deepEqual(readSavedCarts()['user:1'], { '20': 1 })
  assert.equal(readSavedCarts()['user:2'], undefined)
  storage.removeItem('jenny_cart_v1')
})

test('guest selection moves to signed-in account once and leaves other accounts untouched', () => {
  const previous = { guest: { '13::1条': 2, '95': 1 }, 'user:1': { '13::1条': 98 }, 'user:2': { '20': 4 } }
  const next = adoptGuestCart(previous, { id: 1 })
  assert.deepEqual(next['user:1'], { '13::1条': 99, '95': 1 })
  assert.deepEqual(next.guest, {})
  assert.deepEqual(next['user:2'], previous['user:2'])
  assert.deepEqual(adoptGuestCart(next, { id: 1 }), next)
  // Successful checkout clears only the current account's saved cart.
  saveCarts({ ...next, 'user:1': {} })
  assert.deepEqual(readSavedCarts()['user:1'], {})
  assert.deepEqual(readSavedCarts()['user:2'], { '20': 4 })
  storage.removeItem('jenny_cart_v1')
})

test('malformed saved carts and invalid quantities cannot break startup', () => {
  for (const value of ['{', 'null', '[]', '{"version":1,"carts":[]}']) {
    storage.setItem('jenny_cart_v1', value)
    assert.deepEqual(readSavedCarts(), {})
  }
  assert.deepEqual(sanitizeCart({ '95': 1, '13::1条': 2, '20': -1, '21': 100, '22': 1.5, '23': '2', invalid: 1 }), { '95': 1, '13::1条': 2 })
  assert.deepEqual(sanitizeCart([]), {})
  storage.removeItem('jenny_cart_v1')
})
