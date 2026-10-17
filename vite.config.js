import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { readFileSync, writeFileSync } from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    legacy({
      targets: ['Chrome >= 49', 'iOS >= 10'],
      additionalLegacyPolyfills: ['whatwg-fetch', 'url-search-params-polyfill']
    }),
    {
      name: 'wechat-classic-entry',
      apply: 'build',
      closeBundle() {
        // Use the official legacy build without module scripts in embedded WeChat.
        const html = readFileSync('dist/index.html', 'utf8')
          .replace(/<script\b(?=[^>]*\btype=["']module["'])[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/\snomodule\b/g, '')
        writeFileSync('dist/wechat.html', html)
      }
    }
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8788'
    }
  },
  build: {
    outDir: 'dist'
  }
})
