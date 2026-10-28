import { useState, useEffect, useRef } from 'react'
import useVisualViewport from '../useVisualViewport.js'
import UserManage from './UserManage.jsx'
import { buildPackingListHtml, getPackableOrders } from './packingList.js'
import { buildCollectionReportHtml } from './collectionReport.js'

const API = '/api'
const displayOrderNo = order => String(order?.public_no ?? order?.id ?? '').padStart(2, '0')
const orderPaymentText = order => `${order.payment_currency === 'HKD' ? 'HK$' : '¥'}${Number(order.payment_amount ?? (Number(order.total) + Number(order.delivery_fee || 0))).toFixed(2)} ${order.payment_currency || 'CNY'}`
const upgradeFeeText = order => order.payment_currency === 'HKD' && Number(order.total) > 0
  ? `HK$${(Math.round(30 * Number(order.payment_amount) / Number(order.total) * 100) / 100).toFixed(2)}` : '¥30.00'

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
  useVisualViewport()
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [adminUser, setAdminUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [orderToOpen, setOrderToOpen] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [orders, setOrders] = useState([])
  const [users, setUsers] = useState([])
  const [serviceRequests, setServiceRequests] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [pageViews, setPageViews] = useState({ today: 0, total: 0, recent: [] })
  const [toast, setToast] = useState('')

  const reload = () => {
    authFetch(`${API}/products?all=1`).then(r => r.json()).then(setProducts)
    authFetch(`${API}/categories`).then(r => r.json()).then(setCategories)
    authFetch(`${API}/admin/orders`).then(r => r.json()).then(setOrders)
    authFetch(`${API}/admin/users`).then(r => { if (!r.ok) throw new Error('无法读取用户'); return r.json() }).then(setUsers).catch(() => showToast('无法读取用户列表，请重试或重新登录'))
    authFetch(`${API}/admin/order-requests`).then(r => r.ok ? r.json() : []).then(setServiceRequests)
    authFetch(`${API}/announcements?all=1`).then(r => r.ok ? r.json() : []).then(setAnnouncements)
    authFetch(`${API}/admin/page-views`).then(r => r.ok ? r.json() : null).then(d => d && setPageViews(d)).catch(() => {})
  }

  useEffect(() => {
    if (token) {
      authFetch(`${API}/me`).then(r => {
        if (r.ok) return r.json()
        throw new Error('auth failed')
      }).then(u => {
        if (!u || !u.is_admin) throw new Error('not admin')
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

  if (!token || !adminUser?.is_admin) {
    return <AdminLogin onLogin={handleLogin} showToast={showToast} />
  }

  const canManageAll = adminUser.admin_role === 'owner'
  const menu = [
    { key: 'dashboard', label: '📊 数据概览' },
    { key: 'products', label: '📦 商品管理' },
    { key: 'orders', label: '📋 订单管理' },
    { key: 'requests', label: `↩️ 配送与退款申请${serviceRequests.filter(r => r.status === 'pending').length ? ` (${serviceRequests.filter(r => r.status === 'pending').length})` : ''}` },
    { key: 'announcements', label: '📣 配送公告' },
    { key: 'users', label: '👥 用户管理' },
    { key: 'categories', label: '🏷️ 分类管理' },
    { key: 'settings', label: '⚙️ 系统设置' },
  ]

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="logo">🛒 珍珍优质果菜</div>
        {menu.map(m => (
          <div key={m.key} className={`menu-item ${page === m.key ? 'active' : ''}`} onClick={() => { setOrderToOpen(null); setPage(m.key) }}>
            {m.label}
          </div>
        ))}
        <div className="menu-item" style={{ marginTop: 'auto', cursor: 'pointer', color: '#ff6b6b' }} onClick={handleLogout}>
          🚪 退出登录 ({adminUser?.username})
        </div>
      </div>
      <div className="main-content">
        {!canManageAll && <div className="card" role="status">当前账号：后台资料只读；商品可新增、修改和下架。订单、收款、申请及其他设置仅主管理员可处理。</div>}
        {page === 'dashboard' && <Dashboard products={products} orders={orders} categories={categories} pageViews={pageViews} />}
        {page === 'products' && <ProductManage products={products} categories={categories} reload={reload} showToast={showToast} />}
        {page === 'orders' && <OrderManage orders={orders} reload={reload} showToast={showToast} initialOrderId={orderToOpen} canManage={canManageAll} />}
        {page === 'requests' && <RequestManage requests={serviceRequests} reload={reload} showToast={showToast} canManage={canManageAll} />}
        {page === 'announcements' && <AnnouncementManage announcements={announcements} reload={reload} showToast={showToast} canManage={canManageAll} />}
        {page === 'users' && <UserManage users={users} authFetch={authFetch} reload={reload} showToast={showToast} adminUser={adminUser} canManage={canManageAll} onSelfLogout={handleLogout} onOpenOrder={id => {setOrderToOpen(id);setPage('orders')}} />}
        {page === 'categories' && <CategoryManage categories={categories} reload={reload} showToast={showToast} canManage={canManageAll} />}
        {page === 'settings' && <SettingsPage authFetch={authFetch} showToast={showToast} canManage={canManageAll} />}
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
function Dashboard({ products, orders, categories, pageViews }) {
  const totalSales = orders.reduce((s, o) => s + (o.payment_status === 'confirmed' ? Number(o.total) + Number(o.delivery_fee || 0) : 0), 0)
  const pendingCount = orders.filter(o => o.status === 'awaiting_confirmation').length
  const groupingCount = orders.filter(o => o.status === 'paid' && !o.delivery_batch_id).length
  const lockedCount = orders.filter(o => o.status === 'paid' && o.delivery_batch_id).length
  const priority = order => order.status === 'awaiting_confirmation' ? 0 : order.status === 'paid' ? 1 : 2
  const prioritizedOrders = [...orders].sort((a, b) => priority(a) - priority(b) || Number(b.id) - Number(a.id))
  const views = pageViews || { today: 0, visitors: 0, total: 0, total_visitors: 0, recent: [] }
  const maxRecent = Math.max(1, ...views.recent.map(r => r.count))
  return (
    <div>
      <div className="page-header"><h2>数据概览</h2></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="label">待审核订单</div><div className="value orange">{pendingCount}</div></div>
        <div className="stat-card"><div className="label">拼团中</div><div className="value green">{groupingCount}</div></div>
        <div className="stat-card"><div className="label">已锁定待配送</div><div className="value blue">{lockedCount}</div></div>
        <div className="stat-card"><div className="label">订单总数</div><div className="value blue">{orders.length}</div></div>
        <div className="stat-card"><div className="label">累计销售额</div><div className="value">¥{totalSales.toFixed(2)}</div></div>
        <div className="stat-card"><div className="label">商品总数</div><div className="value green">{products.length}</div></div>
        <div className="stat-card"><div className="label">今日浏览量</div><div className="value green">{views.today}</div></div>
        <div className="stat-card"><div className="label">今日访客数</div><div className="value blue">{views.visitors}</div></div>
        <div className="stat-card"><div className="label">累计浏览量</div><div className="value">{views.total}</div></div>
        <div className="stat-card"><div className="label">累计访客数</div><div className="value">{views.total_visitors}</div></div>
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>最近浏览量（近 14 天；柱顶为打开次数，柱底小字为访客数）</h3>
        {views.recent.length === 0 ? (
          <p style={{ color: '#999' }}>暂无数据，网站每被打开一次会自动记录。</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140, padding: '8px 4px', overflowX: 'auto' }}>
            {views.recent.map(r => (
              <div key={r.view_date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
                <span style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{r.count}</span>
                <div style={{ width: 18, height: Math.max(3, Math.round(90 * r.count / maxRecent)), background: 'var(--market-green, #2f9e44)', borderRadius: '4px 4px 0 0' }} />
                <span style={{ fontSize: 10, color: '#2f9e44', marginTop: 2 }}>{r.visitors || 0}访</span>
                <span style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{r.view_date.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <h3 style={{ marginBottom: 16 }}>待处理与最近订单</h3>
        <table>
          <thead><tr><th>订单号</th><th>客户</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
          <tbody>
            {prioritizedOrders.slice(0, 5).map(o => (
              <tr key={o.id}>
                <td>{displayOrderNo(o)}</td>
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

const statusText = { pending: '待付款', awaiting_confirmation: '待确认', paid: '拼团中', shipped: '已发货', completed: '已完成', cancelled: '已取消' }
const paymentText = { cash_on_delivery: '货到付款', wechat_transfer: '微信转账', alipay_transfer: '支付宝转账', fps_transfer: '转数快 FPS' }
const payStatusText = { pending: '待支付', paid: '已支付', confirmed: '已确认收款', refunded: '已退款' }

function RequestManage({ requests, reload, showToast, canManage }) {
  const [notes, setNotes] = useState({})
  const [busy, setBusy] = useState(false)
  const resolve = async (entry, decision) => {
    if (busy) return
    const message = decision === 'reject' ? '确认拒绝这项申请？' : entry.type === 'refund'
      ? `确认已经线下退还 ¥${(Number(entry.total) + Number(entry.delivery_fee || 0)).toFixed(2)}？此操作会把订单标记为已退款并取消。`
      : '确认已收到额外 ¥30？此操作会把订单改为送货到家，并计入 ¥30 运费。'
    if (!window.confirm(message)) return
    setBusy(true)
    try {
      const response = await authFetch(`${API}/admin/order-requests`, { method: 'PUT', body: { id: entry.id, decision, note: notes[entry.id] || '' } })
      const data = await response.json()
      showToast(response.ok ? '申请已处理' : data.error || '处理失败')
      if (response.ok) { setNotes(prev => ({ ...prev, [entry.id]: '' })); reload() }
    } catch { showToast('处理失败，请重试') }
    finally { setBusy(false) }
  }
  return <div>
    <div className="page-header"><h2>配送与退款申请</h2></div>
    <div className="request-list">
      {requests.map(entry => <div className="card request-card" key={entry.id}>
        <div className="request-title"><strong>{entry.type === 'refund' ? '取消订单并退款' : '加 ¥30 单独配送'}</strong><span className={`tag ${entry.status === 'pending' ? 'tag-pending' : 'tag-completed'}`}>{entry.status === 'pending' ? '待处理' : entry.status === 'approved' ? '已完成' : '已拒绝'}</span></div>
        <p>订单 {displayOrderNo({ public_no: entry.public_no, id: entry.order_id })} · {entry.customer} · {entry.phone} · {entry.delivery_point_name || '自取点'}</p>
        <p>{entry.type === 'refund' ? '应退金额' : '原订单已收'} {orderPaymentText(entry)} · 申请时间 {entry.created_at}</p>
        {entry.type === 'delivery_upgrade' && <p>单独配送加收：{upgradeFeeText(entry)}（运费基准 ¥30）</p>}
        {entry.address && <p>送货地址：{entry.address}</p>}
        {entry.admin_note && <p>处理备注：{entry.admin_note}</p>}
        {canManage && entry.status === 'pending' && <div className="request-controls">
          <input value={notes[entry.id] || ''} onChange={e => setNotes(prev => ({ ...prev, [entry.id]: e.target.value }))} placeholder="处理备注（可选）" maxLength={500} />
          <button disabled={busy} className="btn btn-primary" onClick={() => resolve(entry, 'approve')}>{entry.type === 'refund' ? '已线下退款，完成申请' : `已收 ${upgradeFeeText(entry)}，改为送货到家`}</button>
          <button disabled={busy} className="btn btn-default" onClick={() => resolve(entry, 'reject')}>拒绝申请</button>
        </div>}
      </div>)}
      {!requests.length && <div className="card">暂无申请</div>}
    </div>
  </div>
}

function AnnouncementManage({ announcements, reload, showToast, canManage }) {
  const [points, setPoints] = useState([])
  const [editing, setEditing] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [translations, setTranslations] = useState({})
  const [pointId, setPointId] = useState('')
  const [published, setPublished] = useState(true)
  useEffect(() => { fetch(`${API}/delivery-points`).then(r => r.json()).then(setPoints).catch(() => {}) }, [])
  const reset = () => { setEditing(null); setTranslations({}); setTitle(''); setContent(''); setPointId(''); setPublished(true) }
  const edit = (item) => { setEditing(item); setTranslations(Object.fromEntries(['title_zh_hk','title_en','content_zh_hk','content_en'].map(k => [k,item[k] || '']))); setTitle(item.title); setContent(item.content); setPointId(item.delivery_point_id || ''); setPublished(Boolean(item.is_published)) }
  const save = async () => {
    const response = await authFetch(`${API}/announcements`, { method: editing ? 'PUT' : 'POST', body: { id: editing?.id, title, content, ...translations, delivery_point_id: pointId || null, is_published: published } })
    const data = await response.json()
    showToast(response.ok ? '公告已保存' : data.error || '保存失败')
    if (response.ok) { reset(); reload() }
  }
  const remove = async (id) => {
    if (!window.confirm('确定删除这条公告？')) return
    const response = await authFetch(`${API}/announcements`, { method: 'DELETE', body: { id } })
    showToast(response.ok ? '公告已删除' : '删除失败')
    if (response.ok) reload()
  }
  return <div>
    <div className="page-header"><h2>配送公告</h2></div>
    {canManage && <div className="card announcement-editor">
      <p>配送前一天，在这里发布取货时间；顾客会在所选服务点首页看到。群通知仍由你自行发送。</p>
      <div className="form-row"><label>标题 · 简体（必填）</label><input value={title} onChange={e => setTitle(e.target.value)} maxLength={100} placeholder="例如：周五科技大学取货安排" /></div>
      <div className="form-row"><label>服务点</label><select value={pointId} onChange={e => setPointId(e.target.value)}><option value="">所有服务点</option>{points.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="form-row"><label>正文 · 简体（必填）</label><textarea value={content} onChange={e => setContent(e.target.value)} maxLength={2000} placeholder="写明日期、时间、地点和取货提醒" rows={4} /></div>
      <p>繁體及 English 可留空；顾客未有对应语言版本时会看到简体原文，不会自动翻译。</p>
      {[['zh_hk','繁體'],['en','English']].map(([code,label]) => <fieldset key={code} className="merchant-language-fields"><legend>{label}（选填）</legend>
        <div className="form-row"><label>标题 · {label}</label><input value={translations[`title_${code}`] || ''} maxLength={100} onChange={e => setTranslations(prev => ({...prev,[`title_${code}`]:e.target.value}))} /></div>
        <div className="form-row"><label>正文 · {label}</label><textarea value={translations[`content_${code}`] || ''} rows={4} maxLength={2000} onChange={e => setTranslations(prev => ({...prev,[`content_${code}`]:e.target.value}))} /></div>
      </fieldset>)}
      <label className="publish-toggle"><input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} /> 立即在网站显示</label>
      <div className="announcement-actions"><button className="btn btn-primary" onClick={save}>{editing ? '保存修改' : '发布公告'}</button>{editing && <button className="btn btn-default" onClick={reset}>取消编辑</button>}</div>
    </div>}
    <div className="announcement-list">{announcements.map(item => <div className="card" key={item.id}>
      <div className="request-title"><strong>{item.title}</strong><span className="tag">{item.is_published ? '已发布' : '草稿'}</span></div>
      <p>{points.find(p => p.id === item.delivery_point_id)?.name || '所有服务点'} · {item.created_at}</p>
      <p className="announcement-content">{item.content}</p>
      {canManage && <div className="announcement-actions"><button className="btn btn-default btn-sm" onClick={() => edit(item)}>编辑</button><button className="btn btn-danger btn-sm" onClick={() => remove(item.id)}>删除</button></div>}
    </div>)}</div>
  </div>
}

/* ========== 商品管理 ========== */
function ProductManage({ products, categories, reload, showToast }) {
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const emptyForm = { name: '', price: '', original_price: 0, image: '', category_id: '', stock: 999, is_new: false, is_hot: false, description: '', unit: '/斤', variants: [], is_active: true }
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
    let parsedVariants = []
    try { parsedVariants = p.variants ? JSON.parse(p.variants) : [] } catch(e) {}
    setForm({ name: p.name, price: p.price, original_price: p.original_price, image: p.image, category_id: p.category_id, stock: p.stock, is_new: p.is_new, is_hot: p.is_hot, description: p.description || '', unit: p.unit || '/斤', variants: parsedVariants, is_active: p.is_active !== false })
    setShowModal(true)
  }

  const save = async (navDir) => {
    if (!form.name) { showToast('请输入商品名称'); return }
    const body = { ...form, price: Number(form.price), original_price: Number(form.original_price), stock: Number(form.stock), category_id: Number(form.category_id), variants: form.variants.length > 0 ? JSON.stringify(form.variants) : null }
    const url = editing ? `${API}/products/${editing.id}` : `${API}/products`
    const method = editing ? 'PUT' : 'POST'
    const res = await authFetch(url, { method, body })
    if (!res.ok) { showToast('保存失败'); return }
    
    // If navigating, load next/prev product from filtered list
    if (navDir && editing) {
      const idx = filtered.findIndex(p => p.id === editing.id)
      const nextIdx = navDir === 'next' ? idx + 1 : idx - 1
      if (nextIdx >= 0 && nextIdx < filtered.length) {
        const np = filtered[nextIdx]
        setEditing(np)
        setForm({ name: np.name, price: np.price, original_price: np.original_price, image: np.image, category_id: np.category_id, stock: np.stock, is_new: np.is_new, is_hot: np.is_hot, description: np.description || '', unit: np.unit || '/斤' })
        showToast(`已保存，跳转至 ${np.name}`)
        return
      } else {
        showToast('已是最后一个商品')
      }
    }
    showToast(editing ? '修改成功' : '添加成功')
    setShowModal(false); reload()
  }

  const del = async (id) => {
    if (!confirm('确定删除该商品？')) return
    const response = await authFetch(`${API}/products/${id}`, { method: 'DELETE' })
    const data = await response.json()
    showToast(response.ok ? '删除成功' : data.error || '删除失败')
    if (response.ok) reload()
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
          <thead><tr><th>ID</th><th>图标</th><th>名称</th><th>分类</th><th>价格</th><th>标签</th><th>操作</th></tr></thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.image ? <img src={p.image} style={{width:50,height:50,objectFit:'cover',borderRadius:6}} /> : '📦'}</td>
                <td>{p.name}</td>
                <td>{p.category?.name || '-'}</td>
                <td style={{ color: '#ff4444', fontWeight: 600 }}>¥{p.price?.toFixed(2)}{p.unit || '/斤'}</td>
                <td>{p.is_new && <span className="tag tag-pending" style={{ marginRight: 4 }}>新人</span>}{p.is_hot && <span className="tag tag-paid" style={{ marginRight: 4 }}>热门</span>}{p.is_active === false && <span style={{background:'#999',color:'#fff',padding:'2px 8px',borderRadius:4,fontSize:11}}>已下架</span>}</td>
                <td><div className="action-btns"><button className="btn btn-default btn-sm" onClick={() => openEdit(p)}>编辑</button><button className="btn btn-danger btn-sm" onClick={() => del(p.id)}>删除</button></div></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', color: '#999', padding: 30 }}>暂无数据</td></tr>}
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
                <div className="form-row"><label>单位</label><input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="/斤" /></div>
              </div>
              <div className="form-inline">
                <div className="form-row"><label>分类</label>
                  <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">请选择</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-inline">
                <div className="form-row"><label><input type="checkbox" checked={form.is_new} onChange={e => setForm({ ...form, is_new: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />新人专享</label></div>
                <div className="form-row"><label><input type="checkbox" checked={form.is_hot} onChange={e => setForm({ ...form, is_hot: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />热门推荐</label></div>
                <div className="form-row"><label><input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ width: 'auto', marginRight: 6 }} />上架中</label></div>
              </div>
              <div className="form-row">
                <label>多规格（可选）</label>
                <div style={{ marginTop: 4 }}>
                  {form.variants.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                      <input placeholder="规格名，如：半磅" value={v.label} onChange={e => {
                        const vs = [...form.variants]; vs[i] = { ...vs[i], label: e.target.value }
                        setForm({ ...form, variants: vs })
                      }} style={{ flex: 1 }} />
                      <input type="number" placeholder="价格" value={v.price} onChange={e => {
                        const vs = [...form.variants]; vs[i] = { ...vs[i], price: Number(e.target.value) }
                        setForm({ ...form, variants: vs })
                      }} style={{ width: 80 }} />
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => {
                        setForm({ ...form, variants: form.variants.filter((_, j) => j !== i) })
                      }}>×</button>
                    </div>
                  ))}
                  <button type="button" className="btn btn-default btn-sm" onClick={() => {
                    setForm({ ...form, variants: [...form.variants, { label: '', price: '' }] })
                  }}>+ 添加规格</button>
                </div>
              </div>
              <div className="form-row"><label>描述</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {editing && (
                  <>
                    <button className="btn btn-default" onClick={() => save('prev')} style={{ marginRight: 8 }}>← 上一个</button>
                    <button className="btn btn-default" onClick={() => save('next')}>下一个 →</button>
                  </>
                )}
              </div>
              <div>
                <button className="btn btn-default" onClick={() => setShowModal(false)}>关闭</button>
                <button className="btn btn-primary" onClick={() => save()}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ========== 订单管理 ========== */
function OrderManage({ orders, reload, showToast, initialOrderId, canManage }) {
  const [statusFilter, setStatusFilter] = useState('')
  const [pointFilter, setPointFilter] = useState('')
  const [deliveryPoints, setDeliveryPoints] = useState([])
  const [search, setSearch] = useState('')
  const [detail, setDetail] = useState(null)
  const [batches, setBatches] = useState([])
  const [selectedBatch, setSelectedBatch] = useState(null)
  const [showUnbatchedHistory, setShowUnbatchedHistory] = useState(false)
  const [batchDate, setBatchDate] = useState('')
  const [batchBusy, setBatchBusy] = useState(false)

  const [editingDelivery, setEditingDelivery] = useState(false)
  const [deliveryForm, setDeliveryForm] = useState({})
  const [deliveryBusy, setDeliveryBusy] = useState(false)
  const [deliveryError, setDeliveryError] = useState('')
  const requestSequence = useRef(0)
  useEffect(() => () => { requestSequence.current++ }, [])
  useEffect(() => {
    authFetch(`${API}/delivery-points`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setDeliveryPoints(data)
    }).catch(() => {})
  }, [])
  const loadBatches = () => authFetch(`${API}/admin/delivery-batches`).then(r => r.ok ? r.json() : []).then(setBatches).catch(() => showToast('读取配送批次失败'))
  useEffect(() => { loadBatches() }, [orders])
  const openReport = async batch => {
    const win = window.open('', '_blank')
    if (!win) { showToast('请允许弹出窗口后再导出报告'); return }
    win.document.write('<p style="font-family:sans-serif;padding:20px">正在生成收款报告…</p>')
    try {
      const response = await authFetch(`${API}/admin/delivery-batches/${batch.id}`)
      if (!response.ok) throw new Error('收款报告读取失败')
      const report = await response.json()
      win.document.open(); win.document.write(buildCollectionReportHtml(report)); win.document.close(); win.focus()
    } catch { win.close(); showToast('收款报告读取失败，请重试') }
  }
  const lockBatch = async () => {
    if (!pointFilter || !batchDate) { showToast('先选择服务点和配送日期'); return }
    const candidates = getPackableOrders(orders.filter(order => !order.delivery_batch_id), pointFilter)
    if (!candidates.length) { showToast('此服务点暂无可锁定订单'); return }
    const name = pointOptions.find(([id]) => id === pointFilter)?.[1] || '服务点'
    if (!window.confirm(`锁定 ${name} ${batchDate} 配送的 ${candidates.length} 笔订单？锁定后商品和收款资料将保存快照，订单不能删除或修改。`)) return
    setBatchBusy(true)
    try {
      const response = await authFetch(`${API}/admin/delivery-batches`, { method: 'POST', body: { point_key: pointFilter, delivery_date: batchDate } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '锁定失败')
      setSelectedBatch(data.id); setStatusFilter(''); reload(); loadBatches(); showToast('批次已锁定，请点击“导出本次收款报告”')
    } catch (error) { showToast(error.message || '锁定失败') }
    finally { setBatchBusy(false) }
  }
  const archiveBatch = async batch => {
    if (!window.confirm(`确认 ${batch.point_name} ${batch.delivery_date} 的 ${batch.order_count} 单均已配送？归档后整批订单将标记为“已发货”。`)) return
    setBatchBusy(true)
    try {
      const response = await authFetch(`${API}/admin/delivery-batches/${batch.id}`, { method: 'PATCH', body: {} })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '归档失败')
      reload(); loadBatches(); showToast('已配送并归档')
    } catch (error) { showToast(error.message || '归档失败') }
    finally { setBatchBusy(false) }
  }
  const unlockBatch = async batch => {
    if (!window.confirm(`解除 ${batch.point_name} ${batch.delivery_date} 的批次锁定？已生成的快照报告将删除，订单返回待处理列表，方便处理退款或更正。`)) return
    setBatchBusy(true)
    try {
      const response = await authFetch(`${API}/admin/delivery-batches/${batch.id}`, { method: 'DELETE' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '解除锁定失败')
      setSelectedBatch(null); setPointFilter(batch.point_key); reload(); loadBatches(); showToast('已解除锁定，订单可继续处理')
    } catch (error) { showToast(error.message || '解除锁定失败') }
    finally { setBatchBusy(false) }
  }
  const viewDetail = async (id) => {
    const sequence = ++requestSequence.current
    setEditingDelivery(false); setDeliveryError('')
    try {
      const response = await authFetch(`${API}/admin/orders/${id}`)
      const data = await response.json()
      if (sequence !== requestSequence.current) return
      if (response.ok) setDetail(data)
      else showToast(data.error || '无法读取订单详情')
    } catch { if (sequence === requestSequence.current) showToast('读取订单失败，请重试') }
  }
  useEffect(() => { if (initialOrderId) viewDetail(initialOrderId) }, [initialOrderId])
  const saveDelivery = async e => {
    e.preventDefault()
    if (deliveryBusy) return
    setDeliveryBusy(true);setDeliveryError('')
    try {
      const response = await authFetch(`${API}/admin/orders/${detail.id}`, {method:'PATCH',body:deliveryForm})
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败')
      await viewDetail(detail.id);reload();showToast('收货信息与备注已保存')
    } catch(error) { setDeliveryError(error.message || '网络异常，请重试') }
    finally { setDeliveryBusy(false) }
  }

  const updateStatus = async (id, status) => {
    const response = await authFetch(`${API}/admin/orders/${id}`, { method: 'PUT', body: { status } })
    const data = await response.json()
    showToast(response.ok ? '状态已更新' : data.error || '更新失败')
    if (response.ok) reload()
  }

  const del = async (id) => {
    const order = orders.find(o => o.id === id)
    if (window.prompt(`永久删除订单 ${order?.order_no}？此操作无法恢复。请输入订单号确认：`) !== order?.order_no) return
    const response = await authFetch(`${API}/admin/orders/${id}`, { method: 'DELETE' })
    showToast(response.ok ? '删除成功' : '删除失败')
    if (response.ok) reload()
  }

  const confirmPayment = async (id) => {
    if (!window.confirm('确认实际收到这笔订单的款项？')) return
    const response = await authFetch(`${API}/admin/orders/${id}`, { method: 'PUT', body: { payment_status: 'confirmed', status: 'paid' } })
    const data = await response.json()
    showToast(response.ok ? '已确认收款' : data.error || '操作失败')
    if (response.ok) reload()
  }

  const pointOptions = [...new Map(orders.filter(o => o.delivery_point_id != null).map(o => [String(o.delivery_point_id), o.delivery_point_name || `服务点 ${o.delivery_point_id}`])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1], 'zh-Hans-CN'))
  if (orders.some(o => o.delivery_point_id == null)) pointOptions.push(['home', '送货到家'])
  const archivedGroups = Object.values(batches.filter(batch => batch.status === 'archived').reduce((groups, batch) => {
    const group = groups[batch.point_key] || (groups[batch.point_key] = { name: batch.point_name, batches: [] })
    group.batches.push(batch)
    return groups
  }, {}))
  const filtered = orders.filter(o => (selectedBatch ? Number(o.delivery_batch_id) === selectedBatch : !o.delivery_batch_id && (showUnbatchedHistory ? ['shipped', 'completed', 'cancelled'].includes(o.status) : !['shipped', 'completed', 'cancelled'].includes(o.status)))
    && (!statusFilter || o.status === statusFilter)
    && (!pointFilter || (pointFilter === 'home' ? o.delivery_point_id == null : String(o.delivery_point_id) === pointFilter))
    && (!search || `${displayOrderNo(o)} ${o.order_no} ${o.customer} ${o.phone}`.toLowerCase().includes(search.toLowerCase())))

  // 当前服务点单独打印；只有已确认收款、尚待配送的订单可进入配货单。
  const exportPackingList = () => {
    if (!pointFilter) { showToast('请先选择配货服务点'); return }
    if (!getPackableOrders(filtered, pointFilter).length) { showToast('该服务点当前没有已确认收款、待配送的订单'); return }
    const pointName = pointOptions.find(([id]) => id === pointFilter)?.[1] || '配货'
    const todayHK = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10)
    const schedule = deliveryPoints.find(point => String(point.id) === pointFilter)
    const deliveryDate = selectedBatch ? batches.find(item => item.id === selectedBatch)?.delivery_date || '' : schedule?.group_formed && schedule.delivery_date >= todayHK ? schedule.delivery_date : ''
    const html = buildPackingListHtml(filtered, { pointId: pointFilter, pointName, deliveryDate })
    const win = window.open('', '_blank')
    if (!win) { showToast('浏览器拦截了弹窗，请允许后再试'); return }
    win.document.open()
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  return (
    <div>
      <div className="page-header"><h2>订单管理</h2></div>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3>配送批次</h3>
        <p className="user-help">按服务点及配送日期锁定本次订单；收款报告保存锁定时的金额、商品与付款凭证。配送后整批归档，历史记录仍可查看和导出。</p>
        <div className="action-btns" style={{ flexWrap: 'wrap', marginBottom: 12 }}>
          <button className={`btn ${selectedBatch === null && !showUnbatchedHistory ? 'btn-primary' : 'btn-default'}`} onClick={() => { setSelectedBatch(null); setShowUnbatchedHistory(false); setStatusFilter(''); setPointFilter('') }}>当前待处理订单</button>
          <button className={`btn ${selectedBatch === null && showUnbatchedHistory ? 'btn-primary' : 'btn-default'}`} onClick={() => { setSelectedBatch(null); setShowUnbatchedHistory(true); setStatusFilter(''); setPointFilter('') }}>未归批历史订单</button>
          {batches.filter(batch => batch.status === 'locked').map(batch => <button key={batch.id} className={`btn ${selectedBatch === batch.id ? 'btn-primary' : 'btn-default'}`} onClick={() => { setSelectedBatch(batch.id); setStatusFilter(''); setPointFilter(batch.point_key) }}>📦 {batch.point_name} · {batch.delivery_date} · {batch.order_count} 单 · 待配送</button>)}
        </div>
        {!!archivedGroups.length && <div style={{ marginBottom: 12 }}><h4 style={{ margin: '8px 0' }}>已配送档案</h4>{archivedGroups.map(group => <details key={group.name} open={group.batches.some(batch => batch.id === selectedBatch)} style={{ border: '1px solid #ddd', borderRadius: 6, padding: '7px 10px', marginBottom: 6 }}><summary style={{ cursor: 'pointer', fontWeight: 600 }}>📁 {group.name} · {group.batches.length} 批</summary><div className="action-btns" style={{ flexWrap: 'wrap', paddingTop: 8 }}>{group.batches.map(batch => <button key={batch.id} className={`btn ${selectedBatch === batch.id ? 'btn-primary' : 'btn-default'}`} onClick={() => { setSelectedBatch(batch.id); setStatusFilter(''); setPointFilter('') }}>{batch.delivery_date} 送货订单 · {batch.order_count} 单</button>)}</div></details>)}</div>}
        {selectedBatch ? (() => {
          const batch = batches.find(item => item.id === selectedBatch)
          return batch && <div className="action-btns" style={{ flexWrap: 'wrap' }}><strong>{batch.point_name}｜{batch.delivery_date} 配送｜{batch.order_count} 单</strong><button className="btn btn-primary" onClick={() => openReport(batch)}>导出本次收款报告（含凭证）</button>{canManage && batch.status === 'locked' && <><button disabled={batchBusy} className="btn btn-default" onClick={() => archiveBatch(batch)}>配送完成，整批归档</button><button disabled={batchBusy} className="btn btn-default" onClick={() => unlockBatch(batch)}>解除锁定以更正</button></>}</div>
        })() : canManage && !showUnbatchedHistory && <p className="user-help">锁定新批次：先在下方选择配货服务点，再选日期。锁定后可一键导出收款报告。</p>}
      </div>
      <div className="card">
        <div className="toolbar">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索订单号、客户或电话" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">全部状态</option>
            {Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select aria-label="配货服务点" value={pointFilter} onChange={e => { setPointFilter(e.target.value); const point = deliveryPoints.find(item => String(item.id) === e.target.value); if (point?.delivery_date) setBatchDate(point.delivery_date) }}>
            <option value="">全部服务点（打印前请选择）</option>
            {pointOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          {!selectedBatch && !showUnbatchedHistory && canManage && <><label>配送日期 <input type="date" aria-label="本批配送日期" value={batchDate} onChange={e => setBatchDate(e.target.value)} /></label><button className="btn btn-primary" disabled={batchBusy} onClick={lockBatch}>锁定本批订单</button></>}
          {!showUnbatchedHistory && (!selectedBatch || batches.find(item => item.id === selectedBatch)?.status === 'locked') && <button className="btn btn-default" onClick={exportPackingList}>🖨 打印配货单</button>}
        </div>
        <table>
          <thead><tr><th>订单号</th><th>客户</th><th>电话</th><th>商品</th><th>金额</th><th>支付方式</th><th>支付状态</th><th>状态</th><th>下单时间</th><th>操作</th></tr></thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id}>
                <td>{displayOrderNo(o)}</td>
                <td>{o.customer}</td>
                <td>{o.phone}</td>
                <td style={{ maxWidth: 200 }}>{o.items?.map(i => `${i.product?.name}${i.variant ? `（${i.variant}）` : ''} x${i.quantity}`).join('，')}</td>
                <td style={{ color: '#ff4444', fontWeight: 600 }}>{orderPaymentText(o)}</td>
                <td>{paymentText[o.payment_method] || o.payment_method}</td>
                <td>
                  <span style={{ color: o.payment_status === 'confirmed' ? '#52c41a' : o.payment_status === 'paid' ? '#1890ff' : '#fa8c16', fontWeight: 500 }}>
                    {payStatusText[o.payment_status] || o.payment_status}
                  </span>
                </td>
                <td>
                  <select disabled={!canManage || !!o.delivery_batch_id} value={o.status} onChange={e => updateStatus(o.id, e.target.value)} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                    {Object.entries(statusText).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td>{o.created_at?.slice(0, 19).replace('T', ' ')}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn btn-default btn-sm" onClick={() => viewDetail(o.id)}>详情</button>
                    {canManage && !o.delivery_batch_id && (o.payment_method === 'wechat_transfer' || o.payment_method === 'alipay_transfer' || o.payment_method === 'fps_transfer') && o.payment_status !== 'confirmed' && (
                      <button className="btn btn-primary btn-sm" onClick={() => confirmPayment(o.id)}>确认收款</button>
                    )}
                    {canManage && o.delivery_batch_id && o.status === 'shipped' && <button className="btn btn-default btn-sm" onClick={() => updateStatus(o.id, 'completed')}>标记完成</button>}
                    {canManage && !o.delivery_batch_id && <button className="btn btn-danger btn-sm" onClick={() => del(o.id)}>删除</button>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: 'center', color: '#999', padding: 30 }}>暂无订单</td></tr>}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="modal-overlay" onClick={() => {if (!deliveryBusy) {requestSequence.current++;setDetail(null)}}}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>订单详情</h3><button className="modal-close" onClick={() => {if (!deliveryBusy) {requestSequence.current++;setDetail(null)}}}>×</button></div>
            <div className="modal-body">
              <div className="form-row"><label>订单号</label><div>{displayOrderNo(detail)}</div></div>
              <div className="form-inline">
                <div className="form-row"><label>收货人</label><div>{detail.customer}</div></div>
                <div className="form-row"><label>电话</label><div>{detail.phone || '—'}</div></div>
              </div>
              <div className="form-row"><label>地址</label><div>{detail.address}</div></div>
              <div className="form-row"><label>备注</label><div>{detail.remark || '无'}</div></div>
              {(detail.contact_wechat_id || detail.contact_whatsapp) && <div className="user-help">微信号：{detail.contact_wechat_id || '—'} · WhatsApp：{detail.contact_whatsapp || '—'}</div>}
              {canManage && !detail.delivery_batch_id && (editingDelivery ? <form onSubmit={saveDelivery} className="user-section">
                <h4>修改收货信息与备注</h4><p className="user-help">仅修改这笔订单，不会改变金额、收款状态、商品或自取点。</p>
                {Object.entries({customer:'收货人',phone:'联系电话',contact_wechat_id:'微信号',contact_whatsapp:'WhatsApp',address:'收货地址 / 自取说明',remark:'订单备注'}).map(([key,label]) => <div className="form-row" key={key}><label htmlFor={`order-edit-${key}`}>{label}</label>{['address','remark'].includes(key) ? <textarea id={`order-edit-${key}`} disabled={deliveryBusy} value={deliveryForm[key]} maxLength={key === 'remark' ? 1000 : 500} onChange={e => setDeliveryForm({...deliveryForm,[key]:e.target.value})} /> : <input id={`order-edit-${key}`} disabled={deliveryBusy} value={deliveryForm[key]} onChange={e => setDeliveryForm({...deliveryForm,[key]:e.target.value})} />}</div>)}
                {deliveryError && <p className="user-form-error" role="alert">{deliveryError}</p>}
                <div className="action-btns"><button className="btn btn-primary" disabled={deliveryBusy}>{deliveryBusy ? '正在保存…' : '保存收货信息与备注'}</button><button type="button" className="btn btn-default" disabled={deliveryBusy} onClick={() => setEditingDelivery(false)}>取消</button></div>
              </form> : <button className="btn btn-default" onClick={() => {setDeliveryForm(Object.fromEntries(['customer','phone','contact_wechat_id','contact_whatsapp','address','remark'].map(key => [key,detail[key] || ''])));setDeliveryError('');setEditingDelivery(true)}}>修改收货信息 / 备注</button>)}
              <div className="form-row"><label>商品明细</label>
                <div className="order-detail-items">
                  {detail.items?.map(i => (
                    <div className="order-detail-item" key={i.id}>
                      <span>{i.product?.name}{i.variant ? `（${i.variant}）` : ''} x{i.quantity}</span>
                      <span>¥{(i.price * i.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="order-detail-item"><span>商品小计</span><span>¥{detail.items?.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0).toFixed(2)}</span></div>
                  <div className="order-detail-item"><span>运费</span><span>¥{Number(detail.delivery_fee || 0).toFixed(2)}</span></div>
                  <div className="order-detail-item" style={{ borderTop: '1px solid #e8e8e8', marginTop: 8, paddingTop: 10, fontWeight: 600 }}>
                    <span>应收（含运费）</span><span style={{ color: '#ff4444' }}>{orderPaymentText(detail)}</span>
                  </div>
                  {detail.payment_currency === 'HKD' && <div className="order-detail-item"><span>人民币基准</span><span>¥{(Number(detail.total) + Number(detail.delivery_fee || 0)).toFixed(2)}</span></div>}
                </div>
              </div>

              <div className="form-inline">
                <div className="form-row"><label>支付方式</label><div>{paymentText[detail.payment_method] || detail.payment_method}</div></div>
                <div className="form-row"><label>支付状态</label><div>{payStatusText[detail.payment_status] || detail.payment_status}</div></div>
              </div>
              <div className="form-row"><label>状态</label><span className={`tag tag-${detail.status}`}>{statusText[detail.status]}</span></div>
              {detail.payment_screenshot && (
                <div className="form-row"><label>付款截图</label>
                  <div><img src={detail.payment_screenshot} alt="付款凭证" style={{ maxWidth: 300, borderRadius: 8, border: '1px solid #ddd' }} /></div>
                </div>
              )}
            </div>
            <div className="modal-footer"><button className="btn btn-default" onClick={() => {if (!deliveryBusy) {requestSequence.current++;setDetail(null)}}}>关闭</button></div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ========== 分类管理 ========== */
function CategoryManage({ categories, reload, showToast, canManage }) {
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
    const response = await authFetch(`${API}/categories/${id}`, { method: 'DELETE' })
    const data = await response.json()
    showToast(response.ok ? '删除成功' : data.error || '删除失败')
    if (response.ok) reload()
  }

  return (
    <div>
      <div className="page-header">
        <h2>分类管理</h2>
        {canManage && <button className="btn btn-primary" onClick={openAdd}>+ 新增分类</button>}
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
                <td>{canManage ? <div className="action-btns"><button className="btn btn-default btn-sm" onClick={() => openEdit(c)}>编辑</button><button className="btn btn-danger btn-sm" onClick={() => del(c.id)}>删除</button></div> : '只读'}</td>
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

function SettingsPage({ authFetch, showToast, canManage }) {
  const [rate, setRate] = useState(1.2)
  const [points, setPoints] = useState([])
  const [dates, setDates] = useState({})
  const [savingPoint, setSavingPoint] = useState(null)
  const todayHK = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10)
  useEffect(() => {
    authFetch(`${API}/admin/settings`).then(r => r.json()).then(d => setRate(d.exchange_rate || 1.2)).catch(()=>{})
    authFetch(`${API}/delivery-points`).then(r => r.json()).then(data => {
      if (!Array.isArray(data)) throw new Error('无法读取服务点')
      setPoints(data)
      setDates(Object.fromEntries(data.map(point => [point.id, point.delivery_date || ''])))
    }).catch(() => showToast('无法读取服务点，请刷新后重试'))
  }, [])
  const save = async () => {
    const r = await authFetch(`${API}/admin/settings`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exchange_rate: parseFloat(rate) }) })
    const d = await r.json()
    if (d.ok) showToast('已保存，用户端实时生效')
    else showToast('保存失败')
  }
  const saveSchedule = async (point, groupFormed) => {
    const deliveryDate = dates[point.id] || ''
    if (groupFormed && (!deliveryDate || deliveryDate < todayHK)) {
      showToast('请先选择今天或以后的配送日期')
      return
    }
    setSavingPoint(point.id)
    try {
      const response = await authFetch(`${API}/admin/delivery-schedule`, {
        method: 'POST', body: { delivery_point_id: point.id, group_formed: groupFormed, delivery_date: groupFormed ? deliveryDate : '' }
      })
      const result = await response.json()
      if (!response.ok) { showToast(result.error || '保存失败'); return }
      setPoints(previous => previous.map(item => item.id === point.id
        ? { ...item, group_formed: groupFormed ? 1 : 0, delivery_date: result.delivery_date } : item))
      showToast(groupFormed ? '已发布配送日期，顾客端即将显示' : '已恢复凑单进度')
    } catch { showToast('网络错误，请重试') }
    finally { setSavingPoint(null) }
  }
  return (
    <div>
      <h2>系统设置</h2>
      <div style={{ background: '#fff', padding: 20, borderRadius: 8, maxWidth: 500 }}>
        <h3 style={{ marginBottom: 12 }}>💱 汇率设置</h3>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>
          商品价格以人民币（CNY）录入。用户端选择港币时，自动乘以此汇率显示。<br/>
          例如：汇率 1.2 = ¥1 = HK$1.2
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ fontSize: 14 }}>1 CNY =</label>
          <input disabled={!canManage} type="number" step="0.01" value={rate} onChange={e => setRate(e.target.value)}
            style={{ width: 100, padding: 8, border: '1px solid #ddd', borderRadius: 6, fontSize: 16 }} />
          <label style={{ fontSize: 14 }}>HKD</label>
          {canManage && <button onClick={save} style={{ padding: '8px 20px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>保存</button>}
        </div>
      </div>
      <section className="delivery-schedule-settings card" aria-label="服务点配送安排">
        <h3>服务点成团与配送日期</h3>
        <p>各服务点独立设置。确认已收款的待配送订单达到该点门槛后，选择日期并发布；顾客首页的进度条会改成“已成团，将于指定日期配送”。日期过后自动恢复进度显示。具体取货时间仍请在配送公告和群里通知。</p>
        {points.map(point => {
          const active = Boolean(point.group_formed && point.delivery_date && point.delivery_date >= todayHK)
          return <div className="delivery-schedule-row" key={point.id}>
            <div className="delivery-schedule-heading"><strong>{point.name}</strong><span>{active ? `已成团 · ${point.delivery_date} 配送` : point.group_formed ? '原定日期已过 · 显示实时进度' : `凑单中 · 满 ¥${point.threshold} 起送`}</span></div>
            {canManage && <div className="delivery-schedule-actions">
              <label>配送日期（香港时间）<input type="date" min={todayHK} value={dates[point.id] || ''} onChange={event => setDates(previous => ({ ...previous, [point.id]: event.target.value }))} /></label>
              <button type="button" className="btn btn-primary" disabled={savingPoint !== null} onClick={() => saveSchedule(point, true)}>发布“已成团”</button>
              {Boolean(point.group_formed) && <button type="button" className="btn btn-default" disabled={savingPoint !== null} onClick={() => saveSchedule(point, false)}>恢复进度条</button>}
            </div>}
          </div>
        })}
      </section>
    </div>
  )
}
