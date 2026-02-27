import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './CorrectiveActions.css'

export default function CorrectiveActions() {
  const navigate = useNavigate()
  const [actions, setActions] = useState([])
  const [filteredActions, setFilteredActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projects, setProjects] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [incidents, setIncidents] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [predefinedActions, setPredefinedActions] = useState([])
  
  const [newAction, setNewAction] = useState({
    incident_id: '',
    description: '',
    responsible_person_id: '',
    due_date: '',
    status: 'open'
  })

  useEffect(() => {
    checkAdminAndLoadActions()
  }, [])

  useEffect(() => {
    filterActions()
  }, [actions, searchTerm, statusFilter])

  const checkAdminAndLoadActions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
    
    await fetchProjects()
    await fetchInvolvedPersons()
    await fetchIncidents()
    await fetchPredefinedActions()
    await fetchActions()
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
    if (data) setProjects(data)
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name')
    if (data) setInvolvedPersons(data)
  }

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('id, type_name, date, project_id, employee_name')
      .order('date', { ascending: false })
    if (data) setIncidents(data)
  }
  
  const fetchPredefinedActions = async () => {
    const { data } = await supabase
      .from('predefined_corrective_actions')
      .select('*')
      .order('category')
      .order('description')
    if (data) setPredefinedActions(data)
  }

  const fetchActions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('corrective_actions')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (!error && data) {
      setActions(data)
    }
    setLoading(false)
  }

  const filterActions = () => {
    let filtered = [...actions]
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(action => 
        action.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(action => action.status === statusFilter)
    }
    
    setFilteredActions(filtered)
  }

  const getIncidentInfo = (incidentId) => {
    return incidents.find(i => i.id === incidentId)
  }

  const getProjectName = (projectId) => {
    return projects.find(p => p.id === projectId)?.name || 'Unknown'
  }

  const getPersonName = (personId) => {
    return involvedPersons.find(p => p.id === personId)?.name || 'Unassigned'
  }

  const handleToggleStatus = async (actionId, currentStatus) => {
    if (!isAdmin) return
    
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
      await fetchActions()
    }
  }

  const handleViewIncident = (incidentId) => {
    navigate(`/incidents/${incidentId}`)
  }
  
  const handleAddAction = async () => {
    if (!newAction.incident_id || !newAction.description.trim()) {
      alert('Please select an incident and enter a description')
      return
    }
    
    const { error } = await supabase
      .from('corrective_actions')
      .insert([{
        incident_id: newAction.incident_id,
        description: newAction.description,
        responsible_person_id: newAction.responsible_person_id || null,
        due_date: newAction.due_date || null,
        status: newAction.status
      }])
    
    if (error) {
      alert('Error adding corrective action')
      return
    }
    
    setNewAction({
      incident_id: '',
      description: '',
      responsible_person_id: '',
      due_date: '',
      status: 'open'
    })
    setShowAddForm(false)
    await fetchActions()
  }
  
  const handleSelectPredefinedAction = (actionDescription) => {
    setNewAction({ ...newAction, description: actionDescription })
  }

  if (loading) {
    return <div className="loading">Loading corrective actions...</div>
  }

  return (
    <div className="corrective-actions-page">
      <div className="page-header">
        <h1>Corrective Actions Log</h1>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Corrective Action'}
        </button>
      </div>

      {showAddForm && (
        <div className="add-form-container">
          <h2>Add New Corrective Action</h2>
          <div className="action-form">
            <div className="form-group">
              <label>Select Incident *</label>
              <select
                value={newAction.incident_id}
                onChange={(e) => setNewAction({...newAction, incident_id: e.target.value})}
                required
              >
                <option value="">Select an incident</option>
                {incidents.map(incident => (
                  <option key={incident.id} value={incident.id}>
                    {incident.type_name} - {incident.employee_name} ({new Date(incident.date).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Select from predefined actions (optional)</label>
              <select
                value=""
                onChange={(e) => handleSelectPredefinedAction(e.target.value)}
              >
                <option value="">-- Select a predefined action --</option>
                {predefinedActions.reduce((acc, action) => {
                  if (!acc.find(item => item.category === action.category)) {
                    acc.push({ category: action.category, actions: [] })
                  }
                  const categoryGroup = acc.find(item => item.category === action.category)
                  categoryGroup.actions.push(action)
                  return acc
                }, []).map((group, idx) => (
                  <optgroup key={idx} label={group.category}>
                    {group.actions.map(action => (
                      <option key={action.id} value={action.description}>
                        {action.description}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea
                value={newAction.description}
                onChange={(e) => setNewAction({...newAction, description: e.target.value})}
                required
                rows="3"
                placeholder="Enter corrective action description"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Responsible Person</label>
                <select
                  value={newAction.responsible_person_id}
                  onChange={(e) => setNewAction({...newAction, responsible_person_id: e.target.value})}
                >
                  <option value="">Select Person (Optional)</option>
                  {involvedPersons.map(person => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  value={newAction.due_date}
                  onChange={(e) => setNewAction({...newAction, due_date: e.target.value})}
                />
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="btn-primary"
                onClick={handleAddAction}
              >
                Add Action
              </button>
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowAddForm(false)
                  setNewAction({
                    incident_id: '',
                    description: '',
                    responsible_person_id: '',
                    due_date: '',
                    status: 'open'
                  })
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search corrective actions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Status:</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="results-count">
          Showing {filteredActions.length} of {actions.length} actions
        </div>
      </div>

      <div className="actions-timeline">
        {filteredActions.map((action) => {
          const incident = getIncidentInfo(action.incident_id)
          return (
            <div key={action.id} className={`action-timeline-item ${action.status}`}>
              <div className="action-status-indicator">
                <input
                  type="checkbox"
                  checked={action.status === 'completed'}
                  onChange={() => handleToggleStatus(action.id, action.status)}
                  disabled={!isAdmin}
                  title={isAdmin ? 'Click to toggle status' : 'Only admins can change status'}
                />
              </div>
              <div className="action-timeline-content">
                <div className="action-header">
                  <h3 className="action-description">{action.description}</h3>
                  <span className={`status-badge ${action.status}`}>
                    {action.status === 'completed' ? '✓ Completed' : '⏳ Open'}
                  </span>
                </div>
                
                {incident && (
                  <div className="incident-reference">
                    <strong>Related to incident:</strong> {incident.type_name} - {incident.employee_name}
                    <span className="incident-date">
                      {new Date(incident.date).toLocaleDateString()}
                    </span>
                    {incident.project_id && (
                      <span className="incident-project">
                        Project: {getProjectName(incident.project_id)}
                      </span>
                    )}
                    <button
                      className="btn-link"
                      onClick={() => handleViewIncident(action.incident_id)}
                    >
                      View incident →
                    </button>
                  </div>
                )}
                
                <div className="action-metadata">
                  {action.responsible_person_id && (
                    <span className="meta-item">
                      <strong>👤 Responsible:</strong> {getPersonName(action.responsible_person_id)}
                    </span>
                  )}
                  {action.due_date && (
                    <span className="meta-item">
                      <strong>📅 Due:</strong> {new Date(action.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {action.completion_date && (
                    <span className="meta-item">
                      <strong>✅ Completed:</strong> {new Date(action.completion_date).toLocaleDateString()}
                    </span>
                  )}
                  <span className="meta-item meta-created">
                    Created: {new Date(action.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredActions.length === 0 && (
        <div className="no-results">
          <p>No corrective actions found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}
