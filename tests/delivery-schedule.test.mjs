import test from 'node:test'
import assert from 'node:assert/strict'
import { setupDatabase } from './helpers/d1.mjs'
import { onRequest as manageSchedule } from '../functions/api/admin/delivery-schedule.js'
import { onRequest as stats } from '../functions/api/stats.js'
import { activeSchedule, hongKongToday, validDeliveryDate } from '../functions/api/_delivery-schedule.js'

test('merchant may publish a dated group only after its own point reaches the threshold', async () => {
  const { sqlite, call } = setupDatabase()
  sqlite.exec("INSERT INTO users(id,username,password_hash,is_admin,token) VALUES(1,'admin','test',1,'admin-token'),(2,'customer','test',0,'customer-token')")
  sqlite.exec("INSERT INTO orders(order_no,total,delivery_point_id,status,payment_status) VALUES('a',300,2,'paid','confirmed'),('b',200,2,'paid','confirmed'),('c',900,1,'paid','confirmed')")
  const date = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const makeBody = (delivery_point_id, group_formed = true, delivery_date = date) => ({ delivery_point_id, group_formed, delivery_date })
  assert.equal((await call(manageSchedule, 'POST', makeBody(2), 'customer-token')).status, 403)
  assert.equal((await call(manageSchedule, 'POST', makeBody(1))).status, 409)
  assert.equal((await call(manageSchedule, 'POST', makeBody(2, true, '2026-02-31'))).status, 400)
  const published = await call(manageSchedule, 'POST', makeBody(2))
  assert.equal(published.status, 200)
  const pointStats = await (await call(stats, 'GET', null, 'guest', 1, '/api/stats?point=2')).json()
  assert.equal(pointStats.group_formed, true)
  assert.equal(pointStats.delivery_date, date)
  assert.equal(pointStats.confirmed_total, 500)
  assert.equal((await (await call(stats, 'GET', null, 'guest', 1, '/api/stats?point=1')).json()).group_formed, false)
  assert.equal((await call(manageSchedule, 'POST', makeBody(2, false, ''))).status, 200)
  const reset = await (await call(stats, 'GET', null, 'guest', 1, '/api/stats?point=2')).json()
  assert.equal(reset.group_formed, false)
  assert.equal(reset.delivery_date, null)
  assert.equal(reset.confirmed_total, 500)
  sqlite.close()
})

test('past delivery dates stop displaying as scheduled in Hong Kong time', () => {
  assert(validDeliveryDate(hongKongToday()))
  assert.equal(validDeliveryDate('2026-02-31'), false)
  assert.equal(activeSchedule({ group_formed: 1, delivery_date: '2026-10-25' }, '2026-10-26'), false)
  assert.equal(activeSchedule({ group_formed: 1, delivery_date: '2026-10-26' }, '2026-10-26'), true)
  assert.equal(activeSchedule({ group_formed: 0, delivery_date: '2026-10-26' }, '2026-10-26'), false)
})
