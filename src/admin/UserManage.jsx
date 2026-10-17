import { useEffect, useRef, useState } from 'react'

const fields = [['username', '用户名'], ['wechat_id', '微信ID'], ['whatsapp', 'WhatsApp'], ['phone', '手机号']]
const orderNo = order => String(order.public_no ?? order.id).padStart(2, '0')
const money = value => `¥${Number(value || 0).toFixed(2)}`
const statusNames = { pending:'待付款', awaiting_confirmation:'待确认', paid:'拼团中', shipped:'已发货', completed:'已完成', cancelled:'已取消' }

export default function UserManage({ users, authFetch, reload, showToast, onOpenOrder, adminUser, onSelfLogout }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState({})
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const sequence = useRef(0)
  useEffect(() => () => { sequence.current++ }, [])

  const close = () => { if (busy) return; sequence.current++; setSelected(null); setDetail(null); setPassword(''); setConfirmation(''); setResetting(false); setError('') }
  const open = async user => {
    const request = ++sequence.current
    setSelected(user.id); setDetail(null); setLoading(true); setError(''); setPassword(''); setConfirmation(''); setResetting(false)
    try {
      const response = await authFetch(`/api/admin/users/${user.id}`)
      const data = await response.json()
      if (request !== sequence.current) return
      if (!response.ok) throw new Error(data.error || '读取用户详情失败')
      setDetail(data); setForm(Object.fromEntries(fields.map(([key]) => [key, data.user[key] || ''])))
    } catch (error) { if (request === sequence.current) setError(error.message || '网络异常，请重试') }
    finally { if (request === sequence.current) setLoading(false) }
  }
  const save = async (action, extra) => {
    if (busy || !detail) return
    if (action === 'reset_password' && (!password || password !== confirmation)) { setError('请输入新密码，并确保两次填写一致'); return }
    setBusy(true); setError('')
    try {
      const response = await authFetch(`/api/admin/users/${detail.user.id}`, { method:'PATCH', body:{ action, ...extra } })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || '保存失败')
      const self = detail.user.username === adminUser?.username
      setPassword(''); setConfirmation(''); setResetting(false)
      if (self && data.session_revoked) { onSelfLogout(); return }
      setDetail(current => ({ ...current, user:data.user }))
      setForm(Object.fromEntries(fields.map(([key]) => [key, data.user[key] || ''])))
      showToast(action === 'reset_password' ? '密码已重置，旧登录已退出；请通过已核实的联系方式告知用户新密码' : '已保存')
      reload()
    } catch (error) { setError(error.message || '网络异常，请重试') }
    finally { setBusy(false) }
  }
  const filtered = users.filter(user => (!status || user.account_status === status) && (!search || fields.some(([key]) => String(user[key] || '').toLowerCase().includes(search.toLowerCase())) || String(user.id) === search))
  return <section>
    <div className="page-header"><h2>用户管理</h2><span>共 {users.length} 位注册用户</span></div>
    <div className="card">
      <div className="toolbar"><input aria-label="搜索用户" placeholder="用户名、微信ID、WhatsApp或手机号" value={search} onChange={e => setSearch(e.target.value)} /><select aria-label="账号状态筛选" value={status} onChange={e => setStatus(e.target.value)}><option value="">全部账号状态</option><option value="active">正常</option><option value="disabled">已停用</option></select></div>
      <p className="user-help">累计消费以人民币统计，仅计已确认收款且未取消、未退款的订单（含运费）。订单数包含所有状态。</p>
      <div className="user-table-scroll"><table><thead><tr><th>ID</th>{fields.map(([key,label]) => <th key={key}>{label}</th>)}<th>注册时间</th><th>下单笔数</th><th>累计消费 CNY</th><th>账号状态</th><th>密码</th><th>操作</th></tr></thead>
        <tbody>{filtered.map(user => <tr key={user.id}><td>{user.id}</td>{fields.map(([key]) => <td key={key}>{user[key] || '—'}</td>)}<td>{user.created_at}</td><td>{user.order_count}</td><td>{money(user.total_spent)}</td><td><span className={`tag ${user.account_status === 'disabled' ? 'tag-cancelled' : 'tag-completed'}`}>{user.account_status === 'disabled' ? '已停用' : '正常'}</span>{!!user.is_admin && <small> 管理员</small>}</td><td>{user.has_password ? '已设置' : '未设置'}</td><td><button className="btn btn-default btn-sm" onClick={() => open(user)}>管理 / 订单</button></td></tr>)}</tbody>
      </table>{!filtered.length && <p className="user-help">没有匹配的用户。</p>}</div>
    </div>
    {selected !== null && <div className="modal-overlay" onClick={close}><section className="modal user-manage-modal" role="dialog" aria-modal="true" aria-label="用户详情" onClick={e => e.stopPropagation()}>
      <div className="modal-header"><h3>用户详情{detail ? ` · ${detail.user.username}` : ''}</h3><button className="modal-close" aria-label="关闭用户详情" disabled={busy} onClick={close}>×</button></div>
      <div className="modal-body">
        {loading && <p role="status">正在读取用户和订单…</p>}
        {error && <p className="user-form-error" role="alert">{error}</p>}
        {!loading && !detail && <button className="btn btn-default" onClick={() => open({id:selected})}>重新读取</button>}
        {detail && <>
          <div className="user-summary"><span>下单 <strong>{detail.user.order_count}</strong> 笔</span><span>累计消费 <strong>{money(detail.user.total_spent)} CNY</strong></span><span>注册：{detail.user.created_at}</span></div>
          <p className="user-help">登录用户名：<strong>{detail.user.username}</strong>。联系方式与登录身份分开；改用户名后，请通知顾客使用新用户名重新登录。</p>
          <form onSubmit={e => {e.preventDefault();save('profile',form)}}>
            <fieldset disabled={busy} className="user-fieldset"><legend>账号和联系方式</legend>
              {fields.map(([key,label]) => <div className="form-row" key={key}><label htmlFor={`user-${key}`}>{label}</label><input id={`user-${key}`} autoComplete="off" value={form[key] || ''} readOnly={key === 'username' && detail.user.username === 'jchengat'} maxLength={key === 'username' ? 40 : key === 'wechat_id' ? 20 : 32} onChange={e => setForm({...form,[key]:e.target.value})} placeholder={key === 'wechat_id' ? '微信号，非微信昵称' : key === 'whatsapp' || key === 'phone' ? '+852 91234567 或 +86 13800138000' : '用户名'} /></div>)}
              <p className="user-help">至少填写一项联系方式。号码和微信ID仅检查格式，不代表已验证归属。顾客使用用户名和密码登录，英文字母不区分大小写。修改联系方式不会更改登录用户名；修改用户名会使旧登录失效。历史订单的收货信息需在对应订单单独修改。</p>
              <button className="btn btn-primary" type="submit">{busy ? '正在保存…' : '保存账号与联系方式'}</button>
            </fieldset>
          </form>
          <div className="user-section"><h4>密码与账号状态</h4><p>密码：{detail.user.has_password ? '已设置' : '未设置'}。只保存哈希，无法查看原密码。</p>
            {!resetting ? <button className="btn btn-default" disabled={busy} onClick={() => {setResetting(true);setError('')}}>重置密码</button> : <form onSubmit={e => {e.preventDefault();save('reset_password',{new_password:password})}}>
              <p className="user-help">请先通过已有联系方式核实身份。重置后该账号旧登录立即失效；重置自己的密码会退出后台。</p>
              <div className="form-row"><label htmlFor="user-new-password">设置新密码</label><input id="user-new-password" type="password" autoComplete="new-password" value={password} maxLength={128} disabled={busy} onChange={e => setPassword(e.target.value)} /></div>
              <div className="form-row"><label htmlFor="user-confirm-password">再次输入新密码</label><input id="user-confirm-password" type="password" autoComplete="new-password" value={confirmation} maxLength={128} disabled={busy} onChange={e => setConfirmation(e.target.value)} /></div>
              <div className="action-btns"><button className="btn btn-primary" disabled={busy || !password || password !== confirmation}>确认重置密码</button><button type="button" className="btn btn-default" disabled={busy} onClick={() => {setResetting(false);setPassword('');setConfirmation('')}}>取消</button></div>
            </form>}
            <p className="user-help">停用会立即退出该用户的现有登录，并禁止继续下单；重新启用后需要登录。订单与付款记录保留。</p>
            <button className={`btn ${detail.user.account_status === 'disabled' ? 'btn-default' : 'btn-danger'}`} disabled={busy || !!detail.user.is_admin} onClick={() => {
              const next=detail.user.account_status === 'disabled' ? 'active' : 'disabled'
              if(window.confirm(`确定${next === 'disabled' ? '停用' : '启用'} ${detail.user.username}？`))save('status',{account_status:next})
            }}>{detail.user.account_status === 'disabled' ? '启用账号' : '停用账号'}</button>{!!detail.user.is_admin && <p className="user-help">管理员账号不可在此停用；jchengat 的权限和账号名受保护。</p>}
          </div>
          <div className="user-section"><h4>全部订单 · {detail.orders.length} 笔</h4>{detail.orders.length ? detail.orders.map(order => <div className="user-order-row" key={order.id}><div><strong>订单 {orderNo(order)}</strong><p>{statusNames[order.status] || order.status} · {order.created_at}</p><p>人民币合计 {money(Number(order.total)+Number(order.delivery_fee || 0))}</p></div><button className="btn btn-default btn-sm" disabled={busy} onClick={() => {close();onOpenOrder(order.id)}}>订单详情 / 修改收货信息</button></div>) : <p className="user-help">该用户暂未下单。</p>}</div>
        </>}
      </div><div className="modal-footer"><button className="btn btn-default" disabled={busy} onClick={close}>关闭</button></div>
    </section></div>}
  </section>
}
