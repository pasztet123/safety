import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MAX_CORRECTIVE_ACTION_PHOTOS, normalizeCorrectiveActionPhotos } from '../lib/correctiveActionPhotos'
import { buildCompletionStatusFields, getDeclaredCompletionDate, getTodayDateString, promptForDeclaredCompletionDate } from '../lib/correctiveActionDates'
import { downloadCorrectiveActionsListPDF } from '../lib/pdfBulkGenerator'
import { buildResponsiblePersonOptions, mergeResponsiblePerson, resolveResponsiblePersonId } from '../lib/responsiblePeople'
import './CorrectiveActions.css'

const createEmptyAction = () => ({
  incident_id: '',
  description: '',
  responsible_person_id: '',
  declared_created_date: getTodayDateString(),
  declared_completion_date: '',
  due_date: '',
  status: 'open',
  completion_date: null,
  photos: [],
})

const normalizeActionForState = (action) => ({
  ...action,
  photos: normalizeCorrectiveActionPhotos(action),
})

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
  const [leaders, setLeaders] = useState([])
  const [incidents, setIncidents] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [predefinedActions, setPredefinedActions] = useState([])
  const [exportLoading, setExportLoading] = useState(false)
  const [editingActionId, setEditingActionId] = useState(null)
  const [editForm, setEditForm] = useState({})
  
  const [newAction, setNewAction] = useState(createEmptyAction())
    const responsiblePersonOptions = buildResponsiblePersonOptions({ involvedPersons, leaders })

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
    
    await Promise.all([
      fetchProjects(),
      fetchInvolvedPersons(),
      fetchLeaders(),
      fetchIncidents(),
      fetchPredefinedActions(),
      fetchActions(),
    ])
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
      .select('id, name, leader_id')
      .order('name')
    if (data) setInvolvedPersons(data)
  }

  const fetchLeaders = async () => {
    const { data } = await supabase
      .from('leaders')
      .select('id, name')
      .order('name')
    if (data) setLeaders(data)
  }

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('id, type_name, date, project_id, employee_name')
      .is('deleted_at', null)
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
      .select('*, corrective_action_photos(id, photo_url, display_order)')
      .order('declared_created_date', { ascending: false })
      .order('due_date', { ascending: false })
    
    if (!error && data) {
      setActions(data.map(normalizeActionForState))
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

  const handleToggleStatus = async (action) => {
    if (!isAdmin) return

    const { data: { user } } = await supabase.auth.getUser()
    const newStatus = action.status === 'open' ? 'completed' : 'open'
    const declaredCompletionDate = newStatus === 'completed'
      ? promptForDeclaredCompletionDate(getDeclaredCompletionDate(action) || getTodayDateString())
      : null

    if (newStatus === 'completed' && !declaredCompletionDate) return

    const updateData = {
      status: newStatus,
      ...buildCompletionStatusFields({
        currentStatus: action.status,
        nextStatus: newStatus,
        currentCompletionDate: action.completion_date,
        currentDeclaredCompletionDate: action.declared_completion_date,
        declaredCompletionDate,
      }),
      updated_by: user?.id || null,
    }

    const { error } = await supabase
      .from('corrective_actions')
      .update(updateData)
      .eq('id', action.id)
    
    if (!error) {
      await fetchActions()
    }
  }

  const handleViewIncident = (incidentId) => {
    navigate(`/incidents/${incidentId}`)
  }

  const handleDeleteAction = async (actionId, description) => {
    if (!confirm(`Are you sure you want to delete the corrective action "${description}"? This action cannot be undone.`)) return
    await supabase.from('corrective_actions').delete().eq('id', actionId)
    await fetchActions()
  }

  const handleStartEdit = (action) => {
    setEditingActionId(action.id)
    setEditForm({
      description: action.description,
      responsible_person_id: action.responsible_person_id || '',
      declared_created_date: action.declared_created_date || '',
      declared_completion_date: getDeclaredCompletionDate(action) || '',
      due_date: action.due_date || '',
      status: action.status,
      completion_date: action.completion_date || null,
      photos: action.photos || [],
    })
  }

  const handleActionPhotoAdd = (target, event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const currentPhotos = target === 'new' ? (newAction.photos || []) : (editForm.photos || [])
    const remainingSlots = MAX_CORRECTIVE_ACTION_PHOTOS - currentPhotos.length

    if (remainingSlots <= 0) {
      alert(`You can attach up to ${MAX_CORRECTIVE_ACTION_PHOTOS} photos to one corrective action.`)
      event.target.value = ''
      return
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    if (filesToAdd.length < selectedFiles.length) {
      alert(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added. The limit is ${MAX_CORRECTIVE_ACTION_PHOTOS}.`)
    }

    filesToAdd.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photo = { file, preview: reader.result }
        if (target === 'new') {
          setNewAction(prev => ({ ...prev, photos: [...(prev.photos || []), photo] }))
          return
        }

        setEditForm(prev => ({ ...prev, photos: [...(prev.photos || []), photo] }))
      }
      reader.readAsDataURL(file)
    })

    event.target.value = ''
  }

  const handleRemoveActionPhoto = (target, photoIndex) => {
    if (target === 'new') {
      setNewAction(prev => ({ ...prev, photos: (prev.photos || []).filter((_, index) => index !== photoIndex) }))
      return
    }

    setEditForm(prev => ({ ...prev, photos: (prev.photos || []).filter((_, index) => index !== photoIndex) }))
  }

  const syncCorrectiveActionPhotos = async (actionId, photos) => {
    const { error: deletePhotosError } = await supabase
      .from('corrective_action_photos')
      .delete()
      .eq('corrective_action_id', actionId)

    if (deletePhotosError) {
      throw deletePhotosError
    }

    const photoRows = []
    for (const [photoIndex, photo] of (photos || []).entries()) {
      if (photo.photo_url) {
        photoRows.push({ photo_url: photo.photo_url, display_order: photoIndex })
        continue
      }

      if (!photo.file) continue

      const ext = photo.file.name.split('.').pop()
      const fileName = `corrective-action-${actionId}-${Date.now()}-${photoIndex}.${ext}`
      const { error: uploadPhotoError } = await supabase.storage.from('safety-photos').upload(fileName, photo.file)
      if (uploadPhotoError) {
        throw uploadPhotoError
      }

      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
      photoRows.push({ photo_url: urlData.publicUrl, display_order: photoIndex })
    }

    if (photoRows.length === 0) return

    const { error: insertPhotosError } = await supabase.from('corrective_action_photos').insert(
      photoRows.map(photo => ({
        corrective_action_id: actionId,
        photo_url: photo.photo_url,
        display_order: photo.display_order,
      }))
    )

    if (insertPhotosError) {
      throw insertPhotosError
    }
  }

  const handleSaveEdit = async (actionId) => {
    const { data: { user } } = await supabase.auth.getUser()
    const existingAction = actions.find((action) => action.id === actionId)

    let responsiblePersonId = null
    let syncedPerson = null

    try {
      const resolved = await resolveResponsiblePersonId({
        selectedValue: editForm.responsible_person_id,
        involvedPersons,
        leaders,
        supabase,
      })

      responsiblePersonId = resolved.responsiblePersonId
      syncedPerson = resolved.syncedPerson
    } catch (error) {
      console.error(error)
      alert('Unable to assign the selected responsible person')
      return
    }

    const { error } = await supabase
      .from('corrective_actions')
      .update({
        description: editForm.description,
        responsible_person_id: responsiblePersonId,
        declared_created_date: editForm.declared_created_date || null,
        due_date: editForm.due_date || null,
        status: editForm.status,
        ...buildCompletionStatusFields({
          currentStatus: existingAction?.status,
          nextStatus: editForm.status,
          currentCompletionDate: existingAction?.completion_date,
          currentDeclaredCompletionDate: existingAction?.declared_completion_date,
          declaredCompletionDate: editForm.declared_completion_date || null,
        }),
        updated_by: user?.id || null,
      })
      .eq('id', actionId)
    if (!error) {
      try {
        await syncCorrectiveActionPhotos(actionId, editForm.photos)
        if (syncedPerson) {
          setInvolvedPersons(prev => mergeResponsiblePerson(prev, syncedPerson))
        }
        setEditingActionId(null)
        await Promise.all([fetchActions(), fetchInvolvedPersons()])
      } catch (photoError) {
        console.error(photoError)
        alert('Unable to save corrective action photos')
      }
    }
  }
  
  const handleAddAction = async () => {
    if (!newAction.incident_id || !newAction.description.trim()) {
      alert('Please select an incident and enter a description')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    let responsiblePersonId = null
    let syncedPerson = null

    try {
      const resolved = await resolveResponsiblePersonId({
        selectedValue: newAction.responsible_person_id,
        involvedPersons,
        leaders,
        supabase,
      })

      responsiblePersonId = resolved.responsiblePersonId
      syncedPerson = resolved.syncedPerson
    } catch (resolveError) {
      console.error(resolveError)
      alert('Unable to assign the selected responsible person')
      return
    }
    
    const { data: insertedAction, error } = await supabase
      .from('corrective_actions')
      .insert({
        incident_id: newAction.incident_id,
        description: newAction.description,
        responsible_person_id: responsiblePersonId,
        declared_created_date: newAction.declared_created_date || null,
        due_date: newAction.due_date || null,
        status: newAction.status,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      })
      .select('*')
      .single()
    
    if (error) {
      alert('Error adding corrective action')
      return
    }

    try {
      await syncCorrectiveActionPhotos(insertedAction.id, newAction.photos)
    } catch (photoError) {
      console.error(photoError)
      alert('Corrective action was created, but photos could not be saved')
    }
    
    setNewAction(createEmptyAction())
    setShowAddForm(false)
    if (syncedPerson) {
      setInvolvedPersons(prev => mergeResponsiblePerson(prev, syncedPerson))
    }
    await Promise.all([fetchActions(), fetchInvolvedPersons()])
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
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && filteredActions.length > 0 && (
            <button
              className="btn btn-secondary"
              disabled={exportLoading}
              onClick={async () => {
                setExportLoading(true)
                try { await downloadCorrectiveActionsListPDF(filteredActions, involvedPersons, incidents, 'Corrective Actions Report', `${filteredActions.length} actions`) }
                catch (e) { console.error(e) }
                finally { setExportLoading(false) }
              }}
              title="Download a summary PDF of filtered corrective actions"
            >
              {exportLoading ? '…' : '↓ Export PDF'}
            </button>
          )}
          <button 
            className="btn-primary"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? 'Cancel' : '+ Add Corrective Action'}
          </button>
        </div>
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

            <div className="form-row form-row--three">
              <div className="form-group">
                <label>Responsible Person</label>
                <select
                  value={newAction.responsible_person_id}
                  onChange={(e) => setNewAction({...newAction, responsible_person_id: e.target.value})}
                >
                  <option value="">Select Person (Optional)</option>
                  {responsiblePersonOptions.map(person => (
                    <option key={person.value} value={person.value}>
                      {person.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Declared Created Date</label>
                <input
                  type="date"
                  value={newAction.declared_created_date}
                  onChange={(e) => setNewAction({...newAction, declared_created_date: e.target.value})}
                />
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

            <div className="form-group">
              <label>Photos <span className="ca-optional">optional, up to {MAX_CORRECTIVE_ACTION_PHOTOS}</span></label>
              {newAction.photos?.length > 0 && (
                <div className="ca-photo-grid">
                  {newAction.photos.map((photo, index) => (
                    <div key={photo.preview || photo.photo_url || index} className="ca-photo-item">
                      <img src={photo.preview || photo.photo_url} alt={`Corrective action photo ${index + 1}`} />
                      <button type="button" className="ca-photo-remove" onClick={() => handleRemoveActionPhoto('new', index)}>&#215;</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="btn-secondary ca-upload-btn">
                + Add Photos
                <input type="file" accept="image/*" multiple onChange={(e) => handleActionPhotoAdd('new', e)} style={{ display: 'none' }} />
              </label>
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
                  setNewAction(createEmptyAction())
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
          const isOverdue = action.status === 'open' && action.due_date && new Date(action.due_date) < new Date()
          return (
            <div key={action.id} className={`action-timeline-item ${action.status}${isOverdue ? ' overdue' : ''}`}>
              <div className="action-status-indicator">
                <input
                  type="checkbox"
                  checked={action.status === 'completed'}
                  onChange={() => handleToggleStatus(action)}
                  disabled={!isAdmin}
                  title={isAdmin ? 'Click to toggle status' : 'Only admins can change status'}
                />
              </div>
              <div className="action-timeline-content">
                {editingActionId === action.id ? (
                  <div className="inline-edit-form">
                    <div className="form-group">
                      <label className="form-label">Description</label>
                      <textarea
                        className="form-textarea"
                        value={editForm.description}
                        onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                        rows="2"
                      />
                    </div>
                    <div className="inline-edit-row">
                      <div className="form-group">
                        <label className="form-label">Responsible Person</label>
                        <select
                          className="form-select"
                          value={editForm.responsible_person_id}
                          onChange={e => setEditForm({ ...editForm, responsible_person_id: e.target.value })}
                        >
                          <option value="">Unassigned</option>
                          {responsiblePersonOptions.map(person => (
                            <option key={person.value} value={person.value}>{person.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Declared Created Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={editForm.declared_created_date}
                          onChange={e => setEditForm({ ...editForm, declared_created_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Due Date</label>
                        <input
                          type="date"
                          className="form-input"
                          value={editForm.due_date}
                          onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Status</label>
                        <select
                          className="form-select"
                          value={editForm.status}
                          onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                        >
                          <option value="open">Open</option>
                          <option value="completed">Completed</option>
                        </select>
                      </div>
                      {editForm.status === 'completed' && (
                        <div className="form-group">
                          <label className="form-label">Declared Completed Date</label>
                          <input
                            type="date"
                            className="form-input"
                            value={editForm.declared_completion_date}
                            onChange={e => setEditForm({ ...editForm, declared_completion_date: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Photos <span className="ca-optional">optional, up to {MAX_CORRECTIVE_ACTION_PHOTOS}</span></label>
                      {editForm.photos?.length > 0 && (
                        <div className="ca-photo-grid">
                          {editForm.photos.map((photo, index) => (
                            <div key={photo.id || photo.preview || photo.photo_url || index} className="ca-photo-item">
                              <img src={photo.preview || photo.photo_url} alt={`Corrective action photo ${index + 1}`} />
                              <button type="button" className="ca-photo-remove" onClick={() => handleRemoveActionPhoto('edit', index)}>&#215;</button>
                            </div>
                          ))}
                        </div>
                      )}
                      <label className="btn-secondary ca-upload-btn">
                        + Add Photos
                        <input type="file" accept="image/*" multiple onChange={(e) => handleActionPhotoAdd('edit', e)} style={{ display: 'none' }} />
                      </label>
                    </div>
                    <div className="inline-edit-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(action.id)}>Save</button>
                      <button className="btn btn-secondary btn-sm" onClick={() => setEditingActionId(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="action-header">
                      <h3 className="action-description">{action.description}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {isOverdue && <span className="badge badge--overdue">Overdue</span>}
                        <span className={`ca-status-chip ca-status-chip--${action.status}`}>
                          {action.status === 'completed' ? 'Completed' : 'Open'}
                        </span>
                        {isAdmin && (
                          <>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleStartEdit(action)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteAction(action.id, action.description)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
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
                          <strong>Responsible:</strong> {getPersonName(action.responsible_person_id)}
                        </span>
                      )}
                      {action.due_date && (
                        <span className="meta-item">
                          <strong>Due:</strong> {new Date(action.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {getDeclaredCompletionDate(action) && (
                        <span className="meta-item">
                          <strong>Completed:</strong> {new Date(getDeclaredCompletionDate(action)).toLocaleDateString()}
                        </span>
                      )}
                      {action.completion_date && (
                        <span className="meta-item">
                          <strong>Marked completed:</strong> {new Date(action.completion_date).toLocaleDateString()}
                        </span>
                      )}
                      {action.declared_created_date && (
                        <span className="meta-item meta-created">
                          Created on: {new Date(action.declared_created_date).toLocaleDateString()}
                        </span>
                      )}
                      {(action.photos?.length || 0) > 0 && (
                        <span className="meta-item meta-created">
                          Photos: {action.photos.length}
                        </span>
                      )}
                    </div>
                    {action.photos?.length > 0 && (
                      <div className="ca-photo-grid ca-photo-grid--compact">
                        {action.photos.map((photo, index) => (
                          <a key={photo.id || photo.photo_url || index} href={photo.photo_url} target="_blank" rel="noreferrer" className="ca-photo-item ca-photo-item--readonly">
                            <img src={photo.photo_url} alt={`Corrective action photo ${index + 1}`} />
                          </a>
                        ))}
                      </div>
                    )}
                  </>
                )}
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
