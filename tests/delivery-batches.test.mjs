import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { setupDatabase } from './helpers/d1.mjs'
import { onRequest as batches } from '../functions/api/admin/delivery-batches.js'
import { onRequest as batchDetail } from '../functions/api/admin/delivery-batches/[id].js'
import { onRequest as order } from '../functions/api/admin/orders/[id].js'
import { summarizeCollection, buildCollectionReportHtml } from '../src/admin/collectionReport.js'

function fixture() {
  const { sqlite, call } = setupDatabase()
  sqlite.exec("INSERT INTO users(id,username,password_hash,is_admin,token,admin_role) VALUES(1,'jchengat','hash',1,'owner-token','owner'),(2,'Jenny','hash',1,'editor-token','catalog_editor')")
  sqlite.exec("INSERT INTO products(id,name,price) VALUES(1,'原商品名',15)")
  sqlite.exec("INSERT INTO orders(id,order_no,user_id,customer,status,payment_status,delivery_point_id,total,payment_currency,payment_amount,payment_method,payment_screenshot) VALUES (1,'a','2','顾客A','paid','confirmed',2,15,'CNY',15,'wechat_transfer','data:image/png;base64,AAAA'),(2,'b','2','顾客B','paid','confirmed',2,20,'HKD',24,'fps_transfer','data:image/png;base64,BBBB'),(3,'c','2','顾客C','pending','pending',2,30,'CNY',30,'alipay_transfer',NULL)")
  sqlite.exec("INSERT INTO order_numbers(order_id) VALUES(1),(2),(3)")
  sqlite.exec("INSERT INTO order_items(order_id,product_id,quantity,price,variant) VALUES(1,1,1,15,''),(2,1,2,10,'小份')")
  return { sqlite, call }
}

test('batch migration works against an old orders table', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE orders (id INTEGER PRIMARY KEY, order_no TEXT)')
  db.exec(readFileSync(new URL('../migrations/add-delivery-batches-2026-10.sql', import.meta.url), 'utf8'))
  assert.equal(db.prepare("SELECT name FROM pragma_table_info('orders') WHERE name='delivery_batch_id'").get().name, 'delivery_batch_id')
  db.close()
})

test('lock snapshots only confirmed orders, protects them, then archives and retains report', async () => {
  const {sqlite,call}=fixture()
  const date='2026-10-28'
  assert.equal((await call(batches,'POST',{point_key:'2',delivery_date:date},'editor-token',1,'/api/admin/delivery-batches')).status,403)
  const locked=await call(batches,'POST',{point_key:'2',delivery_date:date},'owner-token',1,'/api/admin/delivery-batches')
  assert.equal(locked.status,201)
  const batch=await locked.json()
  assert.equal(batch.order_count,2)
  assert.equal(sqlite.prepare('SELECT delivery_batch_id FROM orders WHERE id=3').get().delivery_batch_id,null)
  assert.equal((await call(batches,'POST',{point_key:'2',delivery_date:date},'owner-token',1,'/api/admin/delivery-batches')).status,409)
  sqlite.exec("UPDATE products SET name='新商品名' WHERE id=1")
  const detail=await (await call(batchDetail,'GET',null,'owner-token',batch.id,`/api/admin/delivery-batches/${batch.id}`)).json()
  assert.equal((await call(batchDetail,'GET',null,'editor-token',batch.id,`/api/admin/delivery-batches/${batch.id}`)).status,200)
  assert.equal(detail.orders.length,2)
  assert.equal(detail.orders[0].items[0].product_name,'原商品名')
  assert.equal(detail.orders[1].payment_screenshot,'data:image/png;base64,BBBB')
  assert.equal((await call(order,'DELETE',null,'owner-token',1,'/api/admin/orders/1')).status,409)
  assert.equal((await call(order,'PATCH',{remark:'changed'},'owner-token',1,'/api/admin/orders/1')).status,409)
  assert.equal((await call(batchDetail,'PATCH',{},'editor-token',batch.id,`/api/admin/delivery-batches/${batch.id}`)).status,403)
  assert.equal((await call(batchDetail,'PATCH',{},'owner-token',batch.id,`/api/admin/delivery-batches/${batch.id}`)).status,200)
  assert.equal(sqlite.prepare('SELECT status FROM orders WHERE id=1').get().status,'shipped')
  assert.equal(sqlite.prepare('SELECT status FROM delivery_batches WHERE id=?').get(batch.id).status,'archived')
  assert.equal((await call(batchDetail,'DELETE',null,'owner-token',batch.id,`/api/admin/delivery-batches/${batch.id}`)).status,409)
  assert.equal((await call(order,'PUT',{status:'completed'},'owner-token',1,'/api/admin/orders/1')).status,200)
  const after=await (await call(batchDetail,'GET',null,'owner-token',batch.id,`/api/admin/delivery-batches/${batch.id}`)).json()
  assert.equal(after.orders[0].status,'paid')
  sqlite.close()
})

test('owner can unlock a not-yet-delivered batch to correct orders, while Jenny cannot', async () => {
  const {sqlite,call}=fixture()
  const created=await (await call(batches,'POST',{point_key:'2',delivery_date:'2026-10-29'},'owner-token',1,'/api/admin/delivery-batches')).json()
  const path=`/api/admin/delivery-batches/${created.id}`
  assert.equal((await call(batchDetail,'DELETE',null,'editor-token',created.id,path)).status,403)
  assert.equal((await call(batchDetail,'DELETE',null,'owner-token',created.id,path)).status,200)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM delivery_batches').get().count,0)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM delivery_batch_orders').get().count,0)
  assert.equal(sqlite.prepare('SELECT delivery_batch_id FROM orders WHERE id=1').get().delivery_batch_id,null)
  sqlite.close()
})

test('report keeps channel and currency totals separate, matches receipts to orders, and escapes customer text', () => {
  const orders=[
    {id:1,public_no:1,customer:'<Alice>',payment_method:'wechat_transfer',payment_currency:'CNY',payment_amount:15,payment_screenshot:'data:image/png;base64,AAAA',items:[{product_name:'桃',quantity:1}]},
    {id:2,public_no:2,customer:'Bob',payment_method:'fps_transfer',payment_currency:'HKD',payment_amount:24,payment_screenshot:'',items:[{product_name:'苹果',quantity:2}]}
  ]
  const summary=summarizeCollection(orders)
  assert.deepEqual(summary.totals,{CNY:1500,HKD:2400})
  assert.equal(summary.channels.length,2)
  const html=buildCollectionReportHtml({batch:{point_name:'科技大学',delivery_date:'2026-10-28',status:'archived',created_at:'2026-10-28 09:00'},orders})
  assert(html.includes('订单 01') && html.includes('订单 02'))
  assert(html.includes('data:image/png;base64,AAAA'))
  assert(html.includes('未上传付款凭证'))
  assert(!html.includes('<Alice>'))
  assert(html.includes('&lt;Alice&gt;'))
})

test('an unresolved refund request keeps its order out of a locked batch', async () => {
  const { sqlite, call } = fixture()
  sqlite.exec("INSERT INTO order_requests(order_id,user_id,type) VALUES(1,'2','refund')")
  const response = await call(batches,'POST',{point_key:'2',delivery_date:'2026-10-28'},'owner-token',1,'/api/admin/delivery-batches')
  assert.equal(response.status,409)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS count FROM delivery_batches').get().count,0)
  sqlite.close()
})
