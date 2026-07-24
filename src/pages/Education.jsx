import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { toEmbedUrl } from '../lib/video'
import { IconFile } from '../components/Icons'
import { renderPdfThumbnail } from '../lib/pdfThumb'

function ThumbFallback() {
  return (
    <span className="doc-thumb-fallback">
      <IconFile size={40} />
      <span className="doc-thumb-badge">PDF</span>
    </span>
  )
}

// Live-renders a first-page preview from the file URL — only used for older
// documents that have no stored preview. Needs Storage CORS; falls back to an
// icon otherwise.
function PdfThumbnail({ url }) {
  const [src, setSrc] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setSrc(''); setFailed(false)
    renderPdfThumbnail(url)
      .then((d) => { if (active) setSrc(d) })
      .catch(() => { if (active) setFailed(true) })
    return () => { active = false }
  }, [url])

  if (failed) return <ThumbFallback />
  if (!src) return <span className="doc-thumb-skeleton" aria-hidden="true" />
  return <img className="doc-thumb-img" src={src} alt="" />
}

// In-portal PDF viewer: renders the file in an overlay iframe so the agent
// stays inside the app instead of being bounced to a new browser tab.
function PdfViewer({ document: docItem, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pdf-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="pdf-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pdf-modal-head">
          <h3>{docItem.title}</h3>
          <div className="pdf-modal-actions">
            <a className="btn ghost small" href={docItem.fileUrl} target="_blank" rel="noreferrer">Open in new tab</a>
            <a className="btn ghost small" href={docItem.fileUrl} download={docItem.fileName || undefined}>Download</a>
            <button type="button" className="pdf-close" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>
        <iframe className="pdf-frame" src={docItem.fileUrl} title={docItem.title} />
      </div>
    </div>
  )
}

// Sort by the `order` field client-side. Doing the ordering here (instead of in
// the Firestore query with orderBy) means the read only needs the `loId`
// equality filter — no composite index to deploy, and docs that predate the
// `order` field still show up instead of being silently dropped by the query.
const byOrder = (items) =>
  [...items].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER))

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

function DocumentCard({ document, onView }) {
  // PDFs get a first-page preview and open in an in-portal viewer; other file
  // types just show an icon and offer download.
  const isPdf = (document.ext || '').toUpperCase() === 'PDF' ||
    (document.fileName || '').toLowerCase().endsWith('.pdf')
  return (
    <div className="card doc-card">
      <button
        type="button"
        className="doc-thumb"
        onClick={() => isPdf && onView(document)}
        disabled={!isPdf}
        title={isPdf ? 'View document' : undefined}
      >
        {document.previewUrl
          ? <img className="doc-thumb-img" src={document.previewUrl} alt="" />
          : isPdf
            ? <PdfThumbnail url={document.fileUrl} />
            : <ThumbFallback />}
      </button>
      <div className="doc-body">
        <h3>{document.title}</h3>
        {document.description && <p className="muted">{document.description}</p>}
      </div>
      <div className="doc-actions">
        {isPdf && (
          <button type="button" className="btn ghost small" onClick={() => onView(document)}>
            View
          </button>
        )}
        <a className="btn ghost small" href={document.fileUrl} target="_blank" rel="noreferrer" download={document.fileName || undefined}>
          Download{document.ext ? ` ${document.ext}` : ''}
        </a>
      </div>
    </div>
  )
}

export default function Education() {
  const { user, profile, refreshProfile } = useAuth()
  const [videos, setVideos] = useState([])
  const [documents, setDocuments] = useState([])
  const [lo, setLo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewingDoc, setViewingDoc] = useState(null)

  const isAgent = profile?.role === 'agent'
  const loId = profile?.role === 'lo' ? profile.id : profile?.loId
  const completedIds = profile?.completedVideoIds || []

  useEffect(() => {
    if (!loId) { setLoading(false); return }
    const load = async () => {
      const [videoSnap, docSnap, loSnap] = await Promise.all([
        getDocs(query(collection(db, 'videos'), where('loId', '==', loId))),
        getDocs(query(collection(db, 'documents'), where('loId', '==', loId))),
        getDoc(doc(db, 'users', loId)),
      ])
      setVideos(byOrder(videoSnap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      setDocuments(byOrder(docSnap.docs.map((d) => ({ id: d.id, ...d.data() }))))
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
            {documents.map((d) => <DocumentCard key={d.id} document={d} onView={setViewingDoc} />)}
          </div>
        </>
      )}

      {viewingDoc && <PdfViewer document={viewingDoc} onClose={() => setViewingDoc(null)} />}
    </div>
  )
}
