import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Checklists() {
  const navigate = useNavigate()
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChecklists()
  }, [])

  const fetchChecklists = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        items:checklist_items(id),
        completions:checklist_completions(id, completed_at)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setChecklists(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Checklists</h2>
        <button className="btn btn-primary" onClick={() => navigate('/checklists/new')}>
          + New Checklist
        </button>
      </div>

      <div className="checklists-grid">
        {checklists.length === 0 ? (
          <div className="empty-state">
            <p>No checklists created yet. Create your first checklist!</p>
          </div>
        ) : (
          checklists.map((checklist) => (
            <div key={checklist.id} className="card card-clickable">
              <h3 className="checklist-name">{checklist.name}</h3>
              {checklist.description && (
                <p className="checklist-description">{checklist.description}</p>
              )}
              
              <div className="checklist-stats">
                <div className="stat-item">
                  <span className="stat-label">Items:</span>
                  <span className="stat-value">{checklist.items?.length || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Completions:</span>
                  <span className="stat-value">{checklist.completions?.length || 0}</span>
                </div>
              </div>

              <div className="checklist-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/checklists/${checklist.id}/complete`)}
                >
                  Complete Checklist
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate(`/checklists/${checklist.id}`)}
                >
                  View/Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
