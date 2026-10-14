import { useState, useEffect } from 'react'

const API = '/api'
const statusText = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }
const paymentText = { cash_on_delivery: '货到付款（现金）', wechat_transfer: '微信转账', alipay_transfer: '支付宝转账', fps_transfer: '转数快 FPS' }
const payStatusText = { pending: '待支付', paid: '已支付', confirmed: '已确认收款' }

// ========== 多语言 ==========
const langPack = {
  zh_CN: { home:'首页',category:'分类',cart:'购物车',my:'我的',search:'搜索商品',welcome:'珍珍优质果菜',slogan:'新鲜直达 · 每日优选 · 一件送达',groupBuy:'今日凑单 满千免运',groupBuySlogan:'大家一起拼 越买越划算',hot:'热门推荐',pickPoint:'选择自取点',freeShipping:'免运费 · 该点满额统一配送',freeFee:'免运费',deliveryHome:'配送到家',deliveryHomeFee:'运费HK$30',checkout:'确认订单',goodsAmount:'商品金额',shipping:'运费',submit:'提交订单',cancel:'取消',myOrders:'我的订单',viewAll:'查看全部 ›',address:'收货地址',contact:'联系客服',help:'配送规则 / 帮助',favorites:'我的收藏',logout:'退出登录',clickLogin:'点击登录',loginHint:'登录后查看订单和地址',login:'登录',register:'注册',back:'返回上一页',username:'账号',password:'密码',phone:'手机号',addToCart:'加入购物车',checkOut:'去结算',emptyCart:'购物车是空的',favoriteEmpty:'还没有收藏商品',groupRemain:'还差',buyExtra:'顺手买一件',groupProgress:'当前拼单进度',groupFull:'该自取点满 HK$1000，大家都免运费',introTitle:'下单前必读',introBtn:'我已知晓，开始购物',next:'下一步',gotIt:'我知道了',step1Title:'① 选自取点',step1Desc:'点左上角📍选你就近的自提点',step2Title:'② 逛商品加购物车',step2Desc:'点商品看详情，点+号加购',step3Title:'③ 凑单满额',step3Desc:'大家一起凑够HK$1000就免运费',step4Title:'④ 去结算',step4Desc:'选支付方式，扫码付款等配送',deliveryRule:'配送规则：凑满门槛统一配送，免运费',details:'详情 ›',groupBuyBanner:'今日凑单',youGet:'已达起送门槛，今日可配送！',need:'起送',totalConfirmed:'已确认订单总额',ordersConfirmed:'笔订单已确认',all:'全部',emptySearch:'没有找到相关商品',emptyCat:'暂无商品',reached:'✓ 已达起送门槛，今日可配送！',searchResult:'搜索"{kw}"的结果',feeTitle:'运费说明：',feeEach:'· 免运费',feeFree:'· 当天该自取点总订单额满 HK$1000 即起送统一配送',feeNoRefund:'· 未满门槛则暂不配送，可加购凑单',feePerOrder:'本单免运费 · 满 HK$1000 起送',ustFee:'本单免运费 · 满 HK$500 起送',ustBenefit2:'🎓 学生优惠：免运费，满$500起送',feeHint:'免运费 · 该点满额统一配送',confirmOrder:'确认订单',needPay:'待付款',paid:'已付款',selectPointFirst:'请先选择自取点',tagHot:'爆款',tagNew:'新品',noPhone:'未绑定手机号',comingSoon:'敬请期待',statusPending:'待付款',statusPaid:'已付款',statusShipped:'已发货',statusCompleted:'已完成',statusCancelled:'已取消',orderAll:'全部订单',orderPending:'待付款',orderGroup:'拼团中',orderShipping:'待收货',orderDone:'已完成',coupons:'优惠券',refundAfterSale:'退款售后',orderPcs:'件',orderTotal:'合计',noOrders:'暂无订单',orderNo:'订单号',orderStatus:'订单状态',clear:'清空' },
  zh_HK: { home:'首頁',category:'分類',cart:'購物車',my:'我的',search:'搜尋商品',welcome:'珍珍優質果菜',slogan:'新鮮直達 · 每日優選 · 一件送達',groupBuy:'今日湊單 滿千免運',groupBuySlogan:'大家一起拼 越買越划算',hot:'熱門推薦',pickPoint:'選擇自取點',freeShipping:'免運費 · 該點滿額統一配送',freeFee:'免運費',deliveryHome:'配送到家',deliveryHomeFee:'運費HK$30',checkout:'確認訂單',goodsAmount:'商品金額',shipping:'運費',submit:'提交訂單',cancel:'取消',myOrders:'我的訂單',viewAll:'查看全部 ›',address:'收貨地址',contact:'聯繫客服',help:'配送規則 / 幫助',favorites:'我的收藏',logout:'退出登錄',clickLogin:'點擊登錄',loginHint:'登錄後查看訂單和地址',login:'登錄',register:'註冊',back:'返回上一頁',username:'賬號',password:'密碼',phone:'手機號',addToCart:'加入購物車',checkOut:'去結算',emptyCart:'購物車是空的',favoriteEmpty:'還沒有收藏商品',groupRemain:'還差',buyExtra:'順手買一件',groupProgress:'當前拼單進度',groupFull:'該自取點滿 HK$1000，大家都免運費',introTitle:'下單前必讀',introBtn:'我已知曉，開始購物',next:'下一步',gotIt:'我知道了',step1Title:'① 選自取點',step1Desc:'點左上角📍選你就近的自提點',step2Title:'② 逛商品加購物車',step2Desc:'點商品看詳情，點+號加購',step3Title:'③ 湊單滿額',step3Desc:'大家一起湊夠HK$1000就免運費',step4Title:'④ 去結算',step4Desc:'選支付方式，掃碼付款等配送',deliveryRule:'配送規則：湊滿門檻統一配送，免運費',details:'詳情 ›',groupBuyBanner:'今日湊單',youGet:'已達起送門檻，今日可配送！',need:'起送',totalConfirmed:'已確認訂單總額',ordersConfirmed:'筆訂單已確認',all:'全部',emptySearch:'沒有找到相關商品',emptyCat:'暫無商品',reached:'✓ 已達起送門檻，今日可配送！',searchResult:'搜索"{kw}"的結果',feeTitle:'運費說明：',feeEach:'· 免運費',feeFree:'· 當天該自取點總訂單額滿 HK$1000 即起送統一配送',feeNoRefund:'· 未滿門檻則暫不配送，可加購湊單',feePerOrder:'本單免運費 · 滿 HK$1000 起送',ustFee:'本單免運費 · 滿 HK$500 起送',ustBenefit2:'🎓 學生優惠：免運費，滿$500起送',feeHint:'免運費 · 該點滿額統一配送',confirmOrder:'確認訂單',needPay:'待付款',paid:'已付款',selectPointFirst:'請先選擇自取點',tagHot:'爆款',tagNew:'新品',noPhone:'未綁定手機號',comingSoon:'敬請期待',statusPending:'待付款',statusPaid:'已付款',statusShipped:'已發貨',statusCompleted:'已完成',statusCancelled:'已取消',orderAll:'全部訂單',orderPending:'待付款',orderGroup:'拼團中',orderShipping:'待收貨',orderDone:'已完成',coupons:'優惠券',refundAfterSale:'退款售後',orderPcs:'件',orderTotal:'合計',noOrders:'暫無訂單',orderNo:'訂單號',orderStatus:'訂單狀態',clear:'清空' },
  en: { home:'Home',category:'Categories',cart:'Cart',my:'My Account',search:'Search products',welcome:'Zhenzhen Fresh',slogan:'Fresh Daily · Delivered to You',groupBuy:'Group Buy · Free at HK$1000',groupBuySlogan:'Group together to save more',hot:'Popular Picks',pickPoint:'Pickup Point',freeShipping:'Free shipping at HK$1000',freeFee:'Free shipping',deliveryHome:'Home Delivery',deliveryHomeFee:'HK$30',checkout:'Confirm Order',goodsAmount:'Subtotal',shipping:'Shipping',submit:'Place Order',cancel:'Cancel',myOrders:'My Orders',viewAll:'View all ›',address:'Address',contact:'Contact Us',help:'Delivery Info / Help',favorites:'Favorites',logout:'Log Out',clickLogin:'Tap to Login',loginHint:'Login to see orders',login:'Login',register:'Register',back:'Back',username:'Username',password:'Password',phone:'Phone',addToCart:'Add to Cart',checkOut:'Checkout',emptyCart:'Your cart is empty',favoriteEmpty:'No favorites yet',groupRemain:'Need HK$',buyExtra:'Add one more',groupProgress:'Group progress',groupFull:'This point hits HK$1000 — free shipping!',introTitle:'Please Read First',introBtn:'Got it, shop now',next:'Next',gotIt:'Got it',step1Title:'1. Pick your point',step1Desc:'Tap 📍 top-left to choose',step2Title:'2. Browse & add',step2Desc:'Tap product to see, tap + to add',step3Title:'3. Group buy',step3Desc:'Group reaches HK$1000 = free shipping',step4Title:'4. Checkout',step4Desc:'Choose payment, scan QR, wait',deliveryRule:'Group ships when threshold reached; free shipping',details:'Details ›',groupBuyBanner:'Group Buy Today',youGet:'Threshold reached! Delivering today.',need:'to go',totalConfirmed:'Confirmed total',ordersConfirmed:'orders',all:'All',emptySearch:'No products found',emptyCat:'No products',reached:'✓ Threshold reached! Delivering today.',searchResult:'Results for "{kw}"',feeTitle:'Shipping info:',feeEach:'· Free shipping',feeFree:'· Ship when this point totals HK$1000 today',feeNoRefund:'· If under threshold, wait — add items',feePerOrder:'Free shipping · HK$1000 to start',ustFee:'No shipping · HK$500 to start',ustBenefit2:'🎓 Student deal: no shipping, HK$500 to start',feeHint:'Free · ship at HK$1000',confirmOrder:'Confirm Order',needPay:'Pending',paid:'Paid',selectPointFirst:'Please select a pickup point',tagHot:'Hot',tagNew:'New',noPhone:'No phone linked',comingSoon:'Coming soon',statusPending:'To Pay',statusPaid:'Paid',statusShipped:'Shipped',statusCompleted:'Completed',statusCancelled:'Cancelled',orderAll:'All Orders',orderPending:'To Pay',orderGroup:'Group Buy',orderShipping:'To Receive',orderDone:'Completed',coupons:'Coupons',refundAfterSale:'Refund & After-sales',orderPcs:'items',orderTotal:'Total',noOrders:'No orders',orderNo:'Order No.',orderStatus:'Order Status',clear:'Clear' }
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
  '香辛料蔬菜': { zh_HK:'香辛料蔬菜', en:'Herbs & Spices' },
  '蔬菜盲盒': { zh_HK:'蔬菜盲盒', en:'Veggie Blind Box' },
  '蛋类': { zh_HK:'蛋類', en:'Eggs' },
  '时令蔬果(限定)': { zh_HK:'時令蔬果(限定)', en:'Seasonal (Limited)' },
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
  const [checkoutAddrId, setCheckoutAddrId] = useState(null)
  const [remark, setRemark] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery')
  const [showPaymentQR, setShowPaymentQR] = useState(false)
  const [paidOrderNo, setPaidOrderNo] = useState('')
  const [stats, setStats] = useState(null)
  const [deliveryPoints, setDeliveryPoints] = useState([])
  const [selectedPointId, setSelectedPointId] = useState(() => localStorage.getItem('selectedPointId') || null)
  const [showPointPicker, setShowPointPicker] = useState(false)
  const [deliveryType, setDeliveryType] = useState('pickup')
  const [ustBenefit, setUstBenefit] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [favorites, setFavorites] = useState(() => JSON.parse(localStorage.getItem('favorites') || '[]'))
  const [searchHistory, setSearchHistory] = useState(() => JSON.parse(localStorage.getItem('searchHistory') || '[]'))
  const [showHelp, setShowHelp] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [lang, setLang] = useState(() => localStorage.getItem('lang') || 'zh_CN')
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)

  const t = (key) => langPack[lang][key] || key
  const rmb2hkd = (rmb) => (Number(rmb) * 1.08).toFixed(0)
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
    let variants = []
    try { variants = p.variants ? JSON.parse(p.variants) : [] } catch(e) {}
    if (variants.length > 0) {
      const prices = variants.map(v => Number(v.price))
      const min = Math.min(...prices)
      const max = Math.max(...prices)
      return min === max ? min.toFixed(2) : `${min.toFixed(0)}~${max.toFixed(0)}`
    }
    return p.price.toFixed(2)
  }
  const hasVariants = (p) => {
    try { return p.variants && JSON.parse(p.variants).length > 0 } catch(e) { return false }
  }
  const quickAdd = (p) => {
    if (p.is_active === false) return
    if (hasVariants(p)) { setSelectedProduct(p); return }
    addToCart(p.id)
  }
  const statusTxt = { pending: t('statusPending'), paid: t('statusPaid'), shipped: t('statusShipped'), completed: t('statusCompleted'), cancelled: t('statusCancelled') }

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
  }, [])

  useEffect(() => {
    const t = setInterval(() => setBannerIdx(i => (i + 1) % 2), 4000)
    return () => clearInterval(t)
  }, [])

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

  // 切回首页时也刷新一次
  useEffect(() => {
    if (tab === 'home') loadStats()
  }, [tab])

  const selectPoint = (pid) => {
    localStorage.setItem('selectedPointId', String(pid))
    setSelectedPointId(String(pid))
    setShowPointPicker(false)
    loadStats()
    // 科技大学学生优惠提示
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

  const newUserProducts = products.filter(p => p.is_new).slice(0, 4)

  const addToCart = (id, variantLabel, variantPrice) => {
    const key = variantLabel ? `${id}::${variantLabel}` : String(id)
    setCart(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }))
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
  const currentPoint = deliveryPoints.find(p => p.id == selectedPointId)
  const isUstPoint = currentPoint && (currentPoint.name.includes('科技大学') || currentPoint.name.includes('科大') || currentPoint.name.includes('UST'))
  const effectiveFee = 0
  const effectiveThreshold = isUstPoint ? 500 : (stats?.threshold || 1000)
  const effectiveReached = stats ? stats.confirmed_total >= effectiveThreshold : false

  const updateQty = (id, delta) => {
    setCart(prev => {
      const next = { ...prev }
      next[id] = (next[id] || 0) + delta
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
    let customer = '', phone = '', address = ''
    if (deliveryType === 'pickup') {
      if (!selectedPointId) { showToast(t('selectPointFirst')); setShowPointPicker(true); return }
      const pt = deliveryPoints.find(p => p.id == selectedPointId)
      customer = currentUser?.username || ''
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
        delivery_type: deliveryType,
        delivery_point_id: deliveryType === 'pickup' ? selectedPointId : null,
        items: cartItems.map(item => ({ product_id: item.product.id, quantity: item.qty, variant: item.variantLabel || '', price: item.variantPrice }))
      })
    })
    if (res.ok) {
      const data = await res.json()
      showToast('下单成功！')
      setCart({})
      setShowCheckout(false)
      setRemark('')
      authFetch(`${API}/orders`).then(r => r.ok ? r.json() : []).then(setOrders)
      if (paymentMethod === 'wechat_transfer' || paymentMethod === 'alipay_transfer' || paymentMethod === 'fps_transfer') {
        setPaidOrderNo(data.order_no)
        setShowPaymentQR(true)
      } else {
        setTab('myOrders')
      }
    } else {
      const data = await res.json().catch(() => ({}))
      showToast(data.error || '下单失败')
    }
  }

  const handleLogin = async (username, password) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error || '登录失败'); return }
    localStorage.setItem('token', data.token)
    localStorage.setItem('currentUser', JSON.stringify({ username: data.username, phone: data.phone }))
    setCurrentUser({ username: data.username, phone: data.phone })
    setTab('my')
    showToast('登录成功')
  }

  const handleRegister = async (username, password, phone) => {
    if (!username || !password) { showToast('请填写账号和密码'); return }
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, phone })
    })
    const data = await res.json()
    if (!res.ok) { showToast(data.error || '注册失败'); return }
    localStorage.setItem('token', data.token)
    localStorage.setItem('currentUser', JSON.stringify({ username: data.username, phone: data.phone }))
    setCurrentUser({ username: data.username, phone: data.phone })
    setTab('my')
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
    setShowCart(false)
    setShowCheckout(true)
  }

  // ========== 渲染 ==========
  if (tab === 'login') {
    return <LoginPage t={t} onLogin={handleLogin} onRegister={handleRegister} onBack={() => setTab('my')} />
  }

  if (tab === 'orderDetail' && selectedOrder) {
    return <OrderDetailPage order={selectedOrder} onBack={() => setTab('myOrders')} />
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
            <div className="product-card" key={p.id} onClick={() => setSelectedProduct(p)}>
              <div className="emoji">
                {p.image ? <img src={p.image} alt={p.name} /> : '🛒'}
                <span onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id) }} style={{
                  position: 'absolute', top: 6, right: 6, fontSize: 16,
                  background: 'rgba(255,255,255,0.9)', borderRadius: '50%', width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                }}>❤️</span>
              </div>
              <div className="info">
                <div className="name">{pn(p.name)}</div>
                <div className="bottom-row">
                  <div className="price"><small>¥</small>{priceText(p)}</div>
                  <button className="add-btn" onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>+</button>
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
      <div className="top-bar" style={{ paddingTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          {deliveryPoints.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: '#1a1a1a' }} onClick={() => setShowPointPicker(true)}>
              📍 <b>{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || t('pickPoint')}</b>
              <span style={{ fontSize: 12, color: '#666' }}>▼</span>
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
            {Object.entries({ zh_CN:'简', zh_HK:'繁', en:'EN' }).map(([k,v]) => (
              <span key={k} onClick={() => switchLang(k)} style={{
                padding: '2px 8px', borderRadius: 8, cursor: 'pointer',
                background: lang === k ? '#2eb85c' : '#f2f3f5',
                color: lang === k ? '#fff' : '#666',
                fontWeight: lang === k ? 600 : 400
              }}>{v}</span>
            ))}
          </div>
        </div>
        <div className="search-box">
          🔍 <input
            placeholder={t('search')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); saveSearchHistory(searchInput); setTab('home') } }}
          />
          {searchInput && (
            <span style={{ color: '#999', cursor: 'pointer', fontSize: 13 }} onClick={() => { setSearchInput(''); setSearch('') }}>清除</span>
          )}
        </div>
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
      </div>

      {tab === 'home' && (
        <>
          <div className="banner">
            <div className={`banner-slide banner-poster ${bannerIdx === 0 ? 'banner-green' : 'banner-orange'}`}>
              {bannerIdx === 0 ? (
                <>
                  <div className="banner-title">🥬 {t('welcome')}</div>
                  <div className="banner-sub">{t('slogan')}</div>
                </>
              ) : (
                <>
                  <div className="banner-title">🚚 {t('groupBuy')}</div>
                  <div className="banner-sub">{t('groupBuySlogan')}</div>
                </>
              )}
            </div>
            <div className="banner-dots">
              <span className={bannerIdx === 0 ? 'active' : ''} />
              <span className={bannerIdx === 1 ? 'active' : ''} />
            </div>
          </div>

          {/* 分类宫格 */}
          {categories.length > 0 && (
            <div className="category-grid">
              {categories.slice(0, 8).map(c => (
                <div key={c.id} className="cat-item" onClick={() => { setSelectedCategory(c.id); setTab('category'); window.scrollTo(0,0) }}>
                  <div className="cat-icon">{c.icon || '🛍️'}</div>
                  <div className="cat-name">{cn(c.name)}</div>
                </div>
              ))}
            </div>
          )}

          {/* 配送规则小横幅 */}
          <div style={{ margin: '8px 12px 0', background: '#e3f2fd', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: '#1976d2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            onClick={() => setShowHelp(true)}>
            <span>📦 {t('deliveryRule')}</span>
            <span>{t('details')}</span>
          </div>

          {/* 凑单进度条 */}
          {stats && (
            <div className="group-buy-banner">
              <div className="group-buy-row">
                <span className="group-buy-label">🚚 {dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || '今日凑单'}</span>
                {effectiveReached ? (
                  <span className="group-buy-reached">{t('reached')}</span>
                ) : (
                  <span className="group-buy-remain">{t('groupRemain')} <b>¥{(effectiveThreshold - stats.confirmed_total).toFixed(0)}</b> {t('need')}</span>
                )}
              </div>
              <div className="group-buy-progress">
                <div
                  className="group-buy-progress-bar"
                  style={{ width: `${Math.min(100, (stats.confirmed_total / effectiveThreshold) * 100)}%` }}
                />
              </div>
              <div className="group-buy-footer">
                <span>{t('totalConfirmed')}：<b style={{ color: effectiveReached ? '#3cb043' : '#ff6b35' }}>¥{stats.confirmed_total.toFixed(0)}</b> / ¥{effectiveThreshold}</span>
                <span>{stats.confirmed_count} {t('ordersConfirmed')}</span>
              </div>
            </div>
          )}

          {newUserProducts.length > 0 && (
            <div className="new-user-section">
              <div className="section-header">
                <h3>新人专享（任选一件）</h3>
                <span className="more">更多 ›</span>
              </div>
              <div className="product-scroll">
                {newUserProducts.map(p => (
                  <div className="product-card-mini" key={p.id} onClick={() => quickAdd(p)}>
                    <div className="emoji">{p.image ? <img src={p.image} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}} /> : '🛒'}</div>
                    <span className="tag">新人价</span>
                    <div className="name">{pn(p.name)}</div>
                    <div className="price">¥{priceText(p)}</div>
                    <div className="orig-price">¥{p.original_price?.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="category-grid">
            {categories.map(c => (
              <div className="category-item" key={c.id} onClick={() => { setActiveCategory(c.id); setTab('category'); window.scrollTo(0, 0) }}>
                <div className="icon">{c.icon || '📦'}</div>
                <span className="name">{cn(c.name)}</span>
              </div>
            ))}
          </div>

          <div className="product-list">
            <div className="product-list-title">{search ? t('searchResult').replace('{kw}', search) : '🔥 ' + t('hot')}</div>
            <div className="product-grid">
              {filteredProducts.map(p => (
                <div className="product-card" key={p.id} onClick={() => setSelectedProduct(p)} style={p.is_active === false ? { opacity: 0.5, filter: 'grayscale(1)' } : {}}>
                  <div className="emoji">
                    {p.image ? <img src={p.image} alt={p.name} /> : '🛒'}
                    {(p.is_hot || p.is_new) && <div className="promo-tag">{p.is_hot ? t('tagHot') : t('tagNew')}</div>}
                    {p.is_active === false && <div className="promo-tag" style={{background:'#999'}}>{t('offShelf') || '已下架'}</div>}
                    <span onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id) }} className="fav-btn">
                      {favorites.includes(p.id) ? '❤️' : '🤍'}
                    </span>
                  </div>
                  <div className="info">
                    <div className="name">{pn(p.name)}</div>
                    <div className="unit-line">
                      {p.original_price && p.original_price > p.price ? (
                        <div className="orig-price">¥{p.original_price.toFixed(2)}</div>
                      ) : <div className="orig-price orig-placeholder">&nbsp;</div>}
                      <div className="sales">{p.is_hot ? '🔥 ' + t('tagHot') : ''}</div>
                    </div>
                    <div className="bottom-row">
                      <div className="price"><small>¥</small>{priceText(p)}</div>
                      {p.is_active !== false && <button className="add-btn" onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>+</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="empty-state"><div className="icon">🔍</div>{t('emptySearch')}</div>}
          </div>
        </>
      )}

      {tab === 'category' && (
        <div className="cat-layout">
          <div className="cat-sidebar">
            <div className={`cat-side-item ${!activeCategory ? 'active' : ''}`} onClick={() => { setActiveCategory(null); window.scrollTo(0, 0) }}>
              {t('all')}
            </div>
            {categories.map(c => (
              <div className={`cat-side-item ${activeCategory === c.id ? 'active' : ''}`} key={c.id} onClick={() => { setActiveCategory(c.id); window.scrollTo(0, 0) }}>
                {c.icon || '📦'} {cn(c.name)}
              </div>
            ))}
          </div>
          <div className="cat-main">
            <div className="product-grid">
              {filteredProducts.map(p => (
                <div className="product-card" key={p.id} onClick={() => setSelectedProduct(p)} style={p.is_active === false ? { opacity: 0.5, filter: 'grayscale(1)' } : {}}>
                  <div className="emoji">
                    {p.image ? <img src={p.image} alt={p.name} /> : '🛒'}
                    {(p.is_hot || p.is_new) && <div className="promo-tag">{p.is_hot ? t('tagHot') : t('tagNew')}</div>}
                    {p.is_active === false && <div className="promo-tag" style={{background:'#999'}}>{t('offShelf') || '已下架'}</div>}
                    <span onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id) }} className="fav-btn">
                      {favorites.includes(p.id) ? '❤️' : '🤍'}
                    </span>
                  </div>
                  <div className="info">
                    <div className="name">{pn(p.name)}</div>
                    <div className="unit-line">
                      {p.original_price && p.original_price > p.price ? (
                        <div className="orig-price">¥{p.original_price.toFixed(2)}</div>
                      ) : <div className="orig-price orig-placeholder">&nbsp;</div>}
                      <div className="sales">{p.is_hot ? '🔥 ' + t('tagHot') : ''}</div>
                    </div>
                    <div className="bottom-row">
                      <div className="price"><small>¥</small>{priceText(p)}</div>
                      {p.is_active !== false && <button className="add-btn" onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>+</button>}
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
              {[['all', t('orderAll')], ['pending', t('orderPending')], ['paid', t('orderGroup')], ['shipped', t('orderShipping')], ['completed', t('orderDone')]].map(([f, label]) => (
                <div key={f} className={`order-filter-tab ${orderFilter === f ? 'active' : ''}`} onClick={() => setOrderFilter(f)}>{label}</div>
              ))}
            </div>
            {(() => {
              const list = orderFilter === 'all' ? orders : orders.filter(o => o.status === orderFilter)
              if (list.length === 0) return <div className="empty-state"><div className="icon">📭</div>{t('noOrders')}</div>
              return list.map(o => (
                <div className="order-item-card" key={o.id} style={{ background: '#fff', borderRadius: 10, marginBottom: 10 }} onClick={() => { setSelectedOrder(o); setTab('orderDetail') }}>
                  <div className="order-top">
                    <span>{t('orderNo')}：{o.order_no}</span>
                    <span className="order-status">{statusTxt[o.status] || o.status}</span>
                  </div>
                  <div className="order-goods">{o.items?.map(i => `${pn(i.product?.name)} x${i.quantity}`).join('，')}</div>
                  <div className="order-total">{t('orderTotal')}：<span>¥{o.total?.toFixed(2)}</span></div>
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
                  <div className="name">{currentUser.username}</div>
                  <div className="phone">{currentUser.phone || t('noPhone')}</div>
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
                  <div className="my-menu-item" onClick={() => showToast(t('comingSoon'))}>
                    <span className="icon">🎟️</span>
                    <span className="text">{t('coupons')}</span>
                    <span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => setTab('favorites')}>
                    <span className="icon">❤️</span>
                    <span className="text">{t('favorites')} ({favorites.length})</span>
                    <span className="arrow">›</span>
                  </div>
                  <div className="my-menu-item" onClick={() => showToast(t('comingSoon'))}>
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
                <div className="cart-item" key={itemKey}>
                  <div className="emoji">{item.product.image ? <img src={item.product.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6}} /> : '🛒'}</div>
                  <div className="detail">
                    <div className="name">{pn(item.product.name)}{item.variantLabel && <small style={{color:'#ff4444',marginLeft:6,fontSize:12}}>({item.variantLabel})</small>}</div>
                    <div className="price">¥{item.variantPrice.toFixed(2)}<small style={{fontSize:11,color:'#999'}}>{item.product.unit || '/斤'}</small></div>
                  </div>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(itemKey, -1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn plus" onClick={() => updateQty(itemKey, 1)}>+</button>
                  </div>
                </div>
                )
              })}
            </div>
            {/* 凑单推荐 */}
            {deliveryType === 'pickup' && stats && !effectiveReached && (
              <div style={{ padding: '10px 16px', background: '#fff8e1', borderTop: '1px solid #ffe0b2' }}>
                <div style={{ fontSize: 14, color: '#f57c00', fontWeight: 600, marginBottom: 2 }}>
                  💡 {t('buyExtra')}
                </div>
                <div style={{ fontSize: 12, color: '#8a6d3b', marginBottom: 8 }}>
                  {t('groupProgress')}：<b>¥{(stats.confirmed_total || 0).toFixed(0)}</b> / <b>¥{effectiveThreshold.toFixed(0)}</b> · {t('groupRemain')} <b>¥{(effectiveThreshold - (stats.confirmed_total || 0)).toFixed(0)}</b>
                </div>
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                  {products.filter(p => p.price <= 20 && !cart[p.id]).slice(0, 5).map(p => (
                    <div key={p.id} style={{ minWidth: 80, background: '#fff', borderRadius: 8, padding: 6, textAlign: 'center', cursor: 'pointer' }}
                      onClick={() => quickAdd(p)}>
                      <div style={{ fontSize: 24 }}>{p.image ? '' : '🛒'}</div>
                      <div style={{ fontSize: 11, color: '#333', margin: '4px 0' }}>{pn(p.name).slice(0, 4)}</div>
                      <div style={{ fontSize: 12, color: '#ff4444', fontWeight: 600 }}>¥{p.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="cart-footer">
              <div className="cart-total">合计：<span>¥{cartTotal.toFixed(2)}</span> <small style={{fontSize:12,color:'#999',fontWeight:400}}>(≈HK${rmb2hkd(cartTotal)})</small></div>
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
                  border: deliveryType === 'pickup' ? '2px solid #3cb043' : '1px solid #eee',
                  background: deliveryType === 'pickup' ? '#f0fff0' : '#fff', fontSize: 14
                }}>
                  🛍️ 到自取点
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                    {isUstPoint ? t('ustBenefit2') : t('feeHint')}
                  </div>
                </div>
                <div onClick={() => setDeliveryType('delivery')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: deliveryType === 'delivery' ? '2px solid #3cb043' : '1px solid #eee',
                  background: deliveryType === 'delivery' ? '#f0fff0' : '#fff', fontSize: 14
                }}>
                  🏠 配送到家
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>运费$30</div>
                </div>
              </div>
            </div>
            {deliveryType === 'pickup' && (
            <div className="form-group">
              <label>自取点</label>
              <div style={{ padding: 10, background: '#f9f9f9', borderRadius: 8, fontSize: 14, marginBottom: 10 }}>
                📍 <b>{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || '未选择'}</b>
                <span style={{ color: '#3cb043', cursor: 'pointer', marginLeft: 10, fontSize: 13 }} onClick={() => setShowPointPicker(true)}>切换</span>
              </div>
            </div>
            )}
            {deliveryType === 'delivery' && (
            <div className="form-group">
              <label>收货地址</label>
              {addresses.length === 0 ? (
                <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 8, fontSize: 13, color: '#999' }}>
                  暂无地址，<span style={{ color: '#3cb043', cursor: 'pointer' }} onClick={() => { setShowCheckout(false); setTab('address'); setEditingAddr(null); setTab('addrEdit') }}>去添加</span>
                </div>
              ) : (
                <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                  {addresses.map(a => (
                    <div
                      key={a.id}
                      onClick={() => setCheckoutAddrId(a.id)}
                      style={{
                        padding: 10,
                        border: checkoutAddrId === a.id ? '2px solid #3cb043' : '1px solid #eee',
                        borderRadius: 8,
                        marginBottom: 8,
                        cursor: 'pointer',
                        background: checkoutAddrId === a.id ? '#f0fff0' : '#fff'
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
              <label>支付方式</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <div onClick={() => setPaymentMethod('cash_on_delivery')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'cash_on_delivery' ? '2px solid #3cb043' : '1px solid #eee',
                  background: paymentMethod === 'cash_on_delivery' ? '#f0fff0' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💵</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>货到付款</div>
                </div>
                <div onClick={() => setPaymentMethod('wechat_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'wechat_transfer' ? '2px solid #3cb043' : '1px solid #eee',
                  background: paymentMethod === 'wechat_transfer' ? '#f0fff0' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💚</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>微信</div>
                </div>
                <div onClick={() => setPaymentMethod('alipay_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'alipay_transfer' ? '2px solid #3cb043' : '1px solid #eee',
                  background: paymentMethod === 'alipay_transfer' ? '#f0fff0' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💙</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>支付宝</div>
                </div>
                <div onClick={() => setPaymentMethod('fps_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'fps_transfer' ? '2px solid #3cb043' : '1px solid #eee',
                  background: paymentMethod === 'fps_transfer' ? '#f0fff0' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💱</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>转数快</div>
                </div>
              </div>
            </div>
            <div style={{ marginBottom: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>商品金额</span>
                <span>¥{cartTotal.toFixed(2)} <small style={{color:'#999'}}>(≈HK${rmb2hkd(cartTotal)})</small></span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>运费</span>
                <span style={{ color: (deliveryType === 'delivery' || !stats?.reached) ? '#ff4444' : '#3cb043', fontWeight: 600 }}>
                  {deliveryType === 'delivery' ? 'HK$30' : t('freeFee')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', borderTop: '1px solid #eee', marginTop: 4 }}>
                <span>共 {cartCount} 件</span>
                <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 18 }}>
                  ¥{cartTotal.toFixed(2)} <small style={{fontSize:12,color:'#999',fontWeight:400}}>(≈HK${rmb2hkd(cartTotal)})</small>
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

      {/* 商品详情弹窗 */}
      {selectedProduct && (
        <div className="checkout-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div style={{ position: 'relative' }}>
              {selectedProduct.image ? (
                <img src={selectedProduct.image} alt={pn(selectedProduct.name)} style={{ width: '100%', borderRadius: '12px 12px 0 0', aspectRatio: '1/1', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1/1', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, borderRadius: '12px 12px 0 0' }}>🛒</div>
              )}
              <span onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</span>
            </div>
            <div style={{ padding: 16 }}>
              <h3 style={{ fontSize: 18, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {pn(selectedProduct.name)}
                <span onClick={() => toggleFavorite(selectedProduct.id)} style={{ fontSize: 24, cursor: 'pointer' }}>
                  {favorites.includes(selectedProduct.id) ? '❤️' : '🤍'}
                </span>
              </h3>
              {(() => {
                let variants = []
                try { variants = selectedProduct.variants ? JSON.parse(selectedProduct.variants) : [] } catch(e) {}
                if (variants.length === 0) return (
                  <>
                    <div style={{ fontSize: 24, color: '#ff4444', fontWeight: 'bold', marginBottom: 12 }}>¥{selectedProduct.price.toFixed(2)}<small style={{fontSize:13,color:'#999',fontWeight:400}}>{selectedProduct.unit || '/斤'}</small></div>
                    {selectedProduct.description && <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>{selectedProduct.description}</p>}
                    {selectedProduct.is_active !== false ? (
                      <button className="btn-submit" style={{ width: '100%' }} onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null) }}>加入购物车</button>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center', padding: '12px', background: '#f0f0f0', color: '#999', borderRadius: 8, fontWeight: 600 }}>已下架，暂不可购买</div>
                    )}
                  </>
                )
                // Has variants: show selector
                return (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, color: '#999', marginBottom: 6 }}>选择规格：</div>
                      {variants.map((v, i) => (
                        <div key={i} onClick={() => { addToCart(selectedProduct.id, v.label, v.price); setSelectedProduct(null) }}
                          style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', marginBottom: 6, border: '1px solid #ff4444', borderRadius: 8, cursor: 'pointer', background: '#fff5f5' }}>
                          <span style={{ fontWeight: 600 }}>{v.label}</span>
                          <span style={{ color: '#ff4444', fontWeight: 700 }}>¥{Number(v.price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    {selectedProduct.description && <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>{selectedProduct.description}</p>}
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}
      {/* 配送点选择弹窗（强制选择） */}
      {showPointPicker && (
        <div className="checkout-overlay" style={{ zIndex: 3000 }} onClick={() => { if (localStorage.getItem('selectedPointId')) setShowPointPicker(false) }}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>📍 {t('pickPoint')}</h3>
            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, fontSize: 12, color: '#f57c00', marginBottom: 12, textAlign: 'left', lineHeight: 1.6 }}>
              {t('feeTitle')}<br />{t('feeEach')}<br />{t('feeFree')}<br />{t('feeNoRefund')}
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              {deliveryPoints.map(p => (
                <div
                  key={p.id}
                  onClick={() => selectPoint(p.id)}
                  style={{
                    padding: 12, border: selectedPointId == p.id ? '2px solid #3cb043' : '1px solid #eee',
                    borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                    background: selectedPointId == p.id ? '#f0fff0' : '#fff'
                  }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{dn(p.name)}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{dn(p.address)}</div>
                  <div style={{ fontSize: 12, color: '#3cb043', marginTop: 3 }}>🚚 {selectedPointId == p.id && isUstPoint ? t('ustFee') : t('feePerOrder')}</div>
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
              {paymentMethod === 'wechat_transfer' && <>📌 操作：点「保存收款码」→ 点「打开微信」→ 右上角 + → 扫一扫 → 相册选刚保存的图付款。<br />转账时备注订单号，付完截图发给老板微信。</>}
              {paymentMethod === 'alipay_transfer' && <>📌 操作：点「保存收款码」→ 点「打开支付宝」→ 扫一扫 → 相册选刚保存的图付款。<br />转账时备注订单号，付完截图发给老板微信。</>}
              {paymentMethod === 'fps_transfer' && <>📌 操作：转数快 FPS 转账到 <b>95480721</b>，备注订单号，付完截图发给老板微信。</>}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setTab('myOrders') }}>稍后支付</button>
              <button className="btn-submit" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setTab('myOrders'); showToast('请等待老板确认收款') }}>我已付款</button>
            </div>
          </div>
        </div>
      )}

      {/* 新手指引弹窗 */}
      {showOnboard && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => {}}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 60, marginBottom: 12 }}>
              {['📍', '🛒', '👥', '✅'][onboardStep]}
            </div>
            <h3 style={{ marginBottom: 8 }}>{t(`step${onboardStep+1}Title`)}</h3>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>{t(`step${onboardStep+1}Desc`)}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {[0,1,2,3].map(i => (
                <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: i === onboardStep ? '#3cb043' : '#ddd' }} />
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
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>📋 下单前必读</h3>

            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}>
              <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <b>🚚 关于凑单配送</b><br />
                · 本站是<b>拼单模式</b>：大家一起买，凑够起送金额才配送<br />
                · 不是单笔订单满额，是<b>当天该自取点所有人加起来满额</b><br />
                · 想单独送到家？运费 HK$30，可选"配送到家"
              </div>

              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <b>⏰ 配送时间</b><br />
                · 当天 <b>中午12:00前</b> 凑满起送额 → 当天晚上配送<br />
                · 当天 <b>中午12:00后</b> 才满额 → 第二天配送<br />
                · 每天 <b>晚上12:00</b> 截止当天下单
              </div>

              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <b>✅ 关于订单确认</b><br />
                · 下单后老板会当天确认，没及时确认也不用紧张<br />
                · 确认可能有延时，<b>只要付了钱就放心，一定会确认</b><br />
                · 凑单进度条实时更新，大家都能看到还差多少
              </div>

              <div style={{ background: '#fce4ec', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <b>💳 关于付款</b><br />
                · 选微信/支付宝/转数快付款后，会弹出收款二维码<br />
                · <b>请截图扫码转账给老板</b>，转账后联系老板确认<br />
                · 货到付款：取货时给现金
              </div>

              <div style={{ background: '#f3e5f5', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <b>📞 联系我们</b><br />
                · <b>UST科大学生</b>：请加「菜神」微信进群<br />
                · <b>小区居民</b>：请加老板微信<br />
                · 有任何问题（退货、退款、缺货）都直接微信联系
              </div>

              <div style={{ background: '#fafafa', padding: 12, borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#666' }}>
                <b>📦 关于退货</b><br />
                · 生鲜类商品不支持无理由退货<br />
                · 如有质量问题（坏果、缺斤少两），拍照联系老板退款
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

      {/* 科大学生优惠弹窗 */}
      {ustBenefit && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => setUstBenefit(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎓</div>
            <h3 style={{ color: '#3cb043', marginBottom: 8 }}>UST 科大学生优惠</h3>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, marginBottom: 16 }}>
              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                🎓 <b>学生优惠</b><br/>
                免运费 · 满 HK$500 即起送
              </div>
              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8 }}>
                🎯 <b>起送门槛 HK$500</b><br/>
                当天该点总订单满 HK$500 即起送统一配送<br/>
                比其他自取点低一半！
              </div>
            </div>
            <button className="btn-submit" style={{ width: '100%' }} onClick={() => setUstBenefit(false)}>
              太好了，开始购物
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
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3cb043' }}>🎓 UST科大学生 · 菜神</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>加微信进群 / 咨询订单</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>ustshucaizhishen</div>
                  <button onClick={() => copyText('ustshucaizhishen', '微信号')} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #3cb043', color: '#3cb043', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>复制</button>
                </div>
              </div>

              <div style={{ border: '1px solid #e8f5e9', background: '#f6fff8', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3cb043' }}>🏠 小区居民 · 老板</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>加微信咨询订单 / 售后</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>jennybabi1988</div>
                  <button onClick={() => copyText('jennybabi1988', '微信号')} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #3cb043', color: '#3cb043', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>复制</button>
                </div>
              </div>

              <div style={{ border: '1px solid #e6f4ff', background: '#f4faff', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#128c7e' }}>💬 WhatsApp 客服</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>海外 / 非微信用户首选</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>+852 95228191</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => copyText('+85295228191', 'WhatsApp号')} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #128c7e', color: '#128c7e', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>复制</button>
                    <a href="https://wa.me/85295228191" target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #128c7e', color: '#fff', background: '#128c7e', borderRadius: 14, cursor: 'pointer', textDecoration: 'none' }}>打开</a>
                  </div>
                </div>
              </div>
            </div>

            <button className="btn-submit" style={{ width: '100%' }} onClick={() => setShowContact(false)}>我知道了</button>
          </div>
        </div>
      )}

      {/* 配送规则弹窗 */}
      {showHelp && (
        <div className="checkout-overlay" onClick={() => setShowHelp(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '85vh', overflowY: 'auto' }}>
            <h3>📋 配送规则</h3>
            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}>
              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>⏰ 配送时间</b><br />
                · 当天中午12:00前凑满起送额 → 当天晚上配送<br />
                · 中午12:00后才满额 → 第二天配送<br />
                · 每天晚上12:00截止当天下单
              </div>
              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>🚚 运费规则</b><br />
                · 自取免运费<br />
                · 当天该自取点总订单满 HK$1000 即起送统一配送<br />
                · 单独送到家：HK$30
              </div>
              <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>📍 自取点</b><br />
                · 日出康城站 / 科技大学 / 坑口站 / 宝琳站 / 将军澳站 / 调景岭站
              </div>
              <div style={{ background: '#fce4ec', padding: 12, borderRadius: 8 }}>
                <b>📞 有问题？</b><br />
                UST学生加菜神微信，小区居民加老板微信
              </div>
            </div>
            <button className="btn-submit" style={{ width: '100%', marginTop: 12 }} onClick={() => setShowHelp(false)}>我知道了</button>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {/* 底部导航 */}
      <div className="bottom-nav">
        <div className={`nav-item ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <span className="icon">🏠</span>{t('home')}
        </div>
        <div className={`nav-item ${tab === 'category' ? 'active' : ''}`} onClick={() => { setTab('category'); window.scrollTo(0, 0) }}>
          <span className="icon">⬡</span>{t('category')}
        </div>
        <div className="nav-item" onClick={() => setShowCart(true)}>
          <span className="icon">🛒</span>{t('cart')}
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
        <div className={`nav-item ${tab === 'my' || tab === 'myOrders' || tab === 'address' || tab === 'orderDetail' ? 'active' : ''}`} onClick={() => setTab('my')}>
          <span className="icon">👤</span>{t('my')}
        </div>
      </div>
    </div>
  )
}

/* ========== 登录页 ========== */
function LoginPage({ onLogin, onRegister, onBack, t }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  const submit = () => {
    if (mode === 'login') onLogin(username, password)
    else if (!phone || phone.length < 8) { alert(t('phone') + ' *'); return }
    else onRegister(username, password, phone)
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
          <label>{t('username')}</label>
          <input placeholder={t('username')} value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="login-input-group">
          <label>{t('password')}</label>
          <input type="password" placeholder={t('password')} value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {mode === 'register' && (
          <div className="login-input-group">
            <label>{t('phone')} <span style={{color:'red'}}>*</span></label>
            <input placeholder={t('phone')} value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        )}
        <button className="login-btn" onClick={submit}>{mode === 'login' ? t('login') : t('register')}</button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#999' }}>
          <span style={{ cursor: 'pointer', color: '#ee4d2d' }} onClick={onBack}>{t('back')}</span>
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
              <div className="name-row">{a.name} <span className="phone">{a.phone}</span> {a.isDefault && <span style={{ background: '#3cb043', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4, marginLeft: 8 }}>默认</span>}</div>
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
function OrderDetailPage({ order, onBack }) {
  return (
    <div>
      <div className="back-btn" onClick={onBack}>‹ 返回</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>订单详情</h3>
      <div className="order-detail-page">
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
                <div className="name">{pn(i.product?.name)}</div>
                <div className="price">¥{i.price?.toFixed(2)}</div>
              </div>
              <div className="qty">x{i.quantity}</div>
            </div>
          ))}
          <div className="order-detail-summary">
            <div className="row"><span>商品总额</span><span>¥{order.total?.toFixed(2)}</span></div>
            <div className="row"><span>运费</span><span>¥0.00</span></div>
            <div className="row total"><span>实付</span><span>¥{order.total?.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="order-detail-card">
          <h4>订单信息</h4>
          <div className="order-detail-meta">
            <div>订单编号：{order.order_no}</div>
            <div>{t('orderStatus')}：{statusTxt[order.status] || order.status}</div>
            <div>支付方式：{paymentText[order.payment_method] || order.payment_method}</div>
            <div>支付状态：{payStatusText[order.payment_status] || order.payment_status}</div>
            <div>下单时间：{order.created_at?.slice(0, 19).replace('T', ' ')}</div>
            {order.remark && <div>备注：{order.remark}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
