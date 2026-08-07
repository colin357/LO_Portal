import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `vite dev` doesn't run the api/ serverless functions, so the image proxy
// smart templates rely on would 404 locally. This mounts the same handler on
// the dev server behind a minimal Vercel-style req/res shim.
function devImageProxy() {
  return {
    name: 'dev-image-proxy',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/image', async (req, res, next) => {
        const { default: handler } = await import('./api/image.js')
        const url = new URL(req.originalUrl || req.url, 'http://localhost')
        req.query = Object.fromEntries(url.searchParams)
        res.status = (code) => { res.statusCode = code; return res }
        res.json = (body) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)) }
        res.send = (body) => res.end(body)
        try {
          await handler(req, res)
        } catch (err) {
          next(err)
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), devImageProxy()],
})
