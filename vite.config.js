import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * Dev-only: serve the serverless functions in /api (which Vercel runs in production)
 * from the Vite dev server, so `npm run dev` works end-to-end.
 */
function apiDevServer(env) {
  return {
    name: 'neuralfeed-api-dev',
    apply: 'serve',
    configureServer(server) {
      // server-side keys from .env for the handlers (never exposed to the browser bundle)
      for (const [k, v] of Object.entries(env)) if (!(k in process.env)) process.env[k] = v
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0]
        if (path !== '/api/ask') return next()
        try {
          const mod = await server.ssrLoadModule('/api/ask.js')
          await mod.default(req, res)
        } catch (e) {
          server.config.logger.error(`[api] ${e.stack || e.message}`)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Dev API error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), apiDevServer(env)],
    // NEXT_PUBLIC_* = public vars created by the Vercel Supabase integration (URL + anon key only)
    envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  }
})
