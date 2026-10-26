import { useState, useEffect } from 'react'
import { normalizeContactPhone, validateProfile } from '../../functions/api/_contacts.js'
import { translate, localizedContent, apiError } from './i18n.js'
import useVisualViewport from '../useVisualViewport.js'
import { storage, readStoredArray } from '../storage.js'
import { usePersistentCart } from './cart.js'

const API = '/api'
const BOSS_WECHAT = 'jennybabi1988'
const displayOrderNo = order => String(order?.public_no ?? order?.id ?? '').padStart(2, '0')
const formatAmount = (amount, currency) => `${currency === 'HKD' ? 'HK$' : '¥'}${Number(amount || 0).toFixed(2)}`
const orderPaymentText = order => formatAmount(order.payment_amount ?? (Number(order.total) + Number(order.delivery_fee || 0)), order.payment_currency || 'CNY')
const formatScheduleDate = (iso, lang) => {
  if (!iso) return ''
  if (lang === 'en') return iso
  const [year, month, day] = iso.split('-')
  return year + '年' + Number(month) + '月' + Number(day) + '日'
}
const BOSS_WHATSAPP = '+85295228191'
const GROUP_BUY_URL = 'https://jennyfresh.com/'
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
  '贝贝南瓜': { zh_HK:'貝貝南瓜', en:'Butterball Pumpkin' },
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
  '西瓜': { zh_HK:'西瓜', en:'Watermelon' },
  '串茄(小番茄)': { zh_HK:'串茄(小番茄)', en:'Cherry Tomatoes on Vine' },
  '士多啤梨(草莓)': { zh_HK:'士多啤梨(草莓)', en:'Strawberries' },
  '小唐菜(上海青、油菜)': { zh_HK:'小唐菜(上海青、油菜)', en:'Baby Bok Choy (Shanghai Greens)' },
  '椰菜(包菜、圆白菜)': { zh_HK:'椰菜(包菜、圓白菜)', en:'Cabbage' },
  '番薯(红薯)': { zh_HK:'番薯(紅薯)', en:'Sweet Potato' },
  '白福花(白花菜)': { zh_HK:'白福花(白花菜)', en:'White Cauliflower' },
  '白菜（旺菜）': { zh_HK:'白菜（旺菜）', en:'Napa Cabbage (Wong Choy)' },
  '白萝卜(萝卜)': { zh_HK:'白蘿蔔(蘿蔔)', en:'White Radish' },
  '白蘑菇（口蘑）': { zh_HK:'白蘑菇（口蘑）', en:'White Mushroom' },
  '白通菜(空心菜)': { zh_HK:'白通菜(空心菜)', en:'Water Spinach' },
  '節瓜(毛瓜)': { zh_HK:'節瓜(毛瓜)', en:'Hairy Gourd' },
  '翠玉瓜(西葫芦)': { zh_HK:'翠玉瓜(西葫蘆)', en:'Courgette (Zucchini)' },
  '胡萝卜（红萝卜）': { zh_HK:'胡蘿蔔（紅蘿蔔）', en:'Carrot' },
  '蒜头(大蒜)': { zh_HK:'蒜頭(大蒜)', en:'Garlic' },
  '西洋菜(豆瓣菜)': { zh_HK:'西洋菜(豆瓣菜)', en:'Watercress' },
  '角瓜(丝瓜)': { zh_HK:'角瓜(絲瓜)', en:'Angled Gourd (Luffa)' },
  '豆苗(豌豆苗)': { zh_HK:'豆苗(豌豆苗)', en:'Pea Shoots' },
  '青瓜(黄瓜)': { zh_HK:'青瓜(黃瓜)', en:'Cucumber' },
  '龍芽葉': { zh_HK:'龍芽葉', en:'Dragon Tooth Leaves' }
}

// ========== 规格名三语映射 ==========
const variantLabelMap = {
  '半磅': { zh_HK:'半磅', en:'Half lb' },
  '一磅': { zh_HK:'一磅', en:'One lb' },
  '1条': { zh_HK:'1條', en:'1 pc' },
  '3条': { zh_HK:'3條', en:'3 pcs' },
  '5磅': { zh_HK:'5磅', en:'5 lb' },
  '6磅': { zh_HK:'6磅', en:'6 lb' },
  '7磅': { zh_HK:'7磅', en:'7 lb' }
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
  const token = storage.getItem('token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

// 微信内置浏览器 localStorage 可能失效，intro_read 双写 cookie 保证跨会话记忆
const introReadCookie = () => document.cookie.split(';').some(s => s.trim().startsWith('intro_read=1'))
const setIntroReadCookie = () => {
  try { document.cookie = 'intro_read=1; max-age=31536000; path=/; SameSite=Lax' } catch {}
}

async function uploadProofFile(file, orderId, t) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return t('copy001')
  const original = await new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
  let screenshot = original
  if (file.size > 60 * 1024) {
    screenshot = await new Promise((resolve, reject) => {
      const image = new Image()
      image.onerror = () => reject(new Error(t('copy002')))
      image.onload = () => {
        let width = image.width, height = image.height
        const maxEdge = 900
        if (Math.max(width, height) > maxEdge) {
          const scale = maxEdge / Math.max(width, height)
          width = Math.max(1, Math.round(width * scale))
          height = Math.max(1, Math.round(height * scale))
        }
        let canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(image, 0, 0, width, height)
        const MAX_B64 = 79000
        let b64 = null
        for (let round = 0; round < 3 && !b64; round++) {
          for (const quality of [0.7, 0.5, 0.35]) {
            const compressed = canvas.toDataURL('image/jpeg', quality)
            if (compressed.length < MAX_B64) { b64 = compressed; break }
          }
          if (!b64) {
            width = Math.max(1, Math.round(width * 0.6))
            height = Math.max(1, Math.round(height * 0.6))
            canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            canvas.getContext('2d').drawImage(image, 0, 0, width, height)
          }
        }
        if (b64) return resolve(b64)
        reject(new Error(t('copy003')))
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
  return apiError(t, data)
}

export default function App() {
  useVisualViewport()
  const [tab, setTab] = useState('home')
  const [orderFilter, setOrderFilter] = useState('all')
  const [currentUser, setCurrentUser] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [activeCategory, setActiveCategory] = useState(null)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const { cart, setCart, adoptGuest, clearGuest } = usePersistentCart(currentUser)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [orderSubmitting, setOrderSubmitting] = useState(false)
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
  const [qrZoom, setQrZoom] = useState(false)
  const [qrSwitching, setQrSwitching] = useState(false)
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
  const [selectedPointId, setSelectedPointId] = useState(() => storage.getItem('selectedPointId') || null)
  const [showPointPicker, setShowPointPicker] = useState(false)
  const [deliveryType, setDeliveryType] = useState('pickup')
  const [ustBenefit, setUstBenefit] = useState(false)
  const [showIntro, setShowIntro] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [noticeMoved, setNoticeMoved] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [favorites, setFavorites] = useState(() => readStoredArray('favorites'))
  const [searchHistory, setSearchHistory] = useState(() => readStoredArray('searchHistory'))
  const [showHelp, setShowHelp] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showRefund, setShowRefund] = useState(false)
  const [showBrand, setShowBrand] = useState(false)
  const [lang, setLang] = useState(() => storage.getItem('lang') || 'zh_CN')
  const [currency, setCurrency] = useState(() => storage.getItem('currency') || 'CNY')
  const [paymentCurrency, setPaymentCurrency] = useState('CNY')
  const [exchangeRate, setExchangeRate] = useState(1.2)
  const [showOnboard, setShowOnboard] = useState(false)
  const [onboardStep, setOnboardStep] = useState(0)

  // 浏览量统计：页面打开即静默上报一次（登录与否都计），不影响用户端任何体验；
  // 设备当日首次打开额外标记 visitor=1（访客数 UV，当天去重）
  useEffect(() => {
    try {
      const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
      let firstVisit = false
      try {
        const key = `v_${today}`
        if (!storage.getItem(key)) { storage.setItem(key, '1'); firstVisit = true }
      } catch { firstVisit = true }
      fetch(`${API}/track-view`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ visitor: firstVisit ? 1 : 0 }), keepalive: true }).catch(() => {})
    } catch {}
  }, [])

  const t = (key, values) => translate(lang, key, values)
  const content = (record, field) => localizedContent(record, field, lang)
  const fmt = (rmbPrice) => {
    const n = Number(rmbPrice) || 0
    if (currency === 'HKD') return 'HK$' + (n * exchangeRate).toFixed(2)
    return '¥' + n.toFixed(2)
  }
  const ruleText = (key, threshold = 1000) => t(key)
    .split('¥1000').join(fmt(threshold))
    .split('¥30').join(fmt(30))
  const pn = (pname) => {
    if (lang === 'zh_CN') return pname
    const m = productNameMap[pname]
    return (m && m[lang]) || pname
  }
  const vl = (vlabel) => {
    if (!vlabel || lang === 'zh_CN') return vlabel || ''
    const m = variantLabelMap[vlabel]
    return (m && m[lang]) || vlabel
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
    const legacy = String(p?.description || '').trim()
    const unit = raw && raw !== '/斤' ? (raw.startsWith('/') ? raw : '/' + raw)
      : /^\/[\u4e00-\u9fff\d]+$/.test(legacy) ? legacy : raw
    const key = 'unit:' + unit
    const translated = t(key)
    return translated === key ? unit : translated
  }
  const hasVariants = (p) => {
    try { return p.variants && JSON.parse(p.variants).length > 0 } catch(e) { return false }
  }
  const quickAdd = (p) => {
    if (p.is_active === false) return
    if (hasVariants(p)) { setSelectedProduct(p); setSelectedVariant(null); return }
    addToCart(p.id)
  }
  const statusTxt = { pending: t('statusPending'), awaiting_confirmation: t('inline0'), paid: t('statusPaid'), shipped: t('statusShipped'), completed: t('statusCompleted'), cancelled: t('statusCancelled') }

  const switchLang = (l) => {
    setLang(l)
    document.documentElement.lang = l === 'zh_HK' ? 'zh-HK' : l === 'en' ? 'en' : 'zh-CN'
    document.title = translate(l, 'welcome')
    storage.setItem('lang', l)
  }

  useEffect(() => { document.documentElement.lang = lang === 'zh_HK' ? 'zh-HK' : lang === 'en' ? 'en' : 'zh-CN'; document.title = t('welcome') }, [lang])

  // 新手指引：仅在未登录且首次访问时显示；已登录用户（老用户）永远不再弹
  useEffect(() => {
    if (authChecked !== true) return
    if (currentUser) return
    if (!storage.getItem('intro_read') && !introReadCookie()) setShowOnboard(true)
  }, [authChecked, currentUser])

  // 动画提示结束后复位，避免重复播放
  useEffect(() => {
    if (!noticeMoved) return
    const timer = setTimeout(() => setNoticeMoved(false), 3600)
    return () => clearTimeout(timer)
  }, [noticeMoved])

  // 初始化：用本地 token 调用 /api/me 验证登录状态
  useEffect(() => {
    const token = storage.getItem('token')
    if (!token) { setAuthChecked(true); return }
    authFetch(`${API}/me`)
      .then(r => {
        if (r.ok) return r.json()
        throw Object.assign(new Error('me-failed'), { status: r.status })
      })
      .then(user => { setCurrentUser(user); setAuthChecked(true) })
      .catch(e => {
        if (e.status === 401) {
          // 明确未登录：清理本地登录态
          storage.removeItem('token')
          storage.removeItem('currentUser')
          setAuthChecked(true)
        } else {
          // 网络/服务异常：登录状态未知，不打扰用户，也不弹新手指引
          setAuthChecked('error')
        }
      })
  }, [])

  // 登录后加载地址和订单
  useEffect(() => {
    if (currentUser) {
      const addrKey = `addrs_${currentUser.address_storage_key || currentUser.username}`
      const list = readStoredArray(addrKey)
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
    if (tab !== 'orderDetail' || !selectedOrder?.id) return
    let active = true
    authFetch(`${API}/orders/${selectedOrder.id}`).then(async response => {
      if (response.ok) {
        const detail = await response.json()
        if (active) setSelectedOrder(detail)
      }
    }).catch(() => {})
    return () => { active = false }
  }, [tab, selectedOrder?.id])

  useEffect(() => {
    fetch(`${API}/products`).then(r => r.json()).then(setProducts)
    fetch(`${API}/categories`).then(r => r.json()).then(setCategories)
    fetch(`${API}/settings`).then(r => r.json()).then(d => setExchangeRate(d.exchange_rate || 1.2)).catch(()=>{})
  }, [])

  useEffect(() => {
    if (bannerPaused) return
    const t = setInterval(() => setBannerIdx(i => (i + 1) % 2), 6500)
    return () => clearInterval(t)
  }, [bannerPaused])

  // 加载配送点列表
  useEffect(() => {
    fetch(`${API}/delivery-points`).then(r => r.json()).then(points => {
      setDeliveryPoints(points)
      if (!storage.getItem('selectedPointId')) setShowPointPicker(true)
    }).catch(() => {})
  }, [])

  // 加载凑单统计 + 每5秒刷新（按当前配送点）
  const loadStats = () => {
    const pid = storage.getItem('selectedPointId')
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
    try { setSeenNoticeIds(JSON.parse(storage.getItem(`seenNotices_${currentUser?.id || 'guest'}_${selectedPointId || 'all'}`) || '[]')) }
    catch { setSeenNoticeIds([]) }
  }, [currentUser?.id, selectedPointId])

  // 切回首页时也刷新一次
  useEffect(() => {
    if (tab === 'home') loadStats()
  }, [tab])

  const selectPoint = (pid) => {
    storage.setItem('selectedPointId', String(pid))
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
      showToast(t('copy006', { '0': label || text }))
    } catch (e) {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      showToast(t('copy006', { '0': label || text }))
    }
  }


  const toggleFavorite = (id) => {
    setFavorites(prev => {
      const next = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
      storage.setItem('favorites', JSON.stringify(next))
      return next
    })
    showToast(favorites.includes(id) ? t('copy013') : t('copy014'))
  }

  const saveSearchHistory = (kw) => {
    if (!kw) return
    setSearchHistory(prev => {
      const next = [kw, ...prev.filter(h => h !== kw)].slice(0, 8)
      storage.setItem('searchHistory', JSON.stringify(next))
      return next
    })
  }

  const saveAddresses = (list) => {
    if (!currentUser) return
    storage.setItem(`addrs_${currentUser.address_storage_key || currentUser.username}`, JSON.stringify(list))
    setAddresses(list)
  }

  const filteredProducts = products.filter(p => {
    if (activeCategory && p.category_id !== activeCategory) return false
    if (search && ![p.name, pn(p.name)].some(name => String(name || '').toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const addToCart = (id, variantLabel, variantPrice) => {
    const key = variantLabel ? `${id}::${variantLabel}` : String(id)
    setCart(prev => ({ ...prev, [key]: Math.min((prev[key] || 0) + 1, 99) }))
    showToast(t('copy015'))
  }

  const cartItems = Object.entries(cart)
    .map(([key, qty]) => {
      const [pidStr, vLabel] = key.split('::')
      const product = products.find(p => p.id === Number(pidStr))
      if (!product || product.is_active === false) return null
      let variants = []
      try { variants = product.variants ? JSON.parse(product.variants) : [] } catch(e) {}
      const variant = vLabel ? variants.find(v => v.label === vLabel) : null
      if (vLabel && !variant) return null
      const price = variant ? variant.price : product.price
      return { product, qty, variantLabel: vLabel || '', variantPrice: price }
    })
    .filter(Boolean)
  const cartCount = cartItems.reduce((sum, item) => sum + item.qty, 0)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.variantPrice * item.qty, 0)
  const currentPoint = deliveryPoints.find(p => p.id == selectedPointId)
  const effectiveFee = deliveryType === 'delivery' ? 30 : 0
  const checkoutCnyTotal = cartTotal + effectiveFee
  const checkoutPayAmount = paymentCurrency === 'HKD' ? Math.round(checkoutCnyTotal * exchangeRate * 100) / 100 : checkoutCnyTotal
  const effectiveThreshold = stats?.threshold || 1000
  const effectiveReached = stats ? stats.confirmed_total >= effectiveThreshold : false
  const deliveryDateText = formatScheduleDate(stats?.delivery_date, lang)
  const unreadNotices = announcements.filter(n => !seenNoticeIds.includes(n.id))
  const unpaidOrders = orders.filter(o => o.status === 'pending' && o.payment_status === 'pending' && o.payment_method !== 'cash_on_delivery')
  const noticeStorageKey = `seenNotices_${currentUser?.id || 'guest'}_${selectedPointId || 'all'}`
  const markNoticesRead = () => {
    const ids = [...new Set([...seenNoticeIds, ...announcements.map(n => n.id)])]
    setSeenNoticeIds(ids)
    storage.setItem(noticeStorageKey, JSON.stringify(ids))
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
      showToast(t('copy016'))
      setTab('login')
      return false
    }
    return true
  }

  const submitOrder = async () => {
    if (orderSubmitting) return
    if (!requireLogin()) return
    if (cartItems.length === 0) { showToast(t('copy017')); return }
    let customer = '', phone = '', address = ''
    if (deliveryType === 'pickup') {
      if (!selectedPointId) { showToast(t('selectPointFirst')); setShowPointPicker(true); return }
      const pt = deliveryPoints.find(p => p.id == selectedPointId)
      customer = currentUser?.username || ''
      address = pt?.name || ''
    } else {
      const addr = addresses.find(a => a.id === checkoutAddrId)
      if (!addr) { showToast(t('copy018')); return }
      customer = addr.name
      phone = addr.phone
      address = addr.detail
    }
    setOrderSubmitting(true)
    try {
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
        items: cartItems.map(item => ({ product_id: item.product.id, quantity: item.qty, variant: item.variantLabel || '' }))
      })
    })
    if (res.ok) {
      const data = await res.json()
      showToast(t('copy019'))
      setCart({})
      setShowCheckout(false)
      setRemark('')
      authFetch(`${API}/orders`).then(r => r.ok ? r.json() : []).then(setOrders)
      setPaidOrderNo(displayOrderNo(data))
      setPaidOrderAmount(Number(data.payment_amount ?? (Number(data.total) + Number(data.delivery_fee || 0))))
      setPaidOrderCurrency(data.payment_currency || 'CNY')
      setLastOrderId(data.id)
      setShowPaymentQR(true)
    } else {
      const data = await res.json().catch(() => ({}))
      showToast(apiError(t, data))
    }
    } catch { showToast(t('connectionFailed')) }
    finally { setOrderSubmitting(false) }
  }

  const switchPaymentMethod = async method => {
    if (method === paymentMethod || qrSwitching || !lastOrderId) return
    setQrSwitching(true)
    try {
      const res = await authFetch(`${API}/orders/${lastOrderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        showToast(apiError(t, data))
        return
      }
      setPaymentMethod(method)
      showToast(t('paymentMethodUpdated'))
    } catch { showToast(t('connectionFailed')) }
    finally { setQrSwitching(false) }
  }

  const handleLogin = async (username, password) => {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json()
    if (!res.ok) return t(data.code || 'loginFailed')
    storage.setItem('token', data.token)
    const { token, ...account } = data
    storage.setItem('currentUser', JSON.stringify(account))
    adoptGuest(account)
    setCurrentUser(account)
    setTab('my')
    showToast(t('copy021'))
  }

  const handleRegister = async (profile, password) => {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, password })
    })
    const data = await res.json()
    if (!res.ok) return t(data.code || 'registerFailed')
    storage.setItem('token', data.token)
    const { token, ...account } = data
    storage.setItem('currentUser', JSON.stringify(account))
    adoptGuest(account)
    setCurrentUser(account)
    setTab('my')
    showToast(t('copy022'))
  }

  const logout = () => {
    storage.removeItem('token')
    storage.removeItem('currentUser')
    setCurrentUser(null)
    clearGuest()
    setTab('home')
    showToast(t('copy023'))
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
    showToast(t('copy024'))
  }

  const deleteAddress = (id) => {
    const list = addresses.filter(a => a.id !== id)
    saveAddresses(list)
    if (selectedAddrId === id) setSelectedAddrId(list[0]?.id || null)
    showToast(t('copy025'))
  }

  const openCheckout = () => {
    if (!requireLogin()) return
    if (cartCount === 0) { showToast(t('copy026')); return }
    const def = addresses.find(a => a.isDefault) || addresses[0]
    setCheckoutAddrId(def?.id || null)
    setPaymentCurrency(currency || 'CNY')
    setPaymentMethod(currency === 'HKD' ? 'fps_transfer' : 'wechat_transfer')
    setShowCart(false)
    setShowCheckout(true)
  }

  // ========== 渲染 ==========
  if (tab === 'login') {
    return <LoginPage t={t} lang={lang} onLogin={handleLogin} onRegister={handleRegister} onBack={() => setTab('my')} />
  }

  if (tab === 'orderDetail' && selectedOrder) {
    return <><OrderDetailPage order={selectedOrder} onBack={() => setTab('myOrders')} pn={pn} vl={vl} copyText={copyText} fmt={fmt} t={t} statusTxt={statusTxt} showToast={showToast} onRefresh={async () => {
      const [response, detailResponse] = await Promise.all([authFetch(`${API}/orders`), authFetch(`${API}/orders/${selectedOrder.id}`)])
      if (response.ok) {
        const next = await response.json()
        setOrders(next)
      }
      if (detailResponse.ok) setSelectedOrder(await detailResponse.json())
      loadStats()
    }} />{toast && <div className="toast" role="status">{toast}</div>}</>
  }

  if (tab === 'address') {
    return (
      <AddressPage
        t={t}
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
    return <AddressEditPage t={t} addr={editingAddr} onSave={saveAddress} onBack={() => setTab('address')} />
  }

  if (tab === 'favorites') {
    const favProducts = products.filter(p => favorites.includes(p.id))
    return (
      <div>
        <div className="back-btn" onClick={() => setTab('my')}>{t('copy027')}</div>
        <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>{t('copy028')}</h3>
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
                  <button className={`add-btn ${hasVariants(p) ? 'variant-add-btn' : ''}`} aria-label={`${hasVariants(p) ? t('copy029') : t('copy030')}：${pn(p.name)}`} onClick={(e) => { e.stopPropagation(); setTab('home'); quickAdd(p) }}>{hasVariants(p) ? t('copy031') : '+'}</button>
                </div>
              </div>
            </div>
          ))}
          {favProducts.length === 0 && <div className="empty-state" style={{gridColumn: '1/-1'}}><div className="icon">💔</div>{t('copy032')}</div>}
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
            <span onClick={() => {
              const c = currency === 'HKD' ? 'CNY' : 'HKD'
              setCurrency(c); storage.setItem('currency', c)
            }} className="currency-switch">
              <span className={currency === 'CNY' ? 'active' : ''}>¥ CNY</span>
              <span className={currency === 'HKD' ? 'active' : ''}>$HKD</span>
            </span>
          </div>
        </div>
        )}
        {(tab === 'category' || (tab === 'home' && search)) && (
        <>
        <div className="category-search-label">{t('inline2')}</div>
        <form className="search-box" role="search" onSubmit={e => { e.preventDefault(); setSearch(searchInput.trim()); if (searchInput.trim()) saveSearchHistory(searchInput.trim()); setActiveCategory(null); setTab('category') }}>
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input
            aria-label={t('search')}
            placeholder={t('inline3')}
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button type="button" className="search-clear" onClick={() => { setSearchInput(''); setSearch('') }}>{t('inline4')}</button>
          )}
          <button type="submit" className="search-submit">{t('inline5')}</button>
        </form>
        {searchHistory.length > 0 && !searchInput && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>{t('copy033')}</span>
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
              aria-label={bannerIdx === 0 ? t('copy034') : t('copy035')}
              onPointerDown={() => setBannerPaused(true)} onFocus={() => setBannerPaused(true)}
              onClick={() => { if (bannerIdx === 0) setShowHelp(true); else setShowBrand(true) }}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (bannerIdx === 0) setShowHelp(true); else setShowBrand(true) } }}>
              {bannerIdx === 0 && <>
                <div className="hero-message">
                  <span className="hero-kicker">{t('inline6')}</span>
                  <h2>{t('inline7')}</h2>
                  <p>{t('inline8')}</p>
                  <span className="hero-link">{t('inline9')} <span aria-hidden="true">↗</span></span>
                </div>
                <div className="hero-visual hero-visual-threshold" aria-label={t('inline10', { '0': effectiveThreshold })}>
                  <span>{t('inline11')}</span>
                  <strong>¥{effectiveThreshold}</strong>
                  <small>CNY</small>
                  <i aria-hidden="true" />
                </div>
              </>}
              {bannerIdx === 1 && <>
                <div className="hero-message">
                  <span className="hero-kicker">ZHENZHEN FRESH</span>
                  <h2>{t('welcome')}</h2>
                  <p>{t('inline12')}</p>
                  <span className="hero-link">{t('inline13')} <span aria-hidden="true">↗</span></span>
                </div>
                <div className="hero-visual hero-visual-produce" aria-hidden="true"><img src="/images/market-hero.jpg" alt="" /></div>
              </>}
            </div>
            <div className="hero-tabs" aria-label={t('inline20')}>
              {[t('posterPickup'), t('posterProduce')].map((label, index) => (
                <button type="button" key={label} className={bannerIdx === index ? 'active' : ''} aria-pressed={bannerIdx === index} onClick={() => { setBannerPaused(true); setBannerIdx(index) }}>{label}</button>
              ))}
            </div>
          </div>

          {unpaidOrders.length > 0 && (
            <div className="unpaid-home-reminder">
              <div><strong>{t('unpaidCount', { count: unpaidOrders.length })}</strong><p>{t('copy038')}</p></div>
              <button type="button" onClick={() => { if (unpaidOrders.length === 1) { setSelectedOrder(unpaidOrders[0]); setTab('orderDetail') } else { setOrderFilter('pending'); setTab('myOrders') } }}>{t('copy039')}</button>
            </div>
          )}

          {/* 配送规则小横幅 */}
          <div className={`delivery-rule-strip${noticeMoved ? ' pulse' : ''}`}
            onClick={() => setShowHelp(true)}>
            <span>{t('deliveryRule')}</span>
            <span>{t('details')}</span>
            {noticeMoved && <span className="notice-bubble">{t('copy212')}</span>}
          </div>

          {/* 凑单进度条 */}
          {stats && (stats.group_formed ? (
            <div className="group-buy-banner group-buy-scheduled" role="status">
              <span className="group-buy-label">{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || t('groupBuyBanner')}</span>
              <strong>{t('groupScheduled')}</strong>
              <p>{t('groupDeliveryDate', { date: deliveryDateText })}</p>
              <small>{t('groupScheduleNotice')}</small>
            </div>
          ) : (
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
                <span>{t('copy041')}<b style={{ color: 'var(--market-green)' }}>{fmt(stats.confirmed_total)}</b> / {fmt(effectiveThreshold)}</span>
                <span>{stats.confirmed_count} {t('ordersConfirmed')}</span>
              </div>
              <p className="group-buy-explain">{t('copy042')}</p>
            </div>
          ))}

          <section className="notice-board notice-board-home" aria-label={t('copy043')} onClick={() => { markNoticesRead(); setTab('messages') }}>
            <div className="notice-board-heading"><span>{t('copy043')} {unreadNotices.length > 0 && <span className="notice-dot" aria-label={t('copy044', { '0': unreadNotices.length })}>{unreadNotices.length > 99 ? '99+' : unreadNotices.length}</span>}</span><small>{t('copy045')}</small></div>
            {announcements.length ? <><strong>{content(announcements[0], 'title')}</strong><p>{content(announcements[0], 'content')}</p></> : <p className="notice-empty">{t('copy046')}</p>}
          </section>

          <div className="product-list">
            <div className="product-list-title">{search ? t('searchResult').replace('{kw}', search) : t('hot')}</div>
            <div className="product-grid">
              {(search ? filteredProducts : featuredProducts).map(p => (
                <div className="product-card" key={p.id} onClick={() => { setSelectedProduct(p); setSelectedVariant(null) }} style={p.is_active === false ? { opacity: 0.5, filter: 'grayscale(1)' } : {}}>
                  <div className="emoji">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span className="product-no-image">{pn(p.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}
                    {(p.is_hot || p.is_new) && <div className="promo-tag">{p.is_hot ? t('tagHot') : t('tagNew')}</div>}
                    {p.is_active === false && <div className="promo-tag" style={{background:'#999'}}>{t('offShelf') || t('copy047')}</div>}
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
                      {p.is_active !== false && <button className={`add-btn ${hasVariants(p) ? 'variant-add-btn' : ''}`} aria-label={`${hasVariants(p) ? t('copy029') : t('copy030')}：${pn(p.name)}`} onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>{hasVariants(p) ? t('copy031') : '+'}</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {(search ? filteredProducts : featuredProducts).length === 0 && <div className="empty-state"><div className="icon">🔍</div>{t('emptySearch')}</div>}
            {!search && <button className="browse-all-button" onClick={() => { setTab('category'); window.scrollTo(0, 0) }}>{t('copy048')}</button>}
          </div>
        </>
      )}


      {tab === 'messages' && (
        <div className="messages-page">
          <div className="back-btn" onClick={() => setTab('my')}>{t('copy027')}</div>
          <h2>{t('copy058')}</h2>
          <p className="messages-intro">{t('copy059')}</p>
          {announcements.length ? announcements.map(notice => <article className="message-card" key={notice.id}>
            <time>{notice.created_at?.slice(0, 16)}</time><h3>{content(notice, 'title')}</h3><p>{content(notice, 'content')}</p>
          </article>) : <p className="messages-empty">{t('copy060')}</p>}
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
            {search && <div className="category-search-result">{t('inline21', { '0': filteredProducts.length, '1': search })} <button type="button" onClick={() => { setSearch(''); setSearchInput('') }}>{t('inline22')}</button></div>}
            <div className="product-grid">
              {filteredProducts.map(p => (
                <div className="product-card" key={p.id} onClick={() => { setSelectedProduct(p); setSelectedVariant(null) }} style={p.is_active === false ? { opacity: 0.5, filter: 'grayscale(1)' } : {}}>
                  <div className="emoji">
                    {p.image ? <img src={p.image} alt={p.name} /> : <span className="product-no-image">{pn(p.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}
                    {(p.is_hot || p.is_new) && <div className="promo-tag">{p.is_hot ? t('tagHot') : t('tagNew')}</div>}
                    {p.is_active === false && <div className="promo-tag" style={{background:'#999'}}>{t('offShelf') || t('copy047')}</div>}
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
                      {p.is_active !== false && <button className={`add-btn ${hasVariants(p) ? 'variant-add-btn' : ''}`} aria-label={`${hasVariants(p) ? t('copy029') : t('copy030')}：${pn(p.name)}`} onClick={(e) => { e.stopPropagation(); quickAdd(p) }}>{hasVariants(p) ? t('copy031') : '+'}</button>}
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
          <div className="back-btn" onClick={() => setTab('my')}>{t('copy027')}</div>
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
                  <div className="order-goods">{o.items?.map(i => `${pn(i.product?.name)}${i.variant ? `（${vl(i.variant)}）` : ''} x${i.quantity}`).join('，')}</div>
                  <div className="order-total">{t('orderTotal')}：<span>{orderPaymentText(o)} · {o.payment_currency || 'CNY'}</span></div>
                  {o.status === 'pending' && o.payment_status === 'pending' && o.payment_method !== 'cash_on_delivery' && <button type="button" className="order-upload-link" onClick={e => { e.stopPropagation(); setSelectedOrder(o); setTab('orderDetail') }}>{t('copy061')}</button>}
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
                  <div className="phone">{t('usernameLogin')}</div>{currentUser.wechat_id && <div className="phone">{t('wechatId')}: {currentUser.wechat_id}</div>}{currentUser.whatsapp && <div className="phone">{t('whatsapp')}: {currentUser.whatsapp}</div>}{currentUser.phone && <div className="phone">{t('phone')}: {currentUser.phone}</div>}
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
                    <span className="icon">📣</span><span className="text">{t('copy058')} {unreadNotices.length > 0 && <span className="notice-dot" aria-label={t('copy044', { '0': unreadNotices.length })}>{unreadNotices.length > 99 ? '99+' : unreadNotices.length}</span>}</span><span className="arrow">›</span>
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
              <h3>{t('copy062')}{cartCount})</h3>
              <span className="clear" onClick={() => setCart({})}>{t('copy063')}</span>
            </div>
            <div className="cart-items">
              {cartItems.length === 0 && <div className="empty-state"><div className="icon">🛒</div>{t('copy026')}</div>}
              {cartItems.map(item => {
                const itemKey = item.variantLabel ? `${item.product.id}::${item.variantLabel}` : String(item.product.id)
                return (
                <div className="cart-item" key={itemKey} onClick={() => { setShowCart(false); setSelectedProduct(item.product); setSelectedVariant(null) }} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') { setShowCart(false); setSelectedProduct(item.product); setSelectedVariant(null) } }}>
                  <div className="emoji">{item.product.image ? <img src={item.product.image} alt="" /> : <span className="product-no-image">{pn(item.product.name).replace(/^\[[^\]]+\]/, '').slice(0, 2)}</span>}</div>
                  <div className="detail">
                    <div className="name">{pn(item.product.name)}{item.variantLabel && <small style={{color:'var(--market-accent)',marginLeft:6,fontSize:12}}>({vl(item.variantLabel)})</small>}</div>
                    <div className="price">{fmt(item.variantPrice)}<small style={{fontSize:11,color:'#999'}}>{item.variantLabel ? `/${vl(item.variantLabel)}` : unitText(item.product)}</small></div>
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
            {deliveryType === 'pickup' && stats?.group_formed && (
              <div className="cart-scheduled" role="status"><strong>{t('groupScheduled')}</strong> · {t('groupDeliveryDate', { date: deliveryDateText })}</div>
            )}
            {deliveryType === 'pickup' && stats && !effectiveReached && !stats.group_formed && (
              <div className="cart-recommend">
                <div className="cart-recommend-title">
                  {t('buyExtra')}
                </div>
                <div className="cart-recommend-progress">
                  {t('cartGroupProgress', { total: fmt(stats.confirmed_total || 0), threshold: fmt(effectiveThreshold), remaining: fmt(effectiveThreshold - (stats.confirmed_total || 0)) })}
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
              <div className="cart-total">{t('copy064')}<span>{fmt(cartTotal)}</span></div>
              <button className="checkout-btn" disabled={cartCount === 0} onClick={openCheckout}>{t('copy065')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 下单弹窗 */}
      {showCheckout && (
        <div className="checkout-overlay" onClick={() => setShowCheckout(false)}>
          <div className="checkout-panel checkout-form-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3>{t('copy066')}</h3>
            <div className="form-group">
              <label>{t('copy067')}</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <div onClick={() => setDeliveryType('pickup')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: deliveryType === 'pickup' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: deliveryType === 'pickup' ? 'var(--market-green-soft)' : '#fff', fontSize: 14
                }}> {t('copy068')} <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}> {t('copy069')} </div>
                </div>
                <div onClick={() => setDeliveryType('delivery')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: deliveryType === 'delivery' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: deliveryType === 'delivery' ? 'var(--market-green-soft)' : '#fff', fontSize: 14
                }}> {t('copy070')} <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{t('copy071')} {fmt(30)}</div>
                </div>
              </div>
            </div>
            {deliveryType === 'pickup' && (
            <div className="form-group">
              <label>{t('copy072')}</label>
              <div style={{ padding: 10, background: '#f9f9f9', borderRadius: 8, fontSize: 14, marginBottom: 10 }}>
                📍 <b>{dn(deliveryPoints.find(p => p.id == selectedPointId)?.name) || t('copy073')}</b>
                <span style={{ color: 'var(--market-green)', cursor: 'pointer', marginLeft: 10, fontSize: 13 }} onClick={() => setShowPointPicker(true)}>{t('copy074')}</span>
              </div>
            </div>
            )}
            {deliveryType === 'delivery' && (
            <div className="form-group">
              <label>{t('copy075')}</label>
              {addresses.length === 0 ? (
                <div style={{ padding: 12, background: '#f9f9f9', borderRadius: 8, fontSize: 13, color: '#999' }}> {t('copy076')}<span style={{ color: 'var(--market-green)', cursor: 'pointer' }} onClick={() => { setShowCheckout(false); setTab('address'); setEditingAddr(null); setTab('addrEdit') }}>{t('copy077')}</span>
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
              <label>{t('copy078')}</label>
              <input value={remark} onChange={e => setRemark(e.target.value)} placeholder={t('copy078')} />
            </div>
            <div className="form-group">
              <label>{t('copy086')}</label>
              <div className="payment-currency-choices">
                <button type="button" className={paymentCurrency === 'CNY' ? 'selected' : ''} onClick={() => { setPaymentCurrency('CNY'); setPaymentMethod('wechat_transfer') }}><span>{t('copy087')}</span><strong>¥{checkoutCnyTotal.toFixed(2)}</strong></button>
                <button type="button" className={paymentCurrency === 'HKD' ? 'selected' : ''} onClick={() => { setPaymentCurrency('HKD'); setPaymentMethod('fps_transfer') }}><span>{t('copy088')}</span><strong>HK${(Math.round(checkoutCnyTotal * exchangeRate * 100) / 100).toFixed(2)}</strong></button>
              </div>
              <small className="payment-currency-hint">{t('copy089')}</small>
            </div>
            <div className="form-group">
              <label>{t('copy090')}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {paymentCurrency === 'CNY' && <div onClick={() => setPaymentMethod('wechat_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'wechat_transfer' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: paymentMethod === 'wechat_transfer' ? 'var(--market-green-soft)' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💚</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>{t('copy091')}</div>
                </div>}
                {paymentCurrency === 'CNY' && <div onClick={() => setPaymentMethod('alipay_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'alipay_transfer' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: paymentMethod === 'alipay_transfer' ? 'var(--market-green-soft)' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💙</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>{t('copy092')}</div>
                </div>}
                {paymentCurrency === 'HKD' && <div onClick={() => setPaymentMethod('fps_transfer')} style={{
                  flex: 1, padding: '8px 4px', textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: paymentMethod === 'fps_transfer' ? '2px solid var(--market-green)' : '1px solid #eee',
                  background: paymentMethod === 'fps_transfer' ? 'var(--market-green-soft)' : '#fff'
                }}>
                  <div style={{ fontSize: 18 }}>💱</div>
                  <div style={{ fontSize: 11, marginTop: 2 }}>{t('copy093')}</div>
                </div>}
              </div>
            </div>
            <div style={{ marginBottom: 8, fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>{t('copy094')}</span>
                <span>{formatAmount(paymentCurrency === 'HKD' ? cartTotal * exchangeRate : cartTotal, paymentCurrency)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>{t('copy071')}</span>
                <span style={{ color: effectiveFee ? 'var(--market-accent)' : 'var(--market-green)', fontWeight: 600 }}>
                  {effectiveFee ? formatAmount(paymentCurrency === 'HKD' ? effectiveFee * exchangeRate : effectiveFee, paymentCurrency) : t('freeFee')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', borderTop: '1px solid #eee', marginTop: 4 }}>
                <span>{t('copy095')} {paymentCurrency}</span>
                <span style={{ color: 'var(--market-accent)', fontWeight: 'bold', fontSize: 18 }}>
                  {formatAmount(checkoutPayAmount, paymentCurrency)}
                </span>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowCheckout(false)}>{t('copy096')}</button>
              <button className="btn-submit" disabled={orderSubmitting} onClick={submitOrder}>{t('copy097')}</button>
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
              paddingBottom: 0
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
                      <div style={{ fontSize: 14, color: '#333', fontWeight: 600, padding: '12px 0 8px' }}>{t('copy098')}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingBottom: 12 }}>
                        <div className="variant-choice" onClick={() => setSelectedVariant(-1)}
                          style={{ padding: '8px 16px', borderRadius: 20, cursor: 'pointer', border: selectedVariant === -1 ? '2px solid var(--market-green)' : '1px solid #ddd', background: selectedVariant === -1 ? 'var(--market-green-soft)' : '#fff', fontSize: 14, fontWeight: selectedVariant === -1 ? 600 : 400 }}> {t('copy099')} {unitText(selectedProduct)} <span style={{ color: 'var(--market-accent)' }}>{fmt(selectedProduct.price)}</span>
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
                              {vl(v.label)} <span style={{color:'var(--market-accent)'}}>{fmt(v.price)}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 描述 */}
                  {selectedProduct.description && !/^\/[\u4e00-\u9fff\d]+$/.test(selectedProduct.description.trim()) && (
                    <div style={{ padding: '0 16px', borderTop: '8px solid #f7f7f7' }}>
                      <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, padding: '12px 0' }}>{content(selectedProduct, 'description')}</p>
                    </div>
                  )}

                  {/* 底部按钮 */}
                  <div style={{ position: 'sticky', bottom: 0, background: '#fff', padding: '12px 16px', borderTop: '1px solid #f0f0f0' }}>
                    {selectedProduct.is_active !== false ? (
                      <button className="btn-submit" style={{ width: '100%', background: 'var(--market-green)', opacity: (variants.length > 0 && selectedVariant === null) ? 0.5 : 1 }}
                        onClick={() => {
                          if (variants.length > 0 && selectedVariant === null) { showToast(t('copy100')); return }
                          if (variants.length > 0 && selectedVariant >= 0) {
                            const v = variants[selectedVariant]
                            addToCart(selectedProduct.id, v.label, Number(v.price))
                          } else {
                            addToCart(selectedProduct.id)
                          }
                          setSelectedProduct(null); setSelectedVariant(null)
                        }}>{t('copy101')}</button>
                    ) : (
                      <div style={{ width: '100%', textAlign: 'center', padding: '14px', background: '#f0f0f0', color: '#999', borderRadius: 8, fontWeight: 600 }}>{t('copy102')}</div>
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
        <div className="checkout-overlay" style={{ zIndex: 3000 }} onClick={() => { if (storage.getItem('selectedPointId')) setShowPointPicker(false) }}>
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
            <h3>{paymentMethod === 'wechat_transfer' ? t('copy103') : paymentMethod === 'alipay_transfer' ? t('copy104') : t('copy105')}</h3>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>{t('copy106')}{paidOrderNo}</div>
            <div className="payment-due">{t('copy107')} {formatAmount(paidOrderAmount, paidOrderCurrency)}<small>{t('paymentSelection', { currency: paidOrderCurrency, method: t(`payment_${paymentMethod}`) })}</small></div>

            {/* 支付方式切换 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['wechat_transfer', t('copy091'), '#07c160'], ['alipay_transfer', t('copy092'), '#1677ff'], ['fps_transfer', t('copy093'), '#722ed1']].map(([method, label, color]) => (
                <button
                  key={method}
                  disabled={qrSwitching}
                  onClick={() => switchPaymentMethod(method)}
                  style={{
                    fontSize: 13, padding: '7px 14px', borderRadius: 20, cursor: 'pointer',
                    border: paymentMethod === method ? `2px solid ${color}` : '1px solid #ddd',
                    background: paymentMethod === method ? color : '#fff',
                    color: paymentMethod === method ? '#fff' : '#555',
                    fontWeight: paymentMethod === method ? 600 : 400,
                    opacity: qrSwitching ? 0.6 : 1
                  }}
                >{label}</button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              {paymentMethod === 'fps_transfer' ? (
                <div style={{ width: 220, height: 220, margin: '0 auto', background: '#f9f0ff', border: '2px solid #722ed1', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ fontSize: 44 }}>💱</div>
                  <div style={{ fontSize: 22, fontWeight: 800, marginTop: 10, color: '#722ed1' }}>95228191</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>{t('copy110')}</div>
                </div>
              ) : (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img
                    src={paymentMethod === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'}
                    alt={t('copy111')}
                    onClick={() => setQrZoom(true)}
                    style={{ width: 220, borderRadius: 12, border: `2px solid ${paymentMethod === 'wechat_transfer' ? '#07c160' : '#1677ff'}`, display: 'block', cursor: 'zoom-in' }}
                  />
                  <div style={{ position: 'absolute', left: 8, bottom: 8, background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 10 }}>{t('copy112')}</div>
                </div>
              )}
              <div style={{ fontSize: 14, marginTop: 10, fontWeight: 600, color: paymentMethod === 'wechat_transfer' ? '#07c160' : paymentMethod === 'alipay_transfer' ? '#1677ff' : '#722ed1' }}>
                {paymentMethod === 'wechat_transfer' ? t('copy113') : paymentMethod === 'alipay_transfer' ? t('copy114') : t('copy115')}
              </div>
              {paymentMethod !== 'fps_transfer' && (
                <div style={{ fontSize: 12, color: '#999', marginTop: 6 }}>{t('copy116')}</div>
              )}
            </div>

            {/* 操作按钮：打开对应App / 复制账号 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              {paymentMethod === 'wechat_transfer' && (
                <a href="weixin://" style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: '1px solid #07c160', color: '#fff', background: '#07c160', textDecoration: 'none', cursor: 'pointer' }}>{t('copy117')}</a>
              )}
              {paymentMethod === 'alipay_transfer' && (
                <a href="alipay://" style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: '1px solid #1677ff', color: '#fff', background: '#1677ff', textDecoration: 'none', cursor: 'pointer' }}>{t('copy118')}</a>
              )}
              {paymentMethod === 'fps_transfer' && (
                <button onClick={() => copyText('95228191', t('copy119'))} style={{ fontSize: 13, padding: '8px 14px', borderRadius: 20, border: '1px solid #722ed1', color: '#fff', background: '#722ed1', cursor: 'pointer' }}>{t('copy120')}</button>
              )}
            </div>

            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, fontSize: 12, color: '#f57c00', marginBottom: 16, textAlign: 'left', lineHeight: 1.7 }}>
              {paymentMethod === 'wechat_transfer' && <>{t('copy121')}<br />{t('copy122')}</>}
              {paymentMethod === 'alipay_transfer' && <>{t('copy123')}<br />{t('copy122')}</>}
              {paymentMethod === 'fps_transfer' && <>{t('copy124')} <b>95228191</b>{t('copy125')}</>}
              <br />{t('copy126')}<b>{BOSS_WECHAT}</b>。
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setTab('myOrders') }}>{t('copy127')}</button>
              <button className="btn-submit" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setShowUploadProof(true) }}>{t('copy128')}</button>
            </div>
          </div>
        </div>
      )}

      {/* 收款码放大 */}
      {qrZoom && (
        <div className="checkout-overlay" style={{ zIndex: 6000 }} onClick={() => setQrZoom(false)}>
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <img src={paymentMethod === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'} alt={t('copy111')} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12 }} />
            <div style={{ marginTop: 14 }}>
              <button className="btn-cancel" onClick={() => setQrZoom(false)} style={{ color: '#fff', borderColor: '#fff', background: 'rgba(0,0,0,0.45)', padding: '8px 22px', borderRadius: 20 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* 上传付款凭证弹窗 */}
      {showUploadProof && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => { if (!proofUploading) { setShowUploadProof(false); setTab('myOrders') } }}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 360, textAlign: 'center' }}>
            <h3 style={{ marginBottom: 12 }}>{t('copy129')}</h3>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.7, marginBottom: 16, textAlign: 'left' }}>
              {t('proofInstructions')}
            </p>
            <label className="proof-file-picker">{t('copy236')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={proofUploading} onChange={e => setProofFile(e.target.files[0] || null)} /></label>
            {proofFile && <p className="proof-selected">{t('copy130')}{proofFile.name}</p>}
            <button className="btn-submit proof-confirm" disabled={!proofFile || proofUploading} onClick={async () => {
              setProofUploading(true)
              try {
                const error = await uploadProofFile(proofFile, lastOrderId, t)
                if (error) showToast(error)
                else {
                  showToast(t('copy131'))
                  setProofFile(null); setShowUploadProof(false); setTab('myOrders'); setOrderFilter('awaiting_confirmation')
                  const response = await authFetch(`${API}/orders`)
                  if (response.ok) setOrders(await response.json())
                }
              } catch (error) { showToast(error.message || t('copy004')) }
              finally { setProofUploading(false) }
            }}>{proofUploading ? t('copy132') : t('copy133')}</button>
            <button className="btn-cancel" disabled={proofUploading} style={{ width: '100%', padding: 12 }} onClick={() => { setShowUploadProof(false); setTab('myOrders') }}>{t('copy134')}</button>
          </div>
        </div>
      )}

      {/* 新手指引弹窗 */}
      {/* 首次进入选择币种（仅未登录访客首次可见；已登录用户不再显示） */}
      {!currency && authChecked === true && !currentUser && (
        <div className="checkout-overlay" style={{ zIndex: 6000 }}>
          <div className="checkout-panel" style={{ maxWidth: 380, textAlign: 'center', padding: 24 }}>
            <h3 style={{ marginBottom: 16 }}>{t('copy135')}</h3>
            <p style={{ fontSize: 13, color: '#777', marginBottom: 20 }}>{t('copy136')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { setCurrency('CNY'); storage.setItem('currency', 'CNY'); setShowOnboard(true) }}
                style={{ padding: 16, borderRadius: 12, border: '2px solid var(--market-green)', background: 'var(--market-green-soft)', color: 'var(--market-accent)', fontSize: 18, fontWeight: 700, cursor: 'pointer' }}>
                ¥ CNY
              </button>
              <button onClick={() => { setCurrency('HKD'); storage.setItem('currency', 'HKD'); setShowOnboard(true) }}
                style={{ padding: 16, borderRadius: 12, border: '2px solid #ddd', background: '#fff', color: '#333', fontSize: 18, fontWeight: 600, cursor: 'pointer' }}>
                $HKD
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
                  onClick={() => setOnboardStep(s => s - 1)}>{t('copy137')}</button>
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
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <h3 style={{ textAlign: 'center', marginBottom: 16 }}>{t('copy138')}</h3>

            <div style={{ fontSize: 13, lineHeight: 1.8, color: '#333' }}>
              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>{t('copy139')}</b><br /> {t('copy140')}<br /> {t('copy141')} </div>

              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>{t('copy142')}</b><br />
                {t('introPickup', { threshold: fmt(effectiveThreshold) })}<br /> {t('copy143')} {fmt(30)}<br />
                {t('introUpgrade', { fee: fmt(30) })}
              </div>

              <div style={{ background: '#fff8e1', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>{t('copy144')}</b><br /> {t('copy145')} </div>

              <div style={{ background: '#fce4ec', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>{t('copy146')}</b><br /> {t('copy147')} </div>

              <div style={{ background: '#f3e5f5', padding: 12, borderRadius: 8, marginBottom: 10 }}>
                <b>{t('copy148')}</b><br /> {t('copy149')}<br />
                {t('contactWhatsappLine')}<br /> {t('copy150')}<br /> {t('copy151')} </div>
            </div>

            <button
              className="btn-submit"
              style={{ width: '100%', padding: 14, marginTop: 8 }}
              onClick={() => {
                storage.setItem('intro_read', '1')
                setIntroReadCookie()
                setShowIntro(false)
                setNoticeMoved(true)
              }}
            > {t('copy152')} </button>
          </div>
        </div>
      )}

      {/* 科大自取规则弹窗 */}
      {ustBenefit && (
        <div className="checkout-overlay" style={{ zIndex: 5000 }} onClick={() => setUstBenefit(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 50, marginBottom: 12 }}>🎓</div>
            <h3 style={{ color: 'var(--market-green)', marginBottom: 8 }}>{t('copy153')}</h3>
            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.8, marginBottom: 16 }}>
              <div style={{ background: '#e8f5e9', padding: 12, borderRadius: 8, marginBottom: 8 }}>
                🎓 <b>{t('copy154')}</b><br/>
                {t('ustPickup', { threshold: fmt(500) })}
              </div>
              <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 8 }}>
                🎯 <b>{t('ustThreshold', { threshold: fmt(500) })}</b><br/>
                {t('ustDelivery', { threshold: fmt(500) })}<br/> {t('copy155')} </div>
            </div>
            <button className="btn-submit" style={{ width: '100%' }} onClick={() => setUstBenefit(false)}> {t('ustBenefitConfirm')} </button>
          </div>
        </div>
      )}

      {/* 联系客服弹窗 */}
      {showContact && (
        <div className="checkout-overlay" onClick={() => setShowContact(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380, textAlign: 'center' }}>
            <h3>{t('copy157')}</h3>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>{t('copy158')}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, textAlign: 'left' }}>
              <div style={{ border: '1px solid #e8f5e9', background: '#f6fff8', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--market-green)' }}>{t('copy159')}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('copy160')}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>ustshucaizhishen</div>
                  <button onClick={() => copyText('ustshucaizhishen', t('copy161'))} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #3cb043', color: 'var(--market-green)', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>{t('copy162')}</button>
                </div>
              </div>

              <div style={{ border: '1px solid #e8f5e9', background: '#f6fff8', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--market-green)' }}>{t('copy163')}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('copy164')}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{BOSS_WECHAT}</div>
                  <button onClick={() => copyText(BOSS_WECHAT, t('copy161'))} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #3cb043', color: 'var(--market-green)', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>{t('copy162')}</button>
                </div>
              </div>

              <div style={{ border: '1px solid #e6f4ff', background: '#f4faff', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#128c7e' }}>{t('copy165')}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t('copy166')}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#222' }}>{BOSS_WHATSAPP}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => copyText(BOSS_WHATSAPP, t('copy167'))} style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #128c7e', color: '#128c7e', background: '#fff', borderRadius: 14, cursor: 'pointer' }}>{t('copy162')}</button>
                    <a href="https://wa.me/85295228191" target="_blank" rel="noreferrer" style={{ fontSize: 12, padding: '4px 10px', border: '1px solid #128c7e', color: '#fff', background: '#128c7e', borderRadius: 14, cursor: 'pointer', textDecoration: 'none' }}>{t('copy168')}</a>
                  </div>
                </div>
              </div>
            </div>

            <button className="btn-submit" style={{ width: '100%' }} onClick={() => setShowContact(false)}>{t('copy169')}</button>
          </div>
        </div>
      )}

      {showRefund && (
        <div className="checkout-overlay" onClick={() => setShowRefund(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
            <h3>{t('copy170')}</h3>
            <p style={{ lineHeight: 1.7, color: '#555', margin: '12px 0' }}>{t('copy171')}</p>
            <div className="after-sale-contact"><span>{t('copy172')}</span><strong>{BOSS_WECHAT}</strong><button onClick={() => copyText(BOSS_WECHAT, t('copy161'))}>{t('copy162')}</button></div>
            <div className="after-sale-contact"><span>{t('whatsapp')}</span><strong>{BOSS_WHATSAPP}</strong><a href="https://wa.me/85295228191" target="_blank" rel="noreferrer">{t('copy173')}</a></div>
            <button className="btn-submit" style={{ width: '100%', marginTop: 16 }} onClick={() => setShowRefund(false)}>{t('copy169')}</button>
          </div>
        </div>
      )}



      {showBrand && (
        <div className="checkout-overlay" onClick={() => setShowBrand(false)}>
          <div className="checkout-panel brand-panel" onClick={e => e.stopPropagation()}>
            <span className="brand-eyebrow">ZHENZHEN FRESH</span>
            <h3>{t('copy197')}</h3>
            <div className="brand-store-count"><strong>9</strong><span>{t('copy198')}</span></div>
            <p>{t('copy199')}</p>
            <button type="button" className="btn-submit" onClick={() => { setShowBrand(false); setTab('category'); window.scrollTo(0, 0) }}>{t('copy200')}</button>
            <button type="button" className="brand-close" onClick={() => setShowBrand(false)}>{t('copy201')}</button>
          </div>
        </div>
      )}

      {/* 配送规则弹窗 */}
      {showHelp && (
        <div className="checkout-overlay" onClick={() => setShowHelp(false)}>
          <div className="checkout-panel delivery-help-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="rule-dialog-heading"><h3>{t('copy202')}</h3><button type="button" aria-label={t('copy203')} onClick={() => setShowHelp(false)}>×</button></div>
            <div className="rule-dialog-list">
              <section><h4>{t('copy204')}</h4><p>{t('copy205')}</p></section>
              <section><h4>{t('copy206')}</h4><p>{t('deliveryFeeRule', { threshold: fmt(effectiveThreshold), fee: fmt(30) })}</p></section>
              <section><h4>{t('copy072')}</h4><p>{t('pointThresholds', { ust: fmt(500), other: fmt(1000) })}</p></section>
              <section><h4>{t('copy207')}</h4><p>{t('copy208')}</p></section>
              <section className="order-guide-in-help">
                <h4>{t('copy211')}</h4>
                <div className="order-guide-in-help-list">
                  <p><b>{t('copy139')}</b>{t('copy140')}{t('copy141')}</p>
                  <p><b>{t('copy142')}</b>{t('introPickup', { threshold: fmt(effectiveThreshold) })}{t('copy143')}{fmt(30)}{t('introUpgrade', { fee: fmt(30) })}</p>
                  <p><b>{t('copy144')}</b>{t('copy145')}</p>
                  <p><b>{t('copy146')}</b>{t('copy147')}</p>
                  <p><b>{t('copy148')}</b>{t('copy149')}<br />{t('copy150')}<br />{t('copy151')}</p>
                </div>
              </section>
            </div>
            <button type="button" className="rule-close-btn" onClick={() => setShowHelp(false)}>{t('copy201')}</button>
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
          <NavIcon name="user" />{t('my')}{unreadNotices.length > 0 && <span className="nav-notice-dot" aria-label={t('copy044', { '0': unreadNotices.length })}>{unreadNotices.length > 99 ? '99+' : unreadNotices.length}</span>}
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

function LoginPage({ onLogin, onRegister, onBack, t }) {
  const [mode, setMode] = useState('login')
  const [profile, setProfile] = useState({ username: '', wechat_id: '', whatsapp: '', phone: '' })
  const [phonePrefix, setPhonePrefix] = useState('+852')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [forgot, setForgot] = useState(false)
  const update = (key, value) => { setProfile(prev => ({ ...prev, [key]: value })); setError('') }
  const digitsOnly = (value, max) => value.replace(/\D/g, '').slice(0, max)
  const submit = async e => {
    e.preventDefault()
    if (submitting) return
    setError('')
    if (!profile.username.trim() || !password) return setError(t('CREDENTIALS_REQUIRED'))
    if (mode === 'register') {
      const contactProfile = {
        ...profile,
        whatsapp: '',
        phone: profile.phone ? phonePrefix + profile.phone : ''
      }
      const result = validateProfile(contactProfile)
      if (result.error) return setError(t(result.code))
      if (password !== confirmation) return setError(t('PASSWORD_MISMATCH'))
      return submitRegister(contactProfile)
    }
    submitLogin()
  }
  const submitRegister = async contactProfile => {
    setSubmitting(true)
    try { setError(await onRegister(contactProfile, password) || '') }
    catch { setError(t('connectionFailed')) }
    finally { setSubmitting(false) }
  }
  const submitLogin = async () => {
    setSubmitting(true)
    try { setError(await onLogin(profile.username.trim(), password) || '') }
    catch { setError(t('connectionFailed')) }
    finally { setSubmitting(false) }
  }
  return <div className="login-page">
    <div className="login-logo"><div className="icon">🛒</div><h2>{t('welcome')}</h2></div>
    <form className="login-box" onSubmit={submit}>
      <div className="login-tabs">{['login','register'].map(value => <button type="button" key={value} className={`login-tab ${mode === value ? 'active' : ''}`} onClick={() => { setMode(value); setError(''); setPassword(''); setConfirmation('') }}>{t(value)}</button>)}</div>
      <div className="login-input-group"><label htmlFor="account-username">{t('username')}</label><input id="account-username" autoComplete="username" required maxLength={40} value={profile.username} onChange={e => update('username',e.target.value)} placeholder={t('usernameHint')} /></div>
      <div className="login-input-group"><label htmlFor="account-password">{t('password')}</label><input id="account-password" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder={t('password')} /></div>
      {mode === 'register' && <>
        <div className="login-input-group"><label htmlFor="account-confirmation">{t('confirmPassword')}</label><input id="account-confirmation" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} /></div>
        <p className="login-phone-hint">{t('contactHint')}</p>
        <div className="login-input-group"><label htmlFor="account-wechat_id">{t('wechatId')} <small>{t('preferredContact')}</small></label><input id="account-wechat_id" type="text" maxLength={20} value={profile.wechat_id} onChange={e => update('wechat_id',e.target.value)} placeholder={t('wechatHint')} /></div>
        <div className="login-input-group"><label htmlFor="account-phone">{t('phone')} <small>{t('optional')}</small></label><div className="phone-prefix-row"><select value={phonePrefix} onChange={e => { setPhonePrefix(e.target.value); setProfile(prev => ({ ...prev, phone: (prev.phone || '').slice(0, e.target.value === '+852' ? 8 : 11) })) }} aria-label={t('countryCode')}><option value="+852">+852</option><option value="+86">+86</option></select><input id="account-phone" type="tel" inputMode="numeric" maxLength={phonePrefix === '+852' ? 8 : 11} value={profile.phone} onChange={e => update('phone', digitsOnly(e.target.value, phonePrefix === '+852' ? 8 : 11))} placeholder={t(phonePrefix === '+852' ? 'phonePh852' : 'phonePh86')} /></div></div>
        <p className="login-phone-hint">{t('noSmsHint')}</p>
      </>}
      {error && <p className="login-form-error" role="alert">{error}</p>}
      <button className="login-btn" disabled={submitting}>{submitting ? t('pleaseWait') : t(mode)}</button>
      {mode === 'login' && <button type="button" className="account-text-button" onClick={() => setForgot(true)}>{t('forgotPassword')}</button>}
      <button type="button" className="account-text-button" onClick={onBack}>{t('back')}</button>
    </form>
    {forgot && <div className="checkout-overlay" onClick={() => setForgot(false)}><div className="checkout-panel" onClick={e => e.stopPropagation()}><h3>{t('forgotPassword')}</h3><p>{t('resetHelp')}</p><p>{t('bossWechat')}: {BOSS_WECHAT}</p><p>{t('forgotWhatsappLine')}</p><a href="https://wa.me/85295228191" target="_blank" rel="noreferrer">{t('contactOwner')}</a><button type="button" className="btn-submit proof-confirm" onClick={() => setForgot(false)}>{t('gotIt')}</button></div></div>}
  </div>
}

/* ========== 地址管理页 ========== */
function AddressPage({ t, addresses, selectedId, onSelect, onEdit, onAdd, onDelete, onBack }) {
  return (
    <div>
      <div className="back-btn" onClick={onBack}>{t('copy027')}</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>{t('copy075')}</h3>
      <div className="addr-list" style={{ paddingBottom: 80 }}>
        {addresses.length === 0 && <div className="empty-state"><div className="icon">📍</div>{t('copy209')}</div>}
        {addresses.map(a => (
          <div className="addr-card" key={a.id} onClick={() => onSelect(a.id)}>
            <div className={`radio ${selectedId === a.id ? 'selected' : ''}`} />
            <div className="addr-info">
              <div className="name-row">{a.name} <span className="phone">{a.phone}</span> {a.isDefault && <span style={{ background: 'var(--market-green)', color: '#fff', fontSize: 10, padding: '1px 6px', borderRadius: 4, marginLeft: 8 }}>{t('copy210')}</span>}</div>
              <div className="detail">{a.detail}</div>
              <div className="addr-actions">
                <span onClick={e => { e.stopPropagation(); onEdit(a) }}>{t('copy211')}</span>
                <span className="del" onClick={e => { e.stopPropagation(); onDelete(a.id) }}>{t('copy212')}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="add-add-btn" onClick={onAdd}>{t('copy213')}</button>
    </div>
  )
}

/* ========== 地址编辑页 ========== */
function AddressEditPage({ t, addr, onSave, onBack }) {
  const [name, setName] = useState(addr?.name || '')
  const [phone, setPhone] = useState(addr?.phone || '')
  const [detail, setDetail] = useState(addr?.detail || '')
  const [isDefault, setIsDefault] = useState(addr?.isDefault || false)

  const save = () => {
    if (!name.trim() || !detail.trim()) { alert(t('addressRequired')); return }
    if (phone && normalizeContactPhone(phone) === null) { alert(t('INVALID_PHONE')); return }
    onSave({ ...(addr || {}), name: name.trim(), phone: normalizeContactPhone(phone) || '', detail: detail.trim(), isDefault })
  }

  return (
    <div>
      <div className="back-btn" onClick={onBack}>{t('copy027')}</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>{addr ? t('copy214') : t('copy215')}</h3>
      <div style={{ padding: '0 16px' }}>
        <div className="form-group"><label>{t('copy216')}</label><input value={name} onChange={e => setName(e.target.value)} placeholder={t('copy217')} /></div>
        <div className="form-group"><label>{t('copy218')}</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('copy219')} /></div>
        <div className="form-group"><label>{t('copy220')}</label><textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder={t('copy221')} rows={3} /></div>
        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} style={{ width: 'auto' }} /> {t('copy222')} </label>
        </div>
        <button className="login-btn" onClick={save} style={{ marginTop: 20 }}>{t('copy223')}</button>
      </div>
    </div>
  )
}

/* ========== 订单详情页 ========== */
export function OrderDetailPage({ order, onBack, pn, vl, copyText, fmt, t, statusTxt, showToast, onRefresh }) {
  const [proofFile, setProofFile] = useState(null)
  const [proofUploading, setProofUploading] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [showPaymentDetails, setShowPaymentDetails] = useState(false)
  const [payMethod, setPayMethod] = useState(order.payment_method)
  const [qrSwitching, setQrSwitching] = useState(false)
  const [qrZoom, setQrZoom] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const cnyDue = Number(order.total) + Number(order.delivery_fee || 0)
  const orderRate = order.payment_currency === 'HKD' && order.payment_amount != null && cnyDue > 0 ? Number(order.payment_amount) / cnyDue : 1
  const orderFmt = amount => formatAmount(Number(amount) * orderRate, order.payment_currency || 'CNY')
  const switchPay = async method => {
    if (method === payMethod || qrSwitching) return
    setQrSwitching(true)
    try {
      const res = await authFetch(`${API}/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_method: method })
      })
      const data = await res.json()
      if (!res.ok) { showToast(apiError(t, data)); return }
      setPayMethod(method)
      showToast(t('paymentMethodUpdated'))
      await onRefresh()
    } catch { showToast(t('connectionFailed')) }
    finally { setQrSwitching(false) }
  }
  const submitRequest = async (type) => {
    if (submitting) return
    if (type === 'delivery_upgrade' && deliveryAddress.trim().length < 5) {
      showToast(t('copy224'))
      return
    }
    const promptText = type === 'refund'
      ? t('copy225')
      : t('copy226')
    if (!window.confirm(promptText)) return
    setSubmitting(true)
    try {
      const response = await authFetch(`${API}/orders/request`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id, type, address: deliveryAddress })
      })
      const data = await response.json()
      showToast(response.ok ? t('copy227') : apiError(t, data))
      if (response.ok) await onRefresh()
    } catch { showToast(t('copy229')) }
    finally { setSubmitting(false) }
  }
  const cancelOrder = async () => {
    if (!window.confirm(t('copy269'))) return
    setSubmitting(true)
    try {
      const response = await authFetch(`${API}/orders/${order.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' })
      })
      const data = await response.json()
      showToast(response.ok ? t('copy270') : apiError(t, data))
      if (response.ok) await onRefresh()
    } catch { showToast(t('connectionFailed')) }
    finally { setSubmitting(false) }
  }
  return (
    <div>
      <div className="back-btn" onClick={onBack}>{t('copy027')}</div>
      <h3 style={{ fontSize: 18, padding: '0 16px 12px' }}>{t('copy230')}</h3>
      <div className="order-detail-page">
        {order.payment_method !== 'cash_on_delivery' && ['pending', 'awaiting_confirmation'].includes(order.status) && (
          <div className="order-detail-card proof-priority-card">
            <h4>{order.status === 'pending' ? t('copy231') : t('copy232')}</h4>
            <p>{order.status === 'pending' ? t('copy233', { '0': orderPaymentText(order) }) : t('copy234')}</p>
            <button type="button" className="payment-info-open" onClick={() => setShowPaymentDetails(true)}>{t('copy235')}</button>
            <label className="proof-file-picker">{t('copy236')}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={proofUploading} onChange={e => setProofFile(e.target.files[0] || null)} /></label>
            {proofFile && <><small className="proof-selected">{t('copy130')}{proofFile.name}</small><button className="btn-submit proof-confirm" disabled={proofUploading} onClick={async () => {
              setProofUploading(true)
              try {
                const error = await uploadProofFile(proofFile, order.id, t)
                if (error) showToast(error)
                else { showToast(t('copy131')); setProofFile(null); await onRefresh() }
                } catch (error) { showToast(error.message || t('copy004')) }
              finally { setProofUploading(false) }
            }}>{proofUploading ? t('copy132') : t('copy133')}</button></>}
            <small className="proof-file-hint">{t('copy237')}</small>
          </div>
        )}
        <div className="order-detail-card">
          <h4>{t('copy238')}</h4>
          <div className="order-detail-addr">
            <div className="icon">📍</div>
            <div className="info">
              <div className="name">{order.customer} <span className="phone">{order.phone}</span></div>
              <div className="detail">{order.address}</div>{order.contact_wechat_id && <div>{t('wechatId')}: {order.contact_wechat_id}</div>}{order.contact_whatsapp && <div>WhatsApp: {order.contact_whatsapp}</div>}
            </div>
          </div>
        </div>
        <div className="order-detail-card">
          <h4>{t('copy239')}</h4>
          {order.items?.map(i => (
            <div className="order-detail-goods-item" key={i.id}>
              <div className="emoji">{i.product?.image ? <img src={i.product.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6}} /> : '🛒'}</div>
              <div className="g-info">
                <div className="name">{pn(i.product?.name)}{i.variant ? `（${vl(i.variant)}）` : ''}</div>
                <div className="price">{orderFmt(i.price)}</div>
              </div>
              <div className="qty">x{i.quantity}</div>
            </div>
          ))}
          <div className="order-detail-summary">
            <div className="row"><span>{t('copy240')}</span><span>{orderFmt(order.items?.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0) || 0)}</span></div>
            <div className="row"><span>{t('copy071')}</span><span>{orderFmt(order.delivery_fee || 0)}</span></div>
            <div className="row total"><span>{order.payment_status === 'refunded' ? t('copy241') : t('copy242')}</span><span>{orderPaymentText(order)} · {order.payment_currency || 'CNY'}</span></div>
          </div>
        </div>
        <div className="order-detail-card">
          <h4>{t('copy243')}</h4>
          <div className="order-detail-meta">
            <div>{t('copy244')}{displayOrderNo(order)}</div>
            {order.delivery_point_id && <div>{t('copy245')}</div>}
            <div>{t('orderStatus')}：{statusTxt[order.status] || order.status}</div>
            <div>{t('copy246')}{t(`payment_${order.payment_method}`)}</div>
            <div>{t('copy247')}{t(`payStatus_${order.payment_status}`)}</div>
            {order.request && <div>{t('copy248')}{order.request.type === 'refund' ? t('copy249') : t('copy250')} · {order.request.status === 'pending' ? t('copy251') : order.request.status === 'approved' ? t('copy252') : t('copy253')}{order.request.admin_note ? `（${order.request.admin_note}）` : ''}</div>}
            {order.request?.status === 'pending' && <div>{order.request.type === 'refund' ? t('copy254') : t('copy255', { '0': orderFmt(30) })}</div>}
            {order.payment_screenshot && <div className="saved-proof"><strong>{t('copy256')}</strong><img src={order.payment_screenshot} alt={t('copy257')} /></div>}
            <div>{t('copy258')}{order.created_at?.slice(0, 19).replace('T', ' ')}</div>
            {order.remark && <div>{t('copy259')}{order.remark}</div>}
          </div>
        </div>
        {order.delivery_point_id && order.status === 'paid' && order.payment_status === 'confirmed' && order.request?.status !== 'pending' && (
          <div className="order-detail-card order-service-actions">
            <h4>{t('copy260')}</h4>
            <p>{t('waitingOptions', { fee: orderFmt(30) })}</p>
            <label htmlFor="delivery-upgrade-address">{t('copy261')}</label>
            <input id="delivery-upgrade-address" value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder={t('copy262')} maxLength={300} />
            <div className="service-action-row">
              <button disabled={submitting} onClick={() => submitRequest('delivery_upgrade')}>{t('upgradeFee', { fee: orderFmt(30) })}</button>
              <button disabled={submitting} className="secondary" onClick={() => submitRequest('refund')}>{t('copy263')}</button>
            </div>
          </div>
        )}
        {order.status === 'pending' && (
          <div className="order-detail-card order-cancel-action">
            <button className="btn-cancel-order" disabled={submitting} onClick={cancelOrder}>{t('copy268')}</button>
          </div>
        )}
        {!['pending', 'cancelled'].includes(order.status) && (
          <div className="order-detail-card after-sale-contact-card">
            <h4>{t('copy271')}</h4>
            <p>{t('copy272')}</p>
            <div className="after-sale-contact"><span>{t('copy172')}</span><strong>{BOSS_WECHAT}</strong><button onClick={() => copyText(BOSS_WECHAT, t('copy161'))}>{t('copy162')}</button></div>
            <div className="after-sale-contact"><span>{t('whatsapp')}</span><strong>{BOSS_WHATSAPP}</strong><a href="https://wa.me/85295228191" target="_blank" rel="noreferrer">{t('copy173')}</a></div>
          </div>
        )}
      </div>
      {showPaymentDetails && <div className="checkout-overlay" onClick={() => setShowPaymentDetails(false)}>
        <div className="checkout-panel payment-detail-panel" onClick={e => e.stopPropagation()}>
          <h3>{t('copy264')}</h3><p>{t('copy106')}{displayOrderNo(order)}</p>
          <div className="payment-due">{t('copy242')} {orderPaymentText(order)}</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              ['wechat_transfer', t('copy091'), '#07c160', 'CNY'],
              ['alipay_transfer', t('copy092'), '#1677ff', 'CNY'],
              ['fps_transfer', t('copy093'), '#722ed1', 'HKD']
            ].map(([method, label, color, allowedCur]) => {
              const allowed = allowedCur === (order.payment_currency || 'CNY')
              return (
                <button
                  key={method}
                  disabled={qrSwitching || !allowed}
                  onClick={() => switchPay(method)}
                  style={{
                    fontSize: 13, padding: '7px 14px', borderRadius: 20, cursor: qrSwitching || !allowed ? 'not-allowed' : 'pointer',
                    border: payMethod === method ? `2px solid ${color}` : '1px solid #ddd',
                    background: payMethod === method && allowed ? color : '#fff',
                    color: payMethod === method && allowed ? '#fff' : (allowed ? '#555' : '#aaa'),
                    fontWeight: payMethod === method ? 600 : 400,
                    opacity: qrSwitching || !allowed ? 0.45 : 1
                  }}
                >{label}{!allowed && <span style={{ display: 'block', fontSize: 10, lineHeight: 1.2 }}>{allowedCur === 'HKD' ? t('copy276') : t('copy275')}</span>}</button>
              )
            })}
          </div>
          {payMethod === 'fps_transfer' ? <div className="fps-pay-number">{t('copy265')}<br /><strong>95228191</strong></div> :
            <img className="payment-detail-qr" style={{ cursor: 'zoom-in' }} src={payMethod === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'} alt={t('copy111')} onClick={() => setQrZoom(true)} />}
          <p>{t('copy266')}{BOSS_WECHAT}。</p>
          <button className="btn-submit proof-confirm" onClick={() => setShowPaymentDetails(false)}>{t('copy267')}</button>
        </div>
      </div>}
      {qrZoom && <div className="checkout-overlay" style={{ zIndex: 6000 }} onClick={() => setQrZoom(false)}>
        <div onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
          <img src={payMethod === 'wechat_transfer' ? '/images/pay/wechat.jpg' : '/images/pay/alipay.jpg'} alt={t('copy111')} style={{ maxWidth: '92vw', maxHeight: '82vh', borderRadius: 12 }} />
          <div style={{ marginTop: 14 }}>
            <button className="btn-cancel" onClick={() => setQrZoom(false)} style={{ color: '#fff', borderColor: '#fff', background: 'rgba(0,0,0,0.45)', padding: '8px 22px', borderRadius: 20 }}>✕</button>
          </div>
        </div>
      </div>}
    </div>
  )
}
