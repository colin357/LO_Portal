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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand">Agent Portal</span>
          {user && (
            <nav className="nav">
              <NavLink to="/" end>Videos</NavLink>
              <NavLink to="/templates">Templates</NavLink>
              <NavLink to="/profile">My Profile</NavLink>
              {profile?.role === 'lo' && <NavLink to="/admin">Admin</NavLink>}
              <button className="link-btn" onClick={handleSignOut}>Sign out</button>
            </nav>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
