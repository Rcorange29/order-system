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
    const rows = (order.items || []).map(item => `<tr><td><span class="item-check" aria-hidden="true"></span>${esc(item.product?.name || '未知商品')}${item.variant ? `<span class="variant">（${esc(item.variant)}）</span>` : ''}</td><td class="num">×${esc(item.quantity)}</td></tr>`).join('')
    return `<div class="order-block">
  <div class="order-head"><span class="check-box" aria-hidden="true"></span><strong>订单 ${esc(displayOrderNo(order))}</strong><span class="contact">— ${contact(order)}</span></div>
  ${order.remark?.trim() ? `<div class="order-remark"><strong>顾客备注：</strong>${esc(order.remark.trim())}</div>` : ''}
  <table><thead><tr><th>商品及规格</th><th class="num">数量</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="2" class="empty">（无商品）</td></tr>'}</tbody></table>
</div>`
  })

  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(pointName)}${displayDate ? ` · ${displayDate}` : ''}配货单</title>
<style>
  body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; max-width: 170mm; margin: 18px auto; padding: 0 8px; color: #222; }
  .sheet-header { text-align: center; margin-bottom: 10px; }
  .sheet-header h1 { font-size: 19px; margin: 0 0 3px; }
  .sheet-header .meta { color: #666; font-size: 11px; }
  .staff-note { border: 1px solid #777; border-radius: 5px; padding: 7px 9px; margin-bottom: 10px; break-inside: avoid; page-break-inside: avoid; }
  .staff-note-title { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
  .staff-note-input { min-height: 38px; font-size: 13px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; outline: none; }
  .staff-note-input:empty::before { content: attr(data-placeholder); color: #888; }
  .staff-note-hint { color: #777; font-size: 11px; margin-top: 4px; }
  .order-block { border: 1px solid #555; border-radius: 5px; padding: 7px 9px; margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
  .order-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 14px; margin-bottom: 5px; }
  .check-box { display: inline-block; width: 15px; height: 15px; border: 1.5px solid #333; flex: none; }
  .contact { font-size: 12px; overflow-wrap: anywhere; }
  .order-remark { border-left: 3px solid #555; background: #f3f3f3; margin: 0 0 6px; padding: 5px 7px; font-size: 12px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border-top: 1px solid #ddd; padding: 4px 6px; text-align: left; font-size: 13px; line-height: 1.35; }
  th { background: #f4f4f4; }
  tbody tr:nth-child(even) { background: #fafafa; }
  .item-check { display: inline-block; width: 12px; height: 12px; border: 1px solid #777; margin-right: 7px; vertical-align: -1px; }
  .num { text-align: center; white-space: nowrap; width: 58px; font-weight: 700; font-size: 14px; border-left: 1px solid #e5e5e5; }
  .variant { color: #555; }
  .empty { color: #888; text-align: center; }
  @page { size: A4 portrait; margin: 10mm; }
  @media print { .no-print, .staff-note-hint, .staff-note[data-empty="true"] { display: none; } .staff-note-input:empty::before { content: ''; } body { max-width: 170mm; margin: 0 auto; padding: 0; } }
</style></head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:10px;color:#888;font-size:12px">按 Ctrl/Cmd + P 打印，或另存为 PDF</div>
  <div class="sheet-header"><h1>${esc(pointName)}${displayDate ? `｜${esc(displayDate)}` : ''}配货单｜共 ${active.length} 单</h1>
    <div class="meta">仅含已确认收款、尚待配送的订单 · 生成时间 ${esc(now)}</div></div>
  <section class="staff-note" data-empty="true"><div class="staff-note-title">注意事项</div>
    <div class="staff-note-input" contenteditable="plaintext-only" role="textbox" aria-label="注意事项" data-placeholder="在这里输入本次配货的注意事项"></div>
    <div class="staff-note-hint">有内容时会随打印或 PDF 一起显示；未填写则不打印。重新打开配货单后此处为空。</div>
  </section>
  ${blocks.join('\n')}
  <script>
    (() => {
      const note = document.querySelector('.staff-note')
      const input = note.querySelector('.staff-note-input')
      const sync = () => { note.dataset.empty = input.textContent.trim() ? 'false' : 'true' }
      input.addEventListener('input', sync)
      window.addEventListener('beforeprint', sync)
      sync()
    })()
  </script>
</body></html>`
}
