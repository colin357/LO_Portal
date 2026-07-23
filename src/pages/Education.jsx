import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { toEmbedUrl } from '../lib/video'
import { IconFile } from '../components/Icons'

function VideoCard({ video, done, onToggle }) {
  const embed = toEmbedUrl(video.url)
  return (
    <div className="card video-card">
      {embed ? (
        <div className="video-frame">
          <iframe
            src={embed}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : (
        <a href={video.url} target="_blank" rel="noreferrer" className="video-link">Watch video ↗</a>
      )}
      <div className="video-card-body">
        <h3>{video.title}</h3>
        {video.description && <p className="muted">{video.description}</p>}
        {onToggle && (
          <button
            className={done ? 'btn ghost' : 'btn'}
            onClick={() => onToggle(video.id, !done)}
          >
            {done ? '↩ Move to not started' : '✓ Mark as completed'}
          </button>
        )}
      </div>
    </div>
  )
}

function DocumentCard({ document }) {
  return (
    <div className="card doc-card">
      <span className="doc-icon"><IconFile size={26} /></span>
      <div className="doc-body">
        <h3>{document.title}</h3>
        {document.description && <p className="muted">{document.description}</p>}
      </div>
      <a className="btn ghost small" href={document.fileUrl} target="_blank" rel="noreferrer" download>
        Download{document.ext ? ` ${document.ext}` : ''}
      </a>
    </div>
  )
}

export default function Education() {
  const { user, profile, refreshProfile } = useAuth()
  const [videos, setVideos] = useState([])
  const [documents, setDocuments] = useState([])
  const [lo, setLo] = useState(null)
  const [loading, setLoading] = useState(true)

  const isAgent = profile?.role === 'agent'
  const loId = profile?.role === 'lo' ? profile.id : profile?.loId
  const completedIds = profile?.completedVideoIds || []

  useEffect(() => {
    if (!loId) { setLoading(false); return }
    const load = async () => {
      const [videoSnap, docSnap, loSnap] = await Promise.all([
        getDocs(query(collection(db, 'videos'), where('loId', '==', loId), orderBy('order'))),
        getDocs(query(collection(db, 'documents'), where('loId', '==', loId), orderBy('order'))),
        getDoc(doc(db, 'users', loId)),
      ])
      setVideos(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setDocuments(docSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      if (loSnap.exists()) setLo(loSnap.data())
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [loId])

  const toggleComplete = async (videoId, done) => {
    await updateDoc(doc(db, 'users', user.uid), {
      completedVideoIds: done ? arrayUnion(videoId) : arrayRemove(videoId),
    })
    await refreshProfile()
  }

  if (loading) return <div className="page-loading">Loading…</div>

  const notStarted = videos.filter((v) => !completedIds.includes(v.id))
  const completed = videos.filter((v) => completedIds.includes(v.id))
  const nothing = videos.length === 0 && documents.length === 0

  return (
    <div>
      <div className="page-header">
        <p className="muted">
          {lo?.name
            ? `Training and resources from your loan officer, ${lo.name} — loan programs, how to refer clients, and what makes working together different.`
            : 'Videos and resource documents to help you grow your business.'}
        </p>
      </div>

      {nothing && (
        <div className="empty">Nothing has been posted yet. Check back soon!</div>
      )}

      {/* --- Videos --- */}
      {videos.length > 0 && (
        <>
          <div className="section-title"><h2>Videos</h2></div>
          {!isAgent ? (
            <div className="video-grid">
              {videos.map((v) => <VideoCard key={v.id} video={v} />)}
            </div>
          ) : (
            <div className="video-columns">
              <section>
                <div className="column-header">
                  <h2>Not started</h2>
                  <span className="count-badge">{notStarted.length}</span>
                </div>
                {notStarted.length === 0 && (
                  <div className="empty small">You're all caught up. Nice work! 🎉</div>
                )}
                {notStarted.map((v) => (
                  <VideoCard key={v.id} video={v} done={false} onToggle={toggleComplete} />
                ))}
              </section>
              <section>
                <div className="column-header">
                  <h2>Completed</h2>
                  <span className="count-badge done">{completed.length}</span>
                </div>
                {completed.length === 0 && (
                  <div className="empty small">Videos you finish will appear here.</div>
                )}
                {completed.map((v) => (
                  <VideoCard key={v.id} video={v} done onToggle={toggleComplete} />
                ))}
              </section>
            </div>
          )}
        </>
      )}

      {/* --- Documents --- */}
      {documents.length > 0 && (
        <>
          <div className="section-title" style={{ marginTop: '2rem' }}>
            <h2>Resource documents</h2>
            <span className="count-badge">{documents.length}</span>
          </div>
          <div className="doc-grid">
            {documents.map((d) => <DocumentCard key={d.id} document={d} />)}
          </div>
        </>
      )}
    </div>
  )
}
