// Shared canvas rendering engine for "smart" templates.
//
// A smart template is a background image plus a list of layers. Image layers
// pull the agent's headshot or logo; text layers pull a field from the agent's
// profile (or fixed text). The same spec is used by the admin designer (with
// sample data) and the agent-facing download (with their real profile).

import { loadImage } from './loadImage'

export const TEXT_FIELDS = [
  { key: 'name', label: 'Agent name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'website', label: 'Website' },
  { key: 'licenseNumber', label: 'License #' },
  { key: 'custom', label: 'Fixed text' },
]

// Fonts offered for text layers. `stack` is what we hand to the canvas; the
// Google-hosted families are fetched on demand (see ensureFonts) so both the
// designer preview and the agent-side render use the real typeface.
export const FONTS = [
  { key: 'system', label: 'System sans', stack: 'system-ui, -apple-system, sans-serif' },
  { key: 'inter', label: 'Inter', stack: '"Inter", system-ui, sans-serif', google: 'Inter' },
  { key: 'montserrat', label: 'Montserrat', stack: '"Montserrat", system-ui, sans-serif', google: 'Montserrat' },
  { key: 'poppins', label: 'Poppins', stack: '"Poppins", system-ui, sans-serif', google: 'Poppins' },
  { key: 'oswald', label: 'Oswald (condensed)', stack: '"Oswald", "Arial Narrow", sans-serif', google: 'Oswald' },
  { key: 'bebas', label: 'Bebas Neue (display)', stack: '"Bebas Neue", Impact, sans-serif', google: 'Bebas Neue' },
  { key: 'playfair', label: 'Playfair Display (serif)', stack: '"Playfair Display", Georgia, serif', google: 'Playfair Display' },
  { key: 'lora', label: 'Lora (serif)', stack: '"Lora", Georgia, serif', google: 'Lora' },
  { key: 'georgia', label: 'Georgia (serif)', stack: 'Georgia, "Times New Roman", serif' },
  { key: 'courier', label: 'Courier (mono)', stack: '"Courier New", Courier, monospace' },
  { key: 'dancing', label: 'Dancing Script (script)', stack: '"Dancing Script", cursive', google: 'Dancing Script' },
]

export const DEFAULT_FONT = 'system'

export function fontStack(key) {
  return (FONTS.find((f) => f.key === key) || FONTS[0]).stack
}

// Google fonts we've already asked the browser to fetch, so repeated renders
// don't pile up <link> tags.
const requestedFonts = new Set()

function requestGoogleFont(family) {
  if (typeof document === 'undefined' || requestedFonts.has(family)) return
  requestedFonts.add(family)
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@400;700&display=swap`
  document.head.appendChild(link)
}

// Fetch every optional family up front — used by the designer so the font
// dropdown previews each option in its own typeface.
export function preloadAllFonts() {
  for (const font of FONTS) {
    if (font.google) requestGoogleFont(font.google)
  }
}

/**
 * Make sure every font used by the template's text layers is loaded before we
 * draw. Canvas silently falls back to a default face if the font isn't ready,
 * so this has to happen up front.
 */
export async function ensureFonts(template) {
  if (typeof document === 'undefined' || !document.fonts) return
  const jobs = []
  for (const layer of template?.layers || []) {
    if (layer.type !== 'text') continue
    const font = FONTS.find((f) => f.key === (layer.fontFamily || DEFAULT_FONT))
    if (!font?.google) continue
    requestGoogleFont(font.google)
    const size = layer.fontSize || 32
    for (const weight of ['400', '700']) {
      jobs.push(document.fonts.load(`${weight} ${size}px "${font.google}"`).catch(() => {}))
    }
  }
  if (jobs.length) await Promise.all(jobs)
}

export const SAMPLE_AGENT = {
  name: 'Sam Agent',
  phone: '(555) 123-4567',
  email: 'sam@example.com',
  brokerage: 'Example Realty',
  website: 'samagent.com',
  licenseNumber: 'DRE #01234567',
  headshotUrl: '',
  logoUrl: '',
}

export function defaultLayer(type, template) {
  const w = template.width
  const h = template.height
  if (type === 'headshot') {
    return { type, x: Math.round(w * 0.05), y: Math.round(h * 0.7), w: Math.round(h * 0.25), h: Math.round(h * 0.25), circle: true }
  }
  if (type === 'logo') {
    return { type, x: Math.round(w * 0.75), y: Math.round(h * 0.8), w: Math.round(w * 0.2), h: Math.round(h * 0.15), circle: false }
  }
  return {
    type: 'text',
    field: 'name',
    text: '',
    x: Math.round(w * 0.05),
    y: Math.round(h * 0.05),
    w: Math.round(w * 0.5),
    h: 60,
    fontSize: Math.max(24, Math.round(h * 0.045)),
    fontFamily: DEFAULT_FONT,
    color: '#ffffff',
    bold: true,
    align: 'left',
  }
}

// Draw an image into a box using cover-fit (fills the box, crops overflow).
function drawCover(ctx, img, x, y, w, h, circle) {
  ctx.save()
  if (circle) {
    ctx.beginPath()
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
    ctx.clip()
  } else {
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.clip()
  }
  const scale = Math.max(w / img.width, h / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

function drawPlaceholder(ctx, layer, label) {
  ctx.save()
  ctx.fillStyle = 'rgba(148, 163, 184, 0.6)'
  if (layer.circle) {
    ctx.beginPath()
    ctx.ellipse(layer.x + layer.w / 2, layer.y + layer.h / 2, layer.w / 2, layer.h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.fillRect(layer.x, layer.y, layer.w, layer.h)
  }
  ctx.fillStyle = '#334155'
  ctx.font = `600 ${Math.max(12, Math.round(layer.w / 8))}px system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, layer.x + layer.w / 2, layer.y + layer.h / 2)
  ctx.restore()
}

function layerText(layer, agent) {
  if (layer.field === 'custom') return layer.text || ''
  return agent?.[layer.field] || ''
}

function drawText(ctx, layer, agent) {
  const text = layerText(layer, agent)
  if (!text) return
  ctx.save()
  ctx.fillStyle = layer.color || '#000000'
  ctx.textBaseline = 'top'
  ctx.textAlign = layer.align || 'left'
  let size = layer.fontSize || 32
  const weight = layer.bold ? '700' : '400'
  const family = fontStack(layer.fontFamily || DEFAULT_FONT)
  // Shrink to fit the box width.
  do {
    ctx.font = `${weight} ${size}px ${family}`
    if (ctx.measureText(text).width <= layer.w || size <= 10) break
    size -= 1
  } while (size > 10)
  const tx = layer.align === 'center' ? layer.x + layer.w / 2 : layer.align === 'right' ? layer.x + layer.w : layer.x
  ctx.fillText(text, tx, layer.y)
  ctx.restore()
}

/**
 * Render a smart template onto a canvas.
 * @param template {width, height, bgUrl, layers[]}
 * @param agent    profile data (headshotUrl, logoUrl, name, phone, ...)
 * @param canvas   target canvas element
 * @param bgImage  optional pre-loaded background Image (used by the designer)
 */
export async function renderTemplate(template, agent, canvas, bgImage = null) {
  canvas.width = template.width
  canvas.height = template.height
  const ctx = canvas.getContext('2d')

  await ensureFonts(template)

  const bg = bgImage || (await loadImage(template.bgUrl))
  ctx.drawImage(bg, 0, 0, template.width, template.height)

  for (const layer of template.layers || []) {
    if (layer.type === 'headshot' || layer.type === 'logo') {
      const url = layer.type === 'headshot' ? agent?.headshotUrl : agent?.logoUrl
      if (url) {
        try {
          const img = await loadImage(url)
          drawCover(ctx, img, layer.x, layer.y, layer.w, layer.h, layer.circle)
        } catch {
          drawPlaceholder(ctx, layer, layer.type === 'headshot' ? 'Headshot' : 'Logo')
        }
      } else {
        drawPlaceholder(ctx, layer, layer.type === 'headshot' ? 'Headshot' : 'Logo')
      }
    } else if (layer.type === 'text') {
      drawText(ctx, layer, agent)
    }
  }
  return canvas
}
