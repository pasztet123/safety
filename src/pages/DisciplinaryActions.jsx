import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { DISCIPLINARY_ACTION_TYPES, SAFETY_VIOLATION_OPTIONS, createEmptyDisciplinaryAction } from '../lib/disciplinary'
import { downloadDisciplinaryActionsListPDF } from '../lib/pdfBulkGenerator'
import './DisciplinaryActions.css'

export default function DisciplinaryActions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const presetIncidentId = searchParams.get('incidentId') || ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [actions, setActions] = useState([])
  const [incidents, setIncidents] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [leaders, setLeaders] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingActionId, setEditingActionId] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [actionTypeFilter, setActionTypeFilter] = useState('all')
  const [violationFilter, setViolationFilter] = useState('all')
  const [leaderFilter, setLeaderFilter] = useState('all')
  const [newAction, setNewAction] = useState({
    incident_id: presetIncidentId,
    violation_type: '',
    ...createEmptyDisciplinaryAction(),
  })
  const [editForm, setEditForm] = useState({})

  const normalizeId = (value) => String(value || '')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (presetIncidentId) {
      setNewAction(prev => {
        const presetIncident = incidents.find(incident => normalizeId(incident.id) === normalizeId(presetIncidentId))
        return {
          ...prev,
          incident_id: presetIncidentId,
          violation_type: presetIncident?.safety_violation_type || prev.violation_type || '',
        }
      })
      setShowAddForm(true)
    }
  }, [presetIncidentId, incidents])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setIsAdmin(data?.is_admin || false)
    }

    await Promise.all([
      fetchActions(),
      fetchIncidents(),
      fetchInvolvedPersons(),
      fetchLeaders(),
    ])
    setLoading(false)
  }

  const fetchActions = async () => {
    const { data, error } = await supabase
      .from('disciplinary_actions')
      .select('*')
      .order('action_date', { ascending: false })
      .order('action_time', { ascending: false })

    if (!error) setActions(data || [])
  }

  const fetchIncidents = async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('id, type_name, date, time, employee_name, safety_violation_type, project:projects(name)')
      .is('deleted_at', null)
      .eq('type_name', 'Safety violation')
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (!error) setIncidents(data || [])
  }

  const fetchInvolvedPersons = async () => {
    const { data, error } = await supabase
      .from('involved_persons')
      .select('id, name')
      .order('name')

    if (!error) setInvolvedPersons(data || [])
  }

  const fetchLeaders = async () => {
    const { data, error } = await supabase
      .from('leaders')
      .select('id, name')
      .order('name')

    if (!error) setLeaders(data || [])
  }

  const getIncident = (incidentId) => incidents.find(incident => normalizeId(incident.id) === normalizeId(incidentId))
  const getPersonName = (personId) => involvedPersons.find(person => person.id === personId)?.name || 'Unknown'
  const getLeaderName = (leaderId) => leaders.find(leader => leader.id === leaderId)?.name || 'Unknown'

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const incident = getIncident(action.incident_id)
      const recipientName = getPersonName(action.recipient_person_id)
      const leaderName = getLeaderName(action.responsible_leader_id)
      const query = searchTerm.trim().toLowerCase()

      const matchesSearch = !query || [
        action.action_type,
        action.action_notes,
        incident?.employee_name,
        incident?.safety_violation_type,
        incident?.project?.name,
        recipientName,
        leaderName,
      ].some(value => value?.toLowerCase().includes(query))

      const matchesActionType = actionTypeFilter === 'all' || action.action_type === actionTypeFilter
      const matchesViolation = violationFilter === 'all' || incident?.safety_violation_type === violationFilter
      const matchesLeader = leaderFilter === 'all' || action.responsible_leader_id === leaderFilter

      return matchesSearch && matchesActionType && matchesViolation && matchesLeader
    })
  }, [actions, searchTerm, actionTypeFilter, violationFilter, leaderFilter, incidents, involvedPersons, leaders])

  const validateAction = (action) => {
    if (!action.incident_id) return 'Select a safety violation incident'
    if (!getIncident(action.incident_id)) return 'Selected safety violation incident is no longer available'
    if (!action.violation_type) return 'Select a violation type'
    if (!action.recipient_person_id) return 'Select a recipient'
    if (!action.responsible_leader_id) return 'Select a responsible worker performing the meeting'
    if (!action.action_type) return 'Select an action taken'
    if (!action.action_date) return 'Select an action date'
    if (!action.action_time) return 'Select an action time'

    return ''
  }

  const handleAddAction = async () => {
    const validationError = validateAction(newAction)
    if (validationError) {
      alert(validationError)
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error: incidentUpdateError } = await supabase
      .from('incidents')
      .update({
        safety_violation_type: newAction.violation_type,
        updated_by: user?.id || null,
      })
      .eq('id', newAction.incident_id)

    if (incidentUpdateError) {
      setSaving(false)
      console.error(incidentUpdateError)
      alert('Unable to save violation type for the selected incident')
      return
    }

    const { error } = await supabase
      .from('disciplinary_actions')
      .insert([{
        incident_id: newAction.incident_id,
        recipient_person_id: newAction.recipient_person_id,
        responsible_leader_id: newAction.responsible_leader_id,
        action_type: newAction.action_type,
        action_notes: newAction.action_notes?.trim() || null,
        action_date: newAction.action_date,
        action_time: newAction.action_time,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      }])

    setSaving(false)
    if (error) {
      console.error(error)
      alert('Unable to save disciplinary action')
      return
    }

    await fetchIncidents()
    setNewAction({ incident_id: presetIncidentId, violation_type: '', ...createEmptyDisciplinaryAction() })
    setShowAddForm(false)
    await fetchActions()
  }

  const handleStartEdit = (action) => {
    setEditingActionId(action.id)
    setEditForm({
      incident_id: action.incident_id,
      violation_type: getIncident(action.incident_id)?.safety_violation_type || '',
      recipient_person_id: action.recipient_person_id,
      responsible_leader_id: action.responsible_leader_id,
      action_type: action.action_type,
      action_notes: action.action_notes || '',
      action_date: action.action_date,
      action_time: (action.action_time || '').slice(0, 5),
    })
  }

  const handleSaveEdit = async (actionId) => {
    const validationError = validateAction(editForm)
    if (validationError) {
      alert(validationError)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { error: incidentUpdateError } = await supabase
      .from('incidents')
      .update({
        safety_violation_type: editForm.violation_type,
        updated_by: user?.id || null,
      })
      .eq('id', editForm.incident_id)

    if (incidentUpdateError) {
      console.error(incidentUpdateError)
      alert('Unable to save violation type for the selected incident')
      return
    }

    const { error } = await supabase
      .from('disciplinary_actions')
      .update({
        incident_id: editForm.incident_id,
        recipient_person_id: editForm.recipient_person_id,
        responsible_leader_id: editForm.responsible_leader_id,
        action_type: editForm.action_type,
        action_notes: editForm.action_notes?.trim() || null,
        action_date: editForm.action_date,
        action_time: editForm.action_time,
        updated_by: user?.id || null,
      })
      .eq('id', actionId)

    if (error) {
      console.error(error)
      alert('Unable to update disciplinary action')
      return
    }

    setEditingActionId(null)
    setEditForm({})
    await fetchIncidents()
    await fetchActions()
  }

  const handleDelete = async (actionId, label) => {
    if (!confirm(`Are you sure you want to delete the disciplinary action "${label}"?`)) return
    const { error } = await supabase.from('disciplinary_actions').delete().eq('id', actionId)
    if (!error) await fetchActions()
  }

  if (loading) {
    return <div className="loading">Loading disciplinary actions...</div>
  }

  const selectedNewIncident = getIncident(newAction.incident_id)

  return (
    <div className="corrective-actions-page disciplinary-actions-page">
      <div className="page-header">
        <h1>Disciplinary Actions Log</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {filteredActions.length > 0 && (
            <button
              className="btn btn-secondary"
              disabled={exportLoading}
              onClick={async () => {
                setExportLoading(true)
                try {
                  await downloadDisciplinaryActionsListPDF(
                    filteredActions,
                    involvedPersons,
                    leaders,
                    incidents,
                    'Disciplinary Actions Report',
                    `${filteredActions.length} actions`
                  )
                } catch (error) {
                  console.error(error)
                } finally {
                  setExportLoading(false)
                }
              }}
            >
              {exportLoading ? '…' : '↓ Export PDF'}
            </button>
          )}
          <button className="btn-primary" onClick={() => setShowAddForm(v => !v)}>
            {showAddForm ? 'Cancel' : '+ Add Disciplinary Action'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-form-container disciplinary-form-container">
          <h2>Add Disciplinary Action</h2>
          <div className="if-row-2">
            <div className="form-group">
              <label className="form-label">Safety violation incident *</label>
              <select
                className="form-select"
                value={newAction.incident_id}
                onChange={e => {
                  const incidentId = e.target.value
                  const selectedIncident = getIncident(incidentId)
                  setNewAction(prev => ({
                    ...prev,
                    incident_id: incidentId,
                    violation_type: selectedIncident?.safety_violation_type || '',
                  }))
                }}
              >
                <option value="">Select incident</option>
                {incidents.map(incident => (
                  <option key={incident.id} value={incident.id}>
                    {incident.safety_violation_type || 'Safety violation'} - {incident.employee_name} - {new Date(incident.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Violation type *</label>
              <select
                className="form-select"
                value={newAction.violation_type}
                onChange={e => setNewAction(prev => ({ ...prev, violation_type: e.target.value }))}
                disabled={!newAction.incident_id}
              >
                <option value="">Select violation type</option>
                {SAFETY_VIOLATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
          <div className="if-row-2">
            <div className="form-group">
              <label className="form-label">Recipient *</label>
              <select className="form-select" value={newAction.recipient_person_id} onChange={e => setNewAction(prev => ({ ...prev, recipient_person_id: e.target.value }))}>
                <option value="">Select person</option>
                {involvedPersons.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Responsible worker performing the meeting *</label>
              <select className="form-select" value={newAction.responsible_leader_id} onChange={e => setNewAction(prev => ({ ...prev, responsible_leader_id: e.target.value }))}>
                <option value="">Select worker performing the meeting</option>
                {leaders.map(leader => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
              </select>
            </div>
          </div>
          <div className="if-row-3">
            <div className="form-group">
              <label className="form-label">Action taken *</label>
              <select className="form-select" value={newAction.action_type} onChange={e => setNewAction(prev => ({ ...prev, action_type: e.target.value }))}>
                <option value="">Select action</option>
                {DISCIPLINARY_ACTION_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={newAction.action_date} onChange={e => setNewAction(prev => ({ ...prev, action_date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Time *</label>
              <input type="time" className="form-input" value={newAction.action_time} onChange={e => setNewAction(prev => ({ ...prev, action_time: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Action details</label>
            <textarea className="form-textarea" rows="3" value={newAction.action_notes} onChange={e => setNewAction(prev => ({ ...prev, action_notes: e.target.value }))} placeholder="Optional notes about the action taken..." />
          </div>
          <button className="btn btn-primary" type="button" disabled={saving} onClick={handleAddAction}>
            {saving ? 'Saving...' : 'Save Disciplinary Action'}
          </button>
        </div>
      )}

      <div className="filters-section">
        <input
          className="search-input"
          type="text"
          placeholder="Search by violation, person, worker performing the meeting, notes..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
        <select className="filter-select" value={actionTypeFilter} onChange={e => setActionTypeFilter(e.target.value)}>
          <option value="all">All actions</option>
          {DISCIPLINARY_ACTION_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="filter-select" value={violationFilter} onChange={e => setViolationFilter(e.target.value)}>
          <option value="all">All violations</option>
          {[...new Set(incidents.map(incident => incident.safety_violation_type).filter(Boolean))].map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        <select className="filter-select" value={leaderFilter} onChange={e => setLeaderFilter(e.target.value)}>
          <option value="all">All workers performing the meetings</option>
          {leaders.map(leader => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
        </select>
      </div>

      <div className="actions-timeline">
        {filteredActions.length === 0 ? (
          <div className="empty-state">No disciplinary actions found.</div>
        ) : (
          filteredActions.map(action => {
            const incident = getIncident(action.incident_id)
            const isEditing = editingActionId === action.id
            return (
              <div key={action.id} className="action-timeline-item disciplinary-timeline-item">
                <div className="action-timeline-content">
                  <div className="disciplinary-timeline-header">
                    <div>
                      <h3>{action.action_type}</h3>
                      <p className="disciplinary-subtitle">
                        {incident?.safety_violation_type || 'Safety violation'}
                        {incident?.employee_name ? ` · ${incident.employee_name}` : ''}
                        {incident?.project?.name ? ` · ${incident.project.name}` : ''}
                      </p>
                    </div>
                    <div className="disciplinary-date-block">
                      <strong>{new Date(action.action_date).toLocaleDateString()}</strong>
                      <span>{(action.action_time || '').slice(0, 5)}</span>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="inline-edit-form disciplinary-inline-form">
                      <div className="if-row-2">
                        <div className="form-group">
                          <label className="form-label">Incident *</label>
                          <select
                            className="form-select"
                            value={editForm.incident_id}
                            onChange={e => {
                              const incidentId = e.target.value
                              const selectedIncident = getIncident(incidentId)
                              setEditForm(prev => ({
                                ...prev,
                                incident_id: incidentId,
                                violation_type: selectedIncident?.safety_violation_type || '',
                              }))
                            }}
                          >
                            {incidents.map(incidentOption => (
                              <option key={incidentOption.id} value={incidentOption.id}>
                                {incidentOption.safety_violation_type || 'Safety violation'} - {incidentOption.employee_name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Action taken *</label>
                          <select className="form-select" value={editForm.action_type} onChange={e => setEditForm(prev => ({ ...prev, action_type: e.target.value }))}>
                            {DISCIPLINARY_ACTION_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="if-row-2">
                        <div className="form-group">
                          <label className="form-label">Recipient *</label>
                          <select className="form-select" value={editForm.recipient_person_id} onChange={e => setEditForm(prev => ({ ...prev, recipient_person_id: e.target.value }))}>
                            <option value="">Select person</option>
                            {involvedPersons.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Responsible worker performing the meeting *</label>
                          <select className="form-select" value={editForm.responsible_leader_id} onChange={e => setEditForm(prev => ({ ...prev, responsible_leader_id: e.target.value }))}>
                            <option value="">Select worker performing the meeting</option>
                            {leaders.map(leader => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="if-row-3">
                        <div className="form-group">
                          <label className="form-label">Date *</label>
                          <input type="date" className="form-input" value={editForm.action_date} onChange={e => setEditForm(prev => ({ ...prev, action_date: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Time *</label>
                          <input type="time" className="form-input" value={editForm.action_time} onChange={e => setEditForm(prev => ({ ...prev, action_time: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Violation *</label>
                          <select
                            className="form-select"
                            value={editForm.violation_type || ''}
                            onChange={e => setEditForm(prev => ({ ...prev, violation_type: e.target.value }))}
                          >
                            <option value="">Select violation type</option>
                            {SAFETY_VIOLATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Action details</label>
                        <textarea className="form-textarea" rows="3" value={editForm.action_notes} onChange={e => setEditForm(prev => ({ ...prev, action_notes: e.target.value }))} />
                      </div>
                      <div className="disciplinary-inline-actions">
                        <button className="btn btn-primary" onClick={() => handleSaveEdit(action.id)}>Save</button>
                        <button className="btn btn-secondary" onClick={() => setEditingActionId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="action-meta-grid disciplinary-meta-grid">
                        <div><strong>Recipient:</strong> {getPersonName(action.recipient_person_id)}</div>
                        <div><strong>Worker performing the meeting:</strong> {getLeaderName(action.responsible_leader_id)}</div>
                        <div><strong>Incident:</strong> {incident ? `${incident.employee_name} on ${new Date(incident.date).toLocaleDateString()}` : 'Unknown'}</div>
                        <div><strong>Violation:</strong> {incident?.safety_violation_type || 'Unknown'}</div>
                      </div>
                      {action.action_notes && <p className="disciplinary-notes">{action.action_notes}</p>}
                    </>
                  )}
                </div>

                <div className="action-buttons disciplinary-action-buttons">
                  <button className="btn btn-secondary" onClick={() => navigate(`/incidents/${action.incident_id}`)}>View Incident</button>
                  {isAdmin && !isEditing && (
                    <>
                      <button className="btn btn-primary" onClick={() => handleStartEdit(action)}>Edit</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(action.id, action.action_type)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}