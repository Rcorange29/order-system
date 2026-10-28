const esc = value => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
const methods = { wechat_transfer: '微信转账', alipay_transfer: '支付宝转账', fps_transfer: '转数快 FPS', cash_on_delivery: '货到付款' }
const money = (cents, currency) => `${currency === 'HKD' ? 'HK$' : '¥'}${(cents / 100).toFixed(2)}`
const cents = value => Math.round(Number(value || 0) * 100)
const currencyOf = order => order.payment_currency === 'HKD' ? 'HKD' : 'CNY'
const amountOf = order => cents(order.payment_amount ?? (Number(order.total || 0) + Number(order.delivery_fee || 0)))
const numberOf = order => String(order.public_no ?? order.id).padStart(2, '0')

export function summarizeCollection(orders) {
  const totals = { CNY: 0, HKD: 0 }
  const channels = new Map()
  for (const order of orders) {
    const currency = currencyOf(order)
    const amount = amountOf(order)
    totals[currency] += amount
    const key = order.payment_method || 'unknown'
    const entry = channels.get(key) || { method: key, count: 0, CNY: 0, HKD: 0 }
    entry.count++
    entry[currency] += amount
    channels.set(key, entry)
  }
  return { totals, channels: [...channels.values()].sort((a, b) => (methods[a.method] || a.method).localeCompare(methods[b.method] || b.method)) }
}

export function buildCollectionReportHtml({ batch, orders }) {
  const summary = summarizeCollection(orders)
  const currencyText = entry => [entry.CNY ? money(entry.CNY, 'CNY') : '', entry.HKD ? money(entry.HKD, 'HKD') : ''].filter(Boolean).join(' + ') || '¥0.00'
  const receipt = value => /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value || '')
    ? `<img class="proof" src="${esc(value)}" alt="付款凭证" />` : '<span class="missing">未上传付款凭证，请人工核对</span>'
  const rows = [...orders].sort((a, b) => Number(a.public_no ?? a.id) - Number(b.public_no ?? b.id)).map(order => {
    const contact = [order.contact_wechat_id || order.user_wechat_id ? `微信 ${order.contact_wechat_id || order.user_wechat_id}` : '', order.contact_whatsapp || order.user_whatsapp ? `WhatsApp ${order.contact_whatsapp || order.user_whatsapp}` : '', order.phone || order.user_phone ? `电话 ${order.phone || order.user_phone}` : ''].filter(Boolean).join(' · ')
    const items = (order.items || []).map(item => `<li>${esc(item.product_name || '商品已删除')}${item.variant ? `（${esc(item.variant)}）` : ''} × ${esc(item.quantity)}</li>`).join('')
    return `<section class="order"><header><strong>订单 ${esc(numberOf(order))}</strong><strong>${esc(money(amountOf(order), currencyOf(order)))} ${currencyOf(order)}</strong></header>
      <div class="meta">${esc(order.customer || order.username || '未填写姓名')} · ${esc(contact || '无联系方式')} · ${esc(methods[order.payment_method] || order.payment_method || '未记录渠道')}</div>
      ${order.address ? `<div class="meta">配送/取货：${esc(order.address)}</div>` : ''}
      ${order.remark ? `<div class="meta">顾客备注：${esc(order.remark)}</div>` : ''}
      <div class="detail"><div><b>购买商品</b><ul>${items || '<li>无商品记录</li>'}</ul></div><div><b>付款凭证</b><div>${receipt(order.payment_screenshot)}</div></div></div>
    </section>`
  }).join('')
  const title = `${batch.point_name}｜${batch.delivery_date} 配送收款报告`
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
    *{box-sizing:border-box}body{font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;color:#202820;max-width:190mm;margin:16px auto;padding:0 8px;font-size:12px;line-height:1.5}
    h1{font-size:20px;margin:0 0 4px}h2{font-size:14px;margin:14px 0 7px}.sub,.meta{color:#526057}.sub{margin-bottom:14px}.summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.box{border:1px solid #cfd8d0;border-radius:5px;padding:8px 10px}.box strong{display:block;font-size:18px}.channels{width:100%;border-collapse:collapse}.channels th,.channels td{border-bottom:1px solid #d8ded9;padding:6px 7px;text-align:left}.channels th:last-child,.channels td:last-child{text-align:right}.order{border:1px solid #aebbb0;border-radius:5px;padding:9px 11px;margin:9px 0;break-inside:avoid;page-break-inside:avoid}.order header{display:flex;justify-content:space-between;gap:10px;font-size:14px;margin-bottom:4px}.detail{display:grid;grid-template-columns:1.2fr 1fr;gap:12px;border-top:1px solid #e0e5e1;margin-top:6px;padding-top:6px}.detail ul{margin:3px 0 0;padding-left:18px}.proof{max-width:100%;max-height:75mm;object-fit:contain;border:1px solid #ddd}.missing{color:#a33}.actions{margin-bottom:12px}.actions button{background:#22543d;color:#fff;border:0;border-radius:4px;padding:7px 12px;cursor:pointer} .note{font-size:11px;color:#647068;margin-top:12px}
    @page{size:A4 portrait;margin:11mm}@media print{body{max-width:none;margin:0;padding:0}.actions{display:none}.order{margin:7px 0}}
  </style></head><body><div class="actions"><button onclick="window.print()">打印 / 存为 PDF</button></div>
  <h1>${esc(title)}</h1><div class="sub">共 ${orders.length} 单 · ${batch.status === 'archived' ? '已归档' : '已锁定，待配送'} · 锁定时间 ${esc(batch.created_at)}${batch.archived_at ? ` · 归档时间 ${esc(batch.archived_at)}` : ''}</div>
  <div class="summary"><div class="box">人民币收款<strong>${money(summary.totals.CNY, 'CNY')}</strong></div><div class="box">港币收款<strong>${money(summary.totals.HKD, 'HKD')}</strong></div></div>
  <h2>各渠道收款</h2><table class="channels"><thead><tr><th>渠道</th><th>订单数</th><th>收款金额</th></tr></thead><tbody>${summary.channels.map(channel => `<tr><td>${esc(methods[channel.method] || channel.method)}</td><td>${channel.count}</td><td>${esc(currencyText(channel))}</td></tr>`).join('')}</tbody></table>
  <h2>订单与付款凭证</h2>${rows}<p class="note">金额、商品和付款凭证均为锁定批次时的记录；人民币与港币分别统计。缺少付款凭证的订单需要人工核对。</p></body></html>`
}
