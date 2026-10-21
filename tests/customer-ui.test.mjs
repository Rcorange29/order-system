import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'
import { translate } from '../src/client/i18n.js'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

test('variant and clipboard handlers are in scope at every customer component call site', () => {
  const require = createRequire(import.meta.url)
  const babel = createRequire(require.resolve('@vitejs/plugin-react'))('@babel/core')
  const ast = babel.parseSync(readFileSync(new URL('../src/client/App.jsx', import.meta.url), 'utf8'), {
    configFile: false, babelrc: false, parserOpts: { sourceType: 'module', plugins: ['jsx'] }
  })
  babel.traverse(ast, { ReferencedIdentifier(path) {
    if (['vl', 'copyText'].includes(path.node.name)) {
      assert(path.scope.hasBinding(path.node.name), `${path.node.name} is undefined at line ${path.node.loc.start.line}`)
    }
  } })
})

test('real order detail component renders variant orders in all languages without crashing', async () => {
  const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { OrderDetailPage } = await server.ssrLoadModule('/src/client/App.jsx')
    for (const lang of ['zh_CN', 'zh_HK', 'en']) {
      const label = { zh_CN: '1条', zh_HK: '1條', en: '1 pc' }[lang]
      const html = renderToStaticMarkup(React.createElement(OrderDetailPage, {
        order: { id: 1, status: 'awaiting_confirmation', payment_method: 'fps_transfer', payment_currency: 'HKD', payment_amount: 4.2, total: 3.5, items: [{ id: 1, price: 3.5, quantity: 1, variant: '1条', product: { name: '香蕉' } }] },
        pn: name => name, vl: () => label, t: (key, values) => translate(lang, key, values), statusTxt: {},
        onBack() {}, onRefresh() {}, copyText() {}, showToast() {}
      }))
      assert(html.includes(label))
      assert(html.includes('HK$4.20'))
      assert(html.includes('jennybabi1988'))
    }
  } finally { await server.close() }
})

test('payment labels name the actual selected channel for both currencies in all languages', () => {
  for (const lang of ['zh_CN', 'zh_HK', 'en']) {
    for (const currency of ['CNY', 'HKD']) {
      for (const method of ['wechat_transfer', 'alipay_transfer', 'fps_transfer']) {
        const channel = translate(lang, `payment_${method}`)
        const message = translate(lang, 'paymentSelection', { currency, method: channel })
        assert(message.includes(currency))
        assert(message.includes(channel))
        assert(!message.includes('{'))
      }
    }
  }
})
