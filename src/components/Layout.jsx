import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './Layout.css'

export default function Layout({ children, session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetchUserInfo()
  }, [session])

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
    await supabase.auth.signOut()
  }

  const showBackButton = location.pathname !== '/'

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <img 
              src="https://lnfzvpaonuzbcnlulyyk.supabase.co/storage/v1/object/public/product-images/public/RGB_ABEdward_logo_horizontal_mono_no-bckg.png" 
              alt="AB Edward Logo" 
              className="header-logo"
              onClick={() => navigate('/')}
            />
            {showBackButton && (
              <button className="back-button" onClick={() => navigate('/')}>
                ← Back
              </button>
            )}
          </div>
          <h1 className="header-title" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            Safety Meetings
          </h1>
          <div className="user-info">
            <span className="user-name">
              {userName}
              {isAdmin && <span className="admin-badge">Admin</span>}
            </span>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
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
