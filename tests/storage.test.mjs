import test from 'node:test'
import assert from 'node:assert/strict'
import { storage, readStoredArray } from '../src/storage.js'

test('corrupt or non-array saved data cannot break startup', () => {
  const data = new Map([['broken', '{'], ['object', '{}'], ['valid', '[1,2]']])
  globalThis.window = { localStorage: { getItem: key => data.get(key) ?? null } }
  assert.deepEqual(readStoredArray('broken'), [])
  assert.deepEqual(readStoredArray('object'), [])
  assert.deepEqual(readStoredArray('valid'), [1, 2])
  delete globalThis.window
})

test('denied browser storage falls back to memory for the current visit', () => {
  globalThis.window = Object.defineProperty({}, 'localStorage', { get() { throw new Error('Access denied') } })
  storage.setItem('restricted', 'ok')
  assert.equal(storage.getItem('restricted'), 'ok')
  storage.removeItem('restricted')
  assert.equal(storage.getItem('restricted'), null)
  delete globalThis.window
})
