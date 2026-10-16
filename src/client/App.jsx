import { useState, useEffect } from 'react'
import { normalizePhone } from '../../functions/api/_phone.js'

const API = '/api'
const BOSS_WECHAT = 'jennybabi1988'
const displayOrderNo = order => String(order?.public_no ?? order?.id ?? '').padStart(2, '0')
const formatAmount = (amount, currency) => `${currency === 'HKD' ? 'HK$' : '¥'}${Number(amount || 0).toFixed(2)}`
const orderPaymentText = order => formatAmount(order.payment_amount ?? (Number(order.total) + Number(order.delivery_fee || 0)), order.payment_currency || 'CNY')
const BOSS_WHATSAPP = '+85295228191'
const GROUP_BUY_URL = 'https://order-system-bp4.pages.dev/'
const GROUP_BUY_SHARE_TEXT = `想买新鲜水果蔬菜的朋友，一起到珍珍优质果菜拼单吧！服务点自取免运费，凑满后统一配送，取货时间会在网站和群里通知。\n选菜链接：${GROUP_BUY_URL}`
const statusText = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }
const paymentText = { cash_on_delivery: '货到付款（现金）', wechat_transfer: '微信转账', alipay_transfer: '支付宝转账', fps_transfer: '转数快 FPS' }
const payStatusText = { pending: '待支付', paid: '已支付', confirmed: '已确认收款', refunded: '已退款' }

// ========== 多语言 ==========
const langPack = {
  zh_CN: { home:'首页',category:'分类',cart:'购物车',my:'我的',search:'搜索商品',welcome:'珍珍优质果菜',slogan:'新鲜果菜 · 自取免运费 · 凑满统一配送',groupBuy:'服务点凑单 满 ¥1000 统一配送',groupBuySlogan:'大家一起拼 越买越划算',hot:'热门推荐',pickPoint:'选择自取点',freeShipping:'满额免运费 · 该点统一配送',freeFee:'免运费',deliveryHome:'配送到家',deliveryHomeFee:'运费¥30',checkout:'确认订单',goodsAmount:'商品金额',shipping:'运费',submit:'提交订单',cancel:'取消',myOrders:'我的订单',viewAll:'查看全部 ›',address:'收货地址',contact:'联系客服',help:'配送规则 / 帮助',favorites:'我的收藏',logout:'退出登录',clickLogin:'点击登录',loginHint:'登录后查看订单和地址',login:'登录',register:'注册',back:'返回上一页',username:'账号',password:'密码',phone:'手机号',addToCart:'加入购物车',checkOut:'去结算',emptyCart:'购物车是空的',favoriteEmpty:'还没有收藏商品',groupRemain:'还差',buyExtra:'顺手买一件',groupProgress:'当前拼单进度',groupFull:'该自取点满 ¥1000，大家都免运费',introTitle:'下单前必读',introBtn:'我已知晓，开始购物',next:'下一步',gotIt:'我知道了',step1Title:'① 选自取点',step1Desc:'点左上角📍选你就近的自提点',step2Title:'② 逛商品加购物车',step2Desc:'点商品看详情，点+号加购',step3Title:'③ 凑单满额',step3Desc:'自取免运费，大家凑够¥1000后统一配送',step4Title:'④ 去结算',step4Desc:'选支付方式，扫码付款等配送',deliveryRule:'配送规则：自取免运费，大家凑满统一配送',details:'详情 ›',groupBuyBanner:'服务点凑单',youGet:'已达起送门槛，请留意配送公告',need:'起送',totalConfirmed:'已确认订单总额',ordersConfirmed:'笔订单已确认',all:'全部',emptySearch:'没有找到相关商品',emptyCat:'暂无商品',reached:'✓ 已达门槛，请留意公告',searchResult:'搜索"{kw}"的结果',feeTitle:'运费说明：',feeEach:'· 自取订单始终免运费，待该点凑满起送额后统一配送',feeFree:'· 该自取点已付款订单满 ¥1000 后统一配送',feeNoRefund:'· 未满门槛先等待；已付款订单可申请加费单独配送或退款',feePerOrder:'自取免运费 · 满 ¥1000 统一配送',ustFee:'自取免运费 · 满 ¥500 统一配送',ustBenefit2:'🎓 科技大学自取点满¥500统一配送，自取免运费',feeHint:'满额免运费 · 该点统一配送',confirmOrder:'确认订单',needPay:'待付款',paid:'已付款',selectPointFirst:'请先选择自取点',tagHot:'爆款',tagNew:'新品',noPhone:'未绑定手机号',comingSoon:'敬请期待',statusPending:'待付款',statusPaid:'已付款',statusShipped:'已发货',statusCompleted:'已完成',statusCancelled:'已取消',orderAll:'全部订单',orderPending:'待付款',orderGroup:'拼团中',orderShipping:'待收货',orderDone:'已完成',coupons:'优惠券',refundAfterSale:'退款售后',orderPcs:'件',orderTotal:'合计',noOrders:'暂无订单',orderNo:'订单号',orderStatus:'订单状态',clear:'清空' },
  zh_HK: { home:'首頁',category:'分類',cart:'購物車',my:'我的',search:'搜尋商品',welcome:'珍珍優質果菜',slogan:'新鮮果菜 · 自取免運費 · 湊滿統一配送',groupBuy:'服務點湊單 滿 ¥1000 統一配送',groupBuySlogan:'大家一起拼 越買越划算',hot:'熱門推薦',pickPoint:'選擇自取點',freeShipping:'滿額免運費 · 該點統一配送',freeFee:'免運費',deliveryHome:'配送到家',deliveryHomeFee:'運費¥30',checkout:'確認訂單',goodsAmount:'商品金額',shipping:'運費',submit:'提交訂單',cancel:'取消',myOrders:'我的訂單',viewAll:'查看全部 ›',address:'收貨地址',contact:'聯繫客服',help:'配送規則 / 幫助',favorites:'我的收藏',logout:'退出登錄',clickLogin:'點擊登錄',loginHint:'登錄後查看訂單和地址',login:'登錄',register:'註冊',back:'返回上一頁',username:'賬號',password:'密碼',phone:'手機號',addToCart:'加入購物車',checkOut:'去結算',emptyCart:'購物車是空的',favoriteEmpty:'還沒有收藏商品',groupRemain:'還差',buyExtra:'順手買一件',groupProgress:'當前拼單進度',groupFull:'該自取點滿 ¥1000，大家都免運費',introTitle:'下單前必讀',introBtn:'我已知曉，開始購物',next:'下一步',gotIt:'我知道了',step1Title:'① 選自取點',step1Desc:'點左上角📍選你就近的自提點',step2Title:'② 逛商品加購物車',step2Desc:'點商品看詳情，點+號加購',step3Title:'③ 湊單滿額',step3Desc:'自取免運費，大家湊夠¥1000後統一配送',step4Title:'④ 去結算',step4Desc:'選支付方式，掃碼付款等配送',deliveryRule:'配送規則：自取免運費，大家湊滿統一配送',details:'詳情 ›',groupBuyBanner:'服務點湊單',youGet:'已達起送門檻，請留意配送公告',need:'起送',totalConfirmed:'已確認訂單總額',ordersConfirmed:'筆訂單已確認',all:'全部',emptySearch:'沒有找到相關商品',emptyCat:'暫無商品',reached:'✓ 已達門檻，請留意公告',searchResult:'搜索"{kw}"的結果',feeTitle:'運費說明：',feeEach:'· 自取訂單一律免運費，待該點湊滿起送額後統一配送',feeFree:'· 該自取點已付款訂單滿 ¥1000 後統一配送',feeNoRefund:'· 未滿門檻先等待；已付款訂單可申請加費單獨配送或退款',feePerOrder:'自取免運費 · 滿 ¥1000 統一配送',ustFee:'自取免運費 · 滿 ¥500 統一配送',ustBenefit2:'🎓 科技大學自取點滿¥500統一配送，自取免運費',feeHint:'滿額免運費 · 該點統一配送',confirmOrder:'確認訂單',needPay:'待付款',paid:'已付款',selectPointFirst:'請先選擇自取點',tagHot:'爆款',tagNew:'新品',noPhone:'未綁定手機號',comingSoon:'敬請期待',statusPending:'待付款',statusPaid:'已付款',statusShipped:'已發貨',statusCompleted:'已完成',statusCancelled:'已取消',orderAll:'全部訂單',orderPending:'待付款',orderGroup:'拼團中',orderShipping:'待收貨',orderDone:'已完成',coupons:'優惠券',refundAfterSale:'退款售後',orderPcs:'件',orderTotal:'合計',noOrders:'暫無訂單',orderNo:'訂單號',orderStatus:'訂單狀態',clear:'清空' },
  en: { home:'Home',category:'Categories',cart:'Cart',my:'My Account',search:'Search products',welcome:'Zhenzhen Fresh',slogan:'Fresh produce · Free pickup · Group delivery',groupBuy:'Group delivery at ¥1000',groupBuySlogan:'Group together to save more',hot:'Popular Picks',pickPoint:'Pickup Point',freeShipping:'Free shipping at ¥1000',freeFee:'Free shipping',deliveryHome:'Home Delivery',deliveryHomeFee:'¥30',checkout:'Confirm Order',goodsAmount:'Subtotal',shipping:'Shipping',submit:'Place Order',cancel:'Cancel',myOrders:'My Orders',viewAll:'View all ›',address:'Address',contact:'Contact Us',help:'Delivery Info / Help',favorites:'Favorites',logout:'Log Out',clickLogin:'Tap to Login',loginHint:'Login to see orders',login:'Login',register:'Register',back:'Back',username:'Username',password:'Password',phone:'Phone',addToCart:'Add to Cart',checkOut:'Checkout',emptyCart:'Your cart is empty',favoriteEmpty:'No favorites yet',groupRemain:'Need',buyExtra:'Add one more',groupProgress:'Group progress',groupFull:'This point hits ¥1000 — free shipping!',introTitle:'Please Read First',introBtn:'Got it, shop now',next:'Next',gotIt:'Got it',step1Title:'1. Pick your point',step1Desc:'Tap 📍 top-left to choose',step2Title:'2. Browse & add',step2Desc:'Tap product to see, tap + to add',step3Title:'3. Group buy',step3Desc:'Pickup is free; group delivery starts at ¥1000',step4Title:'4. Checkout',step4Desc:'Choose payment, scan QR, wait',deliveryRule:'Free pickup; group ships when threshold reached',details:'Details ›',groupBuyBanner:'Group Buy Today',youGet:'Threshold reached; watch announcements',need:'to go',totalConfirmed:'Confirmed total',ordersConfirmed:'orders',all:'All',emptySearch:'No products found',emptyCat:'No products',reached:'✓ Threshold reached; watch notices',searchResult:'Results for "{kw}"',feeTitle:'Shipping info:',feeEach:'· Pickup is always free; orders ship together after the point reaches its threshold',feeFree:'· Deliver together when paid orders at this point reach ¥1000',feeNoRefund:'· If waiting, paid orders may request home delivery or a refund',feePerOrder:'Free pickup · group delivery at ¥1000',ustFee:'Free pickup · group delivery at ¥500',ustBenefit2:'🎓 UST pickup: free; group delivery at ¥500',feeHint:'Pickup is free; delivery follows group threshold',confirmOrder:'Confirm Order',needPay:'Pending',paid:'Paid',selectPointFirst:'Please select a pickup point',tagHot:'Hot',tagNew:'New',noPhone:'No phone linked',comingSoon:'Coming soon',statusPending:'To Pay',statusPaid:'Paid',statusShipped:'Shipped',statusCompleted:'Completed',statusCancelled:'Cancelled',orderAll:'All Orders',orderPending:'To Pay',orderGroup:'Group Buy',orderShipping:'To Receive',orderDone:'Completed',coupons:'Coupons',refundAfterSale:'Refund & After-sales',orderPcs:'items',orderTotal:'Total',noOrders:'No orders',orderNo:'Order No.',orderStatus:'Order Status',clear:'Clear' }
}

// ========== 商品名三语映射 ==========
const productNameMap = {
  '桑葚': { zh_HK:'桑椹', en:'Mulberry' },
  '榴莲': { zh_HK:'榴槤', en:'Durian' },
  '鸡蛋15枚': { zh_HK:'雞蛋15隻', en:'Eggs (15 pcs)' },
  '两斤蔬菜盲盒(3种随机)': { zh_HK:'兩斤蔬菜盲盒(3款隨機)', en:'Veggie Blind Box 2jin (3 random)' },
  '一斤蔬菜盲盒(2种随机)': { zh_HK:'一斤蔬菜盲盒(2款隨機)', en:'Veggie Blind Box 1jin (2 random)' },
  '紫洋葱': { zh_HK:'紫洋蔥', en:'Purple Onion' },
  '白洋葱': { zh_HK:'白洋蔥', en:'White Onion' },
  '香菜': { zh_HK:'芫荽', en:'Cilantro' },
  '包装干葱头(红葱头)': { zh_HK:'包裝乾蔥頭(紅蔥頭)', en:'Shallots (pack)' },
  '蒜头': { zh_HK:'蒜頭', en:'Garlic' },
  '小葱': { zh_HK:'蔥仔', en:'Spring Onion' },
  '大葱': { zh_HK:'大蔥', en:'Green Onion' },
  '冬瓜': { zh_HK:'冬瓜', en:'Winter Melon' },
  '龙芽叶': { zh_HK:'龍芽葉', en:'Dragon Tooth Leaves' },
  '白菜': { zh_HK:'白菜', en:'Napa Cabbage' },
  '尖青椒': { zh_HK:'尖青椒', en:'Green Chilli' },
  '螺丝椒': { zh_HK:'螺絲椒', en:'Screw Chilli' },
  '角瓜': { zh_HK:'角瓜', en:'Zucchini' },
  '芋头': { zh_HK:'芋頭', en:'Taro' },
  '贝贝南瓜': { zh_HK:'贝贝南瓜', en:'Butterball Pumpkin' },
  '辣椒': { zh_HK:'辣椒', en:'Chilli' },
  '大丁苦瓜': { zh_HK:'大丁苦瓜', en:'Bitter Melon' },
  '粉葛': { zh_HK:'粉葛', en:'Kudzu Root' },
  '节瓜(毛瓜)': { zh_HK:'節瓜(毛瓜)', en:'Hairy Gourd' },
  '炖汤木瓜': { zh_HK:'燉湯木瓜', en:'Cooking Papaya' },
  '山药': { zh_HK:'山藥', en:'Chinese Yam' },
  '豆苗': { zh_HK:'豆苗', en:'Pea Shoots' },
  '芹菜': { zh_HK:'芹菜', en:'Celery' },
  '茄子': { zh_HK:'茄子', en:'Eggplant' },
  '洋葱': { zh_HK:'洋蔥', en:'Onion' },
  '生姜': { zh_HK:'生薑', en:'Ginger' },
  '萝卜': { zh_HK:'蘿蔔', en:'Radish' },
  '三色召(彩椒)': { zh_HK:'三色椒(彩椒)', en:'Bell Peppers (3 colors)' },
  '秋葵(150g)': { zh_HK:'秋葵(150g)', en:'Okra (150g)' },
  '翠玉瓜': { zh_HK:'翠玉瓜', en:'Courgette' },
  '青瓜': { zh_HK:'青瓜', en:'Cucumber' },
  '玉米': { zh_HK:'玉米', en:'Sweet Corn' },
  '莲藕': { zh_HK:'蓮藕', en:'Lotus Root' },
  '白萝卜': { zh_HK:'白蘿蔔', en:'White Radish' },
  '油苦瓜': { zh_HK:'油苦瓜', en:'Oil Bitter Melon' },
  '土豆': { zh_HK:'土豆', en:'Potato' },
  '番茄': { zh_HK:'番茄', en:'Tomato' },
  '四季豆': { zh_HK:'四季豆', en:'Green Beans' },
  '番薯': { zh_HK:'番薯', en:'Sweet Potato' },
  '娃娃菜': { zh_HK:'娃娃菜', en:'Baby Bok Choy' },
  '迷你娃娃菜': { zh_HK:'迷你娃娃菜', en:'Mini Baby Bok Choy' },
  '白福花': { zh_HK:'白福花', en:'White Cauliflower' },
  '白通菜': { zh_HK:'白通菜', en:'Water Spinach' },
  '西兰花': { zh_HK:'西蘭花', en:'Broccoli' },
  '菜心': { zh_HK:'菜心', en:'Choy Sum' },
  '菜心苗': { zh_HK:'菜心苗', en:'Baby Choy Sum' },
  '生菜': { zh_HK:'生菜', en:'Lettuce' },
  '旺菜': { zh_HK:'旺菜', en:'Wong Choy' },
  '椰菜': { zh_HK:'椰菜', en:'Cabbage' },
  '白菜仔': { zh_HK:'白菜仔', en:'Baby Napa' },
  '小唐菜': { zh_HK:'小唐菜', en:'Xiao Tang Choy' },
  '油麦菜': { zh_HK:'油麥菜', en:'Leaf Lettuce' },
  '莴笋': { zh_HK:'萵筍', en:'Celtuce' },
  '菠菜苗': { zh_HK:'菠菜苗', en:'Baby Spinach' },
  '西洋菜': { zh_HK:'西洋菜', en:'Watercress' },
  '佛手瓜': { zh_HK:'佛手瓜', en:'Chayote' },
  '长豆角': { zh_HK:'長豆角', en:'Long Beans' },
  '韭菜(约300g)': { zh_HK:'韭菜(約300g)', en:'Chinese Chives (~300g)' },
  '蜜脆梨': { zh_HK:'蜜脆梨', en:'Honey Crisp Pear' },
  '韩国黄金梨': { zh_HK:'韓國黃金梨', en:'Korean Golden Pear' },
  '西梅': { zh_HK:'西梅', en:'Prune' },
  '凯特芒果': { zh_HK:'凱特芒果', en:'Keitt Mango' },
  '棗油桃': { zh_HK:'棗油桃', en:'Nectarine' },
  '香梨': { zh_HK:'香梨', en:'Fragrant Pear' },
  '士多啤梨': { zh_HK:'士多啤梨', en:'Strawberry' },
  '金柚子': { zh_HK:'金柚子', en:'Pomelo' },
  '椰皇': { zh_HK:'椰皇', en:'Young Coconut' },
  '珍宝蓝莓': { zh_HK:'珍寶藍莓', en:'Jumbo Blueberries' },
  '哈密瓜': { zh_HK:'哈密瓜', en:'Hami Melon' },
  '牛油果': { zh_HK:'牛油果', en:'Avocado' },
  '火龙果': { zh_HK:'火龍果', en:'Dragon Fruit' },
  '串茄(高质小番茄)': { zh_HK:'串茄(高質小番茄)', en:'Cherry Tomatoes on Vine' },
  '富士苹果': { zh_HK:'富士蘋果', en:'Fuji Apple' },
  '鸭梨': { zh_HK:'鴨梨', en:'Ya Pear' },
  '秋月梨': { zh_HK:'秋月梨', en:'Akizuki Pear' },
  '南水梨': { zh_HK:'南水梨', en:'Nanshui Pear' },
  '澳洲橙': { zh_HK:'澳洲橙', en:'Australian Orange' },
  '叶橙': { zh_HK:'葉橙', en:'Leaf Orange' },
  '百香果': { zh_HK:'百香果', en:'Passion Fruit' },
  '香蕉': { zh_HK:'香蕉', en:'Banana' },
  '蜜瓜': { zh_HK:'蜜瓜', en:'Honeydew' },
  '西瓜': { zh_HK:'西瓜', en:'Watermelon' }
}
const getProdName = (pname) => pname
// 实际用组件内的函数

// ========== 分类名三语映射 ==========
const categoryNameMap = {
  '水果': { zh_HK:'水果', en:'Fruits' },
  '蔬菜': { zh_HK:'蔬菜', en:'Vegetables' },
  '香辛料蔬菜': { zh_HK:'香辛料蔬菜', en:'Aromatics & Spices' },
  '叶菜·花菜': { zh_HK:'葉菜·花菜', en:'Leafy Greens & Flower Vegetables' },
  '瓜果类蔬菜': { zh_HK:'瓜果類蔬菜', en:'Fruit Vegetables' },
  '根茎·茎菜': { zh_HK:'根莖·莖菜', en:'Roots & Stems' },
  '葱姜蒜·香草': { zh_HK:'蔥薑蒜·香草', en:'Alliums & Herbs' },
  '豆类·玉米': { zh_HK:'豆類·粟米', en:'Beans & Corn' },
  '蔬菜盲盒': { zh_HK:'蔬菜盲盒', en:'Veggie Blind Box' },
  '蛋类': { zh_HK:'蛋類', en:'Eggs' },
  '菌菇': { zh_HK:'菌菇', en:'Mushrooms' }
}

// ========== 自取点三语映射 ==========
const pointNameMap = {
  '日出康城站': { zh_HK:'日出康城站', en:'Lohas Park Station' },
  '科技大学': { zh_HK:'科技大學', en:'HKUST' },
  '坑口地铁站': { zh_HK:'坑口地鐵站', en:'Hang Hau Station' },
  '宝琳站': { zh_HK:'寶琳站', en:'Po Lam Station' },
  '将军澳站': { zh_HK:'將軍澳站', en:'Tseung Kwan O Station' },
  '调景岭站': { zh_HK:'調景嶺站', en:'Tiu Keng Leng Station' },
  // 地址
  '港铁日出康城站': { zh_HK:'港鐵日出康城站', en:'MTR Lohas Park Station' },
  '香港科技大学': { zh_HK:'香港科技大學', en:'The Hong Kong University of Science and Technology' },
  '港铁坑口站': { zh_HK:'港鐵坑口站', en:'MTR Hang Hau Station' },
  '港铁宝琳站': { zh_HK:'港鐵寶琳站', en:'MTR Po Lam Station' },
  '港铁将军澳站': { zh_HK:'港鐵將軍澳站', en:'MTR Tseung Kwan O Station' },
  '港铁调景岭站': { zh_HK:'港鐵調景嶺站', en:'MTR Tiu Keng Leng Station' }
}

// 带鉴权的 fetch
function authFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

async function uploadProofFile(file, orderId) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return '请选择 PNG、JPEG 或 WebP 图片'
  const original = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  let screenshot = original
  if (file.size > 1024 * 1024) {
    screenshot = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onerror = () => reject(new Error('无法读取截图，请换一张图片'))
      image.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
        canvas.width = Math.max(1, Math.round(image.width * scale))
        canvas.height = Math.max(1, Math.round(image.height * scale))
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        for (const quality of [0.82, 0.68, 0.5]) {
          const compressed = canvas.toDataURL('image/jpeg', quality)
          if (compressed.length < 1300000) return resolve(compressed)
        }
        reject(new Error('截图过大，请裁剪后重试'))
      }
      image.src = original
    })
  }
  const response = await authFetch(`${API}/orders/upload-proof`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, screenshot })
  })
  if (response.ok) return null
  const data = await response.json().catch(() => ({}))
  return data.error || '上传失败，请重试'
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [orderFilter, setOrderFilter] = useState('all')
  const [currentUser, setCurrentUser] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [cart, setCart] = useState({})
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orders, setOrders] = useState([])
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [selectedAddrId, setSelectedAddrId] = useState(null)
  const [editingAddr, setEditingAddr] = useState(null)
  const [toast, setToast] = useState('')
  const [bannerIdx, setBannerIdx] = useState(0)
  const [bannerPaused, setBannerPaused] = useState(false)
  const [checkoutAddrId, setCheckoutAddrId] = useState(null)
  const [remark, setRemark] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('wechat_transfer')
  const [showPaymentQR, setShowPaymentQR] = useState(false)
  const [paidOrderNo, setPaidOrderNo] = useState('')
  const [paidOrderAmount, setPaidOrderAmount] = useState(0)
  const [paidOrderCurrency, setPaidOrderCurrency] = useState('CNY')
  const [lastOrderId, setLastOrderId] = useState(null)
  const [showUploadProof, setShowUploadProof] = useState(false)
  const [proofFile, setProofFile] = useState(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [stats, setStats] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [seenNoticeIds, setSeenNoticeIds] = useState([])
  const [deliveryPoints, setDeliveryPoints] = useState([])
  const [selectedPointId, setSelectedPointId] = useState(() => localStorage.getItem('selectedPointId') || null)
  const [showPointPicker, setShowPointPicker] = useState(false)
  const [deliveryType, setDeliveryType] = useState('pickup')
  const [ustBenefit, setUstBenefit] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorites') || '[]'))
  const [searchHistory, setSearchHistory] = useState(() => JSON.parse(localStorage.getItem('searchHistory') || '[]'))
  const [showHelp, setShowHelp] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [couponData, setCouponData] = useState({ campaigns: [], grants: [], claims: [] })
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showBrand, setShowBrand] = useState(false)
  const [showActivityReturnGuide, setShowActivityReturnGuide] = useState(false)
  const [activityProofFile, setActivityProofFile] = useState(null)
  const [returnToActivityAfterLogin, setReturnToActivityAfterLogin] = useState(false)
  const [claimUploading, setClaimUploading] = useState(false)
  const [selectedCouponId, setSelectedCouponId] = useState('')
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh_CN')
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || '')
  const [paymentCurrency, setPaymentCurrency] = useState('CNY')
  const [exchangeRate, setExchangeRate] = useState(1.2)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)

  const t = (key) => langPack[lang][key] || key
  const fmt = (rmbPrice) => {
    const n = Number(rmbPrice) || 0
    if (currency === 'HKD') return 'HK$' + (n * exchangeRate).toFixed(2)
    return '¥' + n.toFixed(2)
  }
  const ruleText = (key, threshold = 1000) => t(key)
    .replaceAll('¥1000', fmt(threshold))
    .replaceAll('¥30', fmt(30))
  const pn = (pname) => {
    if (lang === 'zh_CN') return pname
    const m = productNameMap[pname]
    return (m && m[lang]) || pname
  }
  const cn = (cname) => {
    if (lang === 'zh_CN') return cname
    const m = categoryNameMap[cname]
    return (m && m[lang]) || cname
  }
  const dn = (pname) => {
    if (lang === 'zh_CN') return pname
    const m = pointNameMap[pname]
    return (m && m[lang]) || pname
  }
  const priceText = (p) => {
    return fmt(p.price)
  }
  const unitText = (p) => {
    const raw = String(p?.unit || '').trim()
    if (raw && raw !== '/斤') return raw.startsWith('/') ? raw : `/${raw}`
    const legacy = String(p?.description || '').trim()
    if (/^\/[\u4e00-\u9fff\d]+$/.test(legacy)) return legacy
    return raw
  }
  const hasVariants = (p) => {
    try { return p.variants && JSON.parse(p.variants).length > 0 } catch(e) { return false }
  }
  const quickAdd = (p) => {
    if (p.is_active === false) return
    if (hasVariants(p)) { setSelectedProduct(p); setSelectedVariant(null); return }
    addToCart(p.id)
  }
  const statusTxt = { pending: t('statusPending'), awaiting_confirmation: lang === 'en' ? 'To Confirm' : lang === 'zh_HK' ? '待確認' : '待确认', paid: t('statusPaid'), shipped: t('statusShipped'), completed: t('statusCompleted'), cancelled: t('statusCancelled') }

  const switchLang = (l) => {
    setLang(l)
    localStorage.setItem('lang', l)
  }

  // 首次进入显示新手指引 + 注意事项
  useEffect(() => {
    if (!localStorage.getItem('intro_read')) {
      setShowOnboard(true)
    }
  }, [])

  // 初始化：用本地 token 调用 /api/me 验证登录状态
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authFetch(`${API}/me`).then(r => {
        if (r.ok) return r.json()
        throw new Error('invalid token')
      }).then(user => {
        setCurrentUser(user)
      }).catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('currentUser')
      })
    }
  }, [])

  // 登录后加载地址和订单
  useEffect(() => {
    if (currentUser) {
      const addrKey = `addrs_${currentUser.username}`
      const saved = localStorage.getItem(addrKey)
      const list = saved ? JSON.parse(saved) : []
      setAddresses(list)
      const def = list.find(a => a.isDefault) || list[0]
      if (def) setSelectedAddrId(def.id)
      // 带 token 获取当前用户订单
      authFetch(`${API}/orders`).then(r => r.ok ? r.json() : []).then(setOrders)
    } else {
      setOrders([])
      setAddresses([])
    }
  }, [currentUser])

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.json()).then(setProducts)
    fetch(`${API}/categories`).then(r => r.json()).then(setCategories)
    fetch(`${API}/settings`).then(r => r.json()).then(d => setExchangeRate(d.exchange_rate || 1.2)).catch(()=>{})
    if (!localStorage.getItem('currency')) setShowOnboard(true)
    if (new URLSearchParams(window.location.search).get('activity') === 'share') setShowActivity(true)
  }, [])

  useEffect(() => {
    if (bannerPaused) return
    const t = setInterval(() => setBannerIdx(i => (i + 1) % 3), 6500)
    return () => clearInterval(t)
  }, [bannerPaused])

  const loadCoupons = () => {
    setCouponLoading(true)
    setCouponError(false)
    return authFetch(`${API}/coupons`)
      .then(r => { if (!r.ok) throw new Error('无法读取优惠券'); return r.json() })
      .then(data => { setCouponData(data); setCouponLoading(false) })
      .catch(() => { setCouponError(true); setCouponLoading(false) })
  }
  useEffect(() => { if (tab === 'coupons' || showActivity || showCheckout) loadCoupons() }, [tab, showActivity, showCheckout, currentUser])

  // 加载配送点列表
  useEffect(() => {
    fetch(`${API}/delivery-points`).then(r => r.json()).then(points => {
      setDeliveryPoints(points)
      if (!localStorage.getItem('selectedPointId')) setShowPointPicker(true)
    }).catch(() => {})
  }, [])

  // 加载凑单统计 + 每5秒刷新（按当前配送点）
  const loadStats = () => {
    const pid = localStorage.getItem('selectedPointId')
    const url = pid ? `${API}/stats?point=${pid}` : `${API}/stats`
    return fetch(url).then(r => r.json()).then(setStats).catch(() => {})
  }
  useEffect(() => {
    loadStats()
    const t = setInterval(loadStats, 5000)
    return () => clearInterval(t)
  }, [selectedPointId])

  useEffect(() => {
    const point = selectedPointId ? `?point=${selectedPointId}` : ''
    const refresh = () => fetch(`${API}/announcements${point}`).then(r => r.ok ? r.json() : []).then(setAnnouncements).catch(() => {})
    refresh()
    const timer = setInterval(refresh, 60000)
    return () => clearInterval(timer)
  }, [selectedPointId])
  useEffect(() => {
    try { setSeenNoticeIds(JSON.parse(localStorage.getItem(`seenNotices_${currentUser?.id || 'guest'}_${selectedPointId || 'all'}`) || '[]')) }
    catch { setSeenNoticeIds([]) }
  }, [currentUser?.id, selectedPointId])

  // 切回首页时也刷新一次
  useEffect(() => {
    if (tab === 'home') loadStats()
  }, [tab])

  const selectPoint = (pid) => {
    localStorage.setItem('selectedPointId', String(pid))
    setSelectedPointId(String(pid))
    setShowPointPicker(false)
    loadStats()
    // 科技大学自取规则提示
    const point = deliveryPoints.find(p => p.id == pid)
    if (point && (point.name.includes('科技大学') || point.name.includes('科大') || point.name.includes('UST'))) {
      setUstBenefit(true)
    }
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800) }

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast(`${label || text} 已复制`)
    } catch (e) {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast(`${label || text} 已复制`)
    }
  }

  const openActivity = () => {
    setShowActivityReturnGuide(false)
    setShowActivity(true)
    const url = new URL(window.location.href)
    url.searchParams.set('activity', 'share')
    window.history.replaceState({}, '', url)
  }

  const closeActivity = () => {
    if (claimUploading) { showToast('正在上传截图，请稍候'); return }
    setShowActivity(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('activity')
    window.history.replaceState({}, '', url)
    const hasClaim = activityCampaign && couponData.claims.some(c => Number(c.campaign_id) === Number(activityCampaign.id) && c.status !== 'rejected')
    if (!hasClaim) setShowActivityReturnGuide(true)
  }

  const submitCouponScreenshot = async (file) => {
    if (!file || !activityCampaign || claimUploading) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { showToast('请上传图片截图'); return }
    setClaimUploading(true)
    try {
      const screenshot = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('无法读取截图'))
        reader.onload = () => {
          const img = new Image()
          img.onerror = () => reject(new Error('截图格式无效'))
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const scale = Math.min(1, 1400 / Math.max(img.width, img.height))
            canvas.width = Math.round(img.width * scale)
            canvas.height = Math.round(img.height * scale)
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
            let data = canvas.toDataURL('image/jpeg', 0.75)
            if (data.length > 1300000) data = canvas.toDataURL('image/jpeg', 0.5)
            if (data.length > 1300000) return reject(new Error('截图过大，请裁剪后重试'))
            resolve(data)
          }
          img.src = reader.result
        }
        reader.readAsDataURL(file)
      })
      const response = await authFetch(`${API}/coupons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaign_id: activityCampaign.id, screenshot }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '上传失败')
      setActivityProofFile(null)
      await loadCoupons()
      showToast('截图已提交，请等待后台审核')
    } catch (error) { showToast(error.message) }
    finally { setClaimUploading(false) }
  }

  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      localStorage.setItem('favorites', JSON.stringify(next))
      return next
    })
    showToast(favorites.includes(id) ? '已取消收藏' : '已收藏')
  }

  const saveSearchHistory = (kw) => {
    if (!kw) return
    setSearchHistory(prev => {
      const next = [kw, ...prev.filter(h => h !== kw)].slice(0, 8)
      localStorage.setItem('searchHistory', JSON.stringify(next))
      return next
    })
  }

  const saveAddresses = (list) => {
    if (!currentUser) return
    localStorage.setItem(`addrs_${currentUser.username}`, JSON.stringify(list))
    setAddresses(list)
  }

  const filteredProducts = products.filter(p => {
    if (activeCategory && p.category_id !== activeCategory) return false
    if (search && !p.name.includes(search)) return false
    return true
  })

  const addToCart = (id, variantLabel, variantPrice) => {
    const key = variantLabel ? `${id}::${variantLabel}` : String(id)
    setCart(prev => ({ ...prev, [key]: Math.min((prev[key] || 0) + 1, 99) }))
    showToast('已加入购物车')
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartItems = Object.entries(cart)
    .map(([key, qty]) => {
      const [pidStr, vLabel] = key.split('::')
      const product = products.find(p => p.id === Number(pidStr))
      if (!product) return null
      let variants = []
      try { variants = product.variants ? JSON.parse(product.variants) : [] } catch(e) {}
      const variant = vLabel ? variants.find(v => v.label === vLabel) : null
      const price = variant ? variant.price : product.price
      return { product, qty, variantLabel: vLabel || '', variantPrice: price }
    })
    .filter(item => item.product)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.variantPrice * item.qty, 0)
  const selectedCoupon = couponData.grants.find(g => String(g.id) === String(selectedCouponId) && !g.used_order_no && cartTotal >= Number(g.min_spend))
  const couponDiscount = selectedCoupon ? Number(selectedCoupon.discount_amount) : 0
  const activityCampaign = couponData.campaigns.find(c => Number(c.id) === 1) || couponData.campaigns[0]
  const currentPoint = deliveryPoints.find(p => p.id == selectedPointId)
  const effectiveFee = deliveryType === 'delivery' ? 30 : 0
  const checkoutCnyTotal = cartTotal + effectiveFee - couponDiscount
  const checkoutPayAmount = paymentCurrency === 'HKD' ? Math.round(checkoutCnyTotal * exchangeRate * 100) / 100 : checkoutCnyTotal
  const effectiveThreshold = stats?.threshold || 1000
  const effectiveReached = stats ? stats.confirmed_total >= effectiveThreshold : false
  const unreadNotices = announcements.filter(n => !seenNoticeIds.includes(n.id))
  const unpaidOrders = orders.filter(o => o.status === 'pending' && o.payment_status === 'pending' && o.payment_method !== 'cash_on_delivery')
  const noticeStorageKey = `seenNotices_${currentUser?.id || 'guest'}_${selectedPointId || 'all'}`
  const markNoticesRead = () => {
    const ids = [...new Set([...seenNoticeIds, ...announcements.map(n => n.id)])]
    setSeenNoticeIds(ids)
    localStorage.setItem(noticeStorageKey, JSON.stringify(ids))
  }
  const featuredIds = [95, 48, 56, 57, 13, 20, 115, 93]
  const featuredProducts = [...featuredIds.map(id => products.find(p => p.id === id)).filter(p => p && p.is_active !== false), ...products.filter(p => p.is_active !== false && p.is_hot && !featuredIds.includes(p.id))].slice(0, 8)

  const updateQty = (id, delta) => {
    setCart(prev => {
      const next = { ...prev }
      next[id] = Math.min((next[id] || 0) + delta, 99)
      if (next[id] <= 0) delete next[id]
      return next
    })
  }

  const requireLogin = () => {
    if (!currentUser) {
      showToast('请先登录')
      setTab('login')
      return false
    }
    return true
  }

  const submitOrder = async () => {
    if (!requireLogin()) return
    if (cartItems.length === 0) { showToast('请先选择商品'); return }
    let customer = '', phone = '', address = ''
    if (deliveryType === 'pickup') {
      if (!selectedPointId) { showToast(t('selectPointFirst')); setShowPointPicker(true); return }
      const pt = deliveryPoints.find(p => p.id == selectedPointId)
      customer = currentUser?.phone || ''
      address = `自取点：${pt?.name || ''}`
    } else {
      const addr = addresses.find(a => a.id === checkoutAddrId)
      if (!addr) { showToast('请选择收货地址'); return }
      customer = addr.name
      phone = addr.phone
      address = addr.detail
    }
    const res = await authFetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer, phone, address, remark,
        payment_method: paymentMethod,
        payment_currency: paymentCurrency,
        expected_cny_total: checkoutCnyTotal,
        expected_payment_amount: checkoutPayAmount,
        delivery_type: deliveryType,
        delivery_point_id: deliveryType === 'pickup' ? selectedPointId : null,
        coupon_grant_id: selectedCoupon?.id || null,
        items: cartItems.map(item => ({ product_id: item.product.id, quantity: item.qty, variant: item.variantLabel || '' }))
      })
    })
    if (res.ok) {
      const data = await res.json()
      showToast('下单成功！')
      setCart({})
      setShowCheckout(false)
      setRemark('')
      setSelectedCouponId('')
      loadCoupons()
      authFetch(`${API}/orders`).then(r => r.ok ? r.json() : []).then(setOrders)
      setPaidOrderNo(displayOrderNo(data))
      setPaidOrderAmount(Number(data.payment_amount ?? (Number(data.total) + Number(data.delivery_fee || 0))))
      setPaidOrderCurrency(data.payment_currency || 'CNY')
      setLastOrderId(data.id)
      setShowPaymentQR(true)
    } else {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || '下单失败')
    }
  }

  const handleLogin = async (phone, password) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    })
    const data = await res.json()
    if (!res.ok) return data.error || '登录失败'
    localStorage.setItem('token', data.token)
    localStorage.setItem('currentUser', JSON.stringify({ username: data.username, phone: data.phone }))
    setCurrentUser({ username: data.username, phone: data.phone })
    if (returnToActivityAfterLogin) {
      setReturnToActivityAfterLogin(false)
      setTab('home')
      openActivity()
    } else setTab('my')
    showToast('登录成功')
  }

  const handleRegister = async (phone, password) => {
    if (!phone || !password) return '请填写手机号和密码'
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    })
    const data = await res.json()
    if (!res.ok) return data.error || '注册失败'
    localStorage.setItem('token', data.token)
    localStorage.setItem('currentUser', JSON.stringify({ username: data.username, phone: data.phone }))
    setCurrentUser({ username: data.username, phone: data.phone })
    if (returnToActivityAfterLogin) {
      setReturnToActivityAfterLogin(false)
      setTab('home')
      openActivity()
    } else setTab('my')
    showToast('注册成功')
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
    setCart({})
    setTab('home')
    showToast('已退出登录')
  }

  const saveAddress = (addr) => {
    let list = [...addresses]
    if (addr.id) {
      list = list.map(a => a.id === addr.id ? addr : a)
    } else {
      addr.id = Date.now()
      if (list.length === 0) addr.isDefault = true
      list.push(addr)
    }
    if (addr.isDefault) {
      list = list.map(a => ({ ...a, isDefault: a.id === addr.id }))
    }
    saveAddresses(list)
    setEditingAddr(null)
    setTab('address')
    showToast('地址已保存')
  }

  const deleteAddress = (id) => {
    const list = addresses.filter(a => a.id !== id)
    saveAddresses(list)
    if (selectedAddrId === id) setSelectedAddrId(list[0]?.id || null)
    showToast('已删除')
  }

  const openCheckout = () => {
    if (!requireLogin()) return
    if (cartCount === 0) { showToast('购物车是空的'); return }
    const def = addresses.find(a => a.isDefault) || addresses[0]
    setCheckoutAddrId(def?.id || null)
    setPaymentCurrency(currency || 'CNY')
    setPaymentMethod(currency === 'HKD' ? 'fps_transfer' : 'wechat_transfer')
    setShowCart(false)
    setCouponLoading(true)
    setShowCheckout(true)
  }

  // ========== 渲染 ==========
  if (tab === 'login') {
    return <LoginPage t={t} lang={lang} onLogin={handleLogin} onRegister={handleRegister} onBack={() => setTab('my')} />
  }

  if (tab === 'orderDetail' && selectedOrder) {
    return <OrderDetailPage order={selectedOrder} onBack={() => setTab('myOrders')} pn={pn} fmt={fmt} t={t} statusTxt={statusTxt} showToast={showToast} onRefresh={async () => {
      const response = await authFetch(`${API}/orders`)
      if (response.ok) {
        const next = await response.json()
        setOrders(next)
        setSelectedOrder(next.find(o => o.id === selectedOrder.id) || selectedOrder)
      }
      loadStats()
    }} />
  }

  if (tab === 'address') {
    return (
      <AddressPage
        addresses={addresses}
        selectedId={selectedAddrId}
        onSelect={setSelectedAddrId}
        onEdit={(addr) => { setEditingAddr(addr); setTab('addrEdit') }}
        onAdd={() => { setEditingAddr(null); setTab('addrEdit') }}
        onDelete={deleteAddress}
        onBack={() => setTab('my')}
      />
    )
  }

  if (tab === 'addrEdit') {
    return <AddressEditPage addr={editingAddr} onSave={saveAddress} onBack={() => setTab('address')} />
  }

  if (tab === 'favorites') {
    const favProducts = products.filter(p => favorites.includes(p.id))
    return (
      <div>
        <div className="back-btn" onClick={() => setTab('my')}>‹ 返回</div>
        <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>❤️ 我的收藏</h3>
        <div className="product-grid" style={{ padding: '0 12px 80px' }}>
          {favProducts.map(p => (
            <div className="product-card" key={p.id} onClick={() => { setTab('home'); setSelectedProduct(p); setSelectedVariant(null) }}>
              <div className="emoji">
                {p.image ? <img src={p.image} alt={p.name} /> : <span className="product-no-image">{pn(p.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}
                <span onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id) }} style={{
                  position: 'absolute', top: 6, right: 6, fontSize: 16,
                  background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>❤️</span>
              </div>
              <div className="info">
                <div className="name">{pn(p.name)}</div>
                <div className="bottom-row">
                  <div className="price-stack"><div className="price">{priceText(p)}</div><small className="product-unit">{unitText(p)}</small></div>
                  <button className={`add-btn ${hasVariants(p) ? 'variant-add-btn' : ''}`} aria-label={`${hasVariants(p) ? '选择规格' : '加入购物车'}：${pn(p.name)}`} onClick={(e) => { e.stopPropagation(); setTab('home'); quickAdd(p) }}>{hasVariants(p) ? '选规格' : '+'}</button>
                </div>
              </div>
            </div>
          ))}
          {favProducts.length === 0 && <div className="empty-state" style={{gridColumn: '1/-1'}}><div className="icon">💔</div>还没有收藏商品</div>}
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* 顶部栏 - 去掉服务点 */}
      <div className={`top-bar ${tab !== 'home' ? 'top-bar-compact' : ''}`}>
        {tab === 'home' && (
        <div className="top-bar-main">
          <strong className="shop-wordmark">{t('welcome')}</strong>
          {deliveryPoints.length > 0 && (
            <div className="header-location" onClick={() => setShowPointPicker(true)}>
              <span>{t('pickPoint')}</span><b>{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || t('pickPoint')}</b>
              <span aria-hidden="true">⌄</span>
            </div>
          )}
          <div className="header-options">
            {Object.entries({ zh_CN:'简', zh_HK:'繁', en:'EN' }).map(([k,v]) => (
              <span key={k} onClick={() => switchLang(k)} className={`header-option ${lang === k ? 'active' : ''}`}>{v}</span>
            ))}
            <span className="display-currency-label">{lang === 'en' ? 'View prices' : lang === 'zh_HK' ? '看價幣種' : '看价币种'}</span>
            <span onClick={() => {
              const c = currency === 'HKD' ? 'CNY' : 'HKD'
              setCurrency(c); localStorage.setItem('currency', c)
            }} className="currency-switch">
              <span className={currency === 'HKD' ? 'active' : ''}>HK$ HKD</span>
              <span className={currency === 'CNY' ? 'active' : ''}>¥ CNY</span>
            </span>
          </div>
        </div>
        )}
        {(tab === 'category' || search) && (
        <>
        <div className="category-search-label">{lang === 'en' ? 'Find a product' : '找商品'}</div>
        <form className="search-box" role="search" onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); if (searchInput.trim()) saveSearchHistory(searchInput.trim()); setActiveCategory(null); setTab('category') }}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input
            aria-label={t('search')}
            placeholder={lang === 'en' ? 'Search fruit, vegetables…' : lang === 'zh_HK' ? '搜尋商品，例如番茄、蘋果' : '搜索商品，例如番茄、苹果'}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button type="button" className="search-clear" onClick={() => { setSearchInput(''); setSearch('') }}>{lang === 'en' ? 'Clear' : '清除'}</button>
          )}
          <button type="submit" className="search-submit">{lang === 'en' ? 'Search' : lang === 'zh_HK' ? '搜尋' : '搜索'}</button>
        </form>
        {searchHistory.length > 0 && !searchInput && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>热门:</span>
            {searchHistory.map(h => (
              <span key={h} style={{ fontSize: 12, background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 10, cursor: 'pointer' }}
                onClick={() => { setSearchInput(h); setSearch(h); saveSearchHistory(h) }}>
                {h}
              </span>
            ))}
          </div>
        )}
        </>
        )}
      </div>

      {tab === 'home' && (
        <>
          <div className="banner">
            <div className={`hero-poster hero-poster-${bannerIdx}`} role="button" tabIndex={0}
              aria-label={bannerIdx === 0 ? '查看服务点凑单规则' : bannerIdx === 1 ? '了解珍珍优质果菜' : '打开分享团购活动'}
              onPointerDown={() => setBannerPaused(true)} onFocus={() => setBannerPaused(true)}
              onClick={() => { if (bannerIdx === 0) setShowHelp(true); else if (bannerIdx === 1) setShowBrand(true); else openActivity() }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (bannerIdx === 0) setShowHelp(true); else if (bannerIdx === 1) setShowBrand(true); else openActivity() } }}>
              {bannerIdx === 0 && <>
                <div className="hero-message">
                  <span className="hero-kicker">{lang === 'en' ? 'GROUP PICKUP' : lang === 'zh_HK' ? '服務點湊單' : '服务点凑单'}</span>
                  <h2>{lang === 'en' ? 'Free pickup' : lang === 'zh_HK' ? '自取免運費' : '自取免运费'}</h2>
                  <p>{lang === 'en' ? 'Orders at the same point add up for one delivery.' : lang === 'zh_HK' ? '同一服務點大家一起湊滿，統一配送。' : '同一服务点大家一起凑满，统一配送。'}</p>
                  <span className="hero-link">{lang === 'en' ? 'Delivery rules' : lang === 'zh_HK' ? '看配送規則' : '看配送规则'} <span aria-hidden="true">↗</span></span>
                </div>
                <div className="hero-visual hero-visual-threshold" aria-label={lang === 'en' ? `This point delivers from ¥${effectiveThreshold} CNY` : `本站点合计满 ¥${effectiveThreshold} CNY 配送`}>
                  <span>{lang === 'en' ? 'THIS POINT' : lang === 'zh_HK' ? '本站點合計滿' : '本站点合计满'}</span>
                  <strong>¥{effectiveThreshold}</strong>
                  <small>CNY</small>
                  <i aria-hidden="true" />
                </div>
              </>}
              {bannerIdx === 1 && <>
                <div className="hero-message">
                  <span className="hero-kicker">ZHENZHEN FRESH</span>
                  <h2>{t('welcome')}</h2>
                  <p>{lang === 'en' ? 'Fruit, vegetables and daily favourites in one place.' : lang === 'zh_HK' ? '水果、蔬菜、日常食材，一站挑選。' : '水果、蔬菜、日常食材，一站挑选。'}</p>
                  <span className="hero-link">{lang === 'en' ? 'About us' : lang === 'zh_HK' ? '認識珍珍' : '认识珍珍'} <span aria-hidden="true">↗</span></span>
                </div>
                <div className="hero-visual hero-visual-produce" aria-hidden="true"><img src="/images/market-hero.jpg" alt="" /></div>
              </>}
              {bannerIdx === 2 && <>
                <div className="hero-message">
                  <span className="hero-kicker">{lang === 'en' ? 'SHARE & SAVE' : lang === 'zh_HK' ? '分享團購活動' : '分享团购活动'}</span>
                  <h2>{lang === 'en' ? 'Share for a coupon' : lang === 'zh_HK' ? '分享團購，領券' : '分享团购，领券'}</h2>
                  <p>{lang === 'en' ? 'Share on any social platform, get 10 likes and upload a screenshot.' : lang === 'zh_HK' ? '任意社交平台分享集滿 10 讚，截圖審核後領券。' : '任意社交平台分享集满 10 赞，截图审核后领券。'}</p>
                  <span className="hero-link">{lang === 'en' ? 'See the offer' : lang === 'zh_HK' ? '查看活動' : '查看活动'} <span aria-hidden="true">↗</span></span>
                </div>
                <div className="hero-visual hero-visual-coupon" aria-label={lang === 'en' ? `${activityCampaign?.discount_amount || 5} CNY off when spending ${activityCampaign?.min_spend || 15} CNY` : `满 ¥${activityCampaign?.min_spend || 15} 减 ¥${activityCampaign?.discount_amount || 5}`}>
                  <span>{lang === 'en' ? 'COUPON' : lang === 'zh_HK' ? '分享獎勵' : '分享奖励'}</span>
                  <strong><small>¥</small>{activityCampaign?.discount_amount || 5}</strong>
                  <em>{lang === 'en' ? `on ¥${activityCampaign?.min_spend || 15}+` : `满 ¥${activityCampaign?.min_spend || 15} 可用`}</em>
                </div>
              </>}
            </div>
            <div className="hero-tabs" aria-label={lang === 'en' ? 'Poster selection' : '切换海报'}>
              {(lang === 'en' ? ['Free pickup', 'Fresh produce', 'Coupon offer'] : lang === 'zh_HK' ? ['自取免運', '珍珍果菜', '分享領券'] : ['自取免运', '珍珍果菜', '分享领券']).map((label, index) => (
                <button type="button" key={label} className={bannerIdx === index ? 'active' : ''} aria-pressed={bannerIdx === index} onClick={() => { setBannerPaused(true); setBannerIdx(index) }}>{label}</button>
              ))}
            </div>
          </div>

          {unpaidOrders.length > 0 && (
            <div className="unpaid-home-reminder">
              <div><strong>有 {unpaidOrders.length} 笔订单待付款</strong><p>已经转账？上传付款截图后，店主才能确认订单。</p></div>
              <button type="button" onClick={() => { if (unpaidOrders.length === 1) { setSelectedOrder(unpaidOrders[0]); setTab('orderDetail') } else { setOrderFilter('pending'); setTab('myOrders') } }}>去付款／上传凭证 ›</button>
            </div>
          )}

          {/* 配送规则小横幅 */}
          <div className="delivery-rule-strip"
            onClick={() => setShowHelp(true)}>
            <span>{t('deliveryRule')}</span>
            <span>{t('details')}</span>
          </div>

          <div className="activity-strip" onClick={openActivity} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') openActivity() }}>
            <span>分享团购 · 集满 10 赞领 {fmt(activityCampaign?.discount_amount || 5)} 优惠券</span><span>参加／上传截图 ›</span>
          </div>

          {/* 凑单进度条 */}
          {stats && (
            <div className="group-buy-banner">
              <div className="group-buy-row">
                <span className="group-buy-label">{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || t('groupBuyBanner')}</span>
                {effectiveReached ? (
                  <span className="group-buy-reached">{t('reached')}</span>
                ) : (
                  <span className="group-buy-remain">{t('groupRemain')} <b>{fmt(effectiveThreshold - stats.confirmed_total)}</b> {t('need')}</span>
                )}
              </div>
              <div className="group-buy-progress">
                <div
                  className="group-buy-progress-bar"
                  style={{ width: `${Math.min(100, (stats.confirmed_total / effectiveThreshold) * 100)}%` }}
                />
              </div>
              <div className="group-buy-footer">
                <span>本站点大家的已确认订单：<b style={{ color: 'var(--market-green)' }}>{fmt(stats.confirmed_total)}</b> / {fmt(effectiveThreshold)}</span>
                <span>{stats.confirmed_count} {t('ordersConfirmed')}</span>
              </div>
              <p className="group-buy-explain">大家一起凑够起送额就能统一配送，你无需一个人买满。分享给朋友，帮大家早点收菜。</p>
            </div>
          )}

          <section className="notice-board notice-board-home" aria-label="配送公告" onClick={() => { markNoticesRead(); setTab('messages') }}>
            <div className="notice-board-heading"><span>配送公告 {unreadNotices.length > 0 && <span className="notice-dot" aria-label={`${unreadNotices.length}条未读公告`}>{unreadNotices.length > 99 ? '99+' : unreadNotices.length}</span>}</span><small>查看全部 ›</small></div>
            {announcements.length ? <><strong>{announcements[0].title}</strong><p>{announcements[0].content}</p></> : <p className="notice-empty">取货时间会在配送前一天公布，点此查看消息。</p>}
          </section>

          <div className="product-list">
            <div className="product-list-title">{search ? t('searchResult').replace('{kw}', search) : t('hot')}</div>
            <div className="product-grid">
              {(search ? filteredProducts : featuredProducts).map(p => (
                <div className="product-card" key={p.id} onClick={() => { setSelectedProduct(p); setSelectedVariant(null) }} style={p.is_active === false ? { opacity: 0.5, filter: 'grayscale(1)' } : {}}>
                  <div className="emoji">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span className="product-no-image">{pn(p.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}
                    {(p.is_hot || p.is_new) && <div className="promo-tag">{p.is_hot ? t('tagHot') : t('tagNew')}</div>}
                    {p.is_active === false && <div className="promo-tag" style={{background:'#999'}}>{t('offShelf') || '已下架'}</div>}
                    <span onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id) }} className="fav-btn">
                      {favorites.includes(p.id) ? '❤️' : '🤍'}
                    </span>
                  </div>
                  <div className="info">
                    <div className="name">{pn(p.name)}</div>
                    <div className="unit-line">
                      <div className="sales">{p.is_hot ? '🔥 ' + t('tagHot') : ''}</div>
                    </div>
                    <div className="bottom-row">
                      <div className="price-stack"><div className="price">{priceText(p)}</div><small className="product-unit">{unitText(p)}</small></div>
                      {p.is_active !== false && <button className={`add-btn ${hasVariants(p) ? 'variant-add-btn' : ''}`} aria-label={`${hasVariants(p) ? '选择规格' : '加入购物车'}：${pn(p.name)}`} onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>{hasVariants(p) ? '选规格' : '+'}</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(search ? filteredProducts : featuredProducts).length === 0 && <div className="empty-state"><div className="icon">🔍</div>{t('emptySearch')}</div>}
            {!search && <button className="browse-all-button" onClick={() => { setTab('category'); window.scrollTo(0, 0) }}>到分类看全部商品 ›</button>}
          </div>
        </>
      )}

      {tab === 'coupons' && (
        <div className="coupon-page">
          <div className="back-btn" onClick={() => setTab('my')}>‹ 返回</div>
          <h2>分享团购 · 集赞领券</h2>
          {couponData.campaigns.length ? couponData.campaigns.map(c => <div className="coupon-card coupon-action" key={c.id} onClick={openActivity}><strong>{c.title}</strong><p>任意社交平台分享，单篇集满 10 个赞，领满 {fmt(c.min_spend)} 减 {fmt(c.discount_amount)} 优惠券；每人限领一次。</p><small>查看活动与上传截图 ›</small></div>) : <div className="coupon-card"><strong>活动加载中</strong></div>}
          <h3>我的优惠券</h3>
          {!currentUser ? <p className="coupon-empty" onClick={() => setTab('login')}>登录后查看已发给你的优惠券 ›</p> : couponData.grants.length ? couponData.grants.map(g => <div className="coupon-card" key={g.id}><strong>满 {fmt(g.min_spend)} 减 {fmt(g.discount_amount)}</strong><p>{g.title}</p><small>{g.used_order_no ? '已使用' : '可在结算时使用'} · 领取时间：{g.granted_at}</small></div>) : <p className="coupon-empty">暂时没有收到优惠券。点击上方活动参与分享。</p>}
        </div>
      )}

      {tab === 'messages' && (
        <div className="messages-page">
          <div className="back-btn" onClick={() => setTab('my')}>‹ 返回</div>
          <h2>配送消息</h2>
          <p className="messages-intro">配送前一天，我们会在这里和群里公布取货时间。</p>
          {announcements.length ? announcements.map(notice => <article className="message-card" key={notice.id}>
            <time>{notice.created_at?.slice(0, 16)}</time><h3>{notice.title}</h3><p>{notice.content}</p>
          </article>) : <p className="messages-empty">目前没有新公告，请留意之后的通知。</p>}
        </div>
      )}

      {tab === 'category' && (
        <div className="cat-layout">
          <div className="cat-sidebar">
            <div className={`cat-side-item ${!activeCategory ? 'active' : ''}`} onClick={() => { setActiveCategory(null); window.scrollTo(0, 0) }}>
              {t('all')}
            </div>
            {categories.map(c => (
              <div className={`cat-side-item ${activeCategory === c.id ? 'active' : ''}`} key={c.id} onClick={() => { setActiveCategory(c.id); window.scrollTo(0, 0) }}>
                {cn(c.name)}
              </div>
            ))}
          </div>
          <div className="cat-main">
            {search && <div className="category-search-result">{lang === 'en' ? `${filteredProducts.length} results for “${search}”` : lang === 'zh_HK' ? `找到 ${filteredProducts.length} 款「${search}」商品` : `找到 ${filteredProducts.length} 款“${search}”商品`} <button type="button" onClick={() => { setSearch(''); setSearchInput('') }}>{lang === 'en' ? 'Show all' : lang === 'zh_HK' ? '顯示全部' : '显示全部'}</button></div>}
            <div className="product-grid">
              {filteredProducts.map(p => (
                <div className="product-card" key={p.id} onClick={() => { setSelectedProduct(p); setSelectedVariant(null) }} style={p.is_active === false ? { opacity: 0.5, filter: 'grayscale(1)' } : {}}>
                  <div className="emoji">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span className="product-no-image">{pn(p.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}
                    {(p.is_hot || p.is_new) && <div className="promo-tag">{p.is_hot ? t('tagHot') : t('tagNew')}</div>}
                    {p.is_active === false && <div className="promo-tag" style={{background:'#999'}}>{t('offShelf') || '已下架'}</div>}
                    <span onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id) }} className="fav-btn">
                      {favorites.includes(p.id) ? '❤️' : '🤍'}
                    </span>
                  </div>
                  <div className="info">
                    <div className="name">{pn(p.name)}</div>
                    <div className="unit-line">
                      <div className="sales">{p.is_hot ? '🔥 ' + t('tagHot') : ''}</div>
                    </div>
                    <div className="bottom-row">
                      <div className="price-stack"><div className="price">{priceText(p)}</div><small className="product-unit">{unitText(p)}</small></div>
                      {p.is_active !== false && <button className={`add-btn ${hasVariants(p) ? 'variant-add-btn' : ''}`} aria-label={`${hasVariants(p) ? '选择规格' : '加入购物车'}：${pn(p.name)}`} onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>{hasVariants(p) ? '选规格' : '+'}</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="empty-state"><div className="icon">📦</div>{t('emptyCat')}</div>}
          </div>
        </div>
      )}

      {tab === 'myOrders' && (
        <div>
          <div className="back-btn" onClick={() => setTab('my')}>‹ 返回</div>
          <div style={{ padding: '0 12px 20px' }}>
            <h3 style={{ fontSize: 18, marginBottom: 12, paddingLeft: 4 }}>{t('myOrders')}</h3>
            <div className="order-filter-tabs">
              {[['all', t('orderAll')], ['pending', t('orderPending')], ['awaiting_confirmation', statusTxt.awaiting_confirmation], ['paid', t('orderGroup')], ['shipped', t('orderShipping')], ['completed', t('orderDone')]].map(([f, label]) => (
                <div key={f} className={`order-filter-tab ${orderFilter === f ? 'active' : ''}`} onClick={() => setOrderFilter(f)}>{label}</div>
              ))}
            </div>
            {(() => {
              const list = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)
              if (list.length === 0) return <div className="empty-state"><div className="icon">📭</div>{t('noOrders')}</div>
              return list.map(o => (
                <div className="order-item-card" key={o.id} style={{ background: '#fff', borderRadius: 10, marginBottom: 10 }} onClick={() => { setSelectedOrder(o); setTab('orderDetail') }}>
                  <div className="order-top">
                    <span>{t('orderNo')}：{displayOrderNo(o)}</span>
                    <span className="order-status">{statusTxt[o.status] || o.status}</span>
                  </div>
                  <div className="order-goods">{o.items?.map(i => `${pn(i.product?.name)}${i.variant ? `（${i.variant}）` : ''} x${i.quantity}`).join('，')}</div>
                  <div className="order-total">{t('orderTotal')}：<span>{orderPaymentText(o)} · {o.payment_currency || 'CNY'}</span></div>
                  {o.status === 'pending' && o.payment_status === 'pending' && o.payment_method !== 'cash_on_delivery' && <button type="button" className="order-upload-link" onClick={e => { e.stopPropagation(); setSelectedOrder(o); setTab('orderDetail') }}>付款或上传付款凭证 ›</button>}
                </div>
              ))
            })()}
          </div>
        </div>
      )}

      {tab === 'my' && (
        <div className="my-page">
          {currentUser ? (
            <>
              <div className="my-header">
                <div className="avatar">👤</div>
                <div className="info">
                  <div className="name">{currentUser.phone}</div>
                  <div className="phone">{lang === 'en' ? 'Phone login' : lang === 'zh_HK' ? '手機號登入' : '手机号登录'}</div>
                </div>
              </div>
              <div className="my-content">
                {/* 订单快捷入口 */}
                <div className="order-quick">
                  <div className="order-quick-item" onClick={() => { setOrderFilter('all'); setTab('myOrders') }}>
                    <span className="oq-icon">📦</span>
                    <span className="oq-text">{t('orderAll')}</span>
                  </div>
                  <div className="order-quick-item" onClick={() => { setOrderFilter('pending'); setTab('myOrders') }}>
                    <span className="oq-icon">💰</span>
                    <span className="oq-text">{t('orderPending')}</span>
                    {orders.filter(o => o.status === 'pending').length > 0 && <span className="oq-badge">{orders.filter(o => o.status === 'pending').length}</span>}
                  </div>
                  <div className="order-quick-item" onClick={() => { setOrderFilter('awaiting_confirmation'); setTab('myOrders') }}>
                    <span className="oq-icon">📷</span>
                    <span className="oq-text">{statusTxt.awaiting_confirmation}</span>
                    {orders.some(o => o.status === 'awaiting_confirmation') && <span className="oq-badge">{orders.filter(o => o.status === 'awaiting_confirmation').length}</span>}
                  </div>
                  <div className="order-quick-item" onClick={() => { setOrderFilter('paid'); setTab('myOrders') }}>
                    <span className="oq-icon">🛍️</span>
                    <span className="oq-text">{t('orderGroup')}</span>
                    {orders.filter(o => o.status === 'paid').length > 0 && <span className="oq-badge">{orders.filter(o => o.status === 'paid').length}</span>}
                  </div>
                  <div className="order-quick-item" onClick={() => { setOrderFilter('shipped'); setTab('myOrders') }}>
                    <span className="oq-icon">🚚</span>
                    <span className="oq-text">{t('orderShipping')}</span>
                    {orders.filter(o => o.status === 'shipped').length > 0 && <span className="oq-badge">{orders.filter(o => o.status === 'shipped').length}</span>}
                  </div>
                  <div className="order-quick-item" onClick={() => { setOrderFilter('completed'); setTab('myOrders') }}>
                    <span className="oq-icon">✅</span>
                    <span className="oq-text">{t('orderDone')}</span>
                  </div>
                </div>

                {/* 功能入口 */}
                <div className="my-card">
                  <div className="my-menu-item" onClick={() => { markNoticesRead(); setTab('messages') }}>
                    <span className="icon">📣</span><span className="text">配送消息 {unreadNotices.length > 0 && <span className="notice-dot" aria-label={`${unreadNotices.length}条未读公告`}>{unreadNotices.length > 99 ? '99+' : unreadNotices.length}</span>}</span><span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => setTab('coupons')}>
                    <span className="icon">🎟️</span>
                    <span className="text">{t('coupons')}</span>
                    <span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => setTab('favorites')}>
                    <span className="icon">❤️</span>
                    <span className="text">{t('favorites')} ({favorites.length})</span>
                    <span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => setShowRefund(true)}>
                    <span className="icon">↩️</span>
                    <span className="text">{t('refundAfterSale')}</span>
                    <span className="arrow">›</span>
                  </div>
                </div>

                <div className="my-card">
                  <div className="my-menu-item" onClick={() => setTab('address')}>
                    <span className="icon">📍</span>
                    <span className="text">{t('address')}</span>
                    <span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => setShowContact(true)}>
                    <span className="icon">💬</span>
                    <span className="text">{t('contact')}</span>
                    <span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => setShowHelp(true)}>
                    <span className="icon">📋</span>
                    <span className="text">{t('help')}</span>
                    <span className="arrow">›</span>
                  </div>
                </div>
                <button className="logout-btn" onClick={logout}>{t('logout')}</button>
              </div>
            </>
          ) : (
            <div className="my-header" style={{ justifyContent: 'center', cursor: 'pointer' }} onClick={() => setTab('login')}>
              <div className="avatar">👤</div>
              <div className="info">
                <div className="name">{t('clickLogin')}</div>
                <div className="phone">{t('loginHint')}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 购物车弹窗 */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-panel" onClick={e => e.stopPropagation()}>
            <div className="cart-header">
              <h3>购物车 ({cartCount})</h3>
              <span className="clear" onClick={() => setCart({})}>清空</span>
            </div>
            <div className="cart-items">
              {cartItems.length === 0 && <div className="empty-state"><div className="icon">🛒</div>购物车是空的</div>}
              {cartItems.map(item => {
                const itemKey = item.variantLabel ? `${item.product.id}::${item.variantLabel}` : String(item.product.id)
                return (
                <div className="cart-item" key={itemKey} onClick={() => { setShowCart(false); setSelectedProduct(item.product); setSelectedVariant(null) }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') { setShowCart(false); setSelectedProduct(item.product); setSelectedVariant(null) } }}>
                  <div className="emoji">{item.product.image ? <img src={item.product.image} alt="" /> : <span className="product-no-image">{pn(item.product.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}</div>
                  <div className="detail">
                    <div className="name">{pn(item.product.name)}{item.variantLabel && <small style={{color:'var(--market-accent)',marginLeft:6,fontSize:12}}>({item.variantLabel})</small>}</div>
                    <div className="price">{fmt(item.variantPrice)}<small style={{fontSize:11,color:'#999'}}>{item.variantLabel ? `/${item.variantLabel}` : unitText(item.product)}</small></div>
                  </div>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={(e) => { e.stopPropagation(); updateQty(itemKey, -1) }}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn plus" onClick={(e) => { e.stopPropagation(); updateQty(itemKey, 1) }}>+</button>
                  </div>
                </div>
                )
              })}
            </div>
            {/* 凑单推荐 */}
            {deliveryType === 'pickup' && stats && !effectiveReached && (
              <div className="cart-recommend">
                <div className="cart-recommend-title">
                  {t('buyExtra')}
                </div>
                <div className="cart-recommend-progress">
                  本站点大家已确认 <b>{fmt(stats.confirmed_total || 0)}</b> / <b>{fmt(effectiveThreshold)}</b>，还差 <b>{fmt(effectiveThreshold - (stats.confirmed_total || 0))}</b> 统一配送。你无需个人买满，分享给朋友帮大家早日收菜。
                </div>
                <div className="cart-recommend-list">
                  {products.filter(p => p.price <= 20 && !cart[p.id]).slice(0, 5).map(p => (
                    <div className="cart-recommend-item" key={p.id}
                      onClick={() => quickAdd(p)}>
                      <div className="cart-recommend-image">{p.image ? <img src={p.image} alt="" /> : <span className="product-no-image">{pn(p.name).slice(0, 2)}</span>}</div>
                      <div className="cart-recommend-name">{pn(p.name)}</div>
                      <div className="cart-recommend-price">{fmt(p.price)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="cart-footer">
              <div className="cart-total">合计：<span>{fmt(cartTotal)}</span></div>
              <button className="checkout-btn" disabled={cartCount === 0} onClick={openCheckout}>去结算</button>
            </div>
          </div>
        </div>
      )}

      {/* 下单弹窗 */}
      {showCheckout && (
        <div className="checkout-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>确认订单</h3>
            <div className="form-group">
              <label>配送方式</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div onClick={() => setDeliveryType('pickup')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: deliveryType === 'pickup' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: deliveryType === 'pickup' ? 'var(--market-green-soft)' : '#fff', fontSize: 14
                }}>
                  🛍️ 到自取点
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    自取免运费，凑满门槛后统一配送
                  </div>
                </div>
                <div onClick={() => setDeliveryType('delivery')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: deliveryType === 'delivery' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: deliveryType === 'delivery' ? 'var(--market-green-soft)' : '#fff', fontSize: 14
                }}>
                  🏠 配送到家
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>运费 {fmt(30)}</div>
                </div>
              </div>
            </div>
            {deliveryType === 'pickup' && (
            <div className="form-group">
              <label>自取点</label>
              <div style={{ padding: 10, background: '#f9f9f9', borderRadius: 8, fontSize: 14, marginBottom: 10 }}>
                📍 <b>{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || '未选择'}</b>
                <span style={{ color: 'var(--market-green)', cursor: 'pointer', marginLeft: 10, fontSize: 13 }} onClick={() => setShowPointPicker(true)}>切换</span>
              </div>
            </div>
            )}
            {deliveryType === 'delivery' && (
            <div className="form-group">
              <label>收货地址</label>
              {addresses.length === 0 ? (
                <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 8, fontSize: 13, color: '#999' }}>
                  暂无地址，<span style={{ color: 'var(--market-green)', cursor: 'pointer' }} onClick={() => { setShowCheckout(false); setTab('address'); setEditingAddr(null); setTab('addrEdit') }}>去添加</span>
                </div>
              ) : (
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  {addresses.map(a => (
                    <div
                      key={a.id}
                      onClick={() => setCheckoutAddrId(a.id)}
                      style={{
                        padding: 10,
                        border: checkoutAddrId === a.id ? '2px solid var(--market-green)' : '1px solid #eee',
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: 'pointer',
                        background: checkoutAddrId === a.id ? 'var(--market-green-soft)' : '#fff'
                      }}
                    >
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{a.name} <span style={{ color: '#666', fontWeight: 'normal', marginLeft: 8 }}>{a.phone}</span></div>
                      <div style={{ fontSize: 13, color: '#666', marginTop: 3 }}>{a.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
            <div className="form-group">
              <label>备注</label>
              <input value={remark} onChange={e => setRemark(e.target.value)} placeholder="备注" />
            </div>
            <div className="form-group">
              <label>优惠券</label>
              {couponLoading ? <div className="checkout-coupon-empty">正在查看优惠券…</div>
                : couponError ? <div className="checkout-coupon-empty">暂时无法读取优惠券 <button type="button" onClick={loadCoupons}>重试</button></div>
                  : couponData.grants.some(g => !g.used_order_no && cartTotal >= Number(g.min_spend)) ? <select value={selectedCoupon ? selectedCouponId : ''} onChange={e => setSelectedCouponId(e.target.value)} style={{ width: '100%', padding: 10, border: '1px solid #ddd', background: '#fff' }}>
                    <option value="">不使用优惠券</option>
                    {couponData.grants.filter(g => !g.used_order_no && cartTotal >= Number(g.min_spend)).map(g => <option key={g.id} value={g.id}>满 {fmt(g.min_spend)} 减 {fmt(g.discount_amount)}</option>)}
                  </select> : <div className="checkout-coupon-empty">无优惠券可用</div>}
              {!couponLoading && !couponError && couponData.grants.some(g => !g.used_order_no && cartTotal < Number(g.min_spend)) && <small style={{ color: '#777' }}>已有优惠券，商品金额达到使用门槛后可选</small>}
              {!couponLoading && !couponError && !couponData.grants.some(g => !g.used_order_no && cartTotal >= Number(g.min_spend)) && <button type="button" className="checkout-activity-link" onClick={openActivity}>参加分享活动，领取满 {fmt(activityCampaign?.min_spend || 15)} 减 {fmt(activityCampaign?.discount_amount || 5)} 优惠券 ›</button>}
            </div>
            <div className="form-group">
              <label>选择付款币种 · 实际转账金额</label>
              <div className="payment-currency-choices">
                <button type="button" className={paymentCurrency === 'CNY' ? 'selected' : ''} onClick={() => { setPaymentCurrency('CNY'); setPaymentMethod('wechat_transfer') }}><span>付人民币 CNY</span><strong>¥{checkoutCnyTotal.toFixed(2)}</strong></button>
                <button type="button" className={paymentCurrency === 'HKD' ? 'selected' : ''} onClick={() => { setPaymentCurrency('HKD'); setPaymentMethod('fps_transfer') }}><span>付港币 HKD</span><strong>HK${(Math.round(checkoutCnyTotal * exchangeRate * 100) / 100).toFixed(2)}</strong></button>
              </div>
              <small className="payment-currency-hint">请选你实际转账的币种。商品页的 HKD/CNY 只用于看价格。</small>
            </div>
            <div className="form-group">
              <label>支付方式</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {paymentCurrency === 'CNY' && <div onClick={() => setPaymentMethod('wechat_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'wechat_transfer' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: paymentMethod === 'wechat_transfer' ? 'var(--market-green-soft)' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💚</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>微信</div>
                </div>}
                {paymentCurrency === 'CNY' && <div onClick={() => setPaymentMethod('alipay_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'alipay_transfer' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: paymentMethod === 'alipay_transfer' ? 'var(--market-green-soft)' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💙</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>支付宝</div>
                </div>}
                {paymentCurrency === 'HKD' && <div onClick={() => setPaymentMethod('fps_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'fps_transfer' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: paymentMethod === 'fps_transfer' ? 'var(--market-green-soft)' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💱</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>转数快</div>
                </div>}
              </div>
            </div>
            <div style={{ marginBottom: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>商品金额</span>
                <span>{formatAmount(paymentCurrency === 'HKD' ? cartTotal * exchangeRate : cartTotal, paymentCurrency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>运费</span>
                <span style={{ color: effectiveFee ? 'var(--market-accent)' : 'var(--market-green)', fontWeight: 600 }}>
                  {effectiveFee ? formatAmount(paymentCurrency === 'HKD' ? effectiveFee * exchangeRate : effectiveFee, paymentCurrency) : t('freeFee')}
                </span>
              </div>
              {couponDiscount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: 'var(--market-green)' }}><span>优惠券</span><span>−{formatAmount(paymentCurrency === 'HKD' ? couponDiscount * exchangeRate : couponDiscount, paymentCurrency)}</span></div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', borderTop: '1px solid #eee', marginTop: 4 }}>
                <span>应付 · {paymentCurrency}</span>
                <span style={{ color: 'var(--market-accent)', fontWeight: 'bold', fontSize: 18 }}>
                  {formatAmount(checkoutPayAmount, paymentCurrency)}
                </span>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowCheckout(false)}>取消</button>
              <button className="btn-submit" onClick={submitOrder}>提交订单</button>
            </div>
          </div>
        </div>
      )}

      {/* 商品详情底部弹层 */}
      {selectedProduct && (
        <div className="checkout-overlay" onClick={() => { setSelectedProduct(null); setSelectedVariant(null) }}
          style={{ alignItems: 'flex-end' }}>
          <div className="product-detail-sheet" onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: '16px 16px 0 0', maxWidth: 400, width: '100%',
              maxHeight: '85vh', overflowY: 'auto', paddingBottom: 0
            }}>
            {/* 顶部商品信息行 */}
            <div style={{ display: 'flex', gap: 12, padding: 16, position: 'relative' }}>
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={pn(selectedProduct.name)} style={{ width: 80, height: 80, borderRadius: 10, objectFit: 'cover' }} />
              ) : (
                <div className="detail-no-image"><span className="product-no-image">{pn(selectedProduct.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span></div>
              )}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 18, marginBottom: 6 }}>{pn(selectedProduct.name)}</h3>
                <div style={{ fontSize: 20, color: 'var(--market-accent)', fontWeight: 'bold' }}>
                  {(() => {
                    let variants = []
                    try { variants = selectedProduct.variants ? JSON.parse(selectedProduct.variants) : [] } catch(e) {}
                    const sym = currency === 'HKD' ? 'HK$' : '¥'
                    return fmt(selectedProduct.price)
                  })()}<small style={{fontSize:13,color:'#999',fontWeight:400}}>{unitText(selectedProduct)}</small>
                </div>
              </div>
              <span onClick={() => { setSelectedProduct(null); setSelectedVariant(null) }}
                style={{ position: 'absolute', top: 12, right: 12, background: '#f0f0f0', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14, color: '#999' }}>✕</span>
            </div>

            {(() => {
              let variants = []
              try { variants = selectedProduct.variants ? JSON.parse(selectedProduct.variants) : [] } catch(e) {}
              return (
                <>
                  {/* 规格选择 */}
                  {variants.length > 0 && (
                    <div style={{ padding: '0 16px', borderTop: '8px solid #f7f7f7' }}>
                      <div style={{ fontSize: 14, color: '#333', fontWeight: 600, padding: '12px 0 8px' }}>规格</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
                        <div className="variant-choice" onClick={() => setSelectedVariant(-1)}
                          style={{ padding: '8px 16px', borderRadius: 20, cursor: 'pointer', border: selectedVariant === -1 ? '2px solid var(--market-green)' : '1px solid #ddd', background: selectedVariant === -1 ? 'var(--market-green-soft)' : '#fff', fontSize: 14, fontWeight: selectedVariant === -1 ? 600 : 400 }}>
                          基础规格 {unitText(selectedProduct)} <span style={{ color: 'var(--market-accent)' }}>{fmt(selectedProduct.price)}</span>
                        </div>
                        {variants.map((v, i) => {
                          const isSel = selectedVariant === i
                          return (
                            <div className="variant-choice" key={i} onClick={() => setSelectedVariant(i)}
                              style={{
                                padding: '8px 16px', borderRadius: 20, cursor: 'pointer',
                                border: isSel ? '2px solid var(--market-green)' : '1px solid #ddd',
                                background: isSel ? 'var(--market-green-soft)' : '#fff',
                                fontSize: 14, fontWeight: isSel ? 600 : 400,
                              }}>
                              {v.label} <span style={{color:'var(--market-accent)'}}>{fmt(v.price)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 描述 */}
                  {selectedProduct.description && !/^\/[\u4e00-\u9fff\d]+$/.test(selectedProduct.description.trim()) && (
                    <div style={{ padding: '0 16px', borderTop: '8px solid #f7f7f7' }}>
                      <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, padding: '12px 0' }}>{selectedProduct.description}</p>
                    </div>
                  )}

                  {/* 底部按钮 */}
                  <div style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
                    {selectedProduct.is_active !== false ? (
                      <button className="btn-submit" style={{ width: '100%', background: 'var(--market-green)', opacity: (variants.length > 0 && selectedVariant === null) ? 0.5 : 1 }}
                        onClick={() => {
                          if (variants.length > 0 && selectedVariant === null) { showToast('请先选择规格'); return }
                          if (variants.length > 0 && selectedVariant >= 0) {
                            const v = variants[selectedVariant]
                            addToCart(selectedProduct.id, v.label, Number(v.price))
                          } else {
                            addToCart(selectedProduct.id)
                          }
                          setSelectedProduct(null); setSelectedVariant(null)
                        }}>添加到购物车</button>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center', padding: '14px', background: '#f0f0f0', color: '#999', borderRadius: 8, fontWeight: 600 }}>已下架，暂不可购买</div>
                    )}
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      )}
      {/* 配送点选择弹窗（强制选择） */}
      {showPointPicker && (
        <div className="checkout-overlay" style={{ zIndex: 3000 }} onClick={() => { if (localStorage.getItem('selectedPointId')) setShowPointPicker(false) }}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>📍 {t('pickPoint')}</h3>
            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, fontSize: 12, color: '#f57c00', marginBottom: 12, textAlign: 'left', lineHeight: 1.6 }}>
              {t('feeTitle')}<br />{t('feeEach')}<br />{ruleText('feeFree', effectiveThreshold)}<br />{t('feeNoRefund')}
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {deliveryPoints.map(p => (
                <div
                  key={p.id}
                  onClick={() => selectPoint(p.id)}
                  style={{
                    padding: 12, border: selectedPointId == p.id ? '2px solid var(--market-green)' : '1px solid #eee',
                    borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                    background: selectedPointId == p.id ? 'var(--market-green-soft)' : '#fff'
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{dn(p.name)}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{dn(p.address)}</div>
                  <div style={{ fontSize: 12, color: 'var(--market-green)', marginTop: 3 }}>🚚 {ruleText('feePerOrder', p.threshold || 1000)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 收款码弹窗 */}
      {showPaymentQR && (
        <div className="checkout-overlay" onClick={() => setShowPaymentQR(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 340, textAlign: 'center' }}>
            <h3>{paymentMethod === 'wechat_transfer' ? '微信扫码付款' : paymentMethod === 'alipay_transfer' ? '支付宝扫码付款' : '转数快 FPS 扫码付款'}</h3>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>订单号：{paidOrderNo}</div>
            <div className="payment-due">订单应付 {formatAmount(paidOrderAmount, paidOrderCurrency)}<small>{paidOrderCurrency === 'HKD' ? '已选择港币付款 · 使用 FPS' : `已选择人民币付款 · 使用${paymentMethod === 'wechat_transfer' ? '微信' : '支付宝'}`}</small></div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {paymentMethod === 'fps_transfer' ? (
                <div style={{ width: 220, height: 220, margin: '0 auto', background: '#f9f0ff', border: '2px solid #722ed1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 44 }}>💱</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10, color: '#722ed1' }}>95480721</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>FPS 转数快收款手机号</div>
                </div>
              ) : (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={paymentMethod === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'} alt="收款码" style={{ width: 220, borderRadius: 12, border: `2px solid ${paymentMethod === 'wechat_transfer' ? '#07c160' : '#1677ff'}`, display: 'block' }} />
                  <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 10 }}>长按图片可保存</div>
                </div>
              )}
              <div style={{ fontSize: 14, marginTop: 10, fontWeight: 600, color: paymentMethod === 'wechat_transfer' ? '#07c160' : paymentMethod === 'alipay_transfer' ? '#1677ff' : '#722ed1' }}>
                {paymentMethod === 'wechat_transfer' ? '微信收款码' : paymentMethod === 'alipay_transfer' ? '支付宝收款码' : '转数快 FPS'}
              </div>
            </div>

            {/* 操作按钮：保存图片 / 打开对应App / 复制账号 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {paymentMethod !== 'fps_transfer' && (
                <a
                  href={paymentMethod === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'}
                  download={paymentMethod === 'wechat_transfer' ? 'wechat-pay.jpg' : 'alipay-pay.jpg'}
                  style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: `1px solid ${paymentMethod === 'wechat_transfer' ? '#07c160' : '#1677ff'}`, color: paymentMethod === 'wechat_transfer' ? '#07c160' : '#1677ff', background: '#fff', textDecoration: 'none', cursor: 'pointer' }}
                >⬇ 保存收款码</a>
              )}
              {paymentMethod === 'wechat_transfer' && (
                <a href="weixin://" style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: '1px solid #07c160', color: '#fff', background: '#07c160', textDecoration: 'none', cursor: 'pointer' }}>打开微信</a>
              )}
              {paymentMethod === 'alipay_transfer' && (
                <a href="alipay://" style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: '1px solid #1677ff', color: '#fff', background: '#1677ff', textDecoration: 'none', cursor: 'pointer' }}>打开支付宝</a>
              )}
              {paymentMethod === 'fps_transfer' && (
                <button onClick={() => copyText('95480721', 'FPS手机号')} style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: '1px solid #722ed1', color: '#fff', background: '#722ed1', cursor: 'pointer' }}>📋 复制手机号</button>
              )}
            </div>

            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, fontSize: 12, color: '#f57c00', marginBottom: 16, textAlign: 'left', lineHeight: 1.7 }}>
              {paymentMethod === 'wechat_transfer' && <>📌 操作：点「保存收款码」→ 点「打开微信」→ 右上角 + → 扫一扫 → 相册选刚保存的图付款。<br />转账时备注订单号，付款后点击「我已付款」上传截图。</>}
              {paymentMethod === 'alipay_transfer' && <>📌 操作：点「保存收款码」→ 点「打开支付宝」→ 扫一扫 → 相册选刚保存的图付款。<br />转账时备注订单号，付款后点击「我已付款」上传截图。</>}
              {paymentMethod === 'fps_transfer' && <>📌 操作：转数快 FPS 转账到 <b>95480721</b>，备注订单号，付款后上传截图。</>}
              <br />二维码扫不了？请联系老板，微信：<b>{BOSS_WECHAT}</b>。
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setTab('myOrders') }}>稍后支付</button>
              <button className="btn-submit" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setShowUploadProof(true) }}>我已付款</button>
            </div>
          </div>
        </div>
      )}

      {/* 上传付款凭证弹窗 */}
      {showUploadProof && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => { setShowUploadProof(false); setTab('myOrders') }}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 12 }}>📸 上传付款截图</h3>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, marginBottom: 16, textAlign: 'left' }}>
              付款后请截图支付成功页面（<b>确保付款时间和金额清晰可见</b>），上传后我们会尽快确认。
            </p>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setProofFile(e.target.files[0] || null)} style={{ marginBottom: 16 }} />
            {proofFile && <p className="proof-selected">已选择：{proofFile.name}</p>}
            <button className="btn-submit proof-confirm" disabled={!proofFile || proofUploading} onClick={async () => {
              setProofUploading(true)
              try {
                const error = await uploadProofFile(proofFile, lastOrderId)
                if (error) showToast(error)
                else {
                  showToast('凭证已保存，等待店主确认')
                  setProofFile(null); setShowUploadProof(false); setTab('myOrders'); setOrderFilter('awaiting_confirmation')
                  const response = await authFetch(`${API}/orders`)
                  if (response.ok) setOrders(await response.json())
                }
              } catch (error) { showToast(error.message || '上传失败，请重试') }
              finally { setProofUploading(false) }
            }}>{proofUploading ? '正在上传…' : '确认上传付款凭证'}</button>
            <button className="btn-cancel" style={{ width: '100%', padding: 12 }} onClick={() => { setShowUploadProof(false); setTab('myOrders') }}>稍后上传</button>
          </div>
        </div>
      )}

      {/* 新手指引弹窗 */}
      {/* 首次进入选择币种 */}
      {!currency && (
        <div className="checkout-overlay" style={{ zIndex: 6000 }}>
          <div className="checkout-panel" style={{ maxWidth: 380, textAlign: 'center', padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>请选择看价币种</h3>
            <p style={{ fontSize: 13, color: '#777', marginBottom: 20 }}>下单时可以另选实际付款币种</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { setCurrency('HKD'); localStorage.setItem('currency', 'HKD'); setShowOnboard(true) }}
                style={{ padding: 16, borderRadius: 12, border: '2px solid var(--market-green)', background: 'var(--market-green-soft)', color: 'var(--market-accent)', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
                HK$ HKD
              </button>
              <button onClick={() => { setCurrency('CNY'); localStorage.setItem('currency', 'CNY'); setShowOnboard(true) }}
                style={{ padding: 16, borderRadius: 12, border: '2px solid #ddd', background: '#fff', color: '#333', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>
                ¥ CNY
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboard && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => {}}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>
              {['📍', '🛒', '👥', '✅'][onboardStep]}
            </div>
            <h3 style={{ marginBottom: 8 }}>{t(`step${onboardStep+1}Title`)}</h3>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>{ruleText(`step${onboardStep+1}Desc`, effectiveThreshold)}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === onboardStep ? 'var(--market-green)' : '#ddd' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {onboardStep > 0 && (
                <button className="btn-cancel" style={{ flex: 1, padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                  onClick={() => setOnboardStep(s => s - 1)}>上一步</button>
              )}
              <button className="btn-submit" style={{ flex: 2, padding: 12, borderRadius: 8, border: 'none', cursor: 'pointer' }}
                onClick={() => {
                  if (onboardStep < 3) setOnboardStep(s => s + 1)
                  else { setShowOnboard(false); setShowIntro(true) }
                }}>
                {onboardStep < 3 ? t('next') : t('gotIt')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 首次进入注意事项弹窗 */}
      {showIntro && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => {}}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>📋 下单须知</h3>

            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}>
              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>🚚 配送时间</b><br />
                · 配送前一天在网站公告和群里通知取货时间<br />
                · 配送通知会在对应微信群/WhatsApp群及本网站同步，下单后请及时加群或关注发货通知
              </div>

              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>💰 运费</b><br />
                · 自取始终免运费；当前服务点凑满 {fmt(effectiveThreshold)} 后统一配送，其他服务点按各自门槛配送<br />
                · 配送到家运费 {fmt(30)}<br />
                · 已付款待发货的自取订单可申请加 {fmt(30)} 单独配送，或取消并申请退款
              </div>

              <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>📍 自取点</b><br />
                日出康城站 / 科技大学 / 坑口站 / 宝琳站 / 将军澳站 / 调景岭站
              </div>

              <div style={{ background: '#fce4ec', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>💳 付款</b><br />
                提交订单后弹出收款码，截图或保存后用微信/支付宝/转数快转账即可。人工确认可能延迟，付款成功即可放心。
              </div>

              <div style={{ background: '#f3e5f5', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>📞 联系</b><br />
                · 老板微信：jennybabi1988<br />
                · WhatsApp：+852 95228191<br />
                · 科大学生加菜神微信进群：ustshucaizhishen<br />
                · 技术问题联系微信：ustshucaizhishen
              </div>
            </div>

            <button
              className="btn-submit"
              style={{ width: '100%', padding: 14, marginTop: 8 }}
              onClick={() => {
                localStorage.setItem('intro_read', '1')
                setShowIntro(false)
              }}
            >
              我已知晓，开始购物
            </button>
          </div>
        </div>
      )}

      {/* 科大自取规则弹窗 */}
      {ustBenefit && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => setUstBenefit(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎓</div>
            <h3 style={{ color: 'var(--market-green)', marginBottom: 8 }}>恭喜你，科大学生福利</h3>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, marginBottom: 16 }}>
              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                🎓 <b>自取免运费</b><br/>
                科大服务点自取免运费，满 {fmt(500)} 统一配送
              </div>
              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8 }}>
                🎯 <b>科大专属起送门槛 {fmt(500)}</b><br/>
                该点已付款待配送订单满 {fmt(500)} 后统一配送<br/>
                取货时间请留意网站公告和群通知
              </div>
            </div>
            <button className="btn-submit" style={{ width: '100%' }} onClick={() => setUstBenefit(false)}>
              知道了，开始购物
            </button>
          </div>
        </div>
      )}

      {/* 联系客服弹窗 */}
      {showContact && (
        <div className="checkout-overlay" onClick={() => setShowContact(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <h3>💬 联系客服</h3>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>有问题直接加微信 / WhatsApp 联系我们，点账号可一键复制</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ border: '1px solid #e8f5e9', background: '#f6fff8', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--market-green)' }}>🎓 UST科大学生 · 菜神</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>加微信进群 / 咨询订单</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>ustshucaizhishen</div>
                  <button onClick={() => copyText('ustshucaizhishen', '微信号')} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #3cb043', color: 'var(--market-green)', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>复制</button>
                </div>
              </div>

              <div style={{ border: '1px solid #e8f5e9', background: '#f6fff8', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--market-green)' }}>🏠 小区居民 · 老板</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>加微信咨询订单 / 售后</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{BOSS_WECHAT}</div>
                  <button onClick={() => copyText(BOSS_WECHAT, '微信号')} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #3cb043', color: 'var(--market-green)', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>复制</button>
                </div>
              </div>

              <div style={{ border: '1px solid #e6f4ff', background: '#f4faff', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#128c7e' }}>💬 WhatsApp 客服</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>海外 / 非微信用户首选</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{BOSS_WHATSAPP}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => copyText(BOSS_WHATSAPP, 'WhatsApp号')} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #128c7e', color: '#128c7e', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>复制</button>
                    <a href="https://wa.me/85295228191" target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #128c7e', color: '#fff', background: '#128c7e', borderRadius: 14, cursor: 'pointer', textDecoration: 'none' }}>打开</a>
                  </div>
                </div>
              </div>
            </div>

            <button className="btn-submit" style={{ width: '100%' }} onClick={() => setShowContact(false)}>我知道了</button>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="checkout-overlay" onClick={() => setShowRefund(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3>退款售后</h3>
            <p style={{ lineHeight: 1.7, color: '#555', margin: '12px 0' }}>如需退款或售后帮助，请联系老板。已付款待配送的自取订单，也可在订单详情提交退款申请。</p>
            <div className="after-sale-contact"><span>老板微信</span><strong>{BOSS_WECHAT}</strong><button onClick={() => copyText(BOSS_WECHAT, '微信号')}>复制</button></div>
            <div className="after-sale-contact"><span>WhatsApp</span><strong>{BOSS_WHATSAPP}</strong><a href="https://wa.me/85295228191" target="_blank" rel="noreferrer">联系</a></div>
            <button className="btn-submit" style={{ width: '100%', marginTop: 16 }} onClick={() => setShowRefund(false)}>我知道了</button>
          </div>
        </div>
      )}

      {showActivity && (
        <div className="checkout-overlay" onClick={closeActivity}>
          <div className="checkout-panel activity-panel" onClick={e => e.stopPropagation()}>
            <h3>分享团购 · 集赞领券</h3>
            <p className="activity-intro">和邻居、同学一起买新鲜果菜。服务点凑满起送额后统一配送，自取免运费。</p>
            <div className="activity-rule"><b>集满 10 个赞，领满 {fmt(activityCampaign?.min_spend || 15)} 减 {fmt(activityCampaign?.discount_amount || 5)}</b><p>在任意社交媒体分享我们的团购，并附上网站链接。单篇内容集满 10 个赞后，上传能看清分享内容、发布账号和点赞数的截图。后台审核通过，优惠券会发到“我的优惠券”。</p><p>包括但不限于朋友圈、小红书、抖音、Facebook、Instagram、Threads、X，其他社交平台也可以。</p><strong className="activity-limit">每人限领一次，跨平台发布也只可领取一张；请勿重复注册领取。</strong></div>
            <div className="activity-share"><small>社交媒体分享文案</small><p>{GROUP_BUY_SHARE_TEXT}</p><button onClick={() => copyText(GROUP_BUY_SHARE_TEXT, '宣传语')}>一键复制宣传语</button></div>
            <p className="activity-return-hint">稍后回来上传：从首页海报下方的「分享团购」入口，或「我的 → 优惠券」进入本活动。</p>
            {activityCampaign ? !currentUser ? <button className="btn-submit" style={{ width: '100%', marginTop: 16 }} onClick={() => { setReturnToActivityAfterLogin(true); setShowActivity(false); setTab('login') }}>登录后上传截图</button> : <>
              {(() => { const claim = couponData.claims.find(c => Number(c.campaign_id) === Number(activityCampaign.id)); return claim && <p className="activity-status">{claim.status === 'pending' ? '截图正在审核' : claim.status === 'approved' ? '审核通过，优惠券已发放' : `未通过：${claim.admin_note || '可以重新提交截图'}`}</p> })()}
              {!couponData.claims.some(c => Number(c.campaign_id) === Number(activityCampaign.id) && c.status !== 'rejected') && <>
                <label className="activity-upload">{activityProofFile ? '重新选择截图' : '选择社交平台截图'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={claimUploading} onChange={e => { const file = e.target.files?.[0]; if (file) setActivityProofFile(file); e.target.value = '' }} /></label>
                {activityProofFile && <><p className="activity-selected">已选择：{activityProofFile.name}</p><button type="button" className="activity-confirm-upload" disabled={claimUploading} onClick={() => submitCouponScreenshot(activityProofFile)}>{claimUploading ? '正在上传…' : '确认上传截图'}</button></>}
                <small className="activity-upload-note">支持 PNG、JPEG、WebP；提交后可在这里查看审核状态。</small>
              </>}
            </> : <p className="activity-status">活动加载中…</p>}
            <button className="btn-cancel" style={{ width: '100%', marginTop: 10 }} onClick={closeActivity}>关闭活动</button>
          </div>
        </div>
      )}

      {showActivityReturnGuide && (
        <div className="checkout-overlay" onClick={() => setShowActivityReturnGuide(false)}>
          <div className="checkout-panel activity-guide-panel" onClick={e => e.stopPropagation()}>
            <h3>下次怎么回来上传？</h3>
            <p>打开首页海报下方的「分享团购」入口，或者到「我的 → 优惠券 → 分享团购活动」，就能重新找到截图上传处。</p>
            {activityProofFile && <p className="activity-guide-warning">你选的截图尚未提交；离开网站后需要重新选择，再点「确认上传截图」。</p>}
            <button type="button" className="btn-submit" onClick={() => setShowActivityReturnGuide(false)}>知道了</button>
          </div>
        </div>
      )}

      {showBrand && (
        <div className="checkout-overlay" onClick={() => setShowBrand(false)}>
          <div className="checkout-panel brand-panel" onClick={e => e.stopPropagation()}>
            <span className="brand-eyebrow">ZHENZHEN FRESH</span>
            <h3>认识珍珍优质果菜</h3>
            <div className="brand-store-count"><strong>9</strong><span>家香港门店</span></div>
            <p>珍珍优质果菜在香港设有 9 家门店，分布于不同地区。线上可以挑选水果、蔬菜和日常食材，选择方便的服务点自取；大家凑满起送额后统一配送，自取免运费。</p>
            <button type="button" className="btn-submit" onClick={() => { setShowBrand(false); setTab('category'); window.scrollTo(0, 0) }}>去挑选果菜</button>
            <button type="button" className="brand-close" onClick={() => setShowBrand(false)}>关闭</button>
          </div>
        </div>
      )}

      {/* 配送规则弹窗 */}
      {showHelp && (
        <div className="checkout-overlay" onClick={() => setShowHelp(false)}>
          <div className="checkout-panel delivery-help-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="rule-dialog-heading"><h3>配送规则</h3><button type="button" aria-label="关闭配送规则" onClick={() => setShowHelp(false)}>×</button></div>
            <div className="rule-dialog-list">
              <section><h4>配送时间</h4><p>各服务点凑满门槛后安排统一配送。取货时间在配送前一天于网站公告和群里通知。</p></section>
              <section><h4>运费规则</h4><p>自取订单始终免运费；未满额则等待凑单。该自取点已付款待配送订单满 {fmt(effectiveThreshold)} 即起送统一配送。单独送到家：{fmt(30)}。</p></section>
              <section><h4>自取点</h4><p>科技大学满 {fmt(500)} 起送；其他服务点满 {fmt(1000)} 起送。</p></section>
              <section><h4>有问题？</h4><p>UST 学生加菜神微信，小区居民加老板微信。</p></section>
            </div>
            <button type="button" className="rule-close-btn" onClick={() => setShowHelp(false)}>关闭</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {/* 底部导航 */}
      <div className="bottom-nav">
        <div className={`nav-item ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <NavIcon name="home" />{t('home')}
        </div>
        <div className={`nav-item ${tab === 'category' ? 'active' : ''}`} onClick={() => { setTab('category'); window.scrollTo(0, 0) }}>
          <NavIcon name="category" />{t('category')}
        </div>
        <div className="nav-item" onClick={() => setShowCart(true)}>
          <NavIcon name="cart" />{t('cart')}
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
        <div className={`nav-item ${tab === 'my' || tab === 'myOrders' || tab === 'address' || tab === 'orderDetail' || tab === 'messages' ? 'active' : ''}`} onClick={() => setTab('my')}>
          <NavIcon name="user" />{t('my')}{unreadNotices.length > 0 && <span className="nav-notice-dot" aria-label={`${unreadNotices.length}条未读公告`}>{unreadNotices.length > 99 ? '99+' : unreadNotices.length}</span>}
        </div>
      </div>
    </div>
  )
}

/* ========== 登录页 ========== */
function NavIcon({ name }) {
  const paths = {
    home: <><path d="m3 10 9-7 9 7v10H3z" /><path d="M9 20v-6h6v6" /></>,
    category: <><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>,
    cart: <><path d="M3 4h2l2 12h12l2-9H6" /><circle cx="9" cy="20" r="1" /><circle cx="18" cy="20" r="1" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3-7 8-7s8 3 8 7" /></>
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

function LoginPage({ onLogin, onRegister, onBack, t, lang }) {
  const [mode, setMode] = useState('login')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const phoneExample = lang === 'en' ? '8-digit Hong Kong mobile number' : lang === 'zh_HK' ? '香港8位手機號' : '香港8位手机号'
  const phoneError = phoneTouched && !normalizePhone(phone) ? (lang === 'en' ? 'Enter an 8-digit Hong Kong mobile number starting with 4–9. +852 is optional.' : lang === 'zh_HK' ? '僅支持香港手機號：請輸入4至9開頭的8位號碼，可加+852區號。' : '仅支持香港手机号：请输入4至9开头的8位号码，可加+852区号。') : ''
  const accountHint = lang === 'en' ? 'Your phone number is your login ID. No verification text will be sent.' : lang === 'zh_HK' ? '手機號就是登入帳號；這裡不發驗證碼，請填寫自己可使用的號碼。' : '手机号就是登录账号；这里不发验证码，请填写自己可使用的号码。'

  const submit = async () => {
    if (submitting) return
    setPhoneTouched(true)
    setError('')
    if (!normalizePhone(phone)) return
    if (!password) { setError(lang === 'en' ? 'Enter your password' : lang === 'zh_HK' ? '請填寫密碼' : '请填写密码'); return }
    setSubmitting(true)
    try { setError(await (mode === 'login' ? onLogin(phone, password) : onRegister(phone, password)) || '') }
    catch { setError(lang === 'en' ? 'Connection failed. Please try again.' : lang === 'zh_HK' ? '連線失敗，請稍後重試。' : '连接失败，请稍后重试。') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="login-page">
      <div className="login-logo">
        <div className="icon">🛒</div>
        <h2>{t('welcome')}</h2>
      </div>
      <div className="login-box">
        <div className="login-tabs">
          <div className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>{t('login')}</div>
          <div className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>{t('register')}</div>
        </div>
        <div className="login-input-group">
          <label htmlFor="account-phone">{t('phone')} <small>+852</small></label>
          <input id="account-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder={phoneExample} value={phone} aria-invalid={!!phoneError} aria-describedby={phoneError ? 'account-phone-error' : undefined} onBlur={() => setPhoneTouched(true)} onChange={e => { setPhone(e.target.value); setError('') }} />
          {phoneError && <p id="account-phone-error" className="login-form-error" role="alert">{phoneError}</p>}
        </div>
        <div className="login-input-group">
          <label>{t('password')}</label>
          <input type="password" placeholder={t('password')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit() }} />
        </div>
        {mode === 'register' && <p className="login-phone-hint">{accountHint}</p>}
        {error && <p className="login-form-error" role="alert">{error}</p>}
        <button className="login-btn" disabled={submitting} onClick={submit}>{submitting ? (lang === 'en' ? 'Please wait…' : '请稍候…') : mode === 'login' ? t('login') : t('register')}</button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#999' }}>
          <span style={{ cursor: 'pointer', color: 'var(--market-green)' }} onClick={onBack}>{t('back')}</span>
        </div>
      </div>
    </div>
  )
}

/* ========== 地址管理页 ========== */
function AddressPage({ addresses, selectedId, onSelect, onEdit, onAdd, onDelete, onBack }) {
  return (
    <div>
      <div className="back-btn" onClick={onBack}>‹ 返回</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>收货地址</h3>
      <div className="addr-list" style={{ paddingBottom: 80 }}>
        {addresses.length === 0 && <div className="empty-state"><div className="icon">📍</div>暂无收货地址</div>}
        {addresses.map(a => (
          <div className="addr-card" key={a.id} onClick={() => onSelect(a.id)}>
            <div className={`radio ${selectedId === a.id ? 'selected' : ''}`} />
            <div className="addr-info">
              <div className="name-row">{a.name} <span className="phone">{a.phone}</span> {a.isDefault && <span style={{ background: 'var(--market-green)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4, marginLeft: 8 }}>默认</span>}</div>
              <div className="detail">{a.detail}</div>
              <div className="addr-actions">
                <span onClick={e => { e.stopPropagation(); onEdit(a) }}>编辑</span>
                <span className="del" onClick={e => { e.stopPropagation(); onDelete(a.id) }}>删除</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="add-add-btn" onClick={onAdd}>+ 新增收货地址</button>
    </div>
  )
}

/* ========== 地址编辑页 ========== */
function AddressEditPage({ addr, onSave, onBack }) {
  const [name, setName] = useState(addr?.name || '')
  const [phone, setPhone] = useState(addr?.phone || '')
  const [detail, setDetail] = useState(addr?.detail || '')
  const [isDefault, setIsDefault] = useState(addr?.isDefault || false)

  const save = () => {
    if (!name || !phone || !detail) { alert('请填写完整信息'); return }
    onSave({ ...(addr || {}), name, phone, detail, isDefault })
  }

  return (
    <div>
      <div className="back-btn" onClick={onBack}>‹ 返回</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>{addr ? '编辑地址' : '新增地址'}</h3>
      <div style={{ padding: '0 16px' }}>
        <div className="form-group"><label>收货人</label><input value={name} onChange={e => setName(e.target.value)} placeholder="请输入姓名" /></div>
        <div className="form-group"><label>手机号</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="请输入手机号" /></div>
        <div className="form-group"><label>详细地址</label><textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="请输入详细地址" rows={3} /></div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 'auto' }} />
            设为默认地址
          </label>
        </div>
        <button className="login-btn" onClick={save} style={{ marginTop: 20 }}>保存</button>
      </div>
    </div>
  )
}

/* ========== 订单详情页 ========== */
function OrderDetailPage({ order, onBack, pn, fmt, t, statusTxt, showToast, onRefresh }) {
  const [proofFile, setProofFile] = useState(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const cnyDue = Number(order.total) + Number(order.delivery_fee || 0)
  const orderRate = order.payment_currency === 'HKD' && order.payment_amount != null && cnyDue > 0 ? Number(order.payment_amount) / cnyDue : 1
  const orderFmt = amount => formatAmount(Number(amount) * orderRate, order.payment_currency || 'CNY')
  const submitRequest = async (type) => {
    if (submitting) return
    if (type === 'delivery_upgrade' && deliveryAddress.trim().length < 5) {
      showToast('请填写完整的送货地址')
      return
    }
    const promptText = type === 'refund'
      ? '确认申请取消订单并退款？退款将由店主线下处理。'
      : '确认申请加 ¥30 单独配送？店主确认额外运费后才会改为送货到家。'
    if (!window.confirm(promptText)) return
    setSubmitting(true)
    try {
      const response = await authFetch(`${API}/orders/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, type, address: deliveryAddress })
      })
      const data = await response.json()
      showToast(response.ok ? '申请已提交，请等待店主处理' : data.error || '申请失败')
      if (response.ok) await onRefresh()
    } catch { showToast('申请失败，请重试') }
    finally { setSubmitting(false) }
  }
  return (
    <div>
      <div className="back-btn" onClick={onBack}>‹ 返回</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>订单详情</h3>
      <div className="order-detail-page">
        {order.payment_method !== 'cash_on_delivery' && ['pending', 'awaiting_confirmation'].includes(order.status) && (
          <div className="order-detail-card proof-priority-card">
            <h4>{order.status === 'pending' ? '待付款 · 上传付款凭证' : '付款凭证待确认'}</h4>
            <p>{order.status === 'pending' ? `本单应付 ${orderPaymentText(order)}。完成转账后，在这里上传付款截图。` : '截图已提交，店主确认后订单会进入拼团中。需要更换截图也可以重新上传。'}</p>
            <button type="button" className="payment-info-open" onClick={() => setShowPaymentDetails(true)}>查看收款方式与应付金额 ›</button>
            <label className="proof-file-picker">选择付款截图<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setProofFile(e.target.files[0] || null)} /></label>
            {proofFile && <><small className="proof-selected">已选择：{proofFile.name}</small><button className="btn-submit proof-confirm" disabled={proofUploading} onClick={async () => {
              setProofUploading(true)
              try {
                const error = await uploadProofFile(proofFile, order.id)
                if (error) showToast(error)
                else { showToast('凭证已保存，等待店主确认'); setProofFile(null); await onRefresh() }
                } catch (error) { showToast(error.message || '上传失败，请重试') }
              finally { setProofUploading(false) }
            }}>{proofUploading ? '正在上传…' : '确认上传付款凭证'}</button></>}
            <small className="proof-file-hint">支持 PNG、JPEG、WebP；较大的截图会自动压缩</small>
          </div>
        )}
        <div className="order-detail-card">
          <h4>收货信息</h4>
          <div className="order-detail-addr">
            <div className="icon">📍</div>
            <div className="info">
              <div className="name">{order.customer} <span className="phone">{order.phone}</span></div>
              <div className="detail">{order.address}</div>
            </div>
          </div>
        </div>
        <div className="order-detail-card">
          <h4>商品信息</h4>
          {order.items?.map(i => (
            <div className="order-detail-goods-item" key={i.id}>
              <div className="emoji">{i.product?.image ? <img src={i.product.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6}} /> : '🛒'}</div>
              <div className="g-info">
                <div className="name">{pn(i.product?.name)}{i.variant ? `（${i.variant}）` : ''}</div>
                <div className="price">{orderFmt(i.price)}</div>
              </div>
              <div className="qty">x{i.quantity}</div>
            </div>
          ))}
          <div className="order-detail-summary">
            <div className="row"><span>商品小计</span><span>{orderFmt(order.items?.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0) || 0)}</span></div>
            {Number(order.coupon_discount) > 0 && <div className="row"><span>优惠券</span><span>−{orderFmt(order.coupon_discount)}</span></div>}
            <div className="row"><span>运费</span><span>{orderFmt(order.delivery_fee || 0)}</span></div>
            <div className="row total"><span>{order.payment_status === 'refunded' ? '原订单金额' : '应付'}</span><span>{orderPaymentText(order)} · {order.payment_currency || 'CNY'}</span></div>
          </div>
        </div>
        <div className="order-detail-card">
          <h4>订单信息</h4>
          <div className="order-detail-meta">
            <div>订单编号：{displayOrderNo(order)}</div>
            {order.delivery_point_id && <div>取货时报订单号；手机号后四位用于核对。</div>}
            <div>{t('orderStatus')}：{statusTxt[order.status] || order.status}</div>
            <div>支付方式：{paymentText[order.payment_method] || order.payment_method}</div>
            <div>支付状态：{payStatusText[order.payment_status] || order.payment_status}</div>
            {order.request && <div>最新申请：{order.request.type === 'refund' ? '取消退款' : '加费单独配送'} · {order.request.status === 'pending' ? '待店主处理' : order.request.status === 'approved' ? '已处理' : '未通过'}{order.request.admin_note ? `（${order.request.admin_note}）` : ''}</div>}
            {order.request?.status === 'pending' && <div>{order.request.type === 'refund' ? '店主线下退款后会在后台标记，请留意订单状态。' : `请联系店主支付额外 ${orderFmt(30)}（运费基准 ¥30）；店主确认收款后改为送货到家。`}</div>}
            {order.payment_screenshot && <div className="saved-proof"><strong>已保存的付款凭证</strong><img src={order.payment_screenshot} alt="付款凭证" /></div>}
            <div>下单时间：{order.created_at?.slice(0, 19).replace('T', ' ')}</div>
            {order.remark && <div>备注：{order.remark}</div>}
          </div>
        </div>
        {order.delivery_point_id && order.status === 'paid' && order.payment_status === 'confirmed' && order.request?.status !== 'pending' && (
          <div className="order-detail-card order-service-actions">
            <h4>等待凑单期间</h4>
            <p>自取免运费。你也可以申请加 {orderFmt(30)} 单独配送（运费基准 ¥30），或取消订单并申请退款。</p>
            <label htmlFor="delivery-upgrade-address">单独配送地址</label>
            <input id="delivery-upgrade-address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="填写完整收货地址" maxLength={300} />
            <div className="service-action-row">
              <button disabled={submitting} onClick={() => submitRequest('delivery_upgrade')}>加 {orderFmt(30)} 单独配送</button>
              <button disabled={submitting} className="secondary" onClick={() => submitRequest('refund')}>取消订单并退款</button>
            </div>
          </div>
        )}
      </div>
      {showPaymentDetails && <div className="checkout-overlay" onClick={() => setShowPaymentDetails(false)}>
        <div className="checkout-panel payment-detail-panel" onClick={e => e.stopPropagation()}>
          <h3>付款信息</h3><p>订单号：{displayOrderNo(order)}</p>
          <div className="payment-due">应付 {orderPaymentText(order)}</div>
          {order.payment_method === 'fps_transfer' ? <div className="fps-pay-number">FPS 转数快手机号<br /><strong>95480721</strong></div> :
            <img className="payment-detail-qr" src={order.payment_method === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'} alt="收款码" />}
          <p>转账时请备注订单号，付款后返回订单上传截图。二维码扫不了请联系老板微信：{BOSS_WECHAT}。</p>
          <button className="btn-submit proof-confirm" onClick={() => setShowPaymentDetails(false)}>返回上传截图</button>
        </div>
      </div>}
    </div>
  )
}
