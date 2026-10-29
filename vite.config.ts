import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const token = env.VBG_API_TOKEN

  if (!token) console.warn('\n⚠️  VBG_API_TOKEN mancante in .env.local: la verifica Verified by GS1 non funzionerà.\n')

  // Come in gs1-italy-vbg-app: l'API VbG non abilita il CORS, quindi il browser chiama /api/vbg
  // e il proxy aggiunge il token lato server. In produzione si usa il Worker (VITE_VBG_BASE).
  const proxy: Record<string, ProxyOptions> = {
    '/api/vbg': {
      target: 'https://api.vbg.gs1it.org',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/vbg/, '/v2'),
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
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
    test: { environment: 'node' },
  }
})
