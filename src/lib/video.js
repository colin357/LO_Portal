// Convert a YouTube / Vimeo / Loom share URL into an embeddable iframe URL.
// Returns null for anything unrecognized so callers can fall back to a plain link.
export function toEmbedUrl(url) {
  if (!url) return null
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch' && u.searchParams.get('v')) {
        return `https://www.youtube.com/embed/${u.searchParams.get('v')}`
      }
      if (u.pathname.startsWith('/embed/')) return url
      if (u.pathname.startsWith('/shorts/')) {
        return `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`
      }
    }
    if (host === 'youtu.be') {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    }
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`
    }
    if (host === 'player.vimeo.com') return url
    if (host === 'loom.com' && u.pathname.startsWith('/share/')) {
      return `https://www.loom.com/embed/${u.pathname.split('/')[2]}`
    }
    if (host === 'loom.com' && u.pathname.startsWith('/embed/')) return url
  } catch {
    return null
  }
  return null
}
