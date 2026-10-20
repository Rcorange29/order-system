import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {createRequire} from 'node:module'
import {langPack,translate,localizedContent,apiError} from '../src/client/i18n.js'
const require=createRequire(import.meta.url)
const babel=createRequire(require.resolve('@vitejs/plugin-react'))('@babel/core')
function walk(node,visit){if(!node||typeof node!=='object')return;visit(node);for(const[key,value]of Object.entries(node)){if(['loc','extra','comments','leadingComments','trailingComments','innerComments'].includes(key))continue;if(Array.isArray(value))value.forEach(n=>walk(n,visit));else if(value&&typeof value==='object')walk(value,visit)}}
test('all customer interface keys have three complete translations and matching interpolation values',()=>{
 const keys=Object.keys(langPack.zh_CN).sort()
 for(const lang of ['zh_HK','en'])assert.deepEqual(Object.keys(langPack[lang]).sort(),keys)
 for(const key of keys){const slots=value=>[...value.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();for(const lang of ['zh_CN','zh_HK','en']){assert.equal(typeof langPack[lang][key],'string');assert(langPack[lang][key].trim(),`${lang}/${key}`);assert.deepEqual(slots(langPack[lang][key]),slots(langPack.zh_CN[key]),`${lang}/${key}`)}assert(!/[\u3400-\u9fff]/.test(langPack.en[key]),`Chinese UI in English: ${key}`)}
})
test('customer components have no untranslated CJK UI literals and every static t() key exists',()=>{
 const source=readFileSync(new URL('../src/client/App.jsx',import.meta.url),'utf8')
 const ast=babel.parseSync(source,{configFile:false,babelrc:false,parserOpts:{sourceType:'module',plugins:['jsx']}})
 const marker=source.indexOf('// 带鉴权')
 const dataOnly=new Set(['/斤','科技大学','科大','简','繁'])
 walk(ast,node=>{
  if(node.type==='CallExpression'&&node.callee?.name==='t'&&node.arguments[0]?.type==='StringLiteral')assert(Object.hasOwn(langPack.zh_CN,node.arguments[0].value),`Missing key ${node.arguments[0].value}`)
  if(node.type==='JSXText')assert(!/[\u3400-\u9fff]/.test(node.value),`Untranslated JSX: ${node.value.trim()}`)
  if(node.start>marker&&node.type==='StringLiteral'&&/[\u3400-\u9fff]/.test(node.value))assert(dataOnly.has(node.value),`Untranslated string: ${node.value}`)
  if(node.type==='TemplateLiteral')assert(node.quasis.every(q=>!/[\u3400-\u9fff]/.test(q.value.raw)),'Untranslated template')
 })
})
test('merchant fallback does not translate content and server errors cannot leak untranslated UI',()=>{
 const merchant={title:'商家原文',title_zh_hk:'  ',title_en:'Merchant title'}
 assert.equal(localizedContent(merchant,'title','zh_HK'),'商家原文');assert.equal(localizedContent(merchant,'title','en'),'Merchant title');assert.equal(localizedContent(merchant,'title','zh_CN'),'商家原文')
 const t=(key,values)=>translate('en',key,values)
 assert.equal(apiError(t,{code:'INVALID_PHONE'}),langPack.en.INVALID_PHONE)
 assert.equal(apiError(t,{error:'服务器的旧简体错误'}),langPack.en.requestFailed)
})
