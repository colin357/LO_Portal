import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Templates() {
  const { profile } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const loId = profile?.role === 'lo' ? profile.id : profile?.loId
  const profileComplete = profile?.role === 'lo' || (profile?.headshotUrl && profile?.logoUrl)

  useEffect(() => {
    if (!loId) { setLoading(false); return }
    getDocs(query(collection(db, 'templates'), where('loId', '==', loId), orderBy('createdAt', 'desc')))
      .then((snap) => setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .finally(() => setLoading(false))
  }, [loId])

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div>
      <h1>Marketing Templates</h1>
      <p className="muted">New templates are added every week. Download and share them with your branding.</p>
      {!profileComplete && (
        <div className="notice">
          Tip: <Link to="/profile">upload your headshot and logo</Link> so content can be generated
          with your branding.
        </div>
      )}
      {templates.length === 0 && (
        <div className="empty">No templates yet — check back next week!</div>
      )}
      <div className="template-grid">
        {templates.map((t) => (
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
        ))}
      </div>
    </div>
  )
}
