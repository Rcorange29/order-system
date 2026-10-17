import {DatabaseSync} from 'node:sqlite'
import {readFileSync} from 'node:fs'
export function setupDatabase() {
  const sqlite=new DatabaseSync(':memory:')
  sqlite.exec(readFileSync(new URL('../../migrations/schema.sql',import.meta.url),'utf8'))
  const DB={prepare(sql){const statement={bind(...values){return{...statement,values}},values:[],async first(){return sqlite.prepare(sql).get(...this.values)||null},async all(){return{results:sqlite.prepare(sql).all(...this.values)}},async run(){const r=sqlite.prepare(sql).run(...this.values);return{success:true,meta:{changes:Number(r.changes),last_row_id:Number(r.lastInsertRowid)}}}};return statement},async batch(statements){sqlite.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sqlite.exec('COMMIT');return results}catch(e){sqlite.exec('ROLLBACK');throw e}}}
  const call=(handler,method='GET',body=null,token='admin-token',id=1,path='/api/test')=>handler({request:new Request('https://example.com'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body===null?{}:{body:JSON.stringify(body)})}),env:{DB},params:{id:String(id)}})
  return{sqlite,DB,call}
}
