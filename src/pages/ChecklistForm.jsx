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
    category: '',
    trades: [],
  })
  const [items, setItems] = useState([])
  const [newItem, setNewItem] = useState('')
  const [newItemIsSection, setNewItemIsSection] = useState(false)
  const [completions, setCompletions] = useState([])
  const [showCompletions, setShowCompletions] = useState(false)
  const [categories, setCategories] = useState([])
  const [allChecklists, setAllChecklists] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [draggedIndex, setDraggedIndex] = useState(null)

  useEffect(() => {
    fetchCategories()
    if (id) {
      fetchChecklist()
      fetchCompletions()
    }
  }, [id])

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .order('category')
      .order('name')
    
    if (error) {
      console.error('Error fetching categories:', error)
      return
    }
    
    if (data) {
      setAllChecklists(data)
      const uniqueCategories = [...new Set(data.map(c => c.category).filter(Boolean))]
      setCategories(uniqueCategories.sort())
    }
  }

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
        category: data.category || '',
        trades: data.trades || [],
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

  const handleTemplateSelect = async (templateId) => {
    if (!templateId) {
      setSelectedTemplateId('')
      setFormData({ name: '', description: '', category: formData.category, trades: [] })
      setItems([])
      return
    }

    setSelectedTemplateId(templateId)
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        items:checklist_items(*)
      `)
      .eq('id', templateId)
      .single()

    if (!error && data) {
      setFormData({
        name: data.name,
        description: data.description || '',
        category: data.category || '',
        trades: data.trades || [],
      })
      const sortedItems = data.items.sort((a, b) => a.display_order - b.display_order)
      setItems(sortedItems.map(item => ({ 
        title: item.title, 
        display_order: item.display_order,
        is_section_header: item.is_section_header || false
      })))
    }
  }

  const handleAddItem = () => {
    if (!newItem.trim()) return
    setItems([...items, { 
      title: newItem, 
      display_order: items.length,
      is_section_header: newItemIsSection 
    }])
    setNewItem('')
    setNewItemIsSection(false)
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleDragStart = (index) => {
    // Nie pozwalaj przeciągać nagłówków sekcji
    if (!items[index] || items[index].is_section_header) return
    setDraggedIndex(index)
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    // Nie pozwalaj upuszczać na nagłówki sekcji
    if (!items[index] || items[index].is_section_header) return
    
    if (draggedIndex === null || draggedIndex === index) return
    
    const newItems = [...items]
    const draggedItem = newItems[draggedIndex]
    newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, draggedItem)
    
    newItems.forEach((item, i) => {
      item.display_order = i
    })
    
    setItems(newItems)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
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
        alert('Error updating checklist: ' + error.message)
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
        alert('Error creating checklist: ' + error.message)
        setLoading(false)
        return
      }
      checklistId = data.id
    }

    // Insert items
    if (items.length > 0) {
      const { error } = await supabase.from('checklist_items').insert(
        items.map(item => ({
          checklist_id: checklistId,
          title: item.title,
          display_order: item.display_order,
          is_section_header: item.is_section_header || false
        }))
      )
      
      if (error) {
        console.error('Error inserting items:', error)
        alert('Error saving checklist items: ' + error.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    navigate('/checklists')
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

  const filteredChecklists = formData.category 
    ? allChecklists.filter(c => c.category === formData.category)
    : []

  return (
    <div className="checklist-form">
      <h2 className="page-title">{id ? 'Edit Checklist' : 'New Checklist'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="section-title">Checklist Information</h3>

          {!id && (
            <>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => {
                    setFormData({ ...formData, category: e.target.value })
                    setSelectedTemplateId('')
                  }}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {formData.category && (
                <div className="form-group">
                  <label className="form-label">Use Existing Checklist as Template</label>
                  <select
                    className="form-select"
                    value={selectedTemplateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                  >
                    <option value="">Create New / Start from Scratch</option>
                    {filteredChecklists.map(checklist => (
                      <option key={checklist.id} value={checklist.id}>
                        {checklist.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

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

          <div className="form-group">
            <label className="form-label">Trades / Tags</label>
            <input
              type="text"
              className="form-input"
              value={formData.trades.join(', ')}
              onChange={(e) => {
                const tradesArray = e.target.value
                  .split(',')
                  .map(t => t.trim())
                  .filter(t => t.length > 0)
                setFormData({ ...formData, trades: tradesArray })
              }}
              placeholder="e.g., Roofing, Electrical, HVAC (comma-separated)"
            />
            <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>
              Add multiple trades separated by commas
            </small>
          </div>

          {id && (
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Checklist Items</h3>
          
          <div className="items-list">
            {items.map((item, index) => (
              <div 
                key={index} 
                className={`item-row ${item.is_section_header ? 'section-header-row' : ''} ${draggedIndex === index ? 'dragging' : ''}`}
                draggable={!item.is_section_header}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{ cursor: item.is_section_header ? 'default' : 'grab' }}
              >
                <span className="item-number">{index + 1}.</span>
                <span className={`item-title ${item.is_section_header ? 'section-header-title' : ''}`}>
                  {item.title}
                </span>
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
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={newItemIsSection}
                  onChange={(e) => setNewItemIsSection(e.target.checked)}
                />
                Section Header
              </label>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Enter checklist item"
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddItem())}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn btn-secondary" onClick={handleAddItem}>
                + Add Item
              </button>
            </div>
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
