// 清空没有对应图片的商品image字段
import { getAdminUser, json } from './_utils.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '未授权' }, 401)

  // 这些商品没有对应图片，清空image字段显示默认图标
  const noImageProducts = [
    '西瓜', '蜜瓜', '香蕉', '百香果', '叶橙', '香梨', '棗油桃', '凯特芒果',
    '西梅', '韩国黄金梨', '蜜脆梨', '[已冻结]砂糖桔', '[已冻结]澳洲蜜梨',
    '[已冻结]燕窝果', '[已冻结]蜜桔',
    '韭菜', '长豆角', '佛手瓜', '西洋菜', '菠菜苗', '四季豆', '秋葵',
    '三色召', '生姜', '山药', '炖汤木瓜', '节瓜', '粉葛', '大丁苦瓜',
    '辣椒', '贝贝南瓜', '芋头', '角瓜', '螺丝椒', '尖青椒', '白菜',
    '龙芽叶', '冬瓜', '蒜头', '包装干葱头', '香菜', '紫洋葱',
    '一斤蔬菜盲盒', '两斤蔬菜盲盒'
  ]

  let cleared = 0
  for (const name of noImageProducts) {
    const result = await env.DB.prepare('UPDATE products SET image = ? WHERE name = ?').bind('', name).run()
    if (result.meta.changes > 0) cleared++
  }

  return json({ success: true, cleared })
}
