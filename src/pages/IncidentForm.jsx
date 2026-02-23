import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SignatureCanvas from 'react-signature-canvas'
import './IncidentForm.css'

export default function IncidentForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef()
  
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [employees, setEmployees] = useState([])
  
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
  })
  
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [newType, setNewType] = useState('')
  const [showNewType, setShowNewType] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchIncidentTypes()
    fetchEmployees()
    
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
      })
      if (data.photo_url) {
        setPhotoPreview(data.photo_url)
      }
    }
    setLoading(false)
  }

  const handleAddType = async () => {
    if (!newType.trim()) return

    const { data, error } = await supabase
      .from('incident_types')
      .insert([{ name: newType }])
      .select()
      .single()

    if (!error && data) {
      setIncidentTypes([...incidentTypes, data])
      setFormData({ ...formData, incident_type_id: data.id, type_name: data.name })
      setNewType('')
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
      type_name: type?.name || ''
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
      ...formData,
      photo_url: photoUrl,
      signature_url: signatureUrl,
      created_by: user.id,
    }

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
      const { error } = await supabase
        .from('incidents')
        .insert([incidentData])

      if (error) {
        console.error('Error creating incident:', error)
        setLoading(false)
        return
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
                  }}
                >
                  Cancel
                </button>
              </div>
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
