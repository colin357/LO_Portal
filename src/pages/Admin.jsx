import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc,
  setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'
import TemplateDesigner from '../components/TemplateDesigner'

const TABS = ['Videos', 'Templates', 'Agents', 'Referral Code']

// Loan officer admin: manages their own content. The same building blocks are
// reused by the super admin page with a different target loId.
export default function Admin() {
  const { user } = useAuth()
  const [tab, setTab] = useState('Videos')
  return (
    <div>
      <div className="page-header">
        <h1>Admin</h1>
        <p className="muted">Manage your videos, weekly templates, agents, and referral code.</p>
      </div>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Videos' && <AdminVideos loId={user.uid} />}
      {tab === 'Templates' && <AdminTemplates loId={user.uid} />}
      {tab === 'Agents' && <AdminAgents loId={user.uid} />}
      {tab === 'Referral Code' && <AdminReferral loId={user.uid} />}
    </div>
  )
}

// broadcastLoIds (super admin only): when provided, the form offers a
// "publish to all loan officers" option that fans the doc out per LO.
export function AdminVideos({ loId, broadcastLoIds = null }) {
  const [videos, setVideos] = useState([])
  const [form, setForm] = useState({ title: '', description: '', url: '' })
  const [broadcast, setBroadcast] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const snap = await getDocs(query(collection(db, 'videos'), where('loId', '==', loId), orderBy('order')))
    setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }
  useEffect(() => { load() }, [loId])

  const handleAdd = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const targets = broadcast && broadcastLoIds?.length ? broadcastLoIds : [loId]
      for (const target of targets) {
        await addDoc(collection(db, 'videos'), {
          loId: target,
          title: form.title.trim(),
          description: form.description.trim(),
          url: form.url.trim(),
          order: target === loId ? videos.length : Date.now(),
          createdAt: serverTimestamp(),
        })
      }
      setForm({ title: '', description: '', url: '' })
      await load()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this video?')) return
    await deleteDoc(doc(db, 'videos', id))
    await load()
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="card form-card">
        <h3>Add a video</h3>
        <label>Title
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>Description
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label>Video URL (YouTube, Vimeo, or Loom)
          <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
        </label>
        {broadcastLoIds && (
          <label className="checkbox">
            <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
            Publish to all loan officers ({broadcastLoIds.length})
          </label>
        )}
        <button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add video'}</button>
      </form>
      <ul className="admin-list">
        {videos.map((v) => (
          <li key={v.id}>
            <span><strong>{v.title}</strong> — {v.url}</span>
            <button className="link-btn danger" onClick={() => handleDelete(v.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminTemplates({ loId, broadcastLoIds = null }) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [mode, setMode] = useState('design')
  const [form, setForm] = useState({ title: '', description: '', weekOf: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [broadcast, setBroadcast] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const snap = await getDocs(query(collection(db, 'templates'), where('loId', '==', loId), orderBy('createdAt', 'desc')))
    setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }
  useEffect(() => { load() }, [loId])

  const upload = async (f, path) => {
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, f, { contentType: f.type })
    return getDownloadURL(storageRef)
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    try {
      const stamp = Date.now()
      // Files are stored under the uploader's uid (matches storage rules);
      // the Firestore doc's loId controls who sees the template.
      const fileUrl = await upload(file, `templates/${user.uid}/${stamp}-${file.name}`)
      const previewUrl = preview
        ? await upload(preview, `templates/${user.uid}/${stamp}-preview-${preview.name}`)
        : ''
      const targets = broadcast && broadcastLoIds?.length ? broadcastLoIds : [loId]
      for (const target of targets) {
        await addDoc(collection(db, 'templates'), {
          loId: target,
          kind: 'file',
          title: form.title.trim(),
          description: form.description.trim(),
          weekOf: form.weekOf,
          fileUrl,
          previewUrl,
          createdAt: serverTimestamp(),
        })
      }
      setForm({ title: '', description: '', weekOf: '' })
      setFile(null)
      setPreview(null)
      e.target.reset()
      await load()
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return
    await deleteDoc(doc(db, 'templates', id))
    await load()
  }

  return (
    <div>
      <div className="tabs">
        <button className={mode === 'design' ? 'tab active' : 'tab'} onClick={() => setMode('design')}>
          Smart template (auto-personalized)
        </button>
        <button className={mode === 'file' ? 'tab active' : 'tab'} onClick={() => setMode('file')}>
          File download
        </button>
      </div>

      {mode === 'design' && (
        <TemplateDesigner loId={loId} broadcastLoIds={broadcastLoIds} onSaved={load} />
      )}

      {mode === 'file' && (
      <form onSubmit={handleAdd} className="card form-card">
        <h3>Upload a template file</h3>
        <label>Title
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </label>
        <label>Description
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>
        <label>Week of
          <input type="date" value={form.weekOf} onChange={(e) => setForm({ ...form, weekOf: e.target.value })} />
        </label>
        <label>Template file
          <input required type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
        <label>Preview image (optional)
          <input type="file" accept="image/*" onChange={(e) => setPreview(e.target.files?.[0] || null)} />
        </label>
        {broadcastLoIds && (
          <label className="checkbox">
            <input type="checkbox" checked={broadcast} onChange={(e) => setBroadcast(e.target.checked)} />
            Publish to all loan officers ({broadcastLoIds.length})
          </label>
        )}
        <button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Add template'}</button>
      </form>
      )}

      <ul className="admin-list">
        {templates.map((t) => (
          <li key={t.id}>
            <span>
              <strong>{t.title}</strong>
              {t.kind === 'design' && <span className="pill" style={{ marginLeft: 8 }}>smart</span>}
              {t.weekOf ? ` — week of ${t.weekOf}` : ''}
            </span>
            <button className="link-btn danger" onClick={() => handleDelete(t.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AdminAgents({ loId }) {
  const [agents, setAgents] = useState([])

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('loId', '==', loId), where('role', '==', 'agent')))
      .then((snap) => setAgents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [loId])

  return (
    <div>
      <h3>Agents ({agents.length})</h3>
      <div className="table-wrap">
        <table className="agents-table">
          <thead>
            <tr><th></th><th>Name</th><th>Email</th><th>Phone</th><th>Brokerage</th><th>Assets</th></tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td>{a.headshotUrl ? <img className="avatar" src={a.headshotUrl} alt="" /> : <span className="avatar placeholder" />}</td>
                <td>{a.name}</td>
                <td>{a.email}</td>
                <td>{a.phone}</td>
                <td>{a.brokerage}</td>
                <td>{a.headshotUrl ? '📷' : '—'} {a.logoUrl ? '🏷️' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminReferral({ loId }) {
  const { user, refreshProfile } = useAuth()
  const [code, setCode] = useState('')
  const [savedCode, setSavedCode] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    getDoc(doc(db, 'users', loId)).then((snap) => {
      const current = snap.exists() ? snap.data().referralCode || '' : ''
      setCode(current)
      setSavedCode(current)
    })
  }, [loId])

  const handleSave = async (e) => {
    e.preventDefault()
    setMsg('')
    setBusy(true)
    try {
      const newCode = code.trim().toUpperCase()
      if (!/^[A-Z0-9-]{3,20}$/.test(newCode)) {
        setMsg('Code must be 3-20 letters, numbers, or dashes.')
        return
      }
      const existing = await getDoc(doc(db, 'referralCodes', newCode))
      if (existing.exists() && existing.data().loId !== loId) {
        setMsg('That code is already taken.')
        return
      }
      await setDoc(doc(db, 'referralCodes', newCode), { loId })
      await setDoc(doc(db, 'users', loId), { referralCode: newCode }, { merge: true })
      if (loId === user.uid) await refreshProfile()
      setSavedCode(newCode)
      setMsg('Referral code saved.')
    } finally {
      setBusy(false)
    }
  }

  const signupLink = savedCode ? `${window.location.origin}/signup?ref=${savedCode}` : null

  return (
    <div className="narrow">
      <form onSubmit={handleSave} className="card form-card">
        <h3>Referral code</h3>
        <p className="muted">Agents who sign up with this code (or the link below) are linked to this loan officer.</p>
        <label>Code
          <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SMITH-LOANS" />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save code'}</button>
        {msg && <p className="muted">{msg}</p>}
      </form>
      {signupLink && (
        <div className="card">
          <h3>Signup link</h3>
          <code className="share-link">{signupLink}</code>
          <button className="btn" onClick={() => navigator.clipboard.writeText(signupLink)}>Copy link</button>
        </div>
      )}
    </div>
  )
}
