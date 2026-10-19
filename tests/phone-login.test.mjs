import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { onRequest as register } from '../functions/api/register.js'
import { onRequest as login } from '../functions/api/login.js'
import { verifyPassword } from '../functions/api/_utils.js'

function setup() {
  const sqlite = new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../migrations/schema.sql', import.meta.url),'utf8'))
  const DB = { prepare(sql) { return { bind(...values) { const stmt=sqlite.prepare(sql);return {
    async first() { return stmt.get(...values)||null }, async all() { return {results:stmt.all(...values)} },
    async run() { const result=stmt.run(...values); return { meta:{changes:Number(result.changes),last_row_id:Number(result.lastInsertRowid)} } }
  } } } } }
  const request = (handler, body) => handler({request:new Request('https://example.com/api/account',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env:{DB}})
  return {sqlite,request}
}
const profile={username:'student_01',wechat_id:'student_wx',whatsapp:'',phone:'',password:'TestOnly!123'}
test('username signup accepts WeChat-only contact and signs in without a phone',async()=>{
  const {sqlite,request}=setup()
  const signup=await request(register,profile);assert.equal(signup.status,201)
  const account=await signup.json();assert.equal(account.username,'student_01');assert.equal(account.phone,'');assert.equal(account.wechat_id,'student_wx');assert(account.id)
  const stored=sqlite.prepare('SELECT * FROM users').get();assert(!JSON.stringify(account).includes(stored.password_hash));assert(await verifyPassword(profile.password,stored.password_hash));assert.equal(stored.is_admin,0)
  assert.equal((await request(login,{username:'STUDENT_01',password:profile.password})).status,200)
  assert.equal((await request(login,{username:'student_01',password:'WrongPassword'})).status,401)
  assert.equal((await request(register,profile)).status,409)
  sqlite.close()
})
test('registration accepts HK and mainland contacts, normalizes numbers, and keeps contacts separate from usernames',async()=>{
  const {sqlite,request}=setup()
  for(const [username,phone,expected]of [['hk_user','9123 4567','+85291234567'],['cn_user','+86 13800138000','+8613800138000']] ){
    const response=await request(register,{...profile,username,wechat_id:'',phone,whatsapp:''});assert.equal(response.status,201)
    const account=await response.json();assert.equal(account.phone,expected);assert.equal(account.whatsapp,'')
    assert.equal((await request(login,{username:expected,password:profile.password})).status,401)
  }
  sqlite.close()
})
test('invalid usernames, contacts and passwords fail before creating an account',async()=>{
  const {sqlite,request}=setup()
  for(const bad of [{username:'with space'},{wechat_id:'123bad'},{wechat_id:'',phone:'',whatsapp:''},{phone:'+85361234567'},{phone:'+852912345678'},{phone:'+8612800138000'},{whatsapp:'+8613800138000'}])assert.equal((await request(register,{...profile,...bad})).status,400,JSON.stringify(bad))
  assert.equal((await request(login,{phone:'91234567',password:profile.password})).status,400)
  assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n,0)
  sqlite.close()
})
