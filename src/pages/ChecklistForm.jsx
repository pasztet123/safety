import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './ChecklistForm.css'

export default function ChecklistForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [completions, setCompletions] = useState([])
  const [showCompletions, setShowCompletions] = useState(false)

  useEffect(() => {
    if (id) {
      fetchChecklist()
      fetchCompletions()
    }
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
      setFormData({
        name: data.name,
        description: data.description || '',
      })
      setItems(data.items.sort((a, b) => a.display_order - b.display_order))
    }
    setLoading(false)
  }

  const fetchCompletions = async () => {
    const { data, error } = await supabase
      .from('checklist_completions')
      .select(`
        *,
        project:projects(name),
        completed_items:checklist_completion_items(
          *,
          checklist_item:checklist_items(title)
        )
      `)
      .eq('checklist_id', id)
      .order('completed_at', { ascending: false })

    if (!error && data) {
      setCompletions(data)
    }
  }

  const handleAddItem = () => {
    if (!newItem.trim()) return
    setItems([...items, { title: newItem, display_order: items.length }])
    setNewItem('')
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleMoveItem = (index, direction) => {
    const newItems = [...items]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    
    if (newIndex < 0 || newIndex >= newItems.length) return
    
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]]
    newItems.forEach((item, i) => {
      item.display_order = i
    })
    
    setItems(newItems)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    let checklistId = id
    if (id) {
      const { error } = await supabase
        .from('checklists')
        .update(formData)
        .eq('id', id)
      
      if (error) {
        console.error('Error updating checklist:', error)
        setLoading(false)
        return
      }

      // Delete existing items
      await supabase.from('checklist_items').delete().eq('checklist_id', id)
    } else {
      const { data, error } = await supabase
        .from('checklists')
        .insert([{ ...formData, created_by: user.id }])
        .select()
        .single()

      if (error) {
        console.error('Error creating checklist:', error)
        setLoading(false)
        return
      }
      checklistId = data.id
    }

    // Insert items
    if (items.length > 0) {
      await supabase.from('checklist_items').insert(
        items.map(item => ({
          checklist_id: checklistId,
          title: item.title,
          display_order: item.display_order
        }))
      )
    }

    setLoading(false)
    navigate('/checklists')
  }

  const handleDeleteChecklist = async () => {
    if (!confirm('Are you sure you want to delete this checklist?')) return

    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', id)

    if (!error) {
      navigate('/checklists')
    }
  }

  if (loading && id) return <div className="spinner"></div>

  return (
    <div className="checklist-form">
      <h2 className="page-title">{id ? 'Edit Checklist' : 'New Checklist'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="section-title">Checklist Information</h3>

          <div className="form-group">
            <label className="form-label">Checklist Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Checklist Items</h3>
          
          <div className="items-list">
            {items.map((item, index) => (
              <div key={index} className="item-row">
                <div className="item-controls">
                  <button
                    type="button"
                    className="btn-move"
                    onClick={() => handleMoveItem(index, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn-move"
                    onClick={() => handleMoveItem(index, 'down')}
                    disabled={index === items.length - 1}
                  >
                    ↓
                  </button>
                </div>
                <span className="item-number">{index + 1}.</span>
                <span className="item-title">{item.title}</span>
                <button
                  type="button"
                  className="btn-remove"
                  onClick={() => handleRemoveItem(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="add-item-form">
            <input
              type="text"
              className="form-input"
              placeholder="Enter checklist item"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
              + Add Item
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/checklists')}>
            Cancel
          </button>
          {id && (
            <button type="button" className="btn btn-accent" onClick={handleDeleteChecklist}>
              Delete Checklist
            </button>
          )}
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : id ? 'Update Checklist' : 'Create Checklist'}
          </button>
        </div>
      </form>

      {id && (
        <div className="card" style={{ marginTop: '32px' }}>
          <div className="completions-header">
            <h3 className="section-title">Completion History ({completions.length})</h3>
            <button 
              className="btn btn-secondary"
              onClick={() => setShowCompletions(!showCompletions)}
            >
              {showCompletions ? 'Hide' : 'Show'}
            </button>
          </div>

          {showCompletions && (
            <div className="completions-list">
              {completions.length === 0 ? (
                <p>No completions yet.</p>
              ) : (
                completions.map((completion) => {
                  const checkedCount = completion.completed_items?.filter(item => item.is_checked).length || 0
                  const totalCount = completion.completed_items?.length || 0
                  
                  return (
                    <div key={completion.id} className="completion-item">
                      <div className="completion-header">
                        <div>
                          <p className="completion-date">
                            {new Date(completion.completed_at).toLocaleString()}
                          </p>
                          {completion.project && (
                            <p className="completion-project">Project: {completion.project.name}</p>
                          )}
                        </div>
                        <div className="completion-progress">
                          <span className={checkedCount === totalCount ? 'complete' : 'incomplete'}>
                            {checkedCount}/{totalCount}
                          </span>
                        </div>
                      </div>
                      {completion.notes && (
                        <p className="completion-notes">{completion.notes}</p>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
