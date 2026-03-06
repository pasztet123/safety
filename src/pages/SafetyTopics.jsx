import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchTrades, ensureTrade } from '../lib/trades'
import { SAFETY_CATEGORIES } from '../lib/categories'
import { getSuggestedChecklists } from '../lib/suggestChecklists'
import { generateSafetyTopicPDF } from '../lib/pdfGenerator'
import { downloadSafetyTopicsBrochurePDF } from '../lib/pdfBulkGenerator'
import './SafetyTopics.css'

export default function SafetyTopics() {
  const location = useLocation()
  const navigate = useNavigate()
  const [topics, setTopics] = useState([])
  const [filteredTopics, setFilteredTopics] = useState([])
  const [exportLoading, setExportLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [riskFilter, setRiskFilter] = useState('all')
  const [tradeFilter, setTradeFilter] = useState('all')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [editingTopic, setEditingTopic] = useState(null)
  const [tradeInput, setTradeInput] = useState('')
  const [tradeDropdownOpen, setTradeDropdownOpen] = useState(false)
  const [availableTrades, setAvailableTrades] = useState([])
  const [allChecklists, setAllChecklists] = useState([])
  const [checklistsLoaded, setChecklistsLoaded] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    osha_reference: '',
    description: '',
    risk_level: 'medium',
    image_url: '',
    trades: []
  })

  useEffect(() => {
    checkAdminAndLoadTopics()
  }, [])

  useEffect(() => {
    filterTopics()
  }, [topics, searchTerm, categoryFilter, riskFilter, tradeFilter])

  useEffect(() => {
    const openTopicId = location.state?.openTopicId
    if (!openTopicId || topics.length === 0) return
    const topic = topics.find(t => t.id === openTopicId)
    if (topic) handleOpenTopic(topic)
  }, [topics, location.state])

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
    fetchTrades().then(setAvailableTrades)
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

    // Trade filter
    if (tradeFilter === '__none__') {
      filtered = filtered.filter(topic => !topic.trades || topic.trades.length === 0)
    } else if (tradeFilter !== 'all') {
      filtered = filtered.filter(topic => topic.trades?.includes(tradeFilter))
    }
    
    setFilteredTopics(filtered)
  }

  const buildPayload = (fd) => ({
    name: fd.name,
    category: fd.category || null,
    osha_reference: fd.osha_reference || null,
    description: fd.description || null,
    risk_level: fd.risk_level,
    image_url: fd.image_url || null,
    trades: fd.trades && fd.trades.length > 0 ? fd.trades : null,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const emptyForm = { name: '', category: '', osha_reference: '', description: '', risk_level: 'medium', image_url: '', trades: [] }
    if (editingTopic) {
      // Update existing topic
      const { error } = await supabase
        .from('safety_topics')
        .update(buildPayload(formData))
        .eq('id', editingTopic.id)
      
      if (!error) {
        setFormData(emptyForm)
        setTradeInput('')
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
          ...buildPayload(formData),
          created_by: user.id
        }])
      
      if (!error) {
        setFormData(emptyForm)
        setTradeInput('')
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
      image_url: topic.image_url || '',
      trades: topic.trades || []
    })
    setTradeInput('')
    setEditingTopic(topic)
    setShowAddForm(true)
  }

  // Lazy-load all checklists once the first topic modal is opened
  const loadChecklistsIfNeeded = async () => {
    if (checklistsLoaded) return
    const { data } = await supabase
      .from('checklists')
      .select('id, name, category, trades, description')
      .order('category')
      .order('name')
    if (data) {
      setAllChecklists(data)
      setChecklistsLoaded(true)
    }
  }

  const handleOpenTopic = (topic) => {
    setSelectedTopic(topic)
    loadChecklistsIfNeeded()
  }

  const handleCancelEdit = () => {
    setFormData({
      name: '',
      category: '',
      osha_reference: '',
      description: '',
      risk_level: 'medium',
      image_url: '',
      trades: []
    })
    setTradeInput('')
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
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && filteredTopics.length > 0 && (
            <button
              className="btn btn-secondary"
              disabled={exportLoading}
              onClick={async () => {
                setExportLoading(true)
                try { await downloadSafetyTopicsBrochurePDF(filteredTopics, 'Safety Topics Brochure') }
                catch (e) { console.error('Brochure PDF failed:', e); alert('PDF generation failed: ' + (e?.message || e)) }
                finally { setExportLoading(false) }
              }}
              title="Download all visible topics as a brochure PDF"
            >
              {exportLoading ? '…' : '↓ Brochure PDF'}
            </button>
          )}
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
                risk_level: 'medium',
                image_url: '',
                trades: []
              })
              setTradeInput('')
            }
            setShowAddForm(!showAddForm)
          }}
        >
          {showAddForm ? 'Cancel' : '+ Add Topic'}
        </button>
        </div>
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
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {SAFETY_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
              <label className="form-label">Trades</label>
              <div className="st-trades-editor">
                {formData.trades.map(t => (
                  <span key={t} className="st-trade-pill">
                    {t}
                    <button
                      type="button"
                      className="st-trade-pill-remove"
                      onClick={() => setFormData({ ...formData, trades: formData.trades.filter(x => x !== t) })}
                    >×</button>
                  </span>
                ))}
                <div className="st-trade-input-wrap">
                  <input
                    type="text"
                    className="st-trade-input"
                    placeholder="Add trade…"
                    value={tradeInput}
                    autoComplete="off"
                    onChange={(e) => { setTradeInput(e.target.value); setTradeDropdownOpen(true) }}
                    onFocus={() => setTradeDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setTradeDropdownOpen(false), 150)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && tradeInput.trim()) {
                        e.preventDefault()
                        const val = tradeInput.trim().replace(/,$/, '')
                        if (val && !formData.trades.includes(val)) {
                          setFormData({ ...formData, trades: [...formData.trades, val] })
                          // Register new trade in canonical table if it doesn't exist yet
                          if (!availableTrades.includes(val)) {
                            ensureTrade(val)
                            setAvailableTrades(prev => [...prev, val].sort())
                          }
                        }
                        setTradeInput('')
                        setTradeDropdownOpen(false)
                      }
                      if (e.key === 'Escape') setTradeDropdownOpen(false)
                    }}
                  />
                  {tradeDropdownOpen && (
                    <div className="st-trade-dropdown">
                      {availableTrades
                        .filter(t =>
                          !formData.trades.includes(t) &&
                          (!tradeInput.trim() || t.toLowerCase().includes(tradeInput.toLowerCase()))
                        )
                        .map(t => (
                          <button
                            key={t}
                            type="button"
                            className="st-trade-option"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              if (!formData.trades.includes(t)) {
                                setFormData({ ...formData, trades: [...formData.trades, t] })
                              }
                              setTradeInput('')
                              setTradeDropdownOpen(false)
                            }}
                          >{t}</button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
              <p className="form-hint">Press Enter or comma to add. Matches with checklist trades for smart sorting in meetings.</p>
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
          
          <div className="filter-row filter-row--3">
            <select
              className="form-select filter-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {SAFETY_CATEGORIES.map(cat => (
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

            <select
              className="form-select filter-select"
              value={tradeFilter}
              onChange={(e) => setTradeFilter(e.target.value)}
            >
              <option value="all">All Trades</option>
              <option value="__none__">— No trade assigned</option>
              {availableTrades.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
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
                      onClick={() => handleOpenTopic(topic)}
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

                  {topic.trades && topic.trades.length > 0 && (
                    <div className="topic-trades-row">
                      {topic.trades.map(t => (
                        <button
                          key={t}
                          type="button"
                          className={`topic-trade-badge${tradeFilter === t ? ' is-active' : ''}`}
                          onClick={() => setTradeFilter(tradeFilter === t ? 'all' : t)}
                          title={`Filter by ${t}`}
                        >{t}</button>
                      ))}
                    </div>
                  )}

                  {topic.description && (
                    <p className="topic-description-preview">
                      {topic.description.split('\n')[0].substring(0, 150)}
                      {topic.description.length > 150 ? '...' : ''}
                      {topic.description.length > 150 && (
                        <button className="btn-read-more" onClick={() => handleOpenTopic(topic)}>
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

              {/* Suggested checklists based on trade + category overlap */}
              {(() => {
                const suggestions = getSuggestedChecklists(selectedTopic, allChecklists, 5)
                if (suggestions.length === 0) return null
                return (
                  <div className="topic-suggestions">
                    <h4 className="topic-suggestions-title">Recommended Checklists</h4>
                    <div className="topic-suggestions-list">
                      {suggestions.map(({ checklist, score }) => (
                        <div key={checklist.id} className="topic-suggestion-card">
                          <div className="topic-suggestion-info">
                            <span className="topic-suggestion-name">{checklist.name}</span>
                            {checklist.category && (
                              <span className="topic-suggestion-cat">{checklist.category}</span>
                            )}
                            {checklist.trades && checklist.trades.length > 0 && (
                              <div className="topic-suggestion-trades">
                                {checklist.trades.map(t => (
                                  <span key={t} className="topic-trade-badge">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="topic-suggestion-actions">
                            <div className="topic-suggestion-score" title={`Match score: ${score}/100`}>
                              <div className="topic-suggestion-score-bar">
                                <div className="topic-suggestion-score-fill" style={{ width: `${score}%` }} />
                              </div>
                              <span className="topic-suggestion-score-label">{score}%</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-primary"
                              onClick={() => navigate(`/checklists/${checklist.id}/complete`)}
                            >Fill</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
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
