import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SignatureCanvas from 'react-signature-canvas'
import './MeetingForm.css'

export default function MeetingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef()
  const attendeeSignatureRefs = useRef([])
  
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState([])
  const [leaders, setLeaders] = useState([])
  const [users, setUsers] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    leader_id: '',
    leader_name: '',
    topic: '',
    notes: '',
  })
  
  const [attendees, setAttendees] = useState([])
  const [newAttendee, setNewAttendee] = useState('')
  const [photos, setPhotos] = useState([])
  const [newLeader, setNewLeader] = useState('')
  const [showNewLeader, setShowNewLeader] = useState(false)

  useEffect(() => {
    checkAdminAndLoadData()
  }, [id])

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
      
      // If editing and not admin, redirect
      if (id && !data?.is_admin) {
        alert('Only administrators can edit meetings')
        navigate('/meetings')
        return
      }
    }
    
    fetchProjects()
    fetchLeaders()
    fetchUsers()
    fetchInvolvedPersons()
    
    if (id) {
      fetchMeeting()
    }
  }

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

  const fetchLeaders = async () => {
    const { data } = await supabase
      .from('leaders')
      .select('*')
      .order('name')
    if (data) {
      setLeaders(data)
      // If there's only one leader and no leader selected yet, auto-select it
      if (data.length === 1 && !formData.leader_id) {
        setFormData(prev => ({
          ...prev,
          leader_id: data[0].id,
          leader_name: data[0].name
        }))
      }
    }
  }

  const fetchUsers = async () => {
    // Users will be fetched from auth if needed
    setUsers([])
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name, company:companies(name)')
      .order('name')
    if (data) setInvolvedPersons(data)
  }

  const fetchMeeting = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        attendees:meeting_attendees(*),
        photos:meeting_photos(*)
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      setFormData({
        project_id: data.project_id || '',
        date: data.date.split('T')[0],
        time: data.time,
        location: data.location || '',
        leader_id: data.leader_id || '',
        leader_name: data.leader_name,
        topic: data.topic,
        notes: data.notes || '',
      })
      setAttendees(data.attendees || [])
      setPhotos(data.photos || [])
    }
    setLoading(false)
  }

  const handleAddLeader = async () => {
    if (!newLeader.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('leaders')
      .insert([{ name: newLeader, user_id: user.id }])
      .select()
      .single()

    if (!error && data) {
      setLeaders([...leaders, data])
      setFormData({ ...formData, leader_id: data.id, leader_name: data.name })
      setNewLeader('')
      setShowNewLeader(false)
    }
  }

  const handleAddAttendee = () => {
    if (!newAttendee.trim()) return
    setAttendees([...attendees, { name: newAttendee, signature_url: null }])
    setNewAttendee('')
  }

  const handleRemoveAttendee = (index) => {
    setAttendees(attendees.filter((_, i) => i !== index))
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('safety-photos')
        .upload(filePath, file)

      if (!uploadError) {
        const { data } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(filePath)
        
        setPhotos([...photos, { photo_url: data.publicUrl }])
      }
    }
  }

  const handleRemovePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('User not authenticated')
        setLoading(false)
        return
      }

      // Validate required fields
      if (!formData.leader_name) {
        alert('Please select a leader')
        setLoading(false)
        return
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

      // Insert or update meeting
      const meetingData = {
        project_id: formData.project_id || null,
        date: formData.date,
        time: formData.time,
        location: formData.location || null,
        // Don't include leader_id if it's not set properly - use only leader_name
        ...(formData.leader_id ? { leader_id: formData.leader_id } : {}),
        leader_name: formData.leader_name,
        topic: formData.topic,
        notes: formData.notes || null,
        signature_url: signatureUrl,
        created_by: user.id,
      }

    let meetingId = id
    if (id) {
      const { error } = await supabase
        .from('meetings')
        .update(meetingData)
        .eq('id', id)
      
      if (error) {
        console.error('Error updating meeting:', error)
        setLoading(false)
        return
      }

      // Delete existing attendees and photos
      await supabase.from('meeting_attendees').delete().eq('meeting_id', id)
      await supabase.from('meeting_photos').delete().eq('meeting_id', id)
    } else {
      const { data, error } = await supabase
        .from('meetings')
        .insert([meetingData])
        .select()
        .single()

      if (error) {
        console.error('Error creating meeting:', error)
        alert(`Error creating meeting: ${error.message}`)
        setLoading(false)
        return
      }
      meetingId = data.id
    }

      // Insert attendees with signatures
      if (attendees.length > 0) {
        const attendeesWithSignatures = await Promise.all(
          attendees.map(async (attendee, index) => {
            let signatureUrl = attendee.signature_url || null
            
            // Upload signature if present for this attendee
            const sigRef = attendeeSignatureRefs.current[index]
            if (sigRef && !sigRef.isEmpty()) {
              const signatureBlob = await fetch(sigRef.toDataURL()).then(r => r.blob())
              const signatureFile = `attendee-signature-${Date.now()}-${index}.png`
              
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
            
            return {
              meeting_id: meetingId,
              name: attendee.name,
              user_id: attendee.user_id || null,
              signature_url: signatureUrl
            }
          })
        )
        
        const { error: attendeesError } = await supabase.from('meeting_attendees').insert(attendeesWithSignatures)
        if (attendeesError) {
          console.error('Error adding attendees:', attendeesError)
        }
      }

      // Insert photos
      if (photos.length > 0) {
        const { error: photosError } = await supabase.from('meeting_photos').insert(
          photos.map((p, index) => ({
            meeting_id: meetingId,
            photo_url: p.photo_url,
            display_order: index
          }))
        )
        if (photosError) {
          console.error('Error adding photos:', photosError)
        }
      }

      setLoading(false)
      navigate('/meetings')
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const handleLeaderChange = (e) => {
    const leaderId = e.target.value
    if (leaderId === 'new') {
      setShowNewLeader(true)
      return
    }
    const leader = leaders.find(l => l.id === leaderId)
    setFormData({
      ...formData,
      leader_id: leaderId,
      leader_name: leader?.name || ''
    })
  }

  if (loading && id) return <div className="spinner"></div>

  return (
    <div className="meeting-form">
      <h2 className="page-title">{id ? 'Edit Meeting' : 'New Safety Meeting'}</h2>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="section-title">Meeting Details</h3>

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
            <label className="form-label">Leader *</label>
            <select
              className="form-select"
              value={formData.leader_id}
              onChange={handleLeaderChange}
              required
            >
              <option value="">Select Leader</option>
              {leaders.map(leader => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
              <option value="new">+ Add New Leader</option>
            </select>
          </div>

          {showNewLeader && (
            <div className="new-leader-form">
              <input
                type="text"
                className="form-input"
                placeholder="Enter leader name"
                value={newLeader}
                onChange={(e) => setNewLeader(e.target.value)}
              />
              <div className="form-row">
                <button type="button" className="btn btn-primary" onClick={handleAddLeader}>
                  Add Leader
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowNewLeader(false)
                    setNewLeader('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Topic *</label>
            <input
              type="text"
              className="form-input"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes</label>
            <textarea
              className="form-textarea"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Attendees</h3>
          
          {/* List of attendees with signatures */}
          {attendees.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '24px' }}>
              {attendees.map((attendee, index) => (
                <div key={index} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '16px' }}>
                  {/* Attendee name with remove button */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ marginBottom: '0', fontSize: '16px', fontWeight: '500' }}>
                      {index + 1}. {attendee.name}
                    </label>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => handleRemoveAttendee(index)}
                      style={{ position: 'static' }}
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Attendee signature */}
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                      Signature (optional)
                    </p>
                    {attendee.signature_url ? (
                      <div>
                        <img 
                          src={attendee.signature_url} 
                          alt={`Signature of ${attendee.name}`}
                          style={{ 
                            maxWidth: '100%', 
                            maxHeight: '150px',
                            border: '1px solid var(--color-border)', 
                            borderRadius: '8px',
                            marginBottom: '8px'
                          }} 
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{ fontSize: '14px' }}
                          onClick={() => {
                            const newAttendees = [...attendees]
                            newAttendees[index] = { ...newAttendees[index], signature_url: null }
                            setAttendees(newAttendees)
                          }}
                        >
                          Remove Signature
                        </button>
                      </div>
                    ) : (
                      <div className="signature-container">
                        <SignatureCanvas
                          ref={(ref) => {
                            if (!attendeeSignatureRefs.current[index]) {
                              attendeeSignatureRefs.current[index] = ref
                            }
                          }}
                          canvasProps={{
                            className: 'signature-canvas',
                            style: { width: '100%', height: '150px' }
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => attendeeSignatureRefs.current[index]?.clear()}
                        >
                          Clear Signature
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add attendee form */}
          <div className="add-attendee-form">
            <select
              className="form-select"
              value={newAttendee}
              onChange={(e) => setNewAttendee(e.target.value)}
            >
              <option value="">Select person or type name</option>
              {involvedPersons.map(person => (
                <option key={person.id} value={person.name}>
                  {person.name} {person.company?.name ? `(${person.company.name})` : ''}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="form-input"
              placeholder="Or enter custom name"
              value={newAttendee}
              onChange={(e) => setNewAttendee(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddAttendee())}
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddAttendee}>
              + Add
            </button>
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Photos</h3>
          
          <div className="photos-grid">
            {photos.map((photo, index) => (
              <div key={index} className="photo-item">
                <img src={photo.photo_url} alt={`Photo ${index + 1}`} />
                <button
                  type="button"
                  className="btn-remove-photo"
                  onClick={() => handleRemovePhoto(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label className="form-label">Upload Photos</label>
            <input
              type="file"
              className="form-input"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
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
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/meetings')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : id ? 'Update Meeting' : 'Create Meeting'}
          </button>
        </div>
      </form>
    </div>
  )
}
