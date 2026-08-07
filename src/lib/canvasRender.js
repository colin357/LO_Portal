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
  // Shrink to fit the box width.
  do {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`
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
