import { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { auth } from '../firebase'

// Landing page for the email sign-in link. The email is stashed in
// localStorage when the link is requested; if the link is opened on a
// different device we ask for it again (required by Firebase).
export default function FinishSignIn() {
  const [status, setStatus] = useState('working') // working | need-email | error
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const attempted = useRef(false)

  const complete = async (emailToUse) => {
    try {
      await signInWithEmailLink(auth, emailToUse, window.location.href)
      window.localStorage.removeItem('emailForSignIn')
      navigate('/')
    } catch (err) {
      setError('This sign-in link is invalid or has expired. Request a new one from the login page.')
      setStatus('error')
    }
  }

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true
    if (!isSignInWithEmailLink(auth, window.location.href)) {
      setError('This link is not a valid sign-in link.')
      setStatus('error')
      return
    }
    const stored = window.localStorage.getItem('emailForSignIn')
    if (stored) {
      complete(stored)
    } else {
      setStatus('need-email')
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setStatus('working')
    complete(email.trim())
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {status === 'working' && <p className="muted">Signing you in…</p>}
        {status === 'need-email' && (
          <>
            <h1>Confirm your email</h1>
            <p className="muted">For security, re-enter the email address this sign-in link was sent to.</p>
            <form onSubmit={handleSubmit}>
              <label>Email
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <button type="submit">Continue</button>
            </form>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="alert">{error}</div>
            <p className="muted"><Link to="/login">Back to login</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
