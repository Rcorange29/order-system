// 每个服务点单独打印配货单；仅包括已确认收款、尚待配送的订单。
export function getPackableOrders(orders, pointId) {
  if (!pointId) return []
  return orders.filter(order => order.status === 'paid' && order.payment_status === 'confirmed'
    && (pointId === 'home' ? order.delivery_point_id == null : String(order.delivery_point_id) === String(pointId)))
}

export function buildPackingListHtml(orders, { pointId, pointName = '', deliveryDate = '' } = {}) {
  const active = getPackableOrders(orders, pointId)
  const now = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ')
  const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const displayOrderNo = order => String(order?.public_no ?? order?.id ?? '').padStart(2, '0')
  const displayDate = /^\d{4}-\d{2}-\d{2}$/.test(deliveryDate)
    ? `${Number(deliveryDate.slice(5, 7))}月${Number(deliveryDate.slice(8, 10))}日` : ''
  const contact = order => {
    const wechat = order.contact_wechat_id || order.user_wechat_id
    if (wechat) return `微信：${esc(wechat)}`
    const whatsapp = order.contact_whatsapp || order.user_whatsapp
    if (whatsapp) return `WhatsApp：${esc(whatsapp)}`
    const phone = order.phone || order.user_phone
    return phone ? `电话：${esc(phone)}` : '联系方式未填写'
  }
  const sorted = [...active].sort((a, b) => Number(a.public_no ?? a.id) - Number(b.public_no ?? b.id))
  const blocks = sorted.map(order => {
    const rows = (order.items || []).map(item => `<tr><td>${esc(item.product?.name || '未知商品')}${item.variant ? `<span class="variant">（${esc(item.variant)}）</span>` : ''}</td><td class="num">${esc(item.quantity)}</td></tr>`).join('')
    return `<div class="order-block">
  <div class="order-head"><span class="check-box" aria-hidden="true"></span><strong>订单 ${esc(displayOrderNo(order))}</strong><span class="contact">— ${contact(order)}</span></div>
  <table><thead><tr><th>商品及规格</th><th class="num">数量</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="2" class="empty">（无商品）</td></tr>'}</tbody></table>
</div>`
  })

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(pointName)}${displayDate ? ` · ${displayDate}` : ''}配货单</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; margin: 16px; color: #222; }
  .sheet-header { text-align: center; margin-bottom: 14px; }
  .sheet-header h1 { font-size: 21px; margin: 0 0 4px; }
  .sheet-header .meta { color: #666; font-size: 12px; }
  .order-block { border: 1px solid #555; border-radius: 6px; padding: 9px 11px; margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; }
  .order-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 15px; margin-bottom: 7px; }
  .check-box { display: inline-block; width: 15px; height: 15px; border: 1.5px solid #333; flex: none; }
  .contact { font-size: 13px; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-top: 1px solid #ddd; padding: 5px 7px; text-align: left; font-size: 13px; }
  th { background: #f4f4f4; }
  .num { text-align: right; white-space: nowrap; width: 72px; font-weight: 700; }
  .variant { color: #555; }
  .empty { color: #888; text-align: center; }
  @media print { .no-print { display: none; } body { margin: 8px; } }
</style></head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:10px;color:#888;font-size:12px">按 Ctrl/Cmd + P 打印，或另存为 PDF</div>
  <div class="sheet-header"><h1>${esc(pointName)}${displayDate ? `｜${esc(displayDate)}` : ''}配货单｜共 ${active.length} 单</h1>
    <div class="meta">仅含已确认收款、尚待配送的订单 · 生成时间 ${esc(now)}</div></div>
  ${blocks.join('\n')}
</body></html>`
}
