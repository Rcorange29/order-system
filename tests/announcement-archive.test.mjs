import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { setupDatabase } from './helpers/d1.mjs'
import { onRequest as announcements } from '../functions/api/announcements.js'

test('archive migration preserves old announcements as current', () => {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE announcements (id INTEGER PRIMARY KEY, title TEXT)')
  db.exec("INSERT INTO announcements VALUES (1, '旧公告')")
  db.exec(readFileSync(new URL('../migrations/add-announcement-archive-2026-11.sql', import.meta.url), 'utf8'))
  assert.equal(db.prepare('SELECT is_archived FROM announcements WHERE id=1').get().is_archived, 0)
  db.close()
})

test('past messages disappear from customer pages but remain readable and restorable in admin', async () => {
  const { sqlite, call } = setupDatabase()
  sqlite.exec("INSERT INTO users(id,username,password_hash,is_admin,token,admin_role) VALUES(1,'jchengat','hash',1,'owner-token','owner'),(2,'Jenny','hash',1,'editor-token','catalog_editor')")
  const body = {delivery_point_id:2,title:'科技大学10月28日配送',content:'10月28日取货',title_en:'UST pickup',content_en:'Collect on 28 October.',is_published:true}
  assert.equal((await call(announcements,'POST',body,'owner-token',1,'/api/announcements')).status,200)
  const id = sqlite.prepare('SELECT id FROM announcements').get().id
  const publicPath='/api/announcements?point=2'
  assert.equal((await (await call(announcements,'GET',null,'guest',1,publicPath)).json()).length,1)
  assert.equal((await call(announcements,'PATCH',{id,action:'archive'},'editor-token',1,'/api/announcements')).status,403)
  assert.equal((await call(announcements,'PATCH',{id,action:'archive'},'owner-token',1,'/api/announcements')).status,200)
  assert.equal((await (await call(announcements,'GET',null,'guest',1,publicPath)).json()).length,0)
  const adminList=await (await call(announcements,'GET',null,'editor-token',1,'/api/announcements?all=1')).json()
  assert.equal(adminList[0].is_archived,1)
  assert.equal(adminList[0].content_en,body.content_en)
  assert.equal((await call(announcements,'PATCH',{id,action:'restore'},'owner-token',1,'/api/announcements')).status,200)
  assert.equal((await (await call(announcements,'GET',null,'guest',1,publicPath)).json()).length,1)
  sqlite.close()
})
