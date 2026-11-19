import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin, type ProxyOptions } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.VBG_API_TOKEN

  if (!token) console.warn('\n⚠️  VBG_API_TOKEN mancante in .env.local: la verifica Verified by GS1 non funzionerà.\n')

  // Come in gs1-italy-vbg-app: l'API VbG non abilita il CORS, quindi il browser chiama /api/vbg
  // e il proxy aggiunge il token lato server. In produzione si usa il Worker (VITE_VBG_BASE).
  // Solo POST verso gli endpoint usati da src/gs1/vbg.ts: il token non deve servire ad altro.
  const ALLOWED = /^\/api\/vbg\/(gtin|gln|sscc|grai|giai|gsrn|gdti|gcn|cpid|itip)\/$/
  const proxy: Record<string, ProxyOptions> = {
    '/api/vbg/': {
      target: 'https://api.vbg.gs1it.org',
      changeOrigin: true,
      // false → Vite risponde 404 senza inoltrare (né aggiungere il token).
      bypass: (req) => {
        const site = req.headers['sec-fetch-site']
        return req.method === 'POST' && ALLOWED.test(req.url ?? '') && (!site || site === 'same-origin') ? undefined : false
      },
      rewrite: (path) => path.replace(/^\/api\/vbg\//, '/v2/'),
      configure: (p) => {
        p.on('proxyReq', (req) => {
          req.setHeader('Authorization', `Token ${token ?? ''}`)
          req.removeHeader('cookie')
          req.removeHeader('origin')
          req.removeHeader('referer')
        })
      },
    },
  }

  return {
    base: process.env.BASE_PATH ?? '/',
    plugins: [react(), contentSecurityPolicy(env.VITE_VBG_BASE)],
    server: { proxy },
    test: { environment: 'node' },
  }
})

/**
 * Content-Security-Policy nella pagina pubblicata (GitHub Pages non permette intestazioni HTTP).
 * Solo in build: in sviluppo Vite inserisce stili in linea per l'aggiornamento a caldo.
 * - script: solo dal sito; 'wasm-unsafe-eval' serve alla GS1 Barcode Syntax Engine (WebAssembly).
 * - style: solo dal sito, senza 'unsafe-inline': React, GSAP, Lottie e three.js impostano gli stili via CSSOM,
 *   che la CSP permette (verificato con Chrome su tutte le schermate, nessuna violazione).
 * - connect: il sito e il Worker di Verified by GS1. img: le immagini dei prodotti arrivano da Verified by GS1.
 * frame-ancestors non vale in un meta: per bloccare l'inclusione in frame servono intestazioni HTTP.
 */
function contentSecurityPolicy(vbgBase?: string): Plugin {
  const vbgOrigin = vbgBase && /^https:/.test(vbgBase) ? new URL(vbgBase).origin : ''
  const policy = [
    "default-src 'self'",
    "script-src 'self' 'wasm-unsafe-eval'",
    "style-src 'self'",
    "font-src 'self'",
    "img-src 'self' data: blob: https:",
    `connect-src 'self'${vbgOrigin ? ` ${vbgOrigin}` : ''}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
    'upgrade-insecure-requests',
  ].join('; ')
  return {
    name: 'gs1-csp',
    apply: 'build',
    transformIndexHtml: () => [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }],
  }
}
