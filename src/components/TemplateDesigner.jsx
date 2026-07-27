import { useEffect, useRef, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { renderTemplate, defaultLayer, TEXT_FIELDS, SAMPLE_AGENT } from '../lib/canvasRender'

// Visual designer for "smart" templates: upload a background image, then
// position headshot / logo / text layers on it. Agents get the same layout
// rendered with their own profile data.
export default function TemplateDesigner({ loId, broadcastLoIds = null, onSaved }) {
  const { user } = useAuth()
  const targetLoId = loId || user.uid
  const [broadcast, setBroadcast] = useState(false)
  const canvasRef = useRef(null)
  const [bgFile, setBgFile] = useState(null)
  const [bgImage, setBgImage] = useState(null)
  const [template, setTemplate] = useState(null)
  const [selected, setSelected] = useState(-1)
  const [meta, setMeta] = useState({ title: '', description: '', weekOf: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const dragRef = useRef(null)

  const handleBgChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setBgFile(file)
      setBgImage(img)
      setTemplate({ width: img.naturalWidth, height: img.naturalHeight, bgUrl: '', layers: [] })
      setSelected(-1)
    }
    img.src = url
  }

  // Re-render the preview whenever the layout changes.
  useEffect(() => {
    if (!template || !bgImage || !canvasRef.current) return
    renderTemplate(template, SAMPLE_AGENT, canvasRef.current, bgImage).then(() => {
      // Outline the selected layer so it's easy to see while positioning.
      if (selected >= 0 && template.layers[selected]) {
        const l = template.layers[selected]
        const ctx = canvasRef.current.getContext('2d')
        ctx.save()
        ctx.strokeStyle = '#2563eb'
        ctx.lineWidth = Math.max(2, template.width / 300)
        ctx.setLineDash([8, 6])
        ctx.strokeRect(l.x, l.y, l.w, l.h)
        ctx.restore()
      }
    })
  }, [template, bgImage, selected])

  const addLayer = (type) => {
    const layer = defaultLayer(type, template)
    setTemplate({ ...template, layers: [...template.layers, layer] })
    setSelected(template.layers.length)
  }

  const updateLayer = (index, patch) => {
    const layers = template.layers.map((l, i) => (i === index ? { ...l, ...patch } : l))
    setTemplate({ ...template, layers })
  }

  const removeLayer = (index) => {
    setTemplate({ ...template, layers: template.layers.filter((_, i) => i !== index) })
    setSelected(-1)
  }

  const moveLayer = (index, direction) => {
    const target = index + direction
    if (target < 0 || target >= template.layers.length) return
    const layers = [...template.layers]
    ;[layers[index], layers[target]] = [layers[target], layers[index]]
    setTemplate({ ...template, layers })
    setSelected(target)
  }

  const layerLabel = (layer, index) => {
    if (layer.type === 'headshot') return 'Headshot'
    if (layer.type === 'logo') return 'Logo'
    const field = TEXT_FIELDS.find((f) => f.key === layer.field)
    return field ? field.label : 'Text'
  }

  // Map a mouse event to template-space coordinates.
  const canvasPoint = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * template.width,
      y: ((e.clientY - rect.top) / rect.height) * template.height,
    }
  }

  const handleMouseDown = (e) => {
    if (!template) return
    const p = canvasPoint(e)
    // Pick the topmost layer under the cursor.
    for (let i = template.layers.length - 1; i >= 0; i--) {
      const l = template.layers[i]
      if (p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h) {
        setSelected(i)
        dragRef.current = { index: i, dx: p.x - l.x, dy: p.y - l.y }
        return
      }
    }
    setSelected(-1)
  }

  const handleMouseMove = (e) => {
    if (!dragRef.current) return
    const p = canvasPoint(e)
    const { index, dx, dy } = dragRef.current
    updateLayer(index, { x: Math.round(p.x - dx), y: Math.round(p.y - dy) })
  }

  const handleMouseUp = () => { dragRef.current = null }

  const handleSave = async (e) => {
    e.preventDefault()
    setError('')
    if (!template.layers.length) {
      setError('Add at least one layer (headshot, logo, or text) before saving.')
      return
    }
    setBusy(true)
    try {
      // Stored under the uploader's uid to satisfy storage rules; the
      // Firestore doc's loId controls which loan officer's agents see it.
      const path = `templates/${user.uid}/${crypto.randomUUID()}-${bgFile.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, bgFile, { contentType: bgFile.type })
      const bgUrl = await getDownloadURL(storageRef)
      const targets = broadcast && broadcastLoIds?.length ? broadcastLoIds : [targetLoId]
      for (const target of targets) {
        await addDoc(collection(db, 'templates'), {
          loId: target,
          kind: 'design',
          title: meta.title.trim(),
          description: meta.description.trim(),
          weekOf: meta.weekOf,
          width: template.width,
          height: template.height,
          bgUrl,
          layers: template.layers,
          fileUrl: '',
          previewUrl: '',
          createdAt: serverTimestamp(),
        })
      }
      setBgFile(null)
      setBgImage(null)
      setTemplate(null)
      setMeta({ title: '', description: '', weekOf: '' })
      onSaved?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const sel = selected >= 0 ? template?.layers[selected] : null

  return (
    <div className="card form-card">
      <h3>Design a smart template</h3>
      <p className="muted">
        Upload a background, then place the agent's headshot, logo, and contact info on it.
        Each agent downloads a version personalized with their own branding.
      </p>
      {error && <div className="alert">{error}</div>}
      <label>Background image
        <input type="file" accept="image/*" onChange={handleBgChange} />
      </label>

      {template && (
        <>
          <div className="designer-toolbar">
            <button type="button" className="btn small" onClick={() => addLayer('headshot')}>+ Headshot</button>
            <button type="button" className="btn small" onClick={() => addLayer('logo')}>+ Logo</button>
            <button type="button" className="btn small" onClick={() => addLayer('text')}>+ Text</button>
          </div>

          <canvas
            ref={canvasRef}
            className="designer-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
          <p className="muted small-note">Click a layer to select it, drag to reposition. Shown with sample agent data.</p>

          {template.layers.length > 0 && (
            <div className="layer-list">
              <strong className="layer-list-heading">Layers</strong>
              <ul>
                {template.layers.map((layer, i) => (
                  <li key={i} className={`layer-list-item${i === selected ? ' active' : ''}`} onClick={() => setSelected(i)}>
                    <span className={`layer-type-badge ${layer.type}`}>{layer.type === 'text' ? 'T' : layer.type === 'headshot' ? 'H' : 'L'}</span>
                    <span className="layer-list-label">{layerLabel(layer, i)}</span>
                    <span className="layer-list-actions">
                      <button type="button" title="Move up (behind)" disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveLayer(i, -1) }}>&#x2191;</button>
                      <button type="button" title="Move down (in front)" disabled={i === template.layers.length - 1} onClick={(e) => { e.stopPropagation(); moveLayer(i, 1) }}>&#x2193;</button>
                      <button type="button" title="Delete layer" className="danger" onClick={(e) => { e.stopPropagation(); removeLayer(i) }}>&times;</button>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="muted small-note" style={{ margin: '0.35rem 0 0' }}>Layers render top-to-bottom. Bottom = in front.</p>
            </div>
          )}

          {sel && (
            <div className="layer-editor">
              <strong>Selected: {sel.type}</strong>
              <div className="layer-fields">
                {sel.type === 'text' && (
                  <>
                    <label>Field
                      <select value={sel.field} onChange={(e) => updateLayer(selected, { field: e.target.value })}>
                        {TEXT_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                    </label>
                    {sel.field === 'custom' && (
                      <label>Text
                        <input value={sel.text} onChange={(e) => updateLayer(selected, { text: e.target.value })} />
                      </label>
                    )}
                    <label>Font size
                      <input type="number" min="10" value={sel.fontSize} onChange={(e) => updateLayer(selected, { fontSize: Number(e.target.value) })} />
                    </label>
                    <label>Color
                      <input type="color" value={sel.color} onChange={(e) => updateLayer(selected, { color: e.target.value })} />
                    </label>
                    <label>Align
                      <select value={sel.align} onChange={(e) => updateLayer(selected, { align: e.target.value })}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    <label className="checkbox">
                      <input type="checkbox" checked={sel.bold} onChange={(e) => updateLayer(selected, { bold: e.target.checked })} /> Bold
                    </label>
                  </>
                )}
                {sel.type !== 'text' && (
                  <label className="checkbox">
                    <input type="checkbox" checked={sel.circle} onChange={(e) => updateLayer(selected, { circle: e.target.checked })} /> Circle crop
                  </label>
                )}
                <label>Width
                  <input type="number" min="10" value={sel.w} onChange={(e) => updateLayer(selected, { w: Number(e.target.value) })} />
                </label>
                <label>Height
                  <input type="number" min="10" value={sel.h} onChange={(e) => updateLayer(selected, { h: Number(e.target.value) })} />
                </label>
                <button type="button" className="link-btn danger" onClick={() => removeLayer(selected)}>Remove layer</button>
              </div>
            </div>
          )}

          <form onSubmit={handleSave}>
            <label>Title
              <input required value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} />
            </label>
            <label>Description
              <textarea value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} />
            </label>
            <label>Week of
              <input type="date" value={meta.weekOf} onChange={(e) => setMeta({ ...meta, weekOf: e.target.value })} />
            </label>
            {broadcastLoIds && (
              <label className="checkbox">
                <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
                Publish to all loan officers ({broadcastLoIds.length})
              </label>
            )}
            <button type="submit" disabled={busy}>{busy ? 'Publishing…' : 'Publish template'}</button>
          </form>
        </>
      )}
    </div>
  )
}
