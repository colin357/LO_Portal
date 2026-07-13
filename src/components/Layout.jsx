import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const initial = (profile?.name || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">
            <img
              className="brand-logo"
              src="/logo.png"
              alt="Own It Social"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            Agent Portal
          </span>
          {user && (
            <nav className="nav">
              <NavLink to="/" end>Videos</NavLink>
              <NavLink to="/templates">Templates</NavLink>
              <NavLink to="/profile">My Profile</NavLink>
              {profile?.role === 'lo' && <NavLink to="/admin">Admin</NavLink>}
              {profile?.role === 'super' && <NavLink to="/super">Super Admin</NavLink>}
            </nav>
          )}
          {user && (
            <div className="user-chip">
              {profile?.headshotUrl
                ? <img className="avatar" src={profile.headshotUrl} alt="" />
                : <span className="avatar initial">{initial}</span>}
              <div className="user-chip-text">
                <span className="user-chip-name">{profile?.name || user.email}</span>
                <button className="link-btn signout" onClick={handleSignOut}>Sign out</button>
              </div>
            </div>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-inner">
          <span>© {new Date().getFullYear()} Own It Social</span>
          <span className="muted">Built for loan officers &amp; the agents who work with them</span>
        </div>
      </footer>
    </div>
  )
}
