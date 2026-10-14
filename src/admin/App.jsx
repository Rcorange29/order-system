import { useState, useEffect, useRef } from 'react'

const API = '/api'

function authFetch(url, options = {}) {
  const token = localStorage.getItem('admin_token')
  const headers = { ...(options.headers || {}) }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(options.body)
  }
  return fetch(url, { ...options, headers })
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [adminUser, setAdminUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [toast, setToast] = useState('')

  const reload = () => {
    authFetch(`${API}/products`).then(r => r.json()).then(setProducts)
    authFetch(`${API}/categories`).then(r => r.json()).then(setCategories)
    authFetch(`${API}/admin/orders`).then(r => r.json()).then(setOrders)
  }

  useEffect(() => {
    if (token) {
      authFetch(`${API}/me`).then(r => {
        if (r.ok) return r.json()
        throw new Error('auth failed')
      }).then(u => {
        setAdminUser(u)
        reload()
      }).catch(() => {
        localStorage.removeItem('admin_token')
        setToken('')
        setAdminUser(null)
      })
    }
  }, [token])

  const handleLogin = (token, username) => {
    localStorage.setItem('admin_token', token)
    setToken(token)
    setAdminUser({ username })
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setToken('')
    setAdminUser(null)
  }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2000) }

  if (!token || !adminUser) {
    return <AdminLogin onLogin={handleLogin} showToast={showToast} />
  }

  const menu = [
    { key: 'dashboard', label: '📊 数据概览' },
    { key: 'products', label: '📦 商品管理' },
    { key: 'orders', label: '📋 订单管理' },
    { key: 'categories', label: '🏷️ 分类管理' },
  ]

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="logo">🛒 珍珍优质果菜</div>
        {menu.map(m => (
          <div key={m.key} className={`menu-item ${page === m.key ? 'active' : ''}`} onClick={() => setPage(m.key)}>
            {m.label}
          </div>
        ))}
        <div className="menu-item" style={{ marginTop: 'auto', cursor: 'pointer', color: '#ff6b6b' }} onClick={handleLogout}>
          🚪 退出登录 ({adminUser?.username})
        </div>
      </div>
      <div className="main-content">
        {page === 'dashboard' && <Dashboard products={products} orders={orders} categories={categories} />}
        {page === 'products' && <ProductManage products={products} categories={categories} reload={reload} showToast={showToast} />}
        {page === 'orders' && <OrderManage orders={orders} reload={reload} showToast={showToast} />}
        {page === 'categories' && <CategoryManage categories={categories} reload={reload} showToast={showToast} />}
      </div>
      {toast && <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.8)', color: '#fff', padding: '10px 24px', borderRadius: 6, zIndex: 9999, fontSize: 14 }}>{toast}</div>}
    </div>
  )
}

/* ========== 管理员登录页 ========== */
function AdminLogin({ onLogin, showToast }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) { showToast('请输入账号和密码'); return }
    setLoading(true)
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (res.ok) {
        onLogin(data.token, data.username)
        showToast('登录成功')
      } else {
        showToast(data.error || '登录失败')
      }
    } catch (err) {
      showToast('网络错误')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div style={{ background: '#fff', padding: 40, borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', width: 360 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8, color: '#333' }}>🛒 珍珍优质果菜</h2>
        <p style={{ textAlign: 'center', color: '#999', marginBottom: 24, fontSize: 14 }}>管理后台登录</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#666' }}>账号</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入管理员账号"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#666' }}>密码</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none', borderRadius: 6, fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '登录中...' : '登 录'}
          </button>
        </form>
      </div>
    </div>
  )
}

/* ========== 仪表盘 ========== */
function Dashboard({ products, orders, categories }) {
  const totalSales = orders.reduce((s, o) => s + (o.total || 0), 0)
  const pendingCount = orders.filter(o => o.status === 'pending').length
  return (
    <div>
      <div className="page-header"><h2>数据概览</h2></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="label">商品总数</div><div className="value green">{products.length}</div></div>
        <div className="stat-card"><div className="label">订单总数</div><div className="value blue">{orders.length}</div></div>
        <div className="stat-card"><div className="label">待处理订单</div><div className="value orange">{pendingCount}</div></div>
        <div className="stat-card"><div className="label">累计销售额</div><div className="value">¥{totalSales.toFixed(2)}</div></div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>最近订单</h3>
        <table>
          <thead><tr><th>订单号</th><th>客户</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            {orders.slice(0, 5).map(o => (
              <tr key={o.id}>
                <td>{o.order_no}</td>
                <td>{o.customer}</td>
                <td>¥{o.total?.toFixed(2)}</td>
                <td><span className={`tag tag-${o.status}`}>{statusText[o.status] || o.status}</span></td>
                <td>{o.created_at?.slice(0, 19).replace('T', ' ')}</td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 30 }}>暂无订单</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const statusText = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' }
const paymentText = { cash_on_delivery: '货到付款', wechat_transfer: '微信转账', alipay_transfer: '支付宝转账', fps_transfer: '转数快 FPS' }
const payStatusText = { pending: '待支付', paid: '已支付', confirmed: '已确认收款' }

/* ========== 商品管理 ========== */
function ProductManage({ products, categories, reload, showToast }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const emptyForm = { name: '', price: '', original_price: '', image: '', category_id: '', stock: '', is_new: false, is_hot: false, description: '' }
  const [form, setForm] = useState(emptyForm)
  const fileInputRef = useRef(null)

  // 全局粘贴事件：模态框打开时监听 Ctrl+V / Cmd+V
  useEffect(() => {
    if (!showModal) return
    const onPaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue
          const reader = new FileReader()
          reader.onload = (ev) => {
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const maxW = 800
              const scale = Math.min(1, maxW / img.width)
              canvas.width = img.width * scale
              canvas.height = img.height * scale
              const ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
              setForm(f => ({ ...f, image: canvas.toDataURL('image/jpeg', 0.75) }))
              showToast('已粘贴剪贴板图片')
            }
            img.src = ev.target.result
          }
          reader.readAsDataURL(file)
          return
        }
      }
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [showModal, showToast])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ name: p.name, price: p.price, original_price: p.original_price, image: p.image, category_id: p.category_id, stock: p.stock, is_new: p.is_new, is_hot: p.is_hot, description: p.description || '' })
    setShowModal(true)
  }

  const save = async () => {
    if (!form.name) { showToast('请输入商品名称'); return }
    const body = { ...form, price: Number(form.price), original_price: Number(form.original_price), stock: Number(form.stock), category_id: Number(form.category_id) }
    const url = editing ? `${API}/products/${editing.id}` : `${API}/products`
    const method = editing ? 'PUT' : 'POST'
    const res = await authFetch(url, { method, body })
    if (res.ok) { showToast(editing ? '修改成功' : '添加成功'); setShowModal(false); reload() }
  }

  const del = async (id) => {
    if (!confirm('确定删除该商品？')) return
    await authFetch(`${API}/products/${id}`, { method: 'DELETE' })
    showToast('删除成功'); reload()
  }

  const filtered = products.filter(p => !search || p.name.includes(search))

  return (
    <div>
      <div className="page-header">
        <h2>商品管理</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ 新增商品</button>
      </div>
      <div className="card">
        <div className="toolbar">
          <input placeholder="搜索商品名称" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <table>
          <thead><tr><th>ID</th><th>图标</th><th>名称</th><th>分类</th><th>价格</th><th>原价</th><th>库存</th><th>标签</th><th>操作</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.image ? <img src={p.image} style={{width:50,height:50,objectFit:'cover',borderRadius:6}} /> : '📦'}</td>
                <td>{p.name}</td>
                <td>{p.category?.name || '-'}</td>
                <td style={{ color: '#ff4444', fontWeight: 600 }}>¥{p.price?.toFixed(2)}</td>
                <td><s style={{ color: '#999' }}>¥{p.original_price?.toFixed(2)}</s></td>
                <td>{p.stock}</td>
                <td>{p.is_new && <span className="tag tag-pending" style={{ marginRight: 4 }}>新人</span>}{p.is_hot && <span className="tag tag-paid">热门</span>}</td>
                <td><div className="action-btns"><button className="btn btn-default btn-sm" onClick={() => openEdit(p)}>编辑</button><button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>删除</button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', color: '#999', padding: 30 }}>暂无数据</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editing ? '编辑商品' : '新增商品'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-inline">
                <div className="form-row"><label>商品名称 <span className="req">*</span></label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-row"><label>商品图片</label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#ff4444'; e.currentTarget.style.background = '#fff5f5' }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = '#ddd'; e.currentTarget.style.background = '#fff' }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.style.borderColor = '#ddd'
                      e.currentTarget.style.background = '#fff'
                      const file = e.dataTransfer.files?.[0]
                      if (!file || !file.type.startsWith('image/')) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const img = new Image()
                        img.onload = () => {
                          const canvas = document.createElement('canvas')
                          const maxW = 800
                          const scale = Math.min(1, maxW / img.width)
                          canvas.width = img.width * scale
                          canvas.height = img.height * scale
                          const ctx = canvas.getContext('2d')
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                          setForm({ ...form, image: canvas.toDataURL('image/jpeg', 0.75) })
                          showToast('图片已拖入')
                        }
                        img.src = ev.target.result
                      }
                      reader.readAsDataURL(file)
                    }}
                    style={{
                      border: '2px dashed #ddd', borderRadius: 8, padding: 16,
                      display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {form.image
                      ? <img src={form.image} style={{width:72,height:72,objectFit:'cover',borderRadius:8,border:'1px solid #eee'}} />
                      : <div style={{width:72,height:72,background:'#f5f5f5',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>📦</div>}
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,color:'#666',marginBottom:4}}>拖拽图片到这里，或点击选择文件</div>
                      <div style={{fontSize:11,color:'#999'}}>支持从微信保存后直接拖入 · 也可 Ctrl+V 粘贴</div>
                    </div>
                    <input type="file" accept="image/*" style={{display:'none'}} ref={fileInputRef} onChange={(e) => {
                      const file = e.target.files[0]
                      if (!file) return
                      const reader = new FileReader()
                      reader.onload = (ev) => {
                        const img = new Image()
                        img.onload = () => {
                          const canvas = document.createElement('canvas')
                          const maxW = 800
                          const scale = Math.min(1, maxW / img.width)
                          canvas.width = img.width * scale
                          canvas.height = img.height * scale
                          const ctx = canvas.getContext('2d')
                          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
                          setForm({ ...form, image: canvas.toDataURL('image/jpeg', 0.75) })
                        }
                        img.src = ev.target.result
                      }
                      reader.readAsDataURL(file)
                    }} />
                  </div>
                </div>
              </div>
              <div className="form-inline">
                <div className="form-row"><label>售价 <span className="req">*</span></label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} /></div>
                <div className="form-row"><label>原价</label><input type="number" value={form.original_price} onChange={e => setForm({ ...form, original_price: e.target.value })} /></div>
              </div>
              <div className="form-inline">
                <div className="form-row"><label>分类</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">请选择</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-row"><label>库存</label><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} /></div>
              </div>
              <div className="form-inline">
                <div className="form-row"><label><input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />新人专享</label></div>
                <div className="form-row"><label><input type="checkbox" checked={form.is_hot} onChange={e => setForm({ ...form, is_hot: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />热门推荐</label></div>
              </div>
              <div className="form-row"><label>描述</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ========== 订单管理 ========== */
function OrderManage({ orders, reload, showToast }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [detail, setDetail] = useState(null)

  const updateStatus = async (id, status) => {
    await authFetch(`${API}/admin/orders/${id}`, { method: 'PUT', body: { status } })
    showToast('状态已更新'); reload()
  }

  const del = async (id) => {
    if (!confirm('确定删除该订单？')) return
    await authFetch(`${API}/admin/orders/${id}`, { method: 'DELETE' })
    showToast('删除成功'); reload()
  }

  const confirmPayment = async (id) => {
    await authFetch(`${API}/admin/orders/${id}`, { method: 'PUT', body: { payment_status: 'confirmed', status: 'paid' } })
    showToast('已确认收款'); reload()
  }

  const filtered = orders.filter(o => !statusFilter || o.status === statusFilter)

  return (
    <div>
      <div className="page-header"><h2>订单管理</h2></div>
      <div className="card">
        <div className="toolbar">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            {Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <table>
          <thead><tr><th>订单号</th><th>客户</th><th>电话</th><th>商品</th><th>金额</th><th>支付方式</th><th>支付状态</th><th>状态</th><th>下单时间</th><th>操作</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>{o.order_no}</td>
                <td>{o.customer}</td>
                <td>{o.phone}</td>
                <td style={{ maxWidth: 200 }}>{o.items?.map(i => `${i.product?.name} x${i.quantity}`).join('，')}</td>
                <td style={{ color: '#ff4444', fontWeight: 600 }}>¥{o.total?.toFixed(2)}</td>
                <td>{paymentText[o.payment_method] || o.payment_method}</td>
                <td>
                  <span style={{ color: o.payment_status === 'confirmed' ? '#52c41a' : o.payment_status === 'paid' ? '#1890ff' : '#fa8c16', fontWeight: 500 }}>
                    {payStatusText[o.payment_status] || o.payment_status}
                  </span>
                </td>
                <td>
                  <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                    {Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td>{o.created_at?.slice(0, 19).replace('T', ' ')}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-default btn-sm" onClick={() => setDetail(o)}>详情</button>
                    {(o.payment_method === 'wechat_transfer' || o.payment_method === 'alipay_transfer' || o.payment_method === 'fps_transfer') && o.payment_status !== 'confirmed' && (
                      <button className="btn btn-primary btn-sm" onClick={() => confirmPayment(o.id)}>确认收款</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => del(o.id)}>删除</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 30 }}>暂无订单</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>订单详情</h3><button className="modal-close" onClick={() => setDetail(null)}>×</button></div>
            <div className="modal-body">
              <div className="form-row"><label>订单号</label><div>{detail.order_no}</div></div>
              <div className="form-inline">
                <div className="form-row"><label>收货人</label><div>{detail.customer}</div></div>
                <div className="form-row"><label>电话</label><div>{detail.phone}</div></div>
              </div>
              <div className="form-row"><label>地址</label><div>{detail.address}</div></div>
              <div className="form-row"><label>商品明细</label>
                <div className="order-detail-items">
                  {detail.items?.map(i => (
                    <div className="order-detail-item" key={i.id}>
                      <span>{i.product?.image} {i.product?.name} x{i.quantity}</span>
                      <span>¥{(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="order-detail-item" style={{ borderTop: '1px solid #e8e8e8', marginTop: 8, paddingTop: 10, fontWeight: 600 }}>
                    <span>合计</span><span style={{ color: '#ff4444' }}>¥{detail.total?.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="form-row"><label>备注</label><div>{detail.remark || '无'}</div></div>
              <div className="form-inline">
                <div className="form-row"><label>支付方式</label><div>{paymentText[detail.payment_method] || detail.payment_method}</div></div>
                <div className="form-row"><label>支付状态</label><div>{payStatusText[detail.payment_status] || detail.payment_status}</div></div>
              </div>
              <div className="form-row"><label>状态</label><span className={`tag tag-${detail.status}`}>{statusText[detail.status]}</span></div>
            </div>
            <div className="modal-footer"><button className="btn btn-default" onClick={() => setDetail(null)}>关闭</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ========== 分类管理 ========== */
function CategoryManage({ categories, reload, showToast }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', icon: '', sort: '' })

  const openAdd = () => { setEditing(null); setForm({ name: '', icon: '', sort: '' }); setShowModal(true) }
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name, icon: c.icon, sort: c.sort }); setShowModal(true) }

  const save = async () => {
    if (!form.name) { showToast('请输入分类名称'); return }
    const body = { ...form, sort: Number(form.sort) || 0 }
    const url = editing ? `${API}/categories/${editing.id}` : `${API}/categories`
    const method = editing ? 'PUT' : 'POST'
    const res = await authFetch(url, { method, body })
    if (res.ok) { showToast(editing ? '修改成功' : '添加成功'); setShowModal(false); reload() }
  }

  const del = async (id) => {
    if (!confirm('确定删除该分类？')) return
    await authFetch(`${API}/categories/${id}`, { method: 'DELETE' })
    showToast('删除成功'); reload()
  }

  return (
    <div>
      <div className="page-header">
        <h2>分类管理</h2>
        <button className="btn btn-primary" onClick={openAdd}>+ 新增分类</button>
      </div>
      <div className="card">
        <table>
          <thead><tr><th>ID</th><th>图标</th><th>名称</th><th>排序</th><th>操作</th></tr></thead>
          <tbody>
            {categories.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td style={{ fontSize: 24 }}>{c.icon || '📦'}</td>
                <td>{c.name}</td>
                <td>{c.sort}</td>
                <td><div className="action-btns"><button className="btn btn-default btn-sm" onClick={() => openEdit(c)}>编辑</button><button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>删除</button></div></td>
              </tr>
            ))}
            {categories.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999', padding: 30 }}>暂无分类</td></tr>}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>{editing ? '编辑分类' : '新增分类'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>×</button></div>
            <div className="modal-body">
              <div className="form-row"><label>分类名称 <span className="req">*</span></label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-row"><label>图标(emoji)</label><input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="如 🥬" /></div>
              <div className="form-row"><label>排序</label><input type="number" value={form.sort} onChange={e => setForm({ ...form, sort: e.target.value })} /></div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={save}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
