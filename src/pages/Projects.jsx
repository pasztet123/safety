import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchTrades, ensureTrade } from '../lib/trades'
import { NEW_TAB_LINK_PROPS, followAppPath } from '../lib/navigation'
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
  const [editingProject, setEditingProject] = useState(null)
  const [formData, setFormData] = useState({ ...EMPTY_FORM })
  const [formError, setFormError] = useState('')
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

  const openEditForm = (e, project) => {
    e.stopPropagation()
    setEditingProject(project)
    setFormData({
      name: project.name || '',
      description: project.description || '',
      job_address: project.job_address || '',
      client_name: project.client_name || '',
      status: project.status || 'active',
      trades: project.trades || [],
    })
    setTradeInput('')
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditingProject(null)
    setFormData({ ...EMPTY_FORM })
    setFormError('')
    setTradeInput('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      name: formData.name,
      description: formData.description || null,
      job_address: formData.job_address || null,
      client_name: formData.client_name || null,
      status: formData.status,
      trades: formData.trades.length > 0 ? formData.trades : null,
    }
    setFormError('')
    if (editingProject) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editingProject.id)
      if (error) { setFormError(error.message || 'Failed to update project.') }
      else { closeForm(); fetchProjects() }
    } else {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('projects').insert([{ ...payload, user_id: user.id }])
      if (error) { setFormError(error.message || 'Failed to create project.') }
      else { closeForm(); fetchProjects() }
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

  const toggleExpand = (id, e) => {
    e.stopPropagation()
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
            <div
              key={project.id}
              className="card project-card"
              style={{ cursor: 'pointer' }}
              onClick={(event) => followAppPath(navigate, `/projects/${project.id}`, { event })}
            >  
              {/* Header */}
              <div className="project-card-header">
                <h3 className="project-name">{project.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Link
                    className="btn btn-secondary btn-sm"
                    to={`/projects/${project.id}`}
                    {...NEW_TAB_LINK_PROPS}
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open
                  </Link>
                  <span className={`project-status status-${project.status}`}>
                    {project.status}
                  </span>
                  <button
                    type="button"
                    className="btn-icon-edit"
                    title="Edit project"
                    onClick={(e) => openEditForm(e, project)}
                  >
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M14.7 2.3a1 1 0 0 1 1.4 0l1.6 1.6a1 1 0 0 1 0 1.4L6.5 16.5l-4.5 1 1-4.5L14.7 2.3z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                  </button>
                </div>
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
              <div className="project-meetings-section" onClick={e => e.stopPropagation()}>
                <button
                  type="button"
                  className="project-meetings-toggle"
                  onClick={(e) => toggleExpand(project.id, e)}
                >
                  <span>
                    {meetings.length === 1
                      ? '1 meeting'
                      : `${meetings.length} meetings`}
                  </span>
                  <span className={`project-meetings-chevron ${isExpanded ? 'expanded' : ''}`}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 5L7 9L11 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
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
                            <span className="pmeet-leader">{m.leader_name}</span>
                          )}
                          <span className={`pmeet-status ${m.completed ? 'pmeet-done' : 'pmeet-pending'}`}>
                            {m.completed ? 'Done' : 'In progress'}
                          </span>
                          <Link
                            className="pmeet-view-btn"
                            to={`/meetings/${m.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </Link>
                        </div>
                      ))
                    )}
                    <Link
                      className="btn btn-secondary project-add-meeting-btn"
                      to={`/meetings/new?project_id=${project.id}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      + Add Meeting
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── New / Edit Project Modal ── */}
      {showForm && (
        <div className="modal-overlay" onClick={closeForm}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editingProject ? 'Edit Project' : 'New Project'}</h3>
            {formError && <p className="form-error-msg">{formError}</p>}
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
                  onClick={closeForm}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
