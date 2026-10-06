import { useState, useEffect } from 'react'

const API = '/api'
const statusText = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }
const paymentText = { cash_on_delivery: '货到付款（现金）', wechat_transfer: '微信转账', alipay_transfer: '支付宝转账', fps_transfer: '转数快 FPS' }
const payStatusText = { pending: '待支付', paid: '已支付', confirmed: '已确认收款' }

// 带鉴权的 fetch
function authFetch(url, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  return fetch(url, { ...options, headers })
}

export default function App() {
  const [tab, setTab] = useState('home')
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
  const [refundChoice, setRefundChoice] = useState(null)
  const [refundItems, setRefundItems] = useState([])
  const [showRefundPicker, setShowRefundPicker] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

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
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 1800) }

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

  const addToCart = (id) => {
    setCart(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    showToast('已加入购物车')
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0)
  const cartItems = Object.entries(cart)
    .map(([id, qty]) => ({ product: products.find(p => p.id === Number(id)), qty }))
    .filter(item => item.product)
  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.qty, 0)

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
      if (!selectedPointId) { showToast('请先选择自取点'); setShowPointPicker(true); return }
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
    if (!refundChoice) { showToast('请选择运费退还方式'); return }
    const res = await authFetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer, phone, address, remark,
        payment_method: paymentMethod,
        delivery_type: deliveryType,
        delivery_point_id: deliveryType === 'pickup' ? selectedPointId : null,
        refund_choice: refundChoice,
        refund_items: refundItems,
        items: cartItems.map(item => ({ product_id: item.product.id, quantity: item.qty }))
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
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} onBack={() => setTab('my')} />
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

  return (
    <div>
      {/* 顶部栏 - 去掉服务点 */}
      <div className="top-bar" style={{ paddingTop: 16 }}>
        {deliveryPoints.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, cursor: 'pointer', fontSize: 14 }} onClick={() => setShowPointPicker(true)}>
            📍 <b>{deliveryPoints.find(p => p.id == selectedPointId)?.name || '选择自取点'}</b>
            <span style={{ fontSize: 12, opacity: 0.8 }}>▼</span>
          </div>
        )}
        <div className="search-box">
          🔍 <input
            placeholder="搜索商品"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setTab('home') } }}
          />
          {searchInput && (
            <span style={{ color: '#999', cursor: 'pointer', fontSize: 13 }} onClick={() => { setSearchInput(''); setSearch('') }}>清除</span>
          )}
        </div>
      </div>

      {tab === 'home' && (
        <>
          <div className="banner">
            <div className={`banner-slide ${bannerIdx === 0 ? 'mid-autumn' : 'fresh'}`}>
              {bannerIdx === 0 ? '🥮 喜迎中秋 佳节团圆' : '🥬 新鲜直达 每日优选'}
            </div>
            <div className="banner-dots">
              <span className={bannerIdx === 0 ? 'active' : ''} />
              <span className={bannerIdx === 1 ? 'active' : ''} />
            </div>
          </div>


          {/* 凑单进度条 */}
          {stats && (
            <div className="group-buy-banner">
              <div className="group-buy-row">
                <span className="group-buy-label">🚚 {deliveryPoints.find(p => p.id == selectedPointId)?.name || '今日凑单'}</span>
                {stats.reached ? (
                  <span className="group-buy-reached">✓ 已达起送门槛，今日可配送！</span>
                ) : (
                  <span className="group-buy-remain">还差 <b>¥{stats.remaining.toFixed(0)}</b> 起送</span>
                )}
              </div>
              <div className="group-buy-progress">
                <div
                  className="group-buy-progress-bar"
                  style={{ width: `${Math.min(100, (stats.confirmed_total / stats.threshold) * 100)}%` }}
                />
              </div>
              <div className="group-buy-footer">
                <span>已确认订单总额：<b style={{ color: stats.reached ? '#3cb043' : '#ff6b35' }}>¥{stats.confirmed_total.toFixed(0)}</b> / ¥{stats.threshold}</span>
                <span>{stats.confirmed_count} 笔订单已确认</span>
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
                  <div className="product-card-mini" key={p.id} onClick={() => addToCart(p.id)}>
                    <div className="emoji">{p.image ? <img src={p.image} alt={p.name} style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:8}} /> : '🛒'}</div>
                    <span className="tag">新人价</span>
                    <div className="name">{p.name}</div>
                    <div className="price">¥{p.price.toFixed(2)}</div>
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
                <span className="name">{c.name}</span>
              </div>
            ))}
          </div>

          <div className="product-list">
            <div className="product-list-title">{search ? `搜索"${search}"的结果` : '🔥 热门推荐'}</div>
            <div className="product-grid">
              {filteredProducts.map(p => (
                <div className="product-card" key={p.id} onClick={() => setSelectedProduct(p)}>
                  <div className="emoji">{p.image ? <img src={p.image} alt={p.name} /> : '🛒'}</div>
                  <div className="info">
                    <div className="name">{p.name}</div>
                    <div className="bottom-row">
                      <div className="price"><small>¥</small>{p.price.toFixed(2)}</div>
                      <button className="add-btn" onClick={(e) => { e.stopPropagation(); addToCart(p.id) }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="empty-state"><div className="icon">🔍</div>没有找到相关商品</div>}
          </div>
        </>
      )}

      {tab === 'category' && (
        <div className="cat-layout">
          <div className="cat-sidebar">
            <div className={`cat-side-item ${!activeCategory ? 'active' : ''}`} onClick={() => { setActiveCategory(null); window.scrollTo(0, 0) }}>
              全部
            </div>
            {categories.map(c => (
              <div className={`cat-side-item ${activeCategory === c.id ? 'active' : ''}`} key={c.id} onClick={() => { setActiveCategory(c.id); window.scrollTo(0, 0) }}>
                {c.icon || '📦'} {c.name}
              </div>
            ))}
          </div>
          <div className="cat-main">
            <div className="product-grid">
              {filteredProducts.map(p => (
                <div className="product-card" key={p.id} onClick={() => setSelectedProduct(p)}>
                  <div className="emoji">{p.image ? <img src={p.image} alt={p.name} /> : '🛒'}</div>
                  <div className="info">
                    <div className="name">{p.name}</div>
                    <div className="bottom-row">
                      <div className="price"><small>¥</small>{p.price.toFixed(2)}</div>
                      <button className="add-btn" onClick={(e) => { e.stopPropagation(); addToCart(p.id) }}>+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filteredProducts.length === 0 && <div className="empty-state"><div className="icon">📦</div>暂无商品</div>}
          </div>
        </div>
      )}

      {tab === 'myOrders' && (
        <div>
          <div className="back-btn" onClick={() => setTab('my')}>‹ 返回</div>
          <div style={{ padding: '0 12px 20px' }}>
            <h3 style={{ fontSize: 18, marginBottom: 12, paddingLeft: 4 }}>我的订单</h3>
            {orders.length === 0 && <div className="empty-state"><div className="icon">📭</div>暂无订单</div>}
            {orders.map(o => (
              <div className="order-item-card" key={o.id} style={{ background: '#fff', borderRadius: 10, marginBottom: 10 }} onClick={() => { setSelectedOrder(o); setTab('orderDetail') }}>
                <div className="order-top">
                  <span>订单号：{o.order_no}</span>
                  <span className="order-status">{statusText[o.status] || o.status}</span>
                </div>
                <div className="order-goods">{o.items?.map(i => `${i.product?.image} ${i.product?.name} x${i.quantity}`).join('，')}</div>
                <div className="order-total">共 {o.items?.reduce((s, i) => s + i.quantity, 0)} 件 合计：<span>¥{o.total?.toFixed(2)}</span></div>
              </div>
            ))}
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
                  <div className="phone">{currentUser.phone || '未绑定手机号'}</div>
                </div>
              </div>
              <div className="my-content">
                <div className="my-card">
                  <div className="my-card-title">
                    我的订单
                    <span className="link" onClick={() => setTab('myOrders')}>查看全部 ›</span>
                  </div>
                  {orders.slice(0, 3).map(o => (
                    <div className="order-item-card" key={o.id} onClick={() => { setSelectedOrder(o); setTab('orderDetail') }}>
                      <div className="order-top">
                        <span>{o.order_no}</span>
                        <span className="order-status">{statusText[o.status] || o.status}</span>
                      </div>
                      <div className="order-goods">{o.items?.map(i => `${i.product?.name} x${i.quantity}`).join('，')}</div>
                      <div className="order-total">合计：<span>¥{o.total?.toFixed(2)}</span></div>
                    </div>
                  ))}
                  {orders.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 14 }}>暂无订单</div>}
                </div>
                <div className="my-card">
                  <div className="my-menu-item" onClick={() => setTab('address')}>
                    <span className="icon">📍</span>
                    <span className="text">收货地址</span>
                    <span className="arrow">›</span>
                  </div>
                </div>
                <button className="logout-btn" onClick={logout}>退出登录</button>
              </div>
            </>
          ) : (
            <div className="my-header" style={{ justifyContent: 'center', cursor: 'pointer' }} onClick={() => setTab('login')}>
              <div className="avatar">👤</div>
              <div className="info">
                <div className="name">点击登录</div>
                <div className="phone">登录后查看订单和地址</div>
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
              {cartItems.map(item => (
                <div className="cart-item" key={item.product.id}>
                  <div className="emoji">{item.product.image ? <img src={item.product.image} alt="" style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:6}} /> : '🛒'}</div>
                  <div className="detail">
                    <div className="name">{item.product.name}</div>
                    <div className="price">¥{item.product.price.toFixed(2)}</div>
                  </div>
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQty(item.product.id, -1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn plus" onClick={() => updateQty(item.product.id, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-footer">
              <div className="cart-total">合计：<span>¥{cartTotal.toFixed(2)}</span></div>
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
                  <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>满$1000免运费</div>
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
                📍 <b>{deliveryPoints.find(p => p.id == selectedPointId)?.name || '未选择'}</b>
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
                <span>¥{cartTotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#666' }}>运费</span>
                <span style={{ color: (deliveryType === 'delivery' || !stats?.reached) ? '#ff4444' : '#3cb043', fontWeight: 600 }}>
                  {deliveryType === 'delivery' ? '¥30' : (stats?.reached ? '免运费' : `¥${stats?.delivery_fee || 10}`)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 4px', borderTop: '1px solid #eee', marginTop: 4 }}>
                <span>共 {cartCount} 件</span>
                <span style={{ color: '#ff4444', fontWeight: 'bold', fontSize: 18 }}>
                  ¥{(cartTotal + (deliveryType === 'delivery' ? 30 : (stats?.reached ? 0 : (stats?.delivery_fee || 10)))).toFixed(2)}
                </span>
              </div>
            </div>
            {deliveryType === 'pickup' && (
            <div className="form-group" style={{ marginTop: 12 }}>
              <label>如达到免运费门槛，请选择运费退还方式 <span style={{ color: '#ff4d4f' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div onClick={() => setRefundChoice('original')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: refundChoice === 'original' ? '2px solid #3cb043' : '1px solid #eee',
                  background: refundChoice === 'original' ? '#f0fff0' : '#fff', fontSize: 13
                }}>
                  💵 原渠道退回
                </div>
                <div onClick={() => setRefundChoice('produce')} style={{
                  flex: 1, padding: 10, textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                  border: refundChoice === 'produce' ? '2px solid #3cb043' : '1px solid #eee',
                  background: refundChoice === 'produce' ? '#f0fff0' : '#fff', fontSize: 13
                }}>
                  🥬 等值蔬菜水果
                </div>
              </div>
              {refundChoice === 'produce' && (
                <div style={{ marginTop: 8, padding: 10, background: '#f9f9f9', borderRadius: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>已选 {refundItems.length} 件等值商品</span>
                    <span style={{ color: '#3cb043', cursor: 'pointer' }} onClick={() => setShowRefundPicker(true)}>选择</span>
                  </div>
                  {refundItems.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                      {refundItems.map(item => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 12 }}>
                          <span>{item.name} x{item.qty}</span>
                          <span>¥{item.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            )}
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
                <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: '100%', borderRadius: '12px 12px 0 0', aspectRatio: '1/1', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', aspectRatio: '1/1', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60, borderRadius: '12px 12px 0 0' }}>🛒</div>
              )}
              <span onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.5)', color: '#fff', width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>✕</span>
            </div>
            <div style={{ padding: 16 }}>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{selectedProduct.name}</h3>
              <div style={{ fontSize: 24, color: '#ff4444', fontWeight: 'bold', marginBottom: 12 }}>¥{selectedProduct.price.toFixed(2)}</div>
              {selectedProduct.description && (
                <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>{selectedProduct.description}</p>
              )}
              <button className="btn-submit" style={{ width: '100%' }} onClick={() => { addToCart(selectedProduct.id); setSelectedProduct(null) }}>加入购物车</button>
            </div>
          </div>
        </div>
      )}
      {/* 等值商品选择弹窗 */}
      {showRefundPicker && (
        <div className="checkout-overlay" onClick={() => setShowRefundPicker(false)}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>🥬 选择等值蔬菜水果</h3>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>请选择总价约 HK$10 的商品（运费等值）</p>
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {products.slice(0, 20).map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', padding: 10, border: '1px solid #eee',
                  borderRadius: 8, marginBottom: 6, cursor: 'pointer'
                }} onClick={() => {
                  const existing = refundItems.find(i => i.id === p.id)
                  if (existing) {
                    setRefundItems(refundItems.filter(i => i.id !== p.id))
                  } else {
                    setRefundItems([...refundItems, { id: p.id, name: p.name, price: p.price, qty: 1 }])
                  }
                }}>
                  <input type="checkbox" checked={refundItems.some(i => i.id === p.id)} readOnly style={{ marginRight: 10 }} />
                  <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: '#ff4444' }}>¥{p.price}</span>
                </div>
              ))}
            </div>
            <div style={{ textAlign: 'right', padding: '10px 0' }}>
              <button className="btn-submit" onClick={() => setShowRefundPicker(false)}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 配送点选择弹窗（强制选择） */}
      {showPointPicker && (
        <div className="checkout-overlay" style={{ zIndex: 3000 }} onClick={() => { if (localStorage.getItem('selectedPointId')) setShowPointPicker(false) }}>
          <div className="checkout-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <h3>📍 选择自取点</h3>
            <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>请选择你就近的自提点，每个点满 ¥1000 免运费</p>
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
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 3 }}>{p.address}</div>
                  <div style={{ fontSize: 12, color: '#999', marginTop: 3 }}>运费 HK${p.fee} · 满 HK${p.threshold} 免运费</div>
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
              <div style={{
                width: 200, height: 200, margin: '0 auto',
                background: paymentMethod === 'wechat_transfer' ? '#f0f9eb' : paymentMethod === 'alipay_transfer' ? '#e6f4ff' : '#f9f0ff',
                border: `2px solid ${paymentMethod === 'wechat_transfer' ? '#07c160' : paymentMethod === 'alipay_transfer' ? '#1677ff' : '#722ed1'}`,
                borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64
              }}>
                {paymentMethod === 'wechat_transfer' ? '💚' : paymentMethod === 'alipay_transfer' ? '💙' : '💱'}
              </div>
              <div style={{ fontSize: 14, marginTop: 10, fontWeight: 600, color: paymentMethod === 'wechat_transfer' ? '#07c160' : paymentMethod === 'alipay_transfer' ? '#1677ff' : '#722ed1' }}>
                {paymentMethod === 'wechat_transfer' ? '微信收款码' : paymentMethod === 'alipay_transfer' ? '支付宝收款码' : '转数快 FPS 收款码'}
              </div>
            </div>
            <div style={{ background: '#fff8e1', padding: 10, borderRadius: 8, fontSize: 12, color: '#f57c00', marginBottom: 16, textAlign: 'left' }}>
              ⚠️ 转账时请备注订单号，付款后请截图发给老板微信确认。<br />
              如收款码无法使用，请直接加老板微信付款。
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-cancel" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setTab('myOrders') }}>稍后支付</button>
              <button className="btn-submit" style={{ flex: 1 }} onClick={() => { setShowPaymentQR(false); setTab('myOrders'); showToast('请等待老板确认收款') }}>我已付款</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}

      {/* 底部导航 */}
      <div className="bottom-nav">
        <div className={`nav-item ${tab === 'home' ? 'active' : ''}`} onClick={() => setTab('home')}>
          <span className="icon">🏠</span>首页
        </div>
        <div className={`nav-item ${tab === 'category' ? 'active' : ''}`} onClick={() => { setTab('category'); window.scrollTo(0, 0) }}>
          <span className="icon">⬡</span>分类
        </div>
        <div className="nav-item" onClick={() => setShowCart(true)}>
          <span className="icon">🛒</span>购物车
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </div>
        <div className={`nav-item ${tab === 'my' || tab === 'myOrders' || tab === 'address' || tab === 'orderDetail' ? 'active' : ''}`} onClick={() => setTab('my')}>
          <span className="icon">👤</span>我的
        </div>
      </div>
    </div>
  )
}

/* ========== 登录页 ========== */
function LoginPage({ onLogin, onRegister, onBack }) {
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')

  const submit = () => {
    if (mode === 'login') onLogin(username, password)
    else if (!phone || phone.length < 8) { alert('请填写正确的手机号'); return }
    else onRegister(username, password, phone)
  }

  return (
    <div className="login-page">
      <div className="login-logo">
        <div className="icon">🛒</div>
        <h2>珍珍优质果菜</h2>
      </div>
      <div className="login-box">
        <div className="login-tabs">
          <div className={`login-tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>登录</div>
          <div className={`login-tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>注册</div>
        </div>
        <div className="login-input-group">
          <label>账号</label>
          <input placeholder="请输入账号" value={username} onChange={e => setUsername(e.target.value)} />
        </div>
        <div className="login-input-group">
          <label>密码</label>
          <input type="password" placeholder="请输入密码" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        {mode === 'register' && (
          <div className="login-input-group">
            <label>手机号 <span style="color:red">*</span></label>
            <input placeholder="请输入手机号" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
        )}
        <button className="login-btn" onClick={submit}>{mode === 'login' ? '登 录' : '注 册'}</button>
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#999' }}>
          <span style={{ cursor: 'pointer', color: '#3cb043' }} onClick={onBack}>返回上一页</span>
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
                <div className="name">{i.product?.name}</div>
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
            <div>订单状态：{statusText[order.status] || order.status}</div>
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
