import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../firebase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password)
      navigate('/')
    } catch (err) {
      setError('Invalid email or password.')
    } finally {
      setBusy(false)
    }
  }

  const handleReset = async () => {
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('Enter your email above first, then click "Forgot password".')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setNotice('Password reset email sent. Check your inbox.')
    } catch {
      setError('Could not send reset email. Check the address and try again.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Welcome back</h1>
        {error && <div className="alert">{error}</div>}
        {notice && <div className="notice">{notice}</div>}
        <form onSubmit={handleSubmit}>
          <label>Email
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>Password
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
        </form>
        <p className="muted"><button className="link-btn" onClick={handleReset}>Forgot password?</button></p>
        <p className="muted">New agent? <Link to="/signup">Create an account</Link></p>
      </div>
    </div>
  )
}
