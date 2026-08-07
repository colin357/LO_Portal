import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { renderTemplate, SAMPLE_AGENT } from '../lib/canvasRender'

// A smart template rendered with the viewer's own profile data.
function SmartTemplateCard({ template, agent }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    const canvas = document.createElement('canvas')
    renderTemplate(template, agent, canvas)
      .then(() => { if (!cancelled) setPreviewUrl(canvas.toDataURL('image/png')) })
      .catch(() => { if (!cancelled) setError('Preview unavailable.') })
    return () => { cancelled = true }
  }, [template, agent])

  const handleDownload = async () => {
    setBusy(true)
    try {
      // Reuse the preview bytes when we have them; otherwise render on demand
      // so a failed preview doesn't also block the download.
      let href = previewUrl
      if (!href) {
        const canvas = document.createElement('canvas')
        await renderTemplate(template, agent, canvas)
        href = canvas.toDataURL('image/png')
      }
      const a = document.createElement('a')
      a.href = href
      a.download = `${(template.title || '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'template'}.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setError('')
    } catch {
      setError('Could not generate the image. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card">
      {previewUrl
        ? <img className="template-preview" src={previewUrl} alt={template.title} />
        : <div className="template-preview loading-box">{error || 'Generating preview…'}</div>}
      <h3>{template.title}</h3>
      <p className="pill">Personalized for you</p>
      {template.weekOf && <p className="pill">Week of {template.weekOf}</p>}
      {template.description && <p className="muted">{template.description}</p>}
      <button className="btn" onClick={handleDownload} disabled={busy}>
        {busy ? 'Generating…' : 'Download PNG'}
      </button>
    </div>
  )
}

export default function Templates() {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const isLO = profile?.role === 'lo'
  const loId = isLO ? profile.id : profile?.loId
  const profileComplete = isLO || (profile?.headshotUrl && profile?.logoUrl)
  // LOs preview smart templates with sample data; agents see their own branding.
  const renderData = isLO ? SAMPLE_AGENT : profile

  useEffect(() => {
    if (!loId) { setLoading(false); return }
    getDocs(query(collection(db, 'templates'), where('loId', '==', loId)))
      .then((snap) => setTemplates(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
      ))
      .finally(() => setLoading(false))
  }, [loId])

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div>
      <p className="muted">New templates are added every week. Smart templates are automatically personalized with your headshot, logo, and contact info.</p>
      {!profileComplete && (
        <div className="notice">
          Tip: <Link to="/profile">upload your headshot and logo</Link> so smart templates render
          with your branding instead of placeholders.
        </div>
      )}
      {templates.length === 0 && (
        <div className="empty">No templates yet — check back next week!</div>
      )}
      <div className="template-grid">
        {templates.map((t) =>
          t.kind === 'design' ? (
            <SmartTemplateCard key={t.id} template={t} agent={renderData} />
          ) : (
            <div className="card" key={t.id}>
              {t.previewUrl && <img className="template-preview" src={t.previewUrl} alt={t.title} />}
              <h3>{t.title}</h3>
              {t.weekOf && <p className="pill">Week of {t.weekOf}</p>}
              {t.description && <p className="muted">{t.description}</p>}
              {t.fileUrl && (
                <a className="btn" href={t.fileUrl} target="_blank" rel="noreferrer" download>
                  Download
                </a>
              )}
            </div>
          )
        )}
      </div>
    </div>
  )
}
