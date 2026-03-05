import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchTrades, ensureTrade } from '../lib/trades'
import './Projects.css'

const EMPTY_FORM = {
  name: '',
  description: '',
  job_address: '',
  client_name: '',
  status: 'active',
  trades: [],
}

const STATUS_ORDER = { active: 0, completed: 1, archived: 2 }

export default function Projects() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [availableTrades, setAvailableTrades] = useState([])
  const [tradeInput, setTradeInput] = useState('')
  const [tradeDropdownOpen, setTradeDropdownOpen] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchProjects()
    fetchTrades().then(setAvailableTrades)
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        meetings(id, date, trade, topic, leader_name, completed)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    const payload = {
      name: formData.name,
      description: formData.description || null,
      job_address: formData.job_address || null,
      client_name: formData.client_name || null,
      status: formData.status,
      trades: formData.trades.length > 0 ? formData.trades : null,
      user_id: user.id,
    }
    const { error } = await supabase.from('projects').insert([payload])
    if (!error) {
      setShowForm(false)
      setFormData({ ...EMPTY_FORM })
      setTradeInput('')
      fetchProjects()
    }
  }

  const addFormTrade = (val) => {
    const trimmed = val.trim().replace(/,$/, '')
    if (!trimmed || formData.trades.includes(trimmed)) return
    setFormData({ ...formData, trades: [...formData.trades, trimmed] })
    if (!availableTrades.includes(trimmed)) {
      ensureTrade(trimmed)
      setAvailableTrades(prev => [...prev, trimmed].sort())
    }
    setTradeInput('')
    setTradeDropdownOpen(false)
  }

  const removeFormTrade = (t) =>
    setFormData({ ...formData, trades: formData.trades.filter(x => x !== t) })

  const toggleExpand = (id) => {
    setExpandedProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Filtered + sorted list ──────────────────────────────────────────────
  const displayedProjects = useMemo(() => {
    const q = searchTerm.toLowerCase().trim()
    let list = q
      ? projects.filter(p =>
          p.name?.toLowerCase().includes(q) ||
          p.client_name?.toLowerCase().includes(q) ||
          p.job_address?.toLowerCase().includes(q) ||
          p.trades?.some(t => t.toLowerCase().includes(q))
        )
      : [...projects]

    list.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at)
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at)
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'name_desc':
          return b.name.localeCompare(a.name)
        case 'status':
          return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
        case 'meetings_desc':
          return (b.meetings?.length ?? 0) - (a.meetings?.length ?? 0)
        default:
          return 0
      }
    })
    return list
  }, [projects, searchTerm, sortBy])

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Project
        </button>
      </div>

      {/* ── Controls ── */}
      <div className="projects-controls">
        <input
          type="text"
          className="projects-search"
          placeholder="Search by name, client, address or trade…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="projects-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="name_asc">Name A → Z</option>
          <option value="name_desc">Name Z → A</option>
          <option value="status">By status</option>
          <option value="meetings_desc">Most meetings</option>
        </select>
      </div>

      {/* ── Grid ── */}
      <div className="projects-grid">
        {displayedProjects.length === 0 && (
          <p className="projects-empty">No projects match your search.</p>
        )}
        {displayedProjects.map((project) => {
          const isExpanded = expandedProjects.has(project.id)
          const meetings = project.meetings || []
          const sortedMeetings = [...meetings].sort((a, b) => new Date(b.date) - new Date(a.date))

          return (
            <div key={project.id} className="card project-card">
              {/* Header */}
              <div className="project-card-header">
                <h3 className="project-name">{project.name}</h3>
                <span className={`project-status status-${project.status}`}>
                  {project.status}
                </span>
              </div>

              {/* Meta */}
              {project.client_name && (
                <p className="project-detail">
                  <span className="project-detail-label">Client:</span> {project.client_name}
                </p>
              )}
              {project.job_address && (
                <p className="project-detail">
                  <span className="project-detail-label">Address:</span> {project.job_address}
                </p>
              )}
              {project.description && (
                <p className="project-description">{project.description}</p>
              )}

              {/* Trade badges */}
              {project.trades && project.trades.length > 0 && (
                <div className="project-trades">
                  {project.trades.map(t => (
                    <span key={t} className="project-trade-badge">{t}</span>
                  ))}
                </div>
              )}

              {/* Meetings toggle */}
              <div className="project-meetings-section">
                <button
                  type="button"
                  className="project-meetings-toggle"
                  onClick={() => toggleExpand(project.id)}
                >
                  <span>
                    {meetings.length === 1
                      ? '1 meeting'
                      : `${meetings.length} meetings`}
                  </span>
                  <span className={`project-meetings-chevron ${isExpanded ? 'expanded' : ''}`}>
                    ▼
                  </span>
                </button>

                {isExpanded && (
                  <div className="project-meetings-list">
                    {sortedMeetings.length === 0 ? (
                      <p className="project-meetings-empty">No meetings yet.</p>
                    ) : (
                      sortedMeetings.map(m => (
                        <div key={m.id} className="project-meeting-item">
                          <span className="pmeet-date">
                            {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                          {m.topic && <span className="pmeet-topic">{m.topic}</span>}
                          {m.trade && <span className="pmeet-trade">{m.trade}</span>}
                          {m.leader_name && (
                            <span className="pmeet-leader">👤 {m.leader_name}</span>
                          )}
                          <span className={`pmeet-status ${m.completed ? 'pmeet-done' : 'pmeet-pending'}`}>
                            {m.completed ? 'Done' : 'In progress'}
                          </span>
                          <button
                            type="button"
                            className="pmeet-view-btn"
                            onClick={() => navigate(`/meetings/${m.id}`)}
                          >
                            View
                          </button>
                        </div>
                      ))
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary project-add-meeting-btn"
                      onClick={() => navigate(`/meetings/new?project_id=${project.id}`)}
                    >
                      + Add Meeting
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── New Project Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">New Project</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.job_address}
                  onChange={(e) => setFormData({ ...formData, job_address: e.target.value })}
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
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Trades */}
              <div className="form-group">
                <label className="form-label">Trades</label>
                <div className="st-trades-editor">
                  {formData.trades.map(t => (
                    <span key={t} className="st-trade-pill">
                      {t}
                      <button
                        type="button"
                        className="st-trade-pill-remove"
                        onClick={() => removeFormTrade(t)}
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
                          addFormTrade(tradeInput)
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
                                addFormTrade(t)
                              }}
                            >{t}</button>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowForm(false); setFormData({ ...EMPTY_FORM }); setTradeInput('') }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
