import { useEffect, useMemo, useRef, useState } from 'react'

// A dependency-free crop / zoom / pan editor. Given an image source (a File
// object URL or a remote URL), the user drags to reposition and uses the slider
// to zoom; on save we render the visible crop frame to a canvas and hand back a
// PNG Blob (PNG so logo transparency survives). Remote URLs are loaded with
// crossOrigin so the canvas isn't tainted — this needs CORS on the Storage
// bucket, which the smart-template feature already requires (see README).

const VIEWPORT = 300 // px — the long edge of the crop frame on screen
const OUT_MAX = 768 // px — the long edge of the exported image

export default function ImageCropper({ src, presets, title = 'Adjust crop', onCancel, onSave }) {
  const imgRef = useRef(null)
  const dragRef = useRef(null)
  const [nat, setNat] = useState(null) // { w, h } natural size once loaded
  const [presetIdx, setPresetIdx] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const list = presets && presets.length ? presets : [{ label: 'Square', value: 1 }]
  const rawAspect = list[Math.min(presetIdx, list.length - 1)].value
  // 'original' resolves to the image's natural aspect ratio once it's loaded.
  const aspect = rawAspect === 'original' ? (nat ? nat.w / nat.h : 1) : rawAspect

  // Crop-frame dimensions on screen for the current aspect.
  const { vw, vh } = useMemo(() => {
    if (aspect >= 1) return { vw: VIEWPORT, vh: Math.round(VIEWPORT / aspect) }
    return { vw: Math.round(VIEWPORT * aspect), vh: VIEWPORT }
  }, [aspect])

  // Load the source image (crossOrigin for remote URLs so export won't taint).
  useEffect(() => {
    const img = new Image()
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => { imgRef.current = img; setNat({ w: img.naturalWidth, h: img.naturalHeight }) }
    img.onerror = () => setError('Could not load this image.')
    img.src = src
    return () => { img.onload = null; img.onerror = null }
  }, [src])

  const baseScale = nat ? Math.max(vw / nat.w, vh / nat.h) : 1
  const displayScale = baseScale * zoom
  const dw = nat ? nat.w * displayScale : 0
  const dh = nat ? nat.h * displayScale : 0

  const clamp = (p) => ({
    x: Math.min(0, Math.max(vw - dw, p.x)),
    y: Math.min(0, Math.max(vh - dh, p.y)),
  })

  // Re-center whenever the image loads or the aspect/zoom changes so the frame
  // always stays fully covered.
  useEffect(() => {
    if (!nat) return
    setPos(clamp({ x: (vw - dw) / 2, y: (vh - dh) / 2 }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat, presetIdx, vw, vh])

  const onZoom = (nextZoom) => {
    if (!nat) return
    const oldScale = baseScale * zoom
    const newScale = baseScale * nextZoom
    // Keep the frame's center pinned to the same source point while zooming.
    const cxSrc = (vw / 2 - pos.x) / oldScale
    const cySrc = (vh / 2 - pos.y) / oldScale
    const next = { x: vw / 2 - cxSrc * newScale, y: vh / 2 - cySrc * newScale }
    setZoom(nextZoom)
    // Clamp against the new display size.
    const ndw = nat.w * newScale
    const ndh = nat.h * newScale
    setPos({
      x: Math.min(0, Math.max(vw - ndw, next.x)),
      y: Math.min(0, Math.max(vh - ndh, next.y)),
    })
  }

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragRef.current = { px: e.clientX, py: e.clientY, ox: pos.x, oy: pos.y }
  }
  const onPointerMove = (e) => {
    if (!dragRef.current) return
    const d = dragRef.current
    setPos(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }))
  }
  const onPointerUp = () => { dragRef.current = null }

  const handleSave = async () => {
    if (!imgRef.current || !nat) return
    setBusy(true)
    setError('')
    try {
      const outW = aspect >= 1 ? OUT_MAX : Math.round(OUT_MAX * aspect)
      const outH = aspect >= 1 ? Math.round(OUT_MAX / aspect) : OUT_MAX
      const canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')
      // Source rectangle currently visible inside the crop frame.
      const sx = (0 - pos.x) / displayScale
      const sy = (0 - pos.y) / displayScale
      const sW = vw / displayScale
      const sH = vh / displayScale
      ctx.drawImage(imgRef.current, sx, sy, sW, sH, 0, 0, outW, outH)
      const blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error('Export failed'))), 'image/png')
      )
      await onSave(blob)
    } catch (err) {
      console.error('Crop export failed:', err)
      setError(
        err?.name === 'SecurityError'
          ? 'Export blocked by the browser (image CORS). Re-upload the image, or set CORS on the Storage bucket.'
          : "Couldn't save the crop. Please try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="cropper-overlay" role="dialog" aria-modal="true">
      <div className="cropper-modal">
        <h3>{title}</h3>

        {list.length > 1 && (
          <div className="cropper-presets">
            {list.map((p, i) => (
              <button
                key={p.label}
                type="button"
                className={i === presetIdx ? 'tab active' : 'tab'}
                onClick={() => setPresetIdx(i)}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        <div className="cropper-stage">
          <div
            className="cropper-frame"
            style={{ width: vw, height: vh }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {nat && (
              <img
                src={src}
                alt=""
                draggable={false}
                style={{ position: 'absolute', left: pos.x, top: pos.y, width: dw, height: dh, maxWidth: 'none' }}
              />
            )}
          </div>
        </div>

        <label className="cropper-zoom">
          Zoom
          <input
            type="range" min="1" max="4" step="0.01"
            value={zoom}
            onChange={(e) => onZoom(parseFloat(e.target.value))}
            disabled={!nat}
          />
        </label>

        <p className="muted small-note">Drag the image to reposition · slide to zoom.</p>
        {error && <p className="form-error">{error}</p>}

        <div className="cropper-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="btn" onClick={handleSave} disabled={busy || !nat}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
