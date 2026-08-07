// Loads an image in a form the canvas can export from (i.e. without tainting
// it, which would make toDataURL/toBlob throw).
//
// Firebase Storage URLs only load with `crossOrigin = 'anonymous'` when the
// bucket sends CORS headers. Rather than depend on that bucket-level setup,
// a failed direct load is retried through api/image.js — a same-origin proxy
// that streams the same bytes from our own deploy. Blob/data URLs are already
// local and need neither.

export function proxiedImageUrl(url) {
  return `/api/image?url=${encodeURIComponent(url)}`
}

function loadImageFrom(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    if (crossOrigin) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load image: ${src}`))
    img.src = src
  })
}

export async function loadImage(url) {
  if (!/^https?:/i.test(url)) return loadImageFrom(url, false)
  try {
    return await loadImageFrom(url, true)
  } catch (err) {
    try {
      return await loadImageFrom(proxiedImageUrl(url), false)
    } catch {
      throw err
    }
  }
}
