import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ChecklistCompletion.css'

export default function ChecklistHistoryEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [completion, setCompletion] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [completionDateTime, setCompletionDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    checkAdmin()
    fetchProjects()
    fetchCompletion()
  }, [id])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      const adminStatus = userData?.is_admin || false
      setIsAdmin(adminStatus)
      
      // If not admin, redirect
      if (!adminStatus) {
        navigate('/checklist-history')
      }
    }
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
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
    setProjectId(completionData.project_id || '')
    setNotes(completionData.notes || '')
    
    // Format datetime for input
    const dt = new Date(completionData.completion_datetime)
    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    const hours = String(dt.getHours()).padStart(2, '0')
    const minutes = String(dt.getMinutes()).padStart(2, '0')
    setCompletionDateTime(`${year}-${month}-${day}T${hours}:${minutes}`)

    // Fetch checklist
    const { data: checklistData } = await supabase
      .from('checklists')
      .select('*')
      .eq('id', completionData.checklist_id)
      .single()

    if (checklistData) setChecklist(checklistData)

    // Fetch completion items
    const { data: itemsData } = await supabase
      .from('checklist_completion_items')
      .select('*, checklist_item:checklist_items(*)')
      .eq('completion_id', id)

    if (itemsData) {
      const sortedItems = itemsData.sort((a, b) => 
        a.checklist_item.display_order - b.checklist_item.display_order
      )
      setItems(sortedItems)
    }

    setLoading(false)
  }

  const handleToggleItem = (index) => {
    const newItems = [...items]
    newItems[index].is_checked = !newItems[index].is_checked
    setItems(newItems)
  }

  const handleItemNoteChange = (index, value) => {
    const newItems = [...items]
    newItems[index].notes = value
    setItems(newItems)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    
    setSubmitting(true)

    // Update completion
    const { error: completionError } = await supabase
      .from('checklist_completions')
      .update({
        project_id: projectId || null,
        completion_datetime: completionDateTime,
        notes: notes
      })
      .eq('id', id)

    if (completionError) {
      console.error('Error updating completion:', completionError)
      alert('Error updating completion: ' + completionError.message)
      setSubmitting(false)
      return
    }

    // Update completion items
    const updates = items.map(item => 
      supabase
        .from('checklist_completion_items')
        .update({
          is_checked: item.is_checked,
          notes: item.notes || null
        })
        .eq('id', item.id)
    )

    await Promise.all(updates)

    setSubmitting(false)
    navigate(`/checklist-history/${id}`)
  }

  if (loading) return <div className="spinner"></div>
  if (!isAdmin) return null

  const checkedCount = items.filter(item => item.is_checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <div className="checklist-completion">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="page-title">Edit: {checklist?.name}</h2>
        <button className="btn btn-secondary" onClick={() => navigate(`/checklist-history/${id}`)}>
          Cancel
        </button>
      </div>

      {checklist?.description && (
        <p className="checklist-subtitle">{checklist.description}</p>
      )}

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

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Project (Optional)</label>
            <select
              className="form-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Completion Date & Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={completionDateTime}
              onChange={(e) => setCompletionDateTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Checklist Items</h3>
          
          <div className="completion-items-list">
            {items.map((item, index) => (
              <div key={item.id} className="completion-item-row">
                <div className="completion-item-header">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={item.is_checked}
                    onChange={() => handleToggleItem(index)}
                    id={`item-${item.id}`}
                  />
                  <label 
                    htmlFor={`item-${item.id}`}
                    className={`item-label ${item.is_checked ? 'checked' : ''}`}
                  >
                    <span className="item-number">{index + 1}.</span>
                    <span className="item-text">{item.checklist_item?.title}</span>
                  </label>
                </div>
                
                <input
                  type="text"
                  className="form-input item-note-input"
                  placeholder="Add note (optional)"
                  value={item.notes || ''}
                  onChange={(e) => handleItemNoteChange(index, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this completion..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate(`/checklist-history/${id}`)}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
