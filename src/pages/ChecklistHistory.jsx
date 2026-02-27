import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ChecklistHistory.css'

export default function ChecklistHistory() {
  const navigate = useNavigate()
  
  const [loading, setLoading] = useState(true)
  const [completions, setCompletions] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchCompletions()
  }, [])

  const fetchCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setCurrentUser({ ...user, is_admin: userData?.is_admin || false })
    }
  }

  const fetchCompletions = async () => {
    setLoading(true)
    
    // Fetch completions
    const { data: completionsData, error: completionsError } = await supabase
      .from('checklist_completions')
      .select('id, checklist_id, project_id, completed_by, completion_datetime, notes')
      .order('completion_datetime', { ascending: false })

    if (completionsError) {
      console.error('Error fetching completions:', completionsError)
      setLoading(false)
      return
    }

    // Fetch related data separately
    const checklistIds = [...new Set(completionsData.map(c => c.checklist_id))]
    const projectIds = [...new Set(completionsData.filter(c => c.project_id).map(c => c.project_id))]
    const userIds = [...new Set(completionsData.map(c => c.completed_by))]

    const [checklistsRes, projectsRes, usersRes] = await Promise.all([
      supabase.from('checklists').select('id, name').in('id', checklistIds),
      projectIds.length > 0 ? supabase.from('projects').select('id, name').in('id', projectIds) : { data: [] },
      supabase.from('users').select('id, name, email').in('id', userIds)
    ])

    // Create lookup maps
    const checklistsMap = new Map(checklistsRes.data?.map(c => [c.id, c]) || [])
    const projectsMap = new Map(projectsRes.data?.map(p => [p.id, p]) || [])
    const usersMap = new Map(usersRes.data?.map(u => [u.id, u]) || [])

    // Combine data
    const enrichedCompletions = completionsData.map(completion => ({
      ...completion,
      checklist: checklistsMap.get(completion.checklist_id),
      project: completion.project_id ? projectsMap.get(completion.project_id) : null,
      user: usersMap.get(completion.completed_by)
    }))

    setCompletions(enrichedCompletions)
    setLoading(false)
  }

  const formatDateTime = (datetime) => {
    const date = new Date(datetime)
    return date.toLocaleString('pl-PL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleView = (completionId) => {
    navigate(`/checklist-history/${completionId}`)
  }

  const handleEdit = (completionId) => {
    if (currentUser?.is_admin) {
      navigate(`/checklist-history/${completionId}/edit`)
    }
  }

  const handleDelete = async (completionId, checklistName) => {
    if (!currentUser?.is_admin) return
    
    if (!confirm(`Are you sure you want to delete this completion of "${checklistName}"? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('checklist_completions')
      .delete()
      .eq('id', completionId)

    if (error) {
      alert('Error deleting completion: ' + error.message)
    } else {
      fetchCompletions()
    }
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div className="checklist-history">
      <div className="page-header">
        <h2 className="page-title">Checklist History</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/checklists')}>
          Back to Checklists
        </button>
      </div>

      {completions.length === 0 ? (
        <div className="card">
          <p className="empty-state">No completed checklists yet.</p>
        </div>
      ) : (
        <div className="completions-list">
          {completions.map(completion => (
            <div key={completion.id} className="completion-card">
              <div className="completion-header">
                <h3 className="completion-title">{completion.checklist?.name || 'Unknown Checklist'}</h3>
                <div className="completion-actions">
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleView(completion.id)}
                  >
                    View
                  </button>
                  {currentUser?.is_admin && (
                    <>
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => handleEdit(completion.id)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(completion.id, completion.checklist?.name)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="completion-details">
                <span className="detail-label">Completed:</span>
                <span className="detail-value">{formatDateTime(completion.completion_datetime)}</span>
                
                {completion.project && (
                  <>
                    <span className="detail-label">Project:</span>
                    <span className="detail-value">{completion.project.name}</span>
                  </>
                )}
                
                <span className="detail-label">Completed by:</span>
                <span className="detail-value">
                  {completion.user?.name || completion.user?.email || 'Unknown User'}
                </span>
                
                {completion.notes && (
                  <>
                    <span className="detail-label">Notes:</span>
                    <span className="detail-value">{completion.notes}</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
