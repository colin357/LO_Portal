import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Home from './pages/Home'
import Education from './pages/Education'
import Templates from './pages/Templates'
import Assistant from './pages/Assistant'
import Profile from './pages/Profile'
import Admin from './pages/Admin'
import SuperAdmin from './pages/SuperAdmin'
import FinishSignIn from './pages/FinishSignIn'
import CompleteProfile from './pages/CompleteProfile'
import Onboarding from './pages/Onboarding'

function Protected({ children, role = null }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <div className="page-loading">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  // Signed in (e.g. via email link) but no profile yet: needs a referral code.
  if (!profile) return <Navigate to="/complete-profile" replace />
  // New agents finish the onboarding wizard before entering the portal.
  if (profile.role === 'agent' && profile.onboarded === false) {
    return <Navigate to="/onboarding" replace />
  }
  if (role && profile.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/finish-signin" element={<FinishSignIn />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Protected><Home /></Protected>} />
        <Route path="/education" element={<Protected><Education /></Protected>} />
        <Route path="/templates" element={<Protected><Templates /></Protected>} />
        <Route path="/assistant" element={<Protected><Assistant /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="/admin" element={<Protected role="lo"><Admin /></Protected>} />
        <Route path="/super" element={<Protected role="super"><SuperAdmin /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
