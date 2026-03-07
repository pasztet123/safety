import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateIncidentPDF } from '../lib/pdfGenerator'
import { downloadIncidentListPDF } from '../lib/pdfBulkGenerator'
import LocationMap from '../components/LocationMap'
import './IncidentForm.css'

export default function Incidents() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [correctiveActions, setCorrectiveActions] = useState({})
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  // Search / filter / sort
  const [searchText, setSearchText] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Derived filter options
  const typesInIncidents = useMemo(() => {
    const t = new Set(incidents.map(i => i.type_name).filter(Boolean))
    return [...t].sort()
  }, [incidents])

  const personsInIncidents = useMemo(() => {
    const p = new Set(incidents.map(i => i.employee_name).filter(Boolean))
    return [...p].sort()
  }, [incidents])

  const filteredIncidents = useMemo(() => {
    let result = [...incidents]
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(i =>
        i.type_name?.toLowerCase().includes(q) ||
        i.employee_name?.toLowerCase().includes(q) ||
        i.reporter_name?.toLowerCase().includes(q) ||
        i.project?.name?.toLowerCase().includes(q) ||
        i.location?.toLowerCase().includes(q) ||
        i.details?.toLowerCase().includes(q)
      )
    }
    if (filterType) result = result.filter(i => i.type_name === filterType)
    if (filterPerson) result = result.filter(i => i.employee_name === filterPerson)
    switch (sortBy) {
      case 'oldest': result.sort((a, b) => a.date.localeCompare(b.date)); break
      case 'az': result.sort((a, b) => (a.type_name || '').localeCompare(b.type_name || '')); break
      case 'za': result.sort((a, b) => (b.type_name || '').localeCompare(a.type_name || '')); break
      default: result.sort((a, b) => { const d = b.date.localeCompare(a.date); return d !== 0 ? d : (b.time || '').localeCompare(a.time || '') })
    }
    return result
  }, [incidents, searchText, filterType, filterPerson, sortBy])

  const filtersActive = searchText || filterType || filterPerson || sortBy !== 'newest'

  useEffect(() => {
    checkAdminAndFetchData()
  }, [])

  const checkAdminAndFetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
    
    await fetchIncidents()
    await fetchInvolvedPersons()
  }

  const fetchIncidents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        project:projects(name)
      `)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (!error && data) {
      setIncidents(data)
      
      // Fetch corrective actions for all incidents
      const incidentIds = data.map(i => i.id)
      if (incidentIds.length > 0) {
        const { data: actions } = await supabase
          .from('corrective_actions')
          .select('*')
          .in('incident_id', incidentIds)
        
        if (actions) {
          // Group actions by incident_id
          const actionsByIncident = {}
          actions.forEach(action => {
            if (!actionsByIncident[action.incident_id]) {
              actionsByIncident[action.incident_id] = []
            }
            actionsByIncident[action.incident_id].push(action)
          })
          setCorrectiveActions(actionsByIncident)
        }
      }
    }
    setLoading(false)
  }
  
  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name')
      .order('name')
    if (data) setInvolvedPersons(data)
  }

  const handleGeneratePDF = async (incident) => {
    setPdfLoading(incident.id)
    try {
      await generateIncidentPDF(incident)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleDeleteIncident = async (incidentId) => {
    await supabase.from('corrective_actions').delete().eq('incident_id', incidentId)
    await supabase.from('incidents').delete().eq('id', incidentId)
    setDeleteConfirm(null)
    await fetchIncidents()
  }
  
  const handleToggleActionStatus = async (actionId, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'completed' : 'open'
    const updateData = {
      status: newStatus,
      completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
    }
    
    const { error } = await supabase
      .from('corrective_actions')
      .update(updateData)
      .eq('id', actionId)
    
    if (!error) {
      // Refresh corrective actions
      await fetchIncidents()
    }
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Incidents</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && filteredIncidents.length > 0 && (
            <button
              className="btn btn-secondary"
              disabled={exportLoading}
              onClick={async () => {
                setExportLoading(true)
                try { await downloadIncidentListPDF(filteredIncidents, 'Incidents Report', `${filteredIncidents.length} incidents`) }
                catch (e) { console.error(e) }
                finally { setExportLoading(false) }
              }}
              title="Download a summary PDF of filtered incidents"
            >
              {exportLoading ? '…' : '↓ Export PDF'}
            </button>
          )}
          <button className="btn btn-accent" onClick={() => navigate('/incidents/new')}>
            + Report Incident
          </button>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <input
          className="filter-search-input"
          type="text"
          placeholder="Search type, employee, location..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="filter-select">
          <option value="">All types</option>
          {typesInIncidents.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="filter-select">
          <option value="">All employees</option>
          {personsInIncidents.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">Type A → Z</option>
          <option value="za">Type Z → A</option>
        </select>
        {filtersActive && (
          <button className="filter-clear-btn" onClick={() => { setSearchText(''); setFilterType(''); setFilterPerson(''); setSortBy('newest') }}>
            Clear
          </button>
        )}
      </div>

      <div className="incidents-list">
        {filteredIncidents.length === 0 ? (
          <div className="empty-state">
            <p>{incidents.length === 0 ? 'No incidents reported. Stay safe!' : 'Brak wyników dla podanych filtrów.'}</p>
          </div>
        ) : (
          filteredIncidents.map((incident) => (
            <div key={incident.id} className="card incident-card">
              <div className="incident-header">
                <div>
                  <div>
                    <span className="incident-type-badge">{incident.type_name}</span>
                    {incident.incident_subtype && (
                      <span className="incident-subtype-badge">
                        {incident.incident_subtype.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <p className="incident-meta">
                    {new Date(incident.date).toLocaleDateString()} at{' '}
                    {incident.time}
                  </p>
                  {incident.project && (
                    <p className="incident-project">Project: {incident.project.name}</p>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/incidents/${incident.id}/edit`)}
                >
                  Edit
                </button>
              </div>

              <div className="incident-details">
                <div className="incident-detail-item">
                  <strong>Employee:</strong> {incident.employee_name}
                </div>
                {incident.phone && (
                  <div className="incident-detail-item">
                    <strong>Phone:</strong> {incident.phone}
                  </div>
                )}
                <div className="incident-detail-item">
                  <strong>Reporter:</strong> {incident.reporter_name}
                </div>
                {incident.location && (
                  <div className="incident-detail-item">
                    <strong>Location:</strong> {incident.location}
                    <LocationMap latitude={incident.latitude} longitude={incident.longitude} height={180} />
                  </div>
                )}
                <div className="incident-detail-item">
                  <strong>Details:</strong>
                  <p>{incident.details}</p>
                </div>
                {incident.notes && (
                  <div className="incident-detail-item">
                    <strong>Notes:</strong>
                    <p>{incident.notes}</p>
                  </div>
                )}
                {incident.photo_url && (
                  <div className="incident-detail-item">
                    <strong>Photo:</strong> Attached
                  </div>
                )}
                {incident.signature_url && (
                  <div className="incident-detail-item">
                    <strong>Signature:</strong> Signed by {incident.reporter_name}
                  </div>
                )}
              </div>

              {correctiveActions[incident.id] && correctiveActions[incident.id].length > 0 && (
                <div className="ica-section">
                  <p className="ica-title">Corrective Actions <span className="ica-count">{correctiveActions[incident.id].length}</span></p>
                  <div className="ica-list">
                    {correctiveActions[incident.id].map(action => (
                      <div key={action.id} className={`ica-row ${action.status}`}>
                        <input
                          type="checkbox"
                          className="ica-checkbox"
                          checked={action.status === 'completed'}
                          onChange={() => handleToggleActionStatus(action.id, action.status)}
                          disabled={!isAdmin}
                        />
                        <div className="ica-body">
                          <p className="ica-desc">{action.description}</p>
                          <div className="ica-meta">
                            {action.responsible_person_id && (
                              <span className="ica-tag">
                                {involvedPersons.find(p => p.id === action.responsible_person_id)?.name || 'Unknown'}
                              </span>
                            )}
                            {action.due_date && (
                              <span className="ica-tag ica-tag--date">Due {new Date(action.due_date).toLocaleDateString()}</span>
                            )}
                            {action.completion_date && (
                              <span className="ica-tag ica-tag--done">Completed {new Date(action.completion_date).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/incidents/${incident.id}`)}
                >
                  View Details
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleGeneratePDF(incident)}
                  disabled={pdfLoading === incident.id}
                  style={{ minWidth: '70px' }}
                >
                  {pdfLoading === incident.id ? '…' : 'PDF'}
                </button>
                {isAdmin && (
                  deleteConfirm === incident.id ? (
                    <>
                      <button className="btn btn-danger" onClick={() => handleDeleteIncident(incident.id)}>
                        Confirm Delete
                      </button>
                      <button className="btn btn-secondary" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-danger" onClick={() => setDeleteConfirm(incident.id)}>
                      Delete
                    </button>
                  )
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
