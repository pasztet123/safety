import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { generateSafetyTopicPDF } from '../lib/pdfGenerator'
import './SafetyTopics.css'

export default function SafetyTopics() {
  const [topics, setTopics] = useState([])
  const [filteredTopics, setFilteredTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [editingTopic, setEditingTopic] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    osha_reference: '',
    description: '',
    risk_level: 'medium',
    image_url: ''
  })

  useEffect(() => {
    checkAdminAndLoadTopics()
  }, [])

  useEffect(() => {
    filterTopics()
  }, [topics, searchTerm, categoryFilter, riskFilter])

  const checkAdminAndLoadTopics = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
    
    fetchTopics()
  }

  const fetchTopics = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('safety_topics')
      .select('*')
      .order('category')
      .order('name')
    
    if (!error && data) {
      setTopics(data)
    }
    setLoading(false)
  }

  const filterTopics = () => {
    let filtered = [...topics]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(topic => 
        topic.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        topic.osha_reference?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(topic => topic.category === categoryFilter)
    }
    
    // Risk level filter
    if (riskFilter !== 'all') {
      filtered = filtered.filter(topic => topic.risk_level === riskFilter)
    }
    
    setFilteredTopics(filtered)
  }

  const getCategories = () => {
    const categories = [...new Set(topics.map(t => t.category).filter(Boolean))]
    return categories.sort()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (editingTopic) {
      // Update existing topic
      const { error } = await supabase
        .from('safety_topics')
        .update(formData)
        .eq('id', editingTopic.id)
      
      if (!error) {
        setFormData({
          name: '',
          category: '',
          osha_reference: '',
          description: '',
          risk_level: 'medium',
          image_url: ''
        })
        setEditingTopic(null)
        setShowAddForm(false)
        fetchTopics()
      } else {
        alert('Error updating topic: ' + error.message)
      }
    } else {
      // Create new topic
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('safety_topics')
        .insert([{
          ...formData,
          created_by: user.id
        }])
      
      if (!error) {
        setFormData({
          name: '',
          category: '',
          osha_reference: '',
          description: '',
          risk_level: 'medium',
          image_url: ''
        })
        setShowAddForm(false)
        fetchTopics()
      } else {
        alert('Error adding topic: ' + error.message)
      }
    }
  }

  const handleEdit = (topic) => {
    setFormData({
      name: topic.name,
      category: topic.category || '',
      osha_reference: topic.osha_reference || '',
      description: topic.description || '',
      risk_level: topic.risk_level,
      image_url: topic.image_url || ''
    })
    setEditingTopic(topic)
    setShowAddForm(true)
  }

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      category: '',
      osha_reference: '',
      description: '',
      risk_level: 'medium',
      image_url: ''
    })
    setEditingTopic(null)
    setShowAddForm(false)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return
    
    const { error } = await supabase
      .from('safety_topics')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchTopics()
    } else {
      alert('Error deleting topic: ' + error.message)
    }
  }

  const getRiskBadgeClass = (riskLevel) => {
    switch(riskLevel) {
      case 'low': return 'risk-badge-low'
      case 'medium': return 'risk-badge-medium'
      case 'high': return 'risk-badge-high'
      case 'critical': return 'risk-badge-critical'
      default: return ''
    }
  }

  if (loading) {
    return <div className="container"><p>Loading...</p></div>
  }

  return (
    <div className="container">
      <div className="page-header">
        <h1 className="page-title">Safety Topics</h1>
        <button 
          className="btn btn-primary"
          onClick={() => {
            if (!showAddForm) {
              setEditingTopic(null)
              setFormData({
                name: '',
                category: '',
                osha_reference: '',
                description: '',
                risk_level: 'medium'
              })
            }
            setShowAddForm(!showAddForm)
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Topic'}
        </button>
      </div>

      {showAddForm && (
        <div className="card add-topic-form">
          <h3>{editingTopic ? 'Edit Safety Topic' : 'Add New Safety Topic'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Topic Name *</label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  list="categories"
                  placeholder="e.g., Personal Protective Equipment"
                />
                <datalist id="categories">
                  {getCategories().map(cat => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label className="form-label">OSHA Reference</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.osha_reference}
                  onChange={(e) => setFormData({ ...formData, osha_reference: e.target.value })}
                  placeholder="e.g., 1926.503"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input
                type="url"
                className="form-input"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://... (Supabase Storage URL)"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Risk Level *</label>
              <select
                className="form-select"
                value={formData.risk_level}
                onChange={(e) => setFormData({ ...formData, risk_level: e.target.value })}
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="8"
                placeholder="Enter detailed description with sections like Requirements, Safe Practices, Action Items..."
              />
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingTopic ? 'Update Topic' : 'Add Topic'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="filters-section">
          <input
            type="text"
            className="form-input search-input"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="filter-row">
            <select
              className="form-select filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {getCategories().map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              className="form-select filter-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            >
              <option value="all">All Risk Levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        {filteredTopics.length === 0 ? (
          <p className="no-results">No topics found</p>
        ) : (
          <div className="topics-list">
            {filteredTopics.map(topic => (
              <div key={topic.id} className="topic-card">
                {/* Thumbnail strip */}
                <div className="topic-image-strip">
                  {topic.image_url ? (
                    <img src={topic.image_url} alt={topic.name} />
                  ) : (
                    <div className="topic-image-placeholder">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="topic-body">
                  <div className="topic-top-row">
                    <h3
                      className="topic-title topic-title-clickable"
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic.name}
                    </h3>
                    <div className="topic-badges">
                      {topic.osha_reference && (
                        <span className="osha-badge">OSHA {topic.osha_reference}</span>
                      )}
                      <span className={`risk-badge ${getRiskBadgeClass(topic.risk_level)}`}>
                        {topic.risk_level}
                      </span>
                      <button
                        className="btn-pdf-topic"
                        onClick={() => generateSafetyTopicPDF(topic)}
                        title="Download PDF"
                      >PDF</button>
                      {isAdmin && (
                        <>
                          <button className="btn-edit-topic" onClick={() => handleEdit(topic)} title="Edit topic">✎</button>
                          <button className="btn-delete-topic" onClick={() => handleDelete(topic.id, topic.name)} title="Delete topic">×</button>
                        </>
                      )}
                    </div>
                  </div>

                  {topic.category && (
                    <span className="topic-category">{topic.category}</span>
                  )}

                  {topic.description && (
                    <p className="topic-description-preview">
                      {topic.description.split('\n')[0].substring(0, 150)}
                      {topic.description.length > 150 ? '...' : ''}
                      {topic.description.length > 150 && (
                        <button className="btn-read-more" onClick={() => setSelectedTopic(topic)}>
                          Read more
                        </button>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTopic && (
        <div className="modal-overlay" onClick={() => setSelectedTopic(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {selectedTopic.image_url && (
              <img
                className="modal-hero-image"
                src={selectedTopic.image_url}
                alt={selectedTopic.name}
              />
            )}
            <div className="modal-header">
              <h2>{selectedTopic.name}</h2>
              <div className="modal-header-actions">
                <button
                  className="btn btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => generateSafetyTopicPDF(selectedTopic)}
                >PDF</button>
                {isAdmin && (
                  <button 
                    className="btn-edit-modal"
                    onClick={() => {
                      handleEdit(selectedTopic)
                      setSelectedTopic(null)
                    }}
                    title="Edit topic"
                  >
                    ✎ Edit
                  </button>
                )}
                <button className="modal-close" onClick={() => setSelectedTopic(null)}>×</button>
              </div>
            </div>
            <div className="modal-body">
              {selectedTopic.category && (
                <div className="modal-meta">
                  <span className="topic-category">{selectedTopic.category}</span>
                  {selectedTopic.osha_reference && (
                    <span className="osha-badge">OSHA {selectedTopic.osha_reference}</span>
                  )}
                  <span className={`risk-badge ${getRiskBadgeClass(selectedTopic.risk_level)}`}>
                    {selectedTopic.risk_level} risk
                  </span>
                </div>
              )}
              {selectedTopic.description && (
                <div className="topic-description-full">
                  {selectedTopic.description.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="topics-summary">
        Showing {filteredTopics.length} of {topics.length} topics
      </div>
    </div>
  )
}
