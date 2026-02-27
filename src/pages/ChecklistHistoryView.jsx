import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ChecklistCompletion.css'

export default function ChecklistHistoryView() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [completion, setCompletion] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [project, setProject] = useState(null)
  const [user, setUser] = useState(null)
  const [items, setItems] = useState([])
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchCurrentUser()
    fetchCompletion()
  }, [id])

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

  const fetchCompletion = async () => {
    setLoading(true)

    // Fetch completion
    const { data: completionData, error: completionError } = await supabase
      .from('checklist_completions')
      .select('*')
      .eq('id', id)
      .single()

    if (completionError || !completionData) {
      console.error('Error fetching completion:', completionError)
      setLoading(false)
      return
    }

    setCompletion(completionData)

    // Fetch related data
    const [checklistRes, projectRes, userRes, itemsRes] = await Promise.all([
      supabase.from('checklists').select('*').eq('id', completionData.checklist_id).single(),
      completionData.project_id 
        ? supabase.from('projects').select('*').eq('id', completionData.project_id).single()
        : { data: null },
      supabase.from('users').select('id, name, email').eq('id', completionData.completed_by).single(),
      supabase.from('checklist_completion_items')
        .select('*, checklist_item:checklist_items(*)')
        .eq('completion_id', id)
    ])

    if (checklistRes.data) setChecklist(checklistRes.data)
    if (projectRes.data) setProject(projectRes.data)
    if (userRes.data) setUser(userRes.data)
    
    if (itemsRes.data) {
      const sortedItems = itemsRes.data.sort((a, b) => 
        a.checklist_item.display_order - b.checklist_item.display_order
      )
      setItems(sortedItems)
    }

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

  const handleDelete = async () => {
    if (!currentUser?.is_admin) return
    
    if (!confirm(`Are you sure you want to delete this completion of "${checklist?.name}"? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('checklist_completions')
      .delete()
      .eq('id', id)

    if (error) {
      alert('Error deleting completion: ' + error.message)
    } else {
      navigate('/checklist-history')
    }
  }

  if (loading) return <div className="spinner"></div>

  const checkedCount = items.filter(item => item.is_checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <div className="checklist-completion">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="page-title">{checklist?.name}</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {currentUser?.is_admin && (
            <>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate(`/checklist-history/${id}/edit`)}
              >
                Edit
              </button>
              <button 
                className="btn btn-danger" 
                onClick={handleDelete}
              >
                Delete
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => navigate('/checklist-history')}>
            Back to History
          </button>
        </div>
      </div>

      {checklist?.description && (
        <p className="checklist-subtitle">{checklist.description}</p>
      )}

      <div className="card">
        <h3 className="section-title">Completion Details</h3>
        <div className="completion-details">
          <div className="detail-row">
            <span className="detail-label">Completed:</span>
            <span className="detail-value">{formatDateTime(completion?.completion_datetime)}</span>
          </div>
          
          {project && (
            <div className="detail-row">
              <span className="detail-label">Project:</span>
              <span className="detail-value">{project.name}</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-label">Completed by:</span>
            <span className="detail-value">
              {user?.name || user?.email || 'Unknown User'}
            </span>
          </div>
          
          {completion?.notes && (
            <div className="detail-row">
              <span className="detail-label">Notes:</span>
              <span className="detail-value">{completion.notes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="progress-card">
        <div className="progress-header">
          <span className="progress-label">Progress</span>
          <span className="progress-count">{checkedCount}/{totalCount}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Checklist Items</h3>
        
        <div className="completion-items-list">
          {items.map((item, index) => (
            <div key={item.id} className="completion-item-row" style={{ opacity: item.is_checked ? 1 : 0.6 }}>
              <div className="completion-item-header">
                <input
                  type="checkbox"
                  className="checkbox-input"
                  checked={item.is_checked}
                  disabled
                  id={`item-${item.id}`}
                />
                <label 
                  htmlFor={`item-${item.id}`}
                  className={`item-label ${item.is_checked ? 'checked' : ''}`}
                  style={{ cursor: 'default' }}
                >
                  <span className="item-number">{index + 1}.</span>
                  <span className="item-text">{item.checklist_item?.title}</span>
                </label>
              </div>
              
              {item.notes && (
                <div className="form-input item-note-input" style={{ 
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  cursor: 'default'
                }}>
                  {item.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
