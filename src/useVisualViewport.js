import { useEffect } from 'react'

// Mobile keyboards can reduce the visible viewport without changing 100vh.
export default function useVisualViewport() {
  useEffect(() => {
    const viewport = window.visualViewport
    const style = document.documentElement.style
    const sync = () => {
      style.setProperty('--app-viewport-height', `${viewport?.height ?? window.innerHeight}px`)
      style.setProperty('--app-viewport-top', `${viewport?.offsetTop ?? 0}px`)
    }
    sync()
    window.addEventListener('resize', sync)
    viewport?.addEventListener('resize', sync)
    viewport?.addEventListener('scroll', sync)
    return () => {
      window.removeEventListener('resize', sync)
      viewport?.removeEventListener('resize', sync)
      viewport?.removeEventListener('scroll', sync)
      style.removeProperty('--app-viewport-height')
      style.removeProperty('--app-viewport-top')
    }
  }, [])
}
