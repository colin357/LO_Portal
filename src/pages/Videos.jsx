import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { toEmbedUrl } from '../lib/video'

export default function Videos() {
  const { profile } = useAuth()
  const [videos, setVideos] = useState([])
  const [lo, setLo] = useState(null)
  const [loading, setLoading] = useState(true)

  const loId = profile?.role === 'lo' ? profile.id : profile?.loId

  useEffect(() => {
    if (!loId) { setLoading(false); return }
    const load = async () => {
      const [videoSnap, loSnap] = await Promise.all([
        getDocs(query(collection(db, 'videos'), where('loId', '==', loId), orderBy('order'))),
        getDoc(doc(db, 'users', loId)),
      ])
      setVideos(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      if (loSnap.exists()) setLo(loSnap.data())
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [loId])

  if (loading) return <div className="page-loading">Loading…</div>

  return (
    <div>
      <h1>Welcome{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!</h1>
      {lo && (
        <p className="muted">
          Videos from your loan officer{lo.name ? `, ${lo.name}` : ''} — loan programs, how to refer
          clients, and what makes working together different.
        </p>
      )}
      {videos.length === 0 && (
        <div className="empty">No videos have been posted yet. Check back soon!</div>
      )}
      <div className="video-grid">
        {videos.map((v) => {
          const embed = toEmbedUrl(v.url)
          return (
            <div className="card" key={v.id}>
              {embed ? (
                <div className="video-frame">
                  <iframe
                    src={embed}
                    title={v.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <a href={v.url} target="_blank" rel="noreferrer" className="video-link">Watch video ↗</a>
              )}
              <h3>{v.title}</h3>
              {v.description && <p className="muted">{v.description}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
