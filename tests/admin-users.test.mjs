import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { onRequest as users } from '../functions/api/admin/users.js'
import { onRequest as user } from '../functions/api/admin/users/[id].js'
import { onRequest as order } from '../functions/api/admin/orders/[id].js'
import { onRequest as login } from '../functions/api/login.js'
import { onRequest as register } from '../functions/api/register.js'
import { onRequest as me } from '../functions/api/me.js'
import { hashPassword, verifyPassword } from '../functions/api/_utils.js'
import { normalizeContactPhone } from '../functions/api/_contacts.js'

const password = 'CustomerTest!123'
const originalHash = await hashPassword(password)
function d1(sqlite) {
  return {
    prepare(sql) {
      const query = {
        sql, values:[],
        bind(...values) { return { ...query, values } },
        async first() { return sqlite.prepare(sql).get(...this.values) || null },
        async all() { return { results:sqlite.prepare(sql).all(...this.values) } },
        async run() { const result=sqlite.prepare(sql).run(...this.values); return { success:true, meta:{ changes:Number(result.changes) } } }
      }
      return query
    },
    async batch(statements) {
      sqlite.exec('BEGIN')
      try { const result=[]; for (const statement of statements) result.push(await statement.run()); sqlite.exec('COMMIT'); return result }
      catch(error) { sqlite.exec('ROLLBACK');throw error }
    }
  }
}
function setup() {
  const sqlite=new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../migrations/schema.sql',import.meta.url),'utf8'))
  const migration=readFileSync(new URL('../migrations/2026-10-17-user-management.sql',import.meta.url),'utf8').replace(/^--.*$/gm,'').split(';').map(s=>s.trim()).filter(Boolean)
  for(const sql of migration)if(!sql.startsWith('ALTER TABLE'))sqlite.exec(sql)
  const insert=sqlite.prepare('INSERT INTO users (id,username,password_hash,phone,token,is_admin,address_storage_key,legacy_login_phone) VALUES (?,?,?,?,?,?,?,?)')
  insert.run(1,'jchengat',originalHash,'91200001','admin-token',1,'jchengat','+85291200001')
  insert.run(2,'+85291234567',originalHash,'+85291234567','buyer-token',0,'+85291234567','+85291234567')
  insert.run(3,'other_user',originalHash,'+85261234567','other-token',0,'other_user','+85261234567')
  const add=sqlite.prepare('INSERT INTO orders(id,order_no,user_id,total,delivery_fee,status,payment_status,payment_currency,payment_amount,customer,phone,address,remark,payment_screenshot) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
  add.run(1,'first','2',30,0,'paid','confirmed','HKD',36,'原收货人','+85291234567','Room 1','旧备注','proof-kept')
  add.run(2,'second','2',20,30,'completed','confirmed','CNY',50,'原收货人','+85291234567','Room 1','','')
  add.run(3,'refund','2',100,0,'cancelled','refunded','CNY',100,'原收货人','+85291234567','Room 1','','')
  add.run(4,'pending','2',10,0,'pending','pending','CNY',10,'原收货人','+85291234567','Room 1','','')
  sqlite.exec('INSERT INTO order_numbers(order_id) SELECT id FROM orders ORDER BY id')
  const DB=d1(sqlite)
  const call=(handler,method='GET',body=null,token='admin-token',id=2)=>handler({ request:new Request('https://example.com/api/test',{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body!==null?{body:JSON.stringify(body)}:{})}),env:{DB},params:{id:String(id)} })
  return {sqlite,call,DB}
}
const profile={action:'profile',username:'new_username',wechat_id:'student_wx',whatsapp:'+852 6123 4567',phone:'+86 13800138000'}

test('user list/details require admin, return complete order totals, and never expose credentials',async()=>{
  const {sqlite,call}=setup()
  for(const handler of [users,user])assert.equal((await call(handler,'GET',null,'buyer-token')).status,403)
  const response=await call(users);const list=await response.json();const buyer=list.find(u=>u.id===2)
  assert.equal(buyer.order_count,4);assert.equal(buyer.total_spent,80);assert.equal(buyer.has_password,1)
  assert.equal('password_hash' in buyer,false);assert.equal('token' in buyer,false)
  const detail=await (await call(user)).json();assert.equal(detail.orders.length,4);assert.equal(detail.orders[3].public_no,1)
  assert.equal((await call(users,'POST',{})).status,405)
  sqlite.close()
})

test('profile edits accept HK/CN contacts, retain old login and address keys, and preserve all orders',async()=>{
  const {sqlite,call}=setup();const before=sqlite.prepare('SELECT * FROM orders ORDER BY id').all()
  const response=await call(user,'PATCH',profile);assert.equal(response.status,200)
  const result=await response.json();assert.equal(result.user.phone,'+8613800138000');assert.equal(result.user.whatsapp,'+85261234567')
  const stored=sqlite.prepare('SELECT * FROM users WHERE id=2').get()
  assert.equal(stored.token,null);assert.equal(stored.legacy_login_phone,'+85291234567');assert.equal(stored.address_storage_key,'+85291234567');assert.equal(stored.is_admin,0)
  assert.deepEqual(sqlite.prepare('SELECT * FROM orders ORDER BY id').all(),before)
  const signedIn=await call(login,'POST',{phone:'91234567',password});assert.equal(signedIn.status,200)
  const data=await signedIn.json();assert.equal(data.username,'new_username');assert.equal(data.address_storage_key,'+85291234567')
  const meData=await (await call(me,'GET',null,data.token)).json();assert.equal(meData.address_storage_key,'+85291234567')
  assert.equal((await call(register,'POST',{phone:'91234567',password:'OtherPassword'})).status,409)
  // Customer registration rules are intentionally unchanged until Plan A/B/C is selected.
  assert.equal((await call(register,'POST',{phone:'+8613800138000',password:'OtherPassword'})).status,400)
  sqlite.close()
})

test('password resets store only salted hashes, revoke sessions, and do not log/return passwords',async()=>{
  const {sqlite,call}=setup();const newPassword='ResetOnly!456'
  const response=await call(user,'PATCH',{action:'reset_password',new_password:newPassword});assert.equal(response.status,200)
  const result=await response.text();assert(!result.includes(newPassword));assert(!result.includes(originalHash))
  const stored=sqlite.prepare('SELECT * FROM users WHERE id=2').get();assert.equal(stored.token,null);assert.notEqual(stored.password_hash,originalHash)
  assert(await verifyPassword(newPassword,stored.password_hash));assert(!await verifyPassword(password,stored.password_hash))
  const audit=JSON.stringify(sqlite.prepare('SELECT * FROM admin_user_audit').all());assert(!audit.includes(newPassword));assert(!audit.includes(stored.password_hash))
  assert.equal((await call(me,'GET',null,'buyer-token')).status,401)
  assert.equal((await call(login,'POST',{phone:'91234567',password})).status,401)
  assert.equal((await call(login,'POST',{phone:'91234567',password:newPassword})).status,200)
  sqlite.close()
})

test('disabling blocks both new logins and previously issued tokens; enabling requires login again',async()=>{
  const {sqlite,call}=setup()
  assert.equal((await call(user,'PATCH',{action:'status',account_status:'disabled'})).status,200)
  assert.equal((await call(login,'POST',{phone:'91234567',password})).status,403)
  sqlite.prepare("UPDATE users SET token='stale-token' WHERE id=2").run()
  assert.equal((await call(me,'GET',null,'stale-token')).status,401)
  assert.equal((await call(user,'PATCH',{action:'status',account_status:'active'})).status,200)
  assert.equal((await call(me,'GET',null,'stale-token')).status,401)
  assert.equal((await call(login,'POST',{phone:'91234567',password})).status,200)
  sqlite.close()
})

test('admin identity/privileges are protected, and invalid or duplicate profiles never save',async()=>{
  const {sqlite,call}=setup();const before=sqlite.prepare('SELECT * FROM users WHERE id=2').get()
  for(const body of [{...profile,phone:'+85361234567'},{...profile,wechat_id:'123bad'},{...profile,wechat_id:'',whatsapp:'',phone:''},{...profile,is_admin:1},{...profile,username:'a space'}])assert.equal((await call(user,'PATCH',body)).status,400)
  assert.deepEqual(sqlite.prepare('SELECT * FROM users WHERE id=2').get(),before)
  assert.equal((await call(user,'PATCH',{...profile,username:'other_user'})).status,409)
  assert.equal((await call(user,'PATCH',{action:'status',account_status:'disabled'},'admin-token',1)).status,409)
  assert.equal((await call(user,'PATCH',profile,'admin-token',1)).status,409)
  assert.equal(sqlite.prepare('SELECT is_admin FROM users WHERE username=\'jchengat\'').get().is_admin,1)
  assert.equal((await call(user,'PATCH',profile,'buyer-token')).status,403)
  sqlite.close()
})

test('editing order delivery info can clear remarks and never changes payment, prices or screenshots',async()=>{
  const {sqlite,call}=setup();const before=sqlite.prepare('SELECT * FROM orders WHERE id=1').get()
  assert.equal((await call(order,'PATCH',{remark:''},'buyer-token',1)).status,403)
  assert.equal((await call(order,'PATCH',{status:'paid'},'admin-token',1)).status,400)
  assert.equal((await call(order,'PATCH',{customer:'新收货人',phone:'+86 13800138000',address:'Room 200 HKUST',remark:''},'admin-token',1)).status,200)
  const after=sqlite.prepare('SELECT * FROM orders WHERE id=1').get()
  assert.equal(after.remark,'');assert.equal(after.phone,'+8613800138000')
  for(const key of ['total','delivery_fee','payment_status','status','payment_amount','payment_currency','payment_screenshot','order_no','user_id'])assert.equal(after[key],before[key],key)
  sqlite.close()
})

test('contact normalization supports HK and mainland mobiles but rejects unsupported formats',()=>{
  assert.equal(normalizeContactPhone('9123 4567'),'+85291234567')
  assert.equal(normalizeContactPhone('+86 (138)0013-8000'),'+8613800138000')
  for(const phone of ['+85361234567','123','+852912345678','+8612800138000','abc'])assert.equal(normalizeContactPhone(phone),null)
})
