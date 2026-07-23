import { useEffect, useState } from 'react'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '../firebase'
import { AdminVideos, AdminDocuments, AdminTemplates, AdminAgents, AdminReferral } from './Admin'

const TABS = ['Videos', 'Documents', 'Templates', 'Agents', 'Referral Code']

// System-wide admin: pick any loan officer and manage their content, or
// broadcast videos/templates to every loan officer at once.
export default function SuperAdmin() {
  const [los, setLos] = useState([])
  const [selected, setSelected] = useState('')
  const [tab, setTab] = useState('Videos')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('role', '==', 'lo')))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        setLos(list)
        if (list.length) setSelected(list[0].id)
      })
      .catch((err) => {
        // Without this, any failure (most often a Firestore permission-denied
        // because the isSuper() rules haven't been deployed) was swallowed and
        // the page fell through to the misleading "No loan officers yet" empty
        // state — even when LO accounts exist.
        console.error('Failed to load loan officers:', err)
        setError(err)
      })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loading">Loading…</div>

  const loIds = los.map((l) => l.id)
  const currentLo = los.find((l) => l.id === selected)

  return (
    <div>
      <div className="page-header">
        <p className="muted">
          Manage content for any loan officer in the system, or publish to all of them at once.
        </p>
      </div>

      {error ? (
        <div className="empty">
          {error.code === 'permission-denied' ? (
            <>
              Couldn't load loan officers — Firestore denied the request. This usually means the
              latest security rules (which grant super admins read access to all users) haven't
              been deployed, or your own account isn't set to <code>role: "super"</code>. Deploy{' '}
              <code>firestore.rules</code> and confirm your user doc (see README), then reload.
            </>
          ) : (
            <>Couldn't load loan officers: {error.message || 'unknown error'}. Please reload and try again.</>
          )}
        </div>
      ) : los.length === 0 ? (
        <div className="empty">
          No loan officers yet. Create LO accounts in the Firebase console (see README), and
          they'll appear here.
        </div>
      ) : (
        <>
          <div className="card lo-picker">
            <label>Loan officer
              <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                {los.map((lo) => (
                  <option key={lo.id} value={lo.id}>
                    {lo.name || lo.email || lo.id}{lo.referralCode ? ` (${lo.referralCode})` : ''}
                  </option>
                ))}
              </select>
            </label>
            {currentLo && (
              <p className="muted">
                {currentLo.email}{currentLo.referralCode ? ` · code ${currentLo.referralCode}` : ' · no referral code yet'}
              </p>
            )}
          </div>

          <div className="tabs">
            {TABS.map((t) => (
              <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {selected && tab === 'Videos' && <AdminVideos loId={selected} broadcastLoIds={loIds} />}
          {selected && tab === 'Documents' && <AdminDocuments loId={selected} broadcastLoIds={loIds} />}
          {selected && tab === 'Templates' && <AdminTemplates loId={selected} broadcastLoIds={loIds} />}
          {selected && tab === 'Agents' && <AdminAgents loId={selected} />}
          {selected && tab === 'Referral Code' && <AdminReferral loId={selected} />}
        </>
      )}
    </div>
  )
}
