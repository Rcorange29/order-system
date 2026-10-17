import React from 'react'
import ReactDOM from 'react-dom/client'

const path = window.location.pathname

class StartupBoundary extends React.Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (!this.state.failed) return this.props.children
    return <main role="alert" style={{maxWidth:420,margin:'80px auto',padding:24,font:'16px/1.7 sans-serif',color:'#203b2d'}}>
      <h1 style={{fontSize:24}}>页面暂时无法显示</h1>
      <p>请重新加载。如果仍然出现此提示，请把截图发给老板，以便我们继续排查。</p>
      <button onClick={() => window.location.reload()} style={{padding:'12px 24px',fontSize:16}}>重新加载</button>
    </main>
  }
}

async function bootstrap() {
  if (window.location.hostname === 'admin.jennyfresh.com' || path.startsWith('/admin')) {
    document.title = '珍珍优质果菜 · 管理后台'
    await import('./admin.css')
    const { default: AdminApp } = await import('./admin/App.jsx')
    ReactDOM.createRoot(document.getElementById('root')).render(<StartupBoundary><AdminApp /></StartupBoundary>)
  } else {
    document.title = '珍珍优质果菜'
    await import('./client.css')
    const { default: ClientApp } = await import('./client/App.jsx')
    ReactDOM.createRoot(document.getElementById('root')).render(<StartupBoundary><ClientApp /></StartupBoundary>)
  }
}

bootstrap().catch(() => window.__showLoadError?.())
