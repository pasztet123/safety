import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Layout.css'

/* ── Nav items definition ── */
const NAV_ITEMS = [
  {
    title: 'Projects',
    path: '/projects',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    title: 'Toolbox Meetings',
    path: '/meetings',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        <rect x="8" y="2" width="8" height="4" rx="1"/>
      </svg>
    ),
  },
  {
    title: 'Safety Topics',
    path: '/safety-topics',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    title: 'People',
    path: '/people',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    title: 'Incidents',
    path: '/incidents',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    title: 'Corrective Actions',
    path: '/corrective-actions',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
  },
  {
    title: 'Checklists',
    path: '/checklists',
    icon: (
      <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
  },
]

const ADMIN_NAV_ITEM = {
  title: 'Admin Panel',
  path: '/admin',
  icon: (
    <svg className="nav-drawer-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
}

export default function Layout({ children, session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const hamburgerRef = useRef(null)

  useEffect(() => {
    fetchUserInfo()
  }, [session])

  /* Close drawer on route change */
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  /* Return focus to hamburger when drawer closes */
  useEffect(() => {
    if (!menuOpen && hamburgerRef.current) {
      hamburgerRef.current.focus()
    }
  }, [menuOpen])

  /* Lock body scroll while drawer open */
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const fetchUserInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('name, is_admin')
        .eq('id', user.id)
        .single()
      
      if (data) {
        setUserName(data.name || user.email)
        setIsAdmin(data.is_admin || false)
      } else {
        setUserName(user.email)
      }
    }
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await supabase.auth.signOut()
  }

  const handleNavItem = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <img
            src="https://lnfzvpaonuzbcnlulyyk.supabase.co/storage/v1/object/public/product-images/public/RGB_ABEdward_logo_horizontal_mono_no-bckg.png"
            alt="AB Edward Logo"
            className="header-logo"
            onClick={() => navigate('/')}
          />
          <div className="header-center">
          </div>
          <button
            ref={hamburgerRef}
            className={`hamburger-btn${menuOpen ? ' is-open' : ''}`}
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="nav-drawer"
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
        </div>
      </header>

      {/* Off-canvas drawer */}
      {menuOpen && (
        <>
          <div
            className="nav-overlay"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <nav id="nav-drawer" className="nav-drawer" role="navigation" aria-label="Main navigation">
            <div className="nav-drawer-header">
              <div className="nav-drawer-user">
                <span className="nav-drawer-user-name">{userName}</span>
                {isAdmin && <span className="nav-drawer-admin-badge">Admin</span>}
              </div>
              <button
                className="nav-drawer-close"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>

            <div className="nav-drawer-nav">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  className={`nav-drawer-item${location.pathname === item.path || location.pathname.startsWith(item.path + '/') ? ' is-active' : ''}`}
                  onClick={() => handleNavItem(item.path)}
                >
                  {item.icon}
                  {item.title}
                </button>
              ))}
            </div>

            <div className="nav-drawer-footer">
              <button className="nav-drawer-logout" onClick={handleLogout}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                Logout
              </button>
            </div>
          </nav>
        </>
      )}

      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>

      <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="app-footer-brand">A.B. Edward Enterprises, Inc.</span>
          <span className="app-footer-sep">·</span>
          <span className="app-footer-copy">Safety Management System</span>
          <span className="app-footer-sep">·</span>
          <span className="app-footer-year">© {new Date().getFullYear()}</span>
          <span className="app-footer-sep">·</span>
          <span className="app-footer-version">v4.8.2</span>
        </div>
      </footer>
    </div>
  )
}
