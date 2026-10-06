// 更新商品图片对应关系（正确版）
import { getAdminUser, json } from './_utils.js'

export async function onRequestPost(context) {
  const { request, env } = context
  const admin = await getAdminUser(request, env)
  if (!admin) return json({ error: '未授权' }, 401)

  const imageMap = {
    // 香辛料
    '大葱': '/images/products/p162.jpg',
    '小葱': '/images/products/p163.jpg',
    // 蛋类
    '鸡蛋15枚': '/images/products/p164.jpg',
    // 蔬菜
    '萝卜': '/images/products/p165.jpg',
    '茄子': '/images/products/p168.jpg',
    '芹菜': '/images/products/p169.jpg',
    '莴笋': '/images/products/p170.jpg',
    '娃娃菜': '/images/products/p171.jpg',
    '菜心': '/images/products/p173.jpg',
    '菜心苗': '/images/products/p174.jpg',
    '生菜': '/images/products/p175.jpg',
    '旺菜': '/images/products/p176.jpg',
    '椰菜': '/images/products/p177.jpg',
    '白菜仔': '/images/products/p178.jpg',
    '小唐菜': '/images/products/p179.jpg',
    '油麦菜': '/images/products/p180.jpg',
    '西兰花': '/images/products/p181.jpg',
    '白福花': '/images/products/p182.jpg',
    '白通菜': '/images/products/p183.jpg',
    '迷你娃娃菜': '/images/products/p184.jpg',
    '番薯': '/images/products/p185.jpg',
    '番茄': '/images/products/p189.jpg',
    '土豆': '/images/products/p190.jpg',
    '豆苗': '/images/products/p191.jpg',
    '油苦瓜': '/images/products/p192.jpg',
    '白萝卜': '/images/products/p193.jpg',
    '莲藕': '/images/products/p194.jpg',
    '玉米': '/images/products/p195.jpg',
    '青瓜': '/images/products/p196.jpg',
    '翠玉瓜': '/images/products/p197.jpg',
    // 香辛料
    '白洋葱': '/images/products/p205.jpg',
    // 水果
    '南水梨': '/images/products/p206.jpg',
    '秋月梨': '/images/products/p207.jpg',
    '鸭梨': '/images/products/p208.jpg',
    '士多啤梨': '/images/products/p209.jpg',
    '珍宝蓝莓': '/images/products/p210.jpg',
    '[已冻结]世界一富士苹果': '/images/products/p211.jpg',
    '牛油果': '/images/products/p212.jpg',
    '哈密瓜': '/images/products/p213.jpg',
    '串茄(高质小番茄)': '/images/products/p214.jpg',
    '火龙果': '/images/products/p215.jpg',
    '澳洲橙': '/images/products/p216.jpg',
    '富士苹果': '/images/products/p217.jpg',
    '椰皇': '/images/products/p219.jpg',
    '金柚子': '/images/products/p220.jpg',
    // 时令
    '榴莲': '/images/products/p172.jpg',
    '[已冻结]桑葚': '/images/products/p218.jpg',
  }

  let updated = 0
  for (const [name, image] of Object.entries(imageMap)) {
    const result = await env.DB.prepare('UPDATE products SET image = ? WHERE name = ?').bind(image, name).run()
    if (result.meta.changes > 0) updated++
  }

  return json({ success: true, updated })
}
