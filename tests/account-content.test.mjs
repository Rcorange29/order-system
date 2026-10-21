import test from 'node:test'
import assert from 'node:assert/strict'
import {setupDatabase} from './helpers/d1.mjs'
import {hashPassword} from '../functions/api/_utils.js'
import {onRequest as register} from '../functions/api/register.js'
import {onRequest as orders} from '../functions/api/orders.js'
import {onRequest as orderDetail} from '../functions/api/orders/[id].js'
import {onRequest as upload} from '../functions/api/orders/upload-proof.js'
import {onRequest as adminOrder} from '../functions/api/admin/orders/[id].js'
import {onRequest as announcement} from '../functions/api/announcements.js'
import {onRequest as serviceRequest} from '../functions/api/orders/request.js'
import {onRequest as manageRequest} from '../functions/api/admin/order-requests.js'
import {localizedContent} from '../src/client/i18n.js'
const proof='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pR8AAAAASUVORK5CYII='
async function setup(){const context=setupDatabase();context.sqlite.prepare('INSERT INTO users(username,password_hash,is_admin,token) VALUES(?,?,1,?)').run('jchengat',await hashPassword('AdminTest!123'),'admin-token');return context}
test('WeChat-only customer can order, upload later, receive confirmation and complete delivery; contacts stay attached',async()=>{
 const{sqlite,call}=await setup()
 const account=await(await call(register,'POST',{username:'wechat_student',password:'CustomerTest!123',wechat_id:'student_wx',phone:'',whatsapp:''})).json()
 sqlite.exec("INSERT INTO products(id,name,price,unit,is_active) VALUES(1,'QA produce',15,'/pack',1)")
 const body={items:[{product_id:1,quantity:2}],delivery_type:'pickup',delivery_point_id:2,payment_method:'fps_transfer',payment_currency:'HKD',expected_payment_amount:36,expected_cny_total:30}
 const response=await call(orders,'POST',body,account.token);assert.equal(response.status,201)
 const placed=await response.json();assert.equal(placed.public_no,1);assert.equal(placed.contact_wechat_id,'student_wx');assert.equal(placed.phone,'');assert.equal(placed.delivery_fee,0);assert.equal(placed.payment_amount,36)
 assert.equal((await call(upload,'POST',{order_id:placed.id,screenshot:proof},account.token)).status,200)
 let row=sqlite.prepare('SELECT * FROM orders WHERE id=?').get(placed.id);assert.equal(row.status,'awaiting_confirmation');assert.equal(row.payment_screenshot,proof)
 assert.equal((await call(adminOrder,'PUT',{status:'paid',payment_status:'confirmed'},'admin-token',placed.id)).status,200)
 for(const status of ['shipped','completed'])assert.equal((await call(adminOrder,'PUT',{status},'admin-token',placed.id)).status,200)
 row=sqlite.prepare('SELECT * FROM orders WHERE id=?').get(placed.id);assert.equal(row.status,'completed');assert.equal(row.payment_screenshot,proof)
 // Home delivery still costs CNY 30 and can use the account's WeChat contact.
 const home=await call(orders,'POST',{...body,delivery_type:'delivery',address:'Room 123, Hong Kong',expected_cny_total:60,expected_payment_amount:72},account.token);assert.equal(home.status,201);const h=await home.json();assert.equal(h.delivery_fee,30);assert.equal(h.contact_wechat_id,'student_wx')
 sqlite.close()
})
test('paid group orders support both manual refund and home delivery upgrade without losing contacts',async()=>{
 const{sqlite,call}=await setup()
 sqlite.exec("INSERT INTO users(id,username,password_hash,wechat_id,token) VALUES(2,'student','unused','student_wx','buyer-token')")
 const insert=sqlite.prepare("INSERT INTO orders(id,order_no,user_id,customer,total,payment_currency,payment_amount,status,payment_status,delivery_point_id,contact_wechat_id) VALUES(?,?,'2','student',30,'HKD',36,'paid','confirmed',2,'student_wx')")
 insert.run(1,'refund-test');insert.run(2,'delivery-test')
 for(const[id,type]of [[1,'refund'],[2,'delivery_upgrade']]){assert.equal((await call(serviceRequest,'POST',{order_id:id,type,address:'Room 123, HKUST'},'buyer-token')).status,201);assert.equal((await call(manageRequest,'PUT',{id,decision:'approve'})).status,200)}
 const refunded=sqlite.prepare('SELECT * FROM orders WHERE id=1').get();assert.equal(refunded.payment_status,'refunded');assert.equal(refunded.status,'cancelled')
 const upgraded=sqlite.prepare('SELECT * FROM orders WHERE id=2').get();assert.equal(upgraded.payment_amount,72);assert.equal(upgraded.delivery_fee,30);assert.equal(upgraded.delivery_point_id,null);assert.equal(upgraded.contact_wechat_id,'student_wx')
 sqlite.close()
})
test('customer can switch payment method of own unpaid order freely; ownership and invalid method enforced',async()=>{
 const{sqlite,call}=await setup()
 const account=await(await call(register,'POST',{username:'switch_payer',password:'CustomerTest!123',wechat_id:'switch_wx',phone:'',whatsapp:''})).json()
 sqlite.exec("INSERT INTO products(id,name,price,unit,is_active) VALUES(1,'QA produce',15,'/pack',1)")
 const body={items:[{product_id:1,quantity:2}],delivery_type:'pickup',delivery_point_id:2,payment_method:'wechat_transfer',payment_currency:'CNY',expected_payment_amount:30,expected_cny_total:30}
 const placed=await(await call(orders,'POST',body,account.token)).json()
 assert.equal((await call(orderDetail,'PATCH',{payment_method:'alipay_transfer'},account.token,placed.id)).status,200)
 assert.equal(sqlite.prepare('SELECT payment_method FROM orders WHERE id=?').get(placed.id).payment_method,'alipay_transfer')
 // 三种方式自由切换，不再受币种限制
 assert.equal((await call(orderDetail,'PATCH',{payment_method:'fps_transfer'},account.token,placed.id)).status,200)
 assert.equal(sqlite.prepare('SELECT payment_method FROM orders WHERE id=?').get(placed.id).payment_method,'fps_transfer')
 assert.equal((await call(orderDetail,'PATCH',{payment_method:'wechat_transfer'},account.token,placed.id)).status,200)
 const other=await(await call(register,'POST',{username:'other_payer',password:'CustomerTest!123',wechat_id:'other_wx',phone:'',whatsapp:''})).json()
 assert.equal((await call(orderDetail,'PATCH',{payment_method:'wechat_transfer'},other.token,placed.id)).status,403)
 assert.equal((await call(orderDetail,'PATCH',{payment_method:'invalid_pay'},account.token,placed.id)).status,400)
 // 待付款订单可自行取消；非待付款或他人订单不可
 assert.equal((await call(orderDetail,'PATCH',{action:'cancel'},account.token,placed.id)).status,200)
 assert.equal(sqlite.prepare('SELECT status FROM orders WHERE id=?').get(placed.id).status,'cancelled')
 const paid=await(await call(orders,'POST',{items:[{product_id:1,quantity:2}],delivery_type:'pickup',delivery_point_id:2,payment_method:'wechat_transfer',payment_currency:'CNY',expected_payment_amount:30,expected_cny_total:30})).json()
 sqlite.prepare("UPDATE orders SET status='awaiting_confirmation', payment_status='paid' WHERE id=?").run(Number(paid.id))
 assert.equal((await call(orderDetail,'PATCH',{action:'cancel'},account.token,paid.id)).status,409)
 sqlite.close()
})
test('merchant translations save independently, public APIs include all languages and blank translations fall back per field',async()=>{
 const{sqlite,call}=await setup()
 const input={title:'原文标题',content:'原文正文',title_zh_hk:'繁體標題',content_zh_hk:'繁體內容',title_en:'Pickup update',content_en:'Collect tomorrow.',is_published:true}
 assert.equal((await call(announcement,'POST',input)).status,200)
 let data=await(await call(announcement,'GET',null,'guest',1,'/api/announcements')).json();assert.equal(localizedContent(data[0],'content','en'),'Collect tomorrow.');assert.equal(localizedContent(data[0],'title','zh_HK'),'繁體標題')
 assert.equal((await call(announcement,'PUT',{...input,id:data[0].id,title_en:'',content_zh_hk:'  '})).status,200)
 data=await(await call(announcement,'GET',null,'guest')).json();assert.equal(localizedContent(data[0],'title','en'),'原文标题');assert.equal(localizedContent(data[0],'content','zh_HK'),'原文正文');assert.equal(localizedContent(data[0],'content','en'),'Collect tomorrow.')
 assert.equal((await call(announcement,'POST',{...input,title_en:'x'.repeat(101)})).status,400)
 assert.equal((await call(announcement,'POST',input,'guest')).status,403)
 sqlite.close()
})
