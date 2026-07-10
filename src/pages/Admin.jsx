import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, getDocs, addDoc, deleteDoc, doc,
  setDoc, getDoc, serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'
import { useAuth } from '../context/AuthContext'

const TABS = ['Videos', 'Templates', 'Agents', 'Referral Code']

export default function Admin() {
  const [tab, setTab] = useState('Videos')
  return (
    <div>
      <h1>Admin</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={tab === t ? 'tab active' : 'tab'} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Videos' && <AdminVideos />}
      {tab === 'Templates' && <AdminTemplates />}
      {tab === 'Agents' && <AdminAgents />}
      {tab === 'Referral Code' && <AdminReferral />}
    </div>
  )
}

function AdminVideos() {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [form, setForm] = useState({ title: '', description: '', url: '' })
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const snap = await getDocs(query(collection(db, 'videos'), where('loId', '==', user.uid), orderBy('order')))
    setVideos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }
  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await addDoc(collection(db, 'videos'), {
        loId: user.uid,
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim(),
        order: videos.length,
        createdAt: serverTimestamp(),
      })
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

function AdminTemplates() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [form, setForm] = useState({ title: '', description: '', weekOf: '' })
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const snap = await getDocs(query(collection(db, 'templates'), where('loId', '==', user.uid), orderBy('createdAt', 'desc')))
    setTemplates(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }
  useEffect(() => { load() }, [])

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
      const fileUrl = await upload(file, `templates/${user.uid}/${stamp}-${file.name}`)
      const previewUrl = preview
        ? await upload(preview, `templates/${user.uid}/${stamp}-preview-${preview.name}`)
        : ''
      await addDoc(collection(db, 'templates'), {
        loId: user.uid,
        title: form.title.trim(),
        description: form.description.trim(),
        weekOf: form.weekOf,
        fileUrl,
        previewUrl,
        createdAt: serverTimestamp(),
      })
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
      <form onSubmit={handleAdd} className="card form-card">
        <h3>Upload a template</h3>
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
        <button type="submit" disabled={busy}>{busy ? 'Uploading…' : 'Add template'}</button>
      </form>
      <ul className="admin-list">
        {templates.map((t) => (
          <li key={t.id}>
            <span><strong>{t.title}</strong>{t.weekOf ? ` — week of ${t.weekOf}` : ''}</span>
            <button className="link-btn danger" onClick={() => handleDelete(t.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AdminAgents() {
  const { user } = useAuth()
  const [agents, setAgents] = useState([])

  useEffect(() => {
    getDocs(query(collection(db, 'users'), where('loId', '==', user.uid), where('role', '==', 'agent')))
      .then((snap) => setAgents(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
  }, [])

  return (
    <div>
      <h3>Your agents ({agents.length})</h3>
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
  )
}

function AdminReferral() {
  const { user, profile, refreshProfile } = useAuth()
  const [code, setCode] = useState(profile?.referralCode || '')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

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
      if (existing.exists() && existing.data().loId !== user.uid) {
        setMsg('That code is already taken.')
        return
      }
      await setDoc(doc(db, 'referralCodes', newCode), { loId: user.uid })
      await setDoc(doc(db, 'users', user.uid), { referralCode: newCode }, { merge: true })
      await refreshProfile()
      setMsg('Referral code saved.')
    } finally {
      setBusy(false)
    }
  }

  const signupLink = profile?.referralCode
    ? `${window.location.origin}/signup?ref=${profile.referralCode}`
    : null

  return (
    <div className="narrow">
      <form onSubmit={handleSave} className="card form-card">
        <h3>Your referral code</h3>
        <p className="muted">Give this code (or the link below) to agents so their accounts link to you.</p>
        <label>Code
          <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. SMITH-LOANS" />
        </label>
        <button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save code'}</button>
        {msg && <p className="muted">{msg}</p>}
      </form>
      {signupLink && (
        <div className="card">
          <h3>Share your signup link</h3>
          <code className="share-link">{signupLink}</code>
          <button className="btn" onClick={() => navigator.clipboard.writeText(signupLink)}>Copy link</button>
        </div>
      )}
    </div>
  )
}
