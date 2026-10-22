// 配货表导出：逐单明细 CSV（UTF-8 BOM，Excel 可直接打开）
// 结构：每个订单一个区块 —— 订单信息一行、订单内每个商品一行、末尾本单合计一行。
// 员工按订单号一单一单拿货，商品逐行列出，不容易漏。
export function buildPackingListCsv(orders, { statusFilter = '', statusText = {} } = {}) {
  const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed')
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const displayOrderNo = order => String(order?.public_no ?? order?.id ?? '').padStart(2, '0')
  const lines = []
  lines.push('珍珍果菜 · 配货表（逐单明细）')
  lines.push(`导出时间：${now}  订单数：${active.length}  状态筛选：${statusFilter ? (statusText[statusFilter] || statusFilter) : '全部'}（不含已取消/已完成）`)
  lines.push('')
  lines.push(['订单号', '客户', '电话', '自提点', '商品', '规格', '数量', '单价(¥)', '小计(¥)', '备注'].map(esc).join(','))

  let grandTotalQty = 0, grandTotalAmount = 0
  for (const o of active) {
    const items = o.items || []
    const orderNo = displayOrderNo(o)
    let remark = o.remark || ''
    for (const it of items) {
      const qty = Number(it.quantity) || 1
      const price = Number(it.price) || 0
      grandTotalQty += qty
      grandTotalAmount += price * qty
      lines.push([
        orderNo, o.customer || '', o.phone || '', o.delivery_point_name || '未指定',
        it.product?.name || '未知商品', it.variant || '', qty, price.toFixed(2), (price * qty).toFixed(2), remark,
      ].map(esc).join(','))
      remark = '' // 备注只显示在该单第一个商品行，避免重复
    }
    const orderQty = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)
    const orderAmount = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)
    lines.push([`${orderNo} 合计`, '', '', '', '', '', orderQty, '', orderAmount.toFixed(2), ''].map(esc).join(','))
    lines.push('')
  }
  lines.push(['总计', '', '', '', '', '', grandTotalQty, '', grandTotalAmount.toFixed(2), ''].map(esc).join(','))
  return { csv: '\ufeff' + lines.join('\n'), orders: active.length, itemRows: grandTotalQty > 0 ? active.reduce((s, o) => s + (o.items || []).length, 0) : 0 }
}
