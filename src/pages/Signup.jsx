import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    brokerage: '',
    referralCode: searchParams.get('ref') || '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      // Resolve the referral code to a loan officer before creating the account.
      const code = form.referralCode.trim().toUpperCase()
      if (!code) throw new Error('A referral code from your loan officer is required.')
      const codeSnap = await getDoc(doc(db, 'referralCodes', code))
      if (!codeSnap.exists()) throw new Error('That referral code was not found. Double-check it with your loan officer.')
      const loId = codeSnap.data().loId

      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        role: 'agent',
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        brokerage: form.brokerage.trim(),
        loId,
        referralCode: code,
        headshotUrl: '',
        logoUrl: '',
        onboarded: false,
        createdAt: serverTimestamp(),
      })
      await refreshProfile()
      navigate('/onboarding')
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create your agent account</h1>
        <p className="muted">Sign up with the referral code your loan officer gave you.</p>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Full name
            <input required value={form.name} onChange={set('name')} />
          </label>
          <label>Email
            <input required type="email" value={form.email} onChange={set('email')} />
          </label>
          <label>Password
            <input required type="password" minLength={6} value={form.password} onChange={set('password')} />
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
          <button type="submit" disabled={busy}>{busy ? 'Creating account…' : 'Sign up'}</button>
        </form>
        <p className="muted">Already have an account? <Link to="/login">Log in</Link></p>
      </div>
    </div>
  )
}
