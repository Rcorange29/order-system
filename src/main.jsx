import React from 'react'
import ReactDOM from 'react-dom/client'

const path = window.location.pathname

async function bootstrap() {
  if (window.location.hostname === 'admin.jennyfresh.com' || path.startsWith('/admin')) {
    document.title = '珍珍优质果菜 · 管理后台'
    await import('./admin.css')
    const { default: AdminApp } = await import('./admin/App.jsx')
    ReactDOM.createRoot(document.getElementById('root')).render(<AdminApp />)
  } else {
    document.title = '珍珍优质果菜'
    await import('./client.css')
    const { default: ClientApp } = await import('./client/App.jsx')
    ReactDOM.createRoot(document.getElementById('root')).render(<ClientApp />)
  }
}

bootstrap()
