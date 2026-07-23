import { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { useAuth } from '../context/AuthContext'
import {
  IconHome, IconBook, IconLayers, IconChat, IconUser, IconShield, IconStar,
  IconGift, IconSignOut, IconCollapse, IconSparkle,
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
  const [copied, setCopied] = useState(false)

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

  const referAFriend = async () => {
    const link = window.location.origin
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Own It Social', url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* user dismissed share sheet */ }
  }

  const initial = (profile?.name || user?.email || '?').charAt(0).toUpperCase()
  const title = TITLES[location.pathname] || 'Home'

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
          <span className="brand-mark"><IconSparkle size={20} /></span>
          <span className="brand-text">
            <strong>Own It Social</strong>
            <small>Client Portal</small>
          </span>
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
          <button className="sidebar-action refer" onClick={referAFriend} title="Refer a Friend">
            <span className="nav-icon"><IconGift /></span>
            <span className="nav-label">{copied ? 'Link copied!' : 'Refer a Friend'}</span>
          </button>
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
