import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'
import { useAuth } from '../context/AuthContext'
import {
  IconHome, IconBook, IconLayers, IconChat, IconUser, IconShield, IconStar,
  IconSignOut, IconCollapse, IconSparkle,
} from './Icons'

// Route -> page title shown in the content top bar.
const TITLES = {
  '/': 'Home',
  '/education': 'Education',
  '/templates': 'Templates',
  '/assistant': 'AI Assistant',
  '/profile': 'My Profile',
  '/admin': 'Admin',
  '/super': 'Super Admin',
}

export default function Layout() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('sidebarCollapsed') === '1'
  )

  const handleSignOut = async () => {
    await signOut(auth)
    navigate('/login')
  }

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem('sidebarCollapsed', c ? '0' : '1')
      return !c
    })
  }

  const initial = (profile?.name || user?.email || '?').charAt(0).toUpperCase()
  const title = TITLES[location.pathname] || 'Home'

  // The top-left brand shows the loan officer's uploaded logo. For an LO/super
  // that's their own profile; for an agent we fetch their linked LO's logo.
  // Prefer the dedicated portal logo (Admin → Branding); fall back to the
  // general logo field so a logo uploaded on My Profile shows up too.
  const [brand, setBrand] = useState({ logoUrl: '', name: '' })
  useEffect(() => {
    if (!profile) return
    if (profile.role === 'agent' && profile.loId) {
      let active = true
      getDoc(doc(db, 'users', profile.loId)).then((snap) => {
        if (active && snap.exists()) {
          const d = snap.data()
          setBrand({ logoUrl: d.portalLogoUrl || d.logoUrl || '', name: d.name || '' })
        }
      }).catch(() => {})
      return () => { active = false }
    }
    // LO / super admin: use their own doc.
    setBrand({ logoUrl: profile.portalLogoUrl || profile.logoUrl || '', name: profile.name || '' })
  }, [profile?.role, profile?.loId, profile?.portalLogoUrl, profile?.logoUrl, profile?.name])

  const navItems = [
    { to: '/', label: 'Home', icon: IconHome, end: true },
    { to: '/education', label: 'Education', icon: IconBook },
    { to: '/templates', label: 'Templates', icon: IconLayers },
    { to: '/assistant', label: 'AI Assistant', icon: IconChat },
    { to: '/profile', label: 'My Profile', icon: IconUser },
  ]
  if (profile?.role === 'lo') navItems.push({ to: '/admin', label: 'Admin', icon: IconShield })
  if (profile?.role === 'super') navItems.push({ to: '/super', label: 'Super Admin', icon: IconStar })

  return (
    <div className={`app-shell${collapsed ? ' collapsed' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          {brand.logoUrl ? (
            <img className="brand-logo" src={brand.logoUrl} alt={brand.name || 'Logo'} />
          ) : (
            <>
              <span className="brand-mark"><IconSparkle size={20} /></span>
              {brand.name && (
                <span className="brand-text">
                  <strong>{brand.name}</strong>
                </span>
              )}
            </>
          )}
        </div>

        {user && (
          <div className="sidebar-user">
            {profile?.headshotUrl
              ? <img className="avatar" src={profile.headshotUrl} alt="" />
              : <span className="avatar initial">{initial}</span>}
            <span className="sidebar-user-text">
              <strong>{profile?.name || 'Your account'}</strong>
              <small>{user.email}</small>
            </span>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} title={label}>
              <span className="nav-icon"><Icon /></span>
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-action" onClick={handleSignOut} title="Sign Out">
            <span className="nav-icon"><IconSignOut /></span>
            <span className="nav-label">Sign Out</span>
          </button>
          <button className="sidebar-action collapse-btn" onClick={toggleCollapsed} title="Collapse">
            <span className="nav-icon"><IconCollapse /></span>
            <span className="nav-label">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="content-topbar">
          <h1>{title}</h1>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
