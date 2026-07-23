import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getCountFromServer } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import { IconBook, IconLayers, IconChat, IconFile, IconVideo, IconCheck } from '../components/Icons'

export default function Home() {
  const { profile } = useAuth()
  const isAgent = profile?.role === 'agent'
  const loId = profile?.role === 'agent' ? profile.loId : profile?.id
  const [counts, setCounts] = useState({ videos: 0, documents: 0, templates: 0 })
  const completedIds = profile?.completedVideoIds || []

  useEffect(() => {
    if (!loId) return
    const load = async () => {
      const countFor = async (col) => {
        try {
          const snap = await getCountFromServer(
            query(collection(db, col), where('loId', '==', loId))
          )
          return snap.data().count
        } catch { return 0 }
      }
      const [videos, documents, templates] = await Promise.all([
        countFor('videos'), countFor('documents'), countFor('templates'),
      ])
      setCounts({ videos, documents, templates })
    }
    load()
  }, [loId])

  const firstName = profile?.name ? profile.name.split(' ')[0] : ''
  const watched = completedIds.length

  return (
    <div className="dashboard">
      <section className="hero">
        <div className="hero-content">
          <h2>Welcome back{firstName ? `, ${firstName}` : ''}! 👋</h2>
          <p>Here's what's happening with your marketing today.</p>
        </div>
      </section>

      <section className="quick-links">
        <Link to="/education" className="card quick-link">
          <span className="quick-icon blue"><IconBook /></span>
          <span>
            <strong>Education Center</strong>
            <small>Watch videos and download resource guides</small>
          </span>
        </Link>
        <Link to="/templates" className="card quick-link">
          <span className="quick-icon green"><IconLayers /></span>
          <span>
            <strong>Marketing Templates</strong>
            <small>Auto-personalized graphics with your branding</small>
          </span>
        </Link>
        <Link to="/assistant" className="card quick-link">
          <span className="quick-icon purple"><IconChat /></span>
          <span>
            <strong>Ask the AI Assistant</strong>
            <small>Loan guidelines, growing investor business & more</small>
          </span>
        </Link>
      </section>

      {isAgent && (
        <section className="mini-stats">
          <div className="card mini-stat">
            <span className="quick-icon blue"><IconVideo /></span>
            <div><strong>{counts.videos}</strong><small>videos available</small></div>
          </div>
          <div className="card mini-stat">
            <span className="quick-icon purple"><IconFile /></span>
            <div><strong>{counts.documents}</strong><small>documents to read</small></div>
          </div>
          <div className="card mini-stat">
            <span className="quick-icon green"><IconCheck /></span>
            <div><strong>{watched}</strong><small>videos completed</small></div>
          </div>
        </section>
      )}
    </div>
  )
}
