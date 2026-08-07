// Vercel serverless function: GET /api/image?url=<encoded Storage URL>
//
// Same-origin proxy for Firebase Storage images so the browser can draw them
// onto a canvas and export a PNG. Loading a Storage URL directly into an
// <img> requires CORS headers on the bucket; without them the load fails (or
// taints the canvas so toDataURL throws), which is what broke smart template
// previews and downloads. Fetching through this endpoint makes the bytes
// same-origin, so no bucket configuration is needed.
//
// Only Google/Firebase Storage hosts are proxied — this must never become an
// open relay that can be pointed at arbitrary URLs.

const ALLOWED_HOSTS = new Set([
  'firebasestorage.googleapis.com',
  'storage.googleapis.com',
  'storage.cloud.google.com',
])

const ALLOWED_SUFFIXES = ['.firebasestorage.app', '.appspot.com']

// 25 MB — comfortably above any background image, well below the point where
// buffering the response becomes a problem.
const MAX_BYTES = 25 * 1024 * 1024

function isAllowed(target) {
  if (target.protocol !== 'https:') return false
  const host = target.hostname.toLowerCase()
  if (ALLOWED_HOSTS.has(host)) return true
  return ALLOWED_SUFFIXES.some((suffix) => host.endsWith(suffix))
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const raw = req.query?.url ?? new URL(req.url, 'http://localhost').searchParams.get('url')
  if (!raw) return res.status(400).json({ error: 'Missing url parameter' })

  let target
  try {
    target = new URL(Array.isArray(raw) ? raw[0] : raw)
  } catch {
    return res.status(400).json({ error: 'Invalid url parameter' })
  }
  if (!isAllowed(target)) {
    return res.status(403).json({ error: 'Only Firebase Storage URLs can be proxied' })
  }

  try {
    // `redirect: 'error'` keeps the allowlist meaningful: an upstream redirect
    // can't be used to walk this proxy onto a host we didn't approve.
    const upstream = await fetch(target.toString(), { redirect: 'error' })
    if (!upstream.ok) {
      return res.status(upstream.status === 404 ? 404 : 502).json({ error: 'Could not fetch image' })
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    if (!contentType.startsWith('image/')) {
      return res.status(415).json({ error: 'Proxied URL is not an image' })
    }

    const buffer = Buffer.from(await upstream.arrayBuffer())
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'Image is too large to proxy' })
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', String(buffer.length))
    // Storage download URLs carry an immutable token, so they're safe to cache.
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    return res.status(200).send(req.method === 'HEAD' ? undefined : buffer)
  } catch {
    return res.status(502).json({ error: 'Could not fetch image' })
  }
}
