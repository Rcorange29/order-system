// 批量录入商品数据
// 调用方式: POST /api/seed-products
// 用于首次部署后填充真实商品数据

import { getAdminUser, json, readBody } from './_utils.js'

export async function onRequestPost(context) {
  const { request, env } = context
  try {
    const body = await readBody(request)
    const admin = await getAdminUser(request, env)
    if (!admin) return json({ error: '未授权' }, 401)

    // 清空旧商品和分类
    await env.DB.prepare('DELETE FROM order_items').run()
    await env.DB.prepare('DELETE FROM products').run()
    await env.DB.prepare('DELETE FROM categories').run()

    // 插入分类
    const categories = [
      { name: '水果', icon: '🍎', sort_order: 1 },
      { name: '蔬菜', icon: '🥬', sort_order: 2 },
      { name: '香辛料蔬菜', icon: '🌶️', sort_order: 3 },
      { name: '蔬菜盲盒', icon: '📦', sort_order: 4 },
      { name: '蛋类', icon: '🥚', sort_order: 5 },
      { name: '时令蔬果(限定)', icon: '✨', sort_order: 6 },
      { name: '菌菇', icon: '🍄', sort_order: 7 },
    ]

    const catMap = {}
    for (const cat of categories) {
      const result = await env.DB.prepare(
        'INSERT INTO categories (name, icon, sort) VALUES (?, ?, ?)'
      ).bind(cat.name, cat.icon, cat.sort_order).run()
      const id = result.meta.last_row_id
      catMap[cat.name] = id
    }

    // 商品数据：[name, price, unit, category, imageNum]
    // imageNum对应 public/images/products/p{num}.jpg
    const products = [
      // 水果
      ['西瓜', 50, '/个', '水果', 162],
      ['蜜瓜', 35, '/个', '水果', 163],
      ['香蕉', 10, '/3条', '水果', 164],
      ['百香果', 12, '/磅', '水果', 165],
      ['叶橙', 6, '/个', '水果', 166],
      ['澳洲橙', 7, '/个', '水果', 167],
      ['南水梨', 12, '/个', '水果', 168],
      ['秋月梨', 12, '/个', '水果', 169],
      ['鸭梨', 5, '/个', '水果', 170],
      ['富士苹果', 5, '/个', '水果', 171],
      ['串茄(高质小番茄)', 15, '/磅', '水果', 172],
      ['火龙果', 7, '/个', '水果', 173],
      ['牛油果', 12, '/个', '水果', 174],
      ['哈密瓜', 45, '/个', '水果', 175],
      ['珍宝蓝莓', 48, '/盒', '水果', 176],
      ['椰皇', 14, '/个', '水果', 177],
      ['金柚子', 25, '/个', '水果', 178],
      ['士多啤梨', 35, '/盒', '水果', 179],
      ['香梨', 12, '/3个', '水果', 180],
      ['棗油桃', 28, '/磅', '水果', 181],
      ['凯特芒果', 20, '/个', '水果', 182],
      ['西梅', 30, '/磅', '水果', 183],
      ['韩国黄金梨', 12, '/个', '水果', 184],
      ['蜜脆梨', 22, '/磅', '水果', 185],
      // 蔬菜
      ['韭菜(约300g)', 5, '/扎', '蔬菜', null],
      ['长豆角', 8, '/扎', '蔬菜', null],
      ['佛手瓜', 6, '/只', '蔬菜', null],
      ['西洋菜', 16, '/斤', '蔬菜', null],
      ['菠菜苗', 20, '/斤', '蔬菜', null],
      ['莴笋', 10, '/条', '蔬菜', null],
      ['油麦菜', 9, '/斤', '蔬菜', null],
      ['小唐菜', 12, '/斤', '蔬菜', null],
      ['白菜仔', 12, '/斤', '蔬菜', null],
      ['椰菜', 7, '/斤', '蔬菜', null],
      ['旺菜', 7, '/斤', '蔬菜', null],
      ['生菜', 10, '/斤', '蔬菜', null],
      ['菜心苗', 12, '/斤', '蔬菜', null],
      ['菜心', 10, '/斤', '蔬菜', null],
      ['西兰花', 12, '/斤', '蔬菜', null],
      ['白通菜', 14, '/斤', '蔬菜', null],
      ['白福花', 12, '/斤', '蔬菜', null],
      ['迷你娃娃菜', 8, '/包', '蔬菜', null],
      ['娃娃菜', 12, '/包', '蔬菜', null],
      ['番薯', 9, '/斤', '蔬菜', null],
      ['四季豆', 8, '/扎', '蔬菜', null],
      ['番茄', 10, '/磅', '蔬菜', null],
      ['土豆', 7, '/磅', '蔬菜', null],
      ['油苦瓜', 10, '/条', '蔬菜', null],
      ['白萝卜', 6, '/斤', '蔬菜', null],
      ['莲藕', 14, '/斤', '蔬菜', null],
      ['玉米', 7, '/条', '蔬菜', null],
      ['青瓜', 10, '/斤', '蔬菜', null],
      ['翠玉瓜', 6, '/条', '蔬菜', null],
      ['秋葵(150g)', 6, '/包', '蔬菜', null],
      ['三色召(彩椒)', 16, '/包', '蔬菜', null],
      ['萝卜', 7, '/个', '蔬菜', null],
      ['生姜', 9, '/块', '蔬菜', null],
      ['洋葱', 5, '/个', '蔬菜', null],
      ['茄子', 7, '/个', '蔬菜', null],
      ['芹菜', 8, '/个', '蔬菜', null],
      ['豆苗', 50, '/斤', '蔬菜', null],
      ['山药', 16, '/条', '蔬菜', null],
      ['炖汤木瓜', 8, '/个', '蔬菜', null],
      ['节瓜(毛瓜)', 10, '/斤', '蔬菜', null],
      ['粉葛', 13, '/斤', '蔬菜', null],
      ['大丁苦瓜', 18, '/斤', '蔬菜', null],
      ['辣椒', 8, '/包', '蔬菜', null],
      ['贝贝南瓜', 5, '/个', '蔬菜', null],
      ['芋头', 14, '/个', '蔬菜', null],
      ['角瓜', 10, '/条', '蔬菜', null],
      ['螺丝椒', 3.5, '/条', '蔬菜', null],
      ['尖青椒', 6, '/包', '蔬菜', null],
      ['白菜', 9, '/个', '蔬菜', null],
      ['龙芽叶', 10, '/个', '蔬菜', null],
      ['冬瓜', 7, '/斤', '蔬菜', null],
      // 香辛料蔬菜
      ['大葱', 7, '/根', '香辛料蔬菜', null],
      ['小葱', 4, '/把', '香辛料蔬菜', null],
      ['蒜头', 5, '/条', '香辛料蔬菜', null],
      ['包装干葱头(红葱头)', 5, '/包', '香辛料蔬菜', null],
      ['香菜', 4, '/扎', '香辛料蔬菜', null],
      ['白洋葱', 5, '/个', '香辛料蔬菜', null],
      ['紫洋葱', 5, '/个', '香辛料蔬菜', null],
      // 蔬菜盲盒
      ['一斤蔬菜盲盒(2种随机)', 18, '/包', '蔬菜盲盒', null],
      ['两斤蔬菜盲盒(3种随机)', 25, '/包', '蔬菜盲盒', null],
      // 蛋类
      ['鸡蛋15枚', 25, '/盒', '蛋类', null],
      // 时令蔬果
      ['榴莲', 140, '/个', '时令蔬果(限定)', null],
      ['[已冻结]桑葚', 16, '/盒', '时令蔬果(限定)', null],
    ]

    let count = 0
    for (const [name, price, unit, catName, imgNum] of products) {
      const catId = catMap[catName]
      const image = imgNum ? `/images/products/p${imgNum}.jpg` : ''
      await env.DB.prepare(
        'INSERT INTO products (name, price, original_price, image, category_id, stock, is_new, is_hot, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(name, price, null, image, catId, 999, 0, 0, unit || '').run()
      count++
    }

    return json({ success: true, categories: categories.length, products: count })
  } catch (e) {
    return json({ error: e.message }, 500)
  }
}
