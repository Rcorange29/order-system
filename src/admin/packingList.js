// 配货单生成：可打印 HTML。每个订单一个大格子（order-block），该订单全部商品在格子内列出，
// 按自提点分组排序。员工照着格子一单单捡货，不会漏也不会拆散。
export function buildPackingListHtml(orders, { statusFilter = '', statusText = {} } = {}) {
  const active = orders.filter(o => o.status !== 'cancelled' && o.status !== 'completed')
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const displayOrderNo = order => String(order?.public_no ?? order?.id ?? '').padStart(2, '0')

  // 按自提点 → 订单号 排序，让同一个点的单子排在一起
  const sorted = [...active].sort((a, b) =>
    (a.delivery_point_name || '未指定').localeCompare(b.delivery_point_name || '未指定', 'zh-Hans-CN')
    || displayOrderNo(a).localeCompare(displayOrderNo(b)))

  let grandQty = 0, grandAmount = 0
  let lastPoint = null
  const blocks = []
  for (const o of sorted) {
    const items = o.items || []
    const orderNo = displayOrderNo(o)
    const point = o.delivery_point_name || '未指定'
    const orderQty = items.reduce((s, it) => s + (Number(it.quantity) || 1), 0)
    const orderAmount = items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0)
    grandQty += orderQty
    grandAmount += orderAmount

    if (point !== lastPoint) {
      blocks.push(`<div class="point-head">📍 自提点：${esc(point)}</div>`)
      lastPoint = point
    }
    const itemRows = items.map(it => {
      const qty = Number(it.quantity) || 1
      const price = Number(it.price) || 0
      return `<tr><td>${esc(it.product?.name || '未知商品')}${it.variant ? `<span class="variant">（${esc(it.variant)}）</span>` : ''}</td><td class="num">${qty}</td><td class="num">${price.toFixed(2)}</td><td class="num">${(price * qty).toFixed(2)}</td></tr>`
    }).join('')
    blocks.push(`<div class="order-block">
  <div class="order-head">订单 ${esc(orderNo)} · ${esc(o.customer || '')} · ${esc(o.phone || '')} · ${esc(point)}${o.remark ? `<span class="remark">备注：${esc(o.remark)}</span>` : ''}</div>
  <table>
    <thead><tr><th>商品</th><th>数量</th><th>单价(¥)</th><th>小计(¥)</th></tr></thead>
    <tbody>${itemRows || '<tr><td colspan="4" class="empty">（无商品）</td></tr>'}</tbody>
  </table>
  <div class="order-total">共 ${orderQty} 份 · 合计 ¥${orderAmount.toFixed(2)}</div>
</div>`)
  }

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>珍珍果菜 · 配货单</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 16px; color: #222; }
  .sheet-header { text-align: center; margin-bottom: 12px; }
  .sheet-header h1 { font-size: 22px; margin: 0 0 4px; }
  .sheet-header .meta { color: #666; font-size: 13px; }
  .point-head { font-size: 15px; font-weight: 700; margin: 14px 0 6px; padding: 4px 8px; background: #333; color: #fff; border-radius: 6px; }
  .order-block { border: 2px solid #333; border-radius: 10px; padding: 10px 12px; margin-bottom: 12px; background: #fdfcf7; page-break-inside: avoid; }
  .order-head { font-weight: 700; font-size: 14px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
  .order-head .remark { font-weight: 400; color: #c0392b; margin-left: 8px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #bbb; padding: 4px 8px; text-align: left; font-size: 13px; }
  th { background: #eee; }
  .num { text-align: right; white-space: nowrap; }
  .variant { color: #666; font-weight: 400; }
  .empty { text-align: center; color: #999; }
  .order-total { text-align: right; font-weight: 700; margin-top: 6px; font-size: 14px; }
  .grand-total { text-align: center; font-weight: 700; font-size: 15px; margin-top: 10px; padding: 8px; border: 2px dashed #333; border-radius: 8px; }
  @media print { .no-print { display: none; } body { margin: 8px; } }
</style></head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:10px;color:#888;font-size:12px">按 Ctrl/Cmd + P 打印，或另存为 PDF</div>
  <div class="sheet-header">
    <h1>珍珍果菜 · 配货单</h1>
    <div class="meta">导出时间：${esc(now)} · 订单数：${active.length} · 状态：${esc(statusFilter ? (statusText[statusFilter] || statusFilter) : '全部')}（不含已取消/已完成）</div>
  </div>
  ${blocks.join('\n')}
  <div class="grand-total">总计：${grandQty} 份 · ¥${grandAmount.toFixed(2)}（${active.length} 单）</div>
</body></html>`
}
