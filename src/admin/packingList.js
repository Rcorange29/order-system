// 配货表导出：把订单列表聚合为「商品 × 自提点」矩阵 CSV（UTF-8 BOM，Excel 可直接打开）
export function buildPackingListCsv(orders, { statusFilter = '', statusText = {} } = {}) {
  const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed')
  const points = [...new Set(active.map(o => o.delivery_point_name || '未指定').filter(Boolean))]
  const map = {}
  for (const o of active) {
    const point = o.delivery_point_name || '未指定'
    for (const it of (o.items || [])) {
      const key = `${it.product?.name || '未知商品'}__${it.variant || ''}__${it.price}`
      if (!map[key]) map[key] = { name: it.product?.name || '未知商品', variant: it.variant || '', price: Number(it.price) || 0, points: {} }
      map[key].points[point] = (map[key].points[point] || 0) + (Number(it.quantity) || 1)
    }
  }
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = []
  lines.push('珍珍果菜 · 配货表')
  lines.push(`导出时间：${now}  订单数：${active.length}  状态筛选：${statusFilter ? (statusText[statusFilter] || statusFilter) : '全部'}（不含已取消/已完成）`)
  lines.push('')
  lines.push(['商品', '规格', '单价(¥)', ...points, '合计份数', '合计金额(¥)'].map(esc).join(','))
  const rows = Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
  let totalQty = 0, totalAmount = 0
  for (const r of rows) {
    let qty = 0
    const cells = points.map(p => { const q = r.points[p] || 0; qty += q; return q || '' })
    const amount = r.price * qty
    totalQty += qty; totalAmount += amount
    lines.push([r.name, r.variant, r.price.toFixed(2), ...cells, qty, amount.toFixed(2)].map(esc).join(','))
  }
  lines.push([...Array(3).fill(''), ...points.map(() => ''), totalQty, totalAmount.toFixed(2)].map(esc).join(','))
  return { csv: '\ufeff' + lines.join('\n'), rows: rows.length, points: points.length, orders: active.length }
}
