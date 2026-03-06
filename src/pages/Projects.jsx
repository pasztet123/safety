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
      .select('*')
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
        {displayedProjects.map((project) => (
            <div key={project.id} className="card project-card" style={{ cursor: 'pointer' }} onClick={() => navigate(`/projects/${project.id}`)}>  
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

            </div>
        ))}
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
