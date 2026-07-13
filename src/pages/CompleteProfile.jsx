import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext'

// Shown when someone signs in (e.g. via an email link) but has no profile
// yet — they still need a referral code to be linked to their loan officer.
export default function CompleteProfile() {
  const { user, profile, loading, refreshProfile } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', brokerage: '', referralCode: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (profile) return <Navigate to="/" replace />

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const code = form.referralCode.trim().toUpperCase()
      const codeSnap = await getDoc(doc(db, 'referralCodes', code))
      if (!codeSnap.exists()) throw new Error('That referral code was not found. Double-check it with your loan officer.')
      await setDoc(doc(db, 'users', user.uid), {
        role: 'agent',
        name: form.name.trim(),
        email: user.email,
        phone: form.phone.trim(),
        brokerage: form.brokerage.trim(),
        loId: codeSnap.data().loId,
        referralCode: code,
        headshotUrl: '',
        logoUrl: '',
        createdAt: serverTimestamp(),
      })
      await refreshProfile()
      navigate('/')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Almost there</h1>
        <p className="muted">
          You're signed in as <strong>{user?.email}</strong>. Finish setting up your account with
          the referral code from your loan officer.
        </p>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Full name
            <input required value={form.name} onChange={set('name')} />
          </label>
          <label>Phone
            <input value={form.phone} onChange={set('phone')} />
          </label>
          <label>Brokerage
            <input value={form.brokerage} onChange={set('brokerage')} />
          </label>
          <label>Referral code
            <input required value={form.referralCode} onChange={set('referralCode')} placeholder="From your loan officer" />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Finishing…' : 'Complete setup'}</button>
        </form>
      </div>
    </div>
  )
}
