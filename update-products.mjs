#!/usr/bin/env node
// 批量更新商品图片和解说
import { readFileSync } from 'fs'
const BASE = 'https://order-system-bp4.pages.dev'

async function main() {
  // 1. 登录
  const loginRes = await fetch(`${BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'jchengat', password: 'Jenny@123' })
  })
  const loginData = await loginRes.json()
  if (!loginData.token) {
    console.error('登录失败:', loginData)
    process.exit(1)
  }
  const token = loginData.token
  console.log('登录成功')

  // 2. 拿所有商品
  const productsRes = await fetch(`${BASE}/api/products`)
  const products = await productsRes.json()
  console.log(`共 ${products.length} 个商品`)

  // 3. 更新数据映射
  const updates = {}
  const sql = readFileSync('migrations/update-images.sql', 'utf8')
  const re = /UPDATE products SET image = '([^']+)', description = '([^']+)' WHERE id = (\d+);/g
  let m
  while ((m = re.exec(sql)) !== null) {
    updates[parseInt(m[3])] = { image: m[1], description: m[2] }
  }
  console.log(`准备更新 ${Object.keys(updates).length} 个商品`)

  // 4. 批量 PUT
  let ok = 0, fail = 0
  for (const p of products) {
    const u = updates[p.id]
    if (!u) continue
    const body = {
      name: p.name,
      price: p.price,
      original_price: p.original_price,
      image: u.image,
      category_id: p.category_id,
      stock: p.stock,
      is_new: p.is_new,
      is_hot: p.is_hot,
      description: u.description
    }
    const res = await fetch(`${BASE}/api/products/${p.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    if (res.ok) {
      ok++
      console.log(`✓ id=${p.id} ${p.name}`)
    } else {
      fail++
      console.log(`✗ id=${p.id} ${p.name}: ${res.status}`)
    }
  }
  console.log(`\n完成: 成功 ${ok}, 失败 ${fail}`)
}

main().catch(e => { console.error(e); process.exit(1) })
