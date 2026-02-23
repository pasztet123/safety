import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Layout.css'

export default function Layout({ children, session }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const showBackButton = location.pathname !== '/'

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          {showBackButton && (
            <button className="back-button" onClick={() => navigate('/')}>
              ← Back
            </button>
          )}
          <h1 className="header-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            Safety Meetings
          </h1>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>
      <main className="main-content">
        <div className="container">
          {children}
        </div>
      </main>
    </div>
  )
}
