import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { toEmbedUrl } from '../lib/video'

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

export default function Videos() {
  const { user, profile, refreshProfile } = useAuth()
  const [videos, setVideos] = useState([])
  const [lo, setLo] = useState(null)
  const [loading, setLoading] = useState(true)

  const isAgent = profile?.role === 'agent'
  const loId = profile?.role === 'lo' ? profile.id : profile?.loId
  const completedIds = profile?.completedVideoIds || []

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

  const toggleComplete = async (videoId, done) => {
    await updateDoc(doc(db, 'users', user.uid), {
      completedVideoIds: done ? arrayUnion(videoId) : arrayRemove(videoId),
    })
    await refreshProfile()
  }

  if (loading) return <div className="page-loading">Loading…</div>

  const notStarted = videos.filter((v) => !completedIds.includes(v.id))
  const completed = videos.filter((v) => completedIds.includes(v.id))

  return (
    <div>
      <div className="page-header">
        <h1>Welcome{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}</h1>
        {lo && (
          <p className="muted">
            Videos from your loan officer{lo.name ? `, ${lo.name}` : ''} — loan programs, how to
            refer clients, and what makes working together different.
          </p>
        )}
      </div>

      {videos.length === 0 && (
        <div className="empty">No videos have been posted yet. Check back soon!</div>
      )}

      {videos.length > 0 && !isAgent && (
        <div className="video-grid">
          {videos.map((v) => <VideoCard key={v.id} video={v} />)}
        </div>
      )}

      {videos.length > 0 && isAgent && (
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
    </div>
  )
}
