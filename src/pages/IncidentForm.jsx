import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SignatureCanvas from 'react-signature-canvas'
import './IncidentForm.css'

// Incident subtypes by type
const INCIDENT_SUBTYPES = {
  'Accident (injury)': [
    { value: 'laceration', label: 'Laceration (cut)' },
    { value: 'fracture', label: 'Fracture (broken bone)' },
    { value: 'sprain', label: 'Sprain' },
    { value: 'strain', label: 'Strain' },
    { value: 'burn', label: 'Burn' },
    { value: 'contusion', label: 'Contusion (bruise)' },
    { value: 'puncture', label: 'Puncture' },
    { value: 'electrical_injury', label: 'Electrical injury' },
    { value: 'eye_injury', label: 'Eye injury' },
    { value: 'head_injury', label: 'Head injury' },
    { value: 'back_injury', label: 'Back injury' },
    { value: 'amputation', label: 'Amputation' },
    { value: 'other', label: 'Other' },
  ],
  'Near miss': [
    // Fall/slip related
    { value: 'slip', label: 'Slip', category: 'Fall/Slip Related' },
    { value: 'trip', label: 'Trip', category: 'Fall/Slip Related' },
    { value: 'fall_same_level', label: 'Fall (same level)', category: 'Fall/Slip Related' },
    { value: 'fall_from_height', label: 'Fall from height', category: 'Fall/Slip Related' },
    // Struck by object
    { value: 'falling_object', label: 'Falling object', category: 'Struck by Object' },
    { value: 'flying_object', label: 'Flying object', category: 'Struck by Object' },
    { value: 'moving_equipment', label: 'Moving equipment', category: 'Struck by Object' },
    // Tool related
    { value: 'hand_tool', label: 'Hand tool', category: 'Tool Related' },
    { value: 'power_tool', label: 'Power tool', category: 'Tool Related' },
    { value: 'machinery', label: 'Machinery', category: 'Tool Related' },
    // Electrical
    { value: 'electric_shock', label: 'Electric shock', category: 'Electrical' },
    { value: 'exposed_wire', label: 'Exposed wire', category: 'Electrical' },
    // Structural/environment
    { value: 'sharp_edge', label: 'Sharp edge', category: 'Structural/Environment' },
    { value: 'unprotected_edge', label: 'Unprotected edge', category: 'Structural/Environment' },
    { value: 'unstable_surface', label: 'Unstable surface', category: 'Structural/Environment' },
    // PPE related
    { value: 'missing_ppe', label: 'Missing PPE', category: 'PPE Related' },
    { value: 'improper_ppe', label: 'Improper PPE', category: 'PPE Related' },
  ],
  'Unsafe condition': [
    // Same as near miss
    { value: 'slip', label: 'Slip', category: 'Fall/Slip Related' },
    { value: 'trip', label: 'Trip', category: 'Fall/Slip Related' },
    { value: 'fall_same_level', label: 'Fall (same level)', category: 'Fall/Slip Related' },
    { value: 'fall_from_height', label: 'Fall from height', category: 'Fall/Slip Related' },
    { value: 'falling_object', label: 'Falling object', category: 'Struck by Object' },
    { value: 'flying_object', label: 'Flying object', category: 'Struck by Object' },
    { value: 'moving_equipment', label: 'Moving equipment', category: 'Struck by Object' },
    { value: 'hand_tool', label: 'Hand tool', category: 'Tool Related' },
    { value: 'power_tool', label: 'Power tool', category: 'Tool Related' },
    { value: 'machinery', label: 'Machinery', category: 'Tool Related' },
    { value: 'electric_shock', label: 'Electric shock', category: 'Electrical' },
    { value: 'exposed_wire', label: 'Exposed wire', category: 'Electrical' },
    { value: 'sharp_edge', label: 'Sharp edge', category: 'Structural/Environment' },
    { value: 'unprotected_edge', label: 'Unprotected edge', category: 'Structural/Environment' },
    { value: 'unstable_surface', label: 'Unstable surface', category: 'Structural/Environment' },
    { value: 'missing_ppe', label: 'Missing PPE', category: 'PPE Related' },
    { value: 'improper_ppe', label: 'Improper PPE', category: 'PPE Related' },
  ],
}

export default function IncidentForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef()
  
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [employees, setEmployees] = useState([])
  const [predefinedActions, setPredefinedActions] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    employee_id: '',
    employee_name: '',
    phone: '',
    reporter_name: '',
    details: '',
    notes: '',
    incident_type_id: '',
    type_name: '',
    incident_subtype: '',
  })
  
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [newType, setNewType] = useState('')
  const [newTypeDate, setNewTypeDate] = useState(new Date().toISOString().split('T')[0])
  const [showNewType, setShowNewType] = useState(false)
  
  const [correctiveActions, setCorrectiveActions] = useState([])
  const [newAction, setNewAction] = useState({
    description: '',
    responsible_person_id: '',
    due_date: '',
    status: 'open'
  })

  useEffect(() => {
    fetchProjects()
    fetchIncidentTypes()
    fetchEmployees()
    fetchPredefinedActions()
    fetchInvolvedPersons()
    
    if (id) {
      fetchIncident()
    }
  }, [id])

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation && !id) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            )
            const data = await response.json()
            setFormData(prev => ({ 
              ...prev, 
              location: data.display_name || `${position.coords.latitude}, ${position.coords.longitude}` 
            }))
          } catch (error) {
            console.error('Error getting location:', error)
          }
        },
        (error) => {
          console.log('Location access denied:', error)
        }
      )
    }
  }, [id])

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
  }

  const fetchIncidentTypes = async () => {
    const { data } = await supabase
      .from('incident_types')
      .select('*')
      .order('name')
    if (data) setIncidentTypes(data)
  }

  const fetchEmployees = async () => {
    // Employees will be entered manually
    setEmployees([])
  }
  
  const fetchPredefinedActions = async () => {
    const { data } = await supabase
      .from('predefined_corrective_actions')
      .select('*')
      .order('category')
      .order('description')
    if (data) setPredefinedActions(data)
  }
  
  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name')
      .order('name')
    if (data) setInvolvedPersons(data)
  }

  const fetchIncident = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      setFormData({
        project_id: data.project_id || '',
        date: data.date.split('T')[0],
        time: data.time,
        location: data.location || '',
        employee_id: data.employee_id || '',
        employee_name: data.employee_name,
        phone: data.phone || '',
        reporter_name: data.reporter_name,
        details: data.details,
        notes: data.notes || '',
        incident_type_id: data.incident_type_id || '',
        type_name: data.type_name,
        incident_subtype: data.incident_subtype || '',
      })
      if (data.photo_url) {
        setPhotoPreview(data.photo_url)
      }
      
      // Fetch existing corrective actions
      const { data: actionsData } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('incident_id', id)
      
      if (actionsData) {
        setCorrectiveActions(actionsData)
      }
    }
    setLoading(false)
  }

  const handleAddType = async () => {
    if (!newType.trim()) return

    const { data, error } = await supabase
      .from('incident_types')
      .insert([{ 
        name: newType,
        incident_date: newTypeDate 
      }])
      .select()
      .single()

    if (!error && data) {
      setIncidentTypes([...incidentTypes, data])
      setFormData({ ...formData, incident_type_id: data.id, type_name: data.name })
      setNewType('')
      setNewTypeDate(new Date().toISOString().split('T')[0])
      setShowNewType(false)
    }
  }

  const handleTypeChange = (e) => {
    const typeId = e.target.value
    if (typeId === 'new') {
      setShowNewType(true)
      return
    }
    const type = incidentTypes.find(t => t.id === typeId)
    setFormData({
      ...formData,
      incident_type_id: typeId,
      type_name: type?.name || '',
      incident_subtype: '' // Reset subtype when type changes
    })
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const handleAddCorrectiveAction = () => {
    if (!newAction.description.trim()) return
    
    setCorrectiveActions([...correctiveActions, { ...newAction, isNew: true }])
    setNewAction({
      description: '',
      responsible_person_id: '',
      due_date: '',
      status: 'open'
    })
  }
  
  const handleRemoveCorrectiveAction = (index) => {
    setCorrectiveActions(correctiveActions.filter((_, i) => i !== index))
  }
  
  const handleUpdateCorrectiveAction = (index, field, value) => {
    const updated = [...correctiveActions]
    updated[index] = { ...updated[index], [field]: value }
    setCorrectiveActions(updated)
  }
  
  const handleSelectPredefinedAction = (actionDescription) => {
    setNewAction({ ...newAction, description: actionDescription })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    // Upload photo if present
    let photoUrl = photoPreview
    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `incident-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('safety-photos')
        .upload(fileName, photoFile)

      if (!uploadError) {
        const { data } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(fileName)
        photoUrl = data.publicUrl
      }
    }

    // Upload signature if present
    let signatureUrl = null
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureBlob = await fetch(signatureRef.current.toDataURL()).then(r => r.blob())
      const signatureFile = `signature-${Date.now()}.png`
      
      const { error: uploadError } = await supabase.storage
        .from('safety-photos')
        .upload(signatureFile, signatureBlob)

      if (!uploadError) {
        const { data } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(signatureFile)
        signatureUrl = data.publicUrl
      }
    }

    // Insert or update incident
    const incidentData = {
      project_id: formData.project_id || null,
      date: formData.date,
      time: formData.time,
      location: formData.location || null,
      employee_id: formData.employee_id || null,
      employee_name: formData.employee_name,
      phone: formData.phone || null,
      reporter_name: formData.reporter_name,
      details: formData.details,
      notes: formData.notes || null,
      incident_type_id: formData.incident_type_id || null,
      type_name: formData.type_name,
      incident_subtype: formData.incident_subtype || null,
      photo_url: photoUrl,
      signature_url: signatureUrl,
      created_by: user.id,
    }

    let incidentId = id
    
    if (id) {
      const { error } = await supabase
        .from('incidents')
        .update(incidentData)
        .eq('id', id)
      
      if (error) {
        console.error('Error updating incident:', error)
        setLoading(false)
        return
      }
    } else {
      const { data: newIncident, error } = await supabase
        .from('incidents')
        .insert([incidentData])
        .select()
        .single()

      if (error) {
        console.error('Error creating incident:', error)
        setLoading(false)
        return
      }
      
      incidentId = newIncident.id
    }
    
    // Handle corrective actions
    if (incidentId) {
      // Delete existing corrective actions if editing
      if (id) {
        await supabase
          .from('corrective_actions')
          .delete()
          .eq('incident_id', id)
      }
      
      // Insert new corrective actions
      if (correctiveActions.length > 0) {
        const actionsToInsert = correctiveActions.map(action => ({
          incident_id: incidentId,
          description: action.description,
          responsible_person_id: action.responsible_person_id && action.responsible_person_id !== '' ? action.responsible_person_id : null,
          due_date: action.due_date && action.due_date !== '' ? action.due_date : null,
          status: action.status || 'open',
          completion_date: action.status === 'completed' ? (action.completion_date || new Date().toISOString().split('T')[0]) : null
        }))
        
        const { error: actionsError } = await supabase
          .from('corrective_actions')
          .insert(actionsToInsert)
        
        if (actionsError) {
          console.error('Error inserting corrective actions:', actionsError)
        }
      }
    }

    setLoading(false)
    navigate('/incidents')
  }

  if (loading && id) return <div className="spinner"></div>

  return (
    <div className="incident-form">
      <h2 className="page-title">{id ? 'Edit Incident' : 'Report Incident'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="section-title">Incident Information</h3>

          <div className="form-group">
            <label className="form-label">Project</label>
            <select
              className="form-select"
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input
                type="date"
                className="form-input"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Time *</label>
              <input
                type="time"
                className="form-input"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                step="60"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Auto-filled from GPS or enter manually"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Incident Type *</label>
            <select
              className="form-select"
              value={formData.incident_type_id}
              onChange={handleTypeChange}
              required
            >
              <option value="">Select Type</option>
              {incidentTypes.map(type => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
              <option value="new">+ Add New Type</option>
            </select>
          </div>

          {showNewType && (
            <div className="new-type-form">
              <input
                type="text"
                className="form-input"
                placeholder="Enter incident type"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              />
              <div className="form-group">
                <label className="form-label">Incident Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={newTypeDate}
                  onChange={(e) => setNewTypeDate(e.target.value)}
                />
              </div>
              <div className="form-row">
                <button type="button" className="btn btn-primary" onClick={handleAddType}>
                  Add Type
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewType(false)
                    setNewType('')
                    setNewTypeDate(new Date().toISOString().split('T')[0])
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Subtype selection - shown for specific incident types */}
          {formData.type_name && INCIDENT_SUBTYPES[formData.type_name] && (
            <div className="form-group">
              <label className="form-label">Incident Subtype {formData.type_name === 'Accident (injury)' ? '*' : ''}</label>
              <select
                className="form-select"
                value={formData.incident_subtype}
                onChange={(e) => setFormData({ ...formData, incident_subtype: e.target.value })}
                required={formData.type_name === 'Accident (injury)'}
              >
                <option value="">Select Subtype</option>
                {INCIDENT_SUBTYPES[formData.type_name].map((subtype, index) => {
                  // Group by category for near miss and unsafe condition
                  const showCategory = subtype.category && (
                    index === 0 || 
                    INCIDENT_SUBTYPES[formData.type_name][index - 1].category !== subtype.category
                  )
                  return (
                    <React.Fragment key={subtype.value}>
                      {showCategory && (
                        <option disabled style={{ fontWeight: 'bold', fontStyle: 'italic' }}>
                          ─── {subtype.category} ───
                        </option>
                      )}
                      <option value={subtype.value}>
                        {subtype.category ? '  ' : ''}{subtype.label}
                      </option>
                    </React.Fragment>
                  )
                })}
              </select>
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Employee Information</h3>

          <div className="form-group">
            <label className="form-label">Employee Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.employee_name}
              onChange={(e) => setFormData({ ...formData, employee_name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reporter Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.reporter_name}
              onChange={(e) => setFormData({ ...formData, reporter_name: e.target.value })}
              required
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Incident Details</h3>

          <div className="form-group">
            <label className="form-label">Details *</label>
            <textarea
              className="form-textarea"
              value={formData.details}
              onChange={(e) => setFormData({ ...formData, details: e.target.value })}
              required
              style={{ minHeight: '150px' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Photo</h3>
          
          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="Incident" />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Upload Photo</label>
            <input
              type="file"
              className="form-input"
              accept="image/*"
              onChange={handlePhotoChange}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Corrective Actions</h3>
          
          <div className="form-group">
            <label className="form-label">Select from predefined actions or enter custom</label>
            <select
              className="form-select"
              value=""
              onChange={(e) => handleSelectPredefinedAction(e.target.value)}
            >
              <option value="">-- Select a predefined action --</option>
              {predefinedActions.reduce((acc, action) => {
                // Group by category
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
            <label className="form-label">Action Description</label>
            <textarea
              className="form-textarea"
              value={newAction.description}
              onChange={(e) => setNewAction({ ...newAction, description: e.target.value })}
              placeholder="Enter corrective action description (optional)"
              rows="2"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Responsible Person</label>
              <select
                className="form-select"
                value={newAction.responsible_person_id}
                onChange={(e) => setNewAction({ ...newAction, responsible_person_id: e.target.value })}
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
              <label className="form-label">Due Date</label>
              <input
                type="date"
                className="form-input"
                value={newAction.due_date}
                onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })}
              />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleAddCorrectiveAction}
          >
            + Add Corrective Action
          </button>

          {correctiveActions.length > 0 && (
            <div className="corrective-actions-list">
              <h4>Added Actions ({correctiveActions.length})</h4>
              {correctiveActions.map((action, index) => (
                <div key={index} className="corrective-action-item">
                  <div className="action-content">
                    <textarea
                      className="action-description-edit"
                      value={action.description}
                      onChange={(e) => handleUpdateCorrectiveAction(index, 'description', e.target.value)}
                      rows="2"
                    />
                    <div className="action-edit-fields">
                      <select
                        value={action.responsible_person_id || ''}
                        onChange={(e) => handleUpdateCorrectiveAction(index, 'responsible_person_id', e.target.value)}
                      >
                        <option value="">No one assigned</option>
                        {involvedPersons.map(person => (
                          <option key={person.id} value={person.id}>
                            {person.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={action.due_date || ''}
                        onChange={(e) => handleUpdateCorrectiveAction(index, 'due_date', e.target.value)}
                      />
                      <select
                        value={action.status}
                        onChange={(e) => handleUpdateCorrectiveAction(index, 'status', e.target.value)}
                      >
                        <option value="open">Open</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveCorrectiveAction(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Signature (Optional)</h3>
          
          <div className="signature-container">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                className: 'signature-canvas'
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => signatureRef.current?.clear()}
            >
              Clear Signature
            </button>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/incidents')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-accent" disabled={loading}>
            {loading ? 'Saving...' : id ? 'Update Incident' : 'Report Incident'}
          </button>
        </div>
      </form>
    </div>
  )
}
