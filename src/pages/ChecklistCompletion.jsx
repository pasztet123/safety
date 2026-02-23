import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ChecklistCompletion.css'

export default function ChecklistCompletion() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checklist, setChecklist] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])

  useEffect(() => {
    fetchChecklist()
    fetchProjects()
  }, [id])

  const fetchChecklist = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        items:checklist_items(*)
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      setChecklist(data)
      const sortedItems = data.items.sort((a, b) => a.display_order - b.display_order)
      setItems(sortedItems.map(item => ({
        ...item,
        is_checked: false,
        notes: ''
      })))
    }
    setLoading(false)
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
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
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Create completion
    const { data: completion, error: completionError } = await supabase
      .from('checklist_completions')
      .insert([{
        checklist_id: id,
        project_id: projectId || null,
        completed_by: user.id,
        notes: notes
      }])
      .select()
      .single()

    if (completionError) {
      console.error('Error creating completion:', completionError)
      setSubmitting(false)
      return
    }

    // Insert completion items
    const completionItems = items.map(item => ({
      completion_id: completion.id,
      checklist_item_id: item.id,
      is_checked: item.is_checked,
      notes: item.notes || null
    }))

    const { error: itemsError } = await supabase
      .from('checklist_completion_items')
      .insert(completionItems)

    if (itemsError) {
      console.error('Error creating completion items:', itemsError)
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    navigate('/checklists')
  }

  if (loading) return <div className="spinner"></div>

  const checkedCount = items.filter(item => item.is_checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <div className="checklist-completion">
      <h2 className="page-title">{checklist?.name}</h2>
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
                    <span className="item-text">{item.title}</span>
                  </label>
                </div>
                
                <input
                  type="text"
                  className="form-input item-note-input"
                  placeholder="Add note (optional)"
                  value={item.notes}
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/checklists')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Complete Checklist'}
          </button>
        </div>
      </form>
    </div>
  )
}
