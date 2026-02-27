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
  const [safetyTopics, setSafetyTopics] = useState([])
  const [checklists, setChecklists] = useState([])
  const [selectedChecklists, setSelectedChecklists] = useState([])
  const [showCustomTopic, setShowCustomTopic] = useState(false)
  
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    leader_id: '',
    leader_name: '',
    topic: '',
    notes: '',
    completed: false,
  })
  
  const [attendees, setAttendees] = useState([])
  const [newAttendee, setNewAttendee] = useState('')
  const [photos, setPhotos] = useState([])
  const [newLeader, setNewLeader] = useState('')
  const [showNewLeader, setShowNewLeader] = useState(false)
  const [userDefaultSignatures, setUserDefaultSignatures] = useState({}) // Map of name -> default_signature_url
  const [leaderDefaultSignature, setLeaderDefaultSignature] = useState(null) // Leader's default signature URL

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
    fetchSafetyTopics()
    fetchChecklists()
    
    // Fetch users and involved persons, then build signature map
    Promise.all([fetchUsers(), fetchInvolvedPersons()]).then(([usersData, involvedPersonsData]) => {
      buildSignatureMap(usersData, involvedPersonsData)
    })
    
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
      .select('*, default_signature_url')
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
        // Set default signature for auto-selected leader
        if (data[0].default_signature_url) {
          setLeaderDefaultSignature(data[0].default_signature_url)
        }
      }
    }
  }

  const fetchUsers = async () => {
    // Fetch users with their default signatures
    const { data } = await supabase
      .from('users')
      .select('id, name, email, default_signature_url')
      .order('name')
    
    if (data) {
      setUsers(data)
      return data
    }
    return []
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name, company:companies(name), default_signature_url')
      .order('name')
    
    if (data) {
      setInvolvedPersons(data)
      return data
    }
    return []
  }

  const buildSignatureMap = (usersData, involvedPersonsData) => {
    const sigMap = {}
    
    // Add signatures from users
    usersData.forEach(user => {
      if (user.default_signature_url) {
        sigMap[user.name] = user.default_signature_url
      }
    })
    
    // Add signatures from involved persons
    involvedPersonsData.forEach(person => {
      if (person.default_signature_url) {
        sigMap[person.name] = person.default_signature_url
      }
    })
    
    setUserDefaultSignatures(sigMap)
  }

  const fetchSafetyTopics = async () => {
    const { data } = await supabase
      .from('safety_topics')
      .select('*')
      .order('category')
      .order('name')
    if (data) setSafetyTopics(data)
  }

  const fetchChecklists = async () => {
    const { data } = await supabase
      .from('checklists')
      .select('id, name, category, trades')
      .order('name')
    if (data) setChecklists(data)
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
        completed: data.completed || false,
      })
      setAttendees(data.attendees || [])
      setPhotos(data.photos || [])
      
      // Fetch associated checklists
      const { data: checklistsData } = await supabase
        .from('meeting_checklists')
        .select('checklist_id')
        .eq('meeting_id', id)
      
      if (checklistsData) {
        setSelectedChecklists(checklistsData.map(mc => mc.checklist_id))
      }
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

  // Load default signature into canvas
  const loadDefaultSignature = (attendeeName, index) => {
    const defaultSignatureUrl = userDefaultSignatures[attendeeName]
    
    if (defaultSignatureUrl && attendeeSignatureRefs.current[index]) {
      const canvas = attendeeSignatureRefs.current[index]
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const ctx = canvas.getCanvas().getContext('2d')
        const canvasElement = canvas.getCanvas()
        
        // Clear canvas first
        canvas.clear()
        
        // Calculate scaling to maintain aspect ratio
        const canvasWidth = canvasElement.width
        const canvasHeight = canvasElement.height
        const imgWidth = img.width
        const imgHeight = img.height
        
        // Calculate scale to fit image within canvas while maintaining aspect ratio
        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
        
        // Calculate dimensions and position to center the image
        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        const x = (canvasWidth - scaledWidth) / 2
        const y = (canvasHeight - scaledHeight) / 2
        
        // Draw the image with proper scaling and centering
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
      }
      img.onerror = (error) => {
        console.error('Error loading signature image:', error)
      }
      img.src = defaultSignatureUrl
    }
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
        completed: formData.completed,
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
      await supabase.from('meeting_checklists').delete().eq('meeting_id', id)
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
              signature_url: signatureUrl,
              signed_with_checkbox: attendee.signed_with_checkbox || false
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

      // Insert checklist associations
      if (selectedChecklists.length > 0) {
        const { error: checklistsError } = await supabase.from('meeting_checklists').insert(
          selectedChecklists.map(checklistId => ({
            meeting_id: meetingId,
            checklist_id: checklistId
          }))
        )
        if (checklistsError) {
          console.error('Error adding checklists:', checklistsError)
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
    // Set leader's default signature
    if (leader?.default_signature_url) {
      setLeaderDefaultSignature(leader.default_signature_url)
    } else {
      setLeaderDefaultSignature(null)
    }
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
            <select
              className="form-select"
              value={formData.topic}
              onChange={(e) => {
                const value = e.target.value
                if (value === 'custom') {
                  setShowCustomTopic(true)
                  setFormData({ ...formData, topic: '' })
                } else {
                  setShowCustomTopic(false)
                  setFormData({ ...formData, topic: value })
                }
              }}
              required={!showCustomTopic}
            >
              <option value="">Select a topic</option>
              {Object.entries(
                safetyTopics.reduce((acc, topic) => {
                  const cat = topic.category || 'Other'
                  if (!acc[cat]) acc[cat] = []
                  acc[cat].push(topic)
                  return acc
                }, {})
              ).map(([category, topics]) => (
                <optgroup key={category} label={category}>
                  {topics.map(topic => (
                    <option key={topic.id} value={topic.name}>
                      {topic.name}
                      {topic.osha_reference ? ` (OSHA ${topic.osha_reference})` : ''}
                      {topic.risk_level && topic.risk_level !== 'medium' ? ` - ${topic.risk_level.toUpperCase()}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
              <option value="custom">+ Custom Topic</option>
            </select>
          </div>

          {showCustomTopic && (
            <div className="form-group">
              <label className="form-label">Custom Topic *</label>
              <input
                type="text"
                className="form-input"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="Enter custom topic"
                required
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: '8px' }}
                onClick={() => {
                  setShowCustomTopic(false)
                  setFormData({ ...formData, topic: '' })
                }}
              >
                Select from list instead
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Associated Checklists (Optional)</label>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid var(--color-border)', 
              borderRadius: '8px',
              padding: '12px',
              backgroundColor: '#f9fafb'
            }}>
              {checklists.length === 0 ? (
                <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>No checklists available</p>
              ) : (
                checklists.map(checklist => (
                  <label 
                    key={checklist.id}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start',
                      padding: '8px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      marginBottom: '4px',
                      backgroundColor: selectedChecklists.includes(checklist.id) ? '#e0f2fe' : 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = selectedChecklists.includes(checklist.id) ? '#bae6fd' : '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedChecklists.includes(checklist.id) ? '#e0f2fe' : 'transparent'}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChecklists.includes(checklist.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedChecklists([...selectedChecklists, checklist.id])
                        } else {
                          setSelectedChecklists(selectedChecklists.filter(id => id !== checklist.id))
                        }
                      }}
                      style={{ marginRight: '10px', marginTop: '3px', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                        {checklist.name}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {checklist.category && (
                          <span>{checklist.category}</span>
                        )}
                        {checklist.trades && checklist.trades.length > 0 && (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {checklist.trades.map(trade => (
                              <span key={trade} style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: '11px'
                              }}>
                                {trade}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
            <small style={{ color: '#666', marginTop: '8px', display: 'block' }}>
              Select one or more checklists to associate with this meeting
            </small>
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
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={attendee.signed_with_checkbox || false}
                          onChange={(e) => {
                            const newAttendees = [...attendees]
                            newAttendees[index] = { 
                              ...newAttendees[index], 
                              signed_with_checkbox: e.target.checked 
                            }
                            setAttendees(newAttendees)
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                          Confirm attendance (checkbox signature)
                        </span>
                      </label>
                    </div>
                    
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={attendee.show_signature_field || false}
                          onChange={(e) => {
                            const newAttendees = [...attendees]
                            newAttendees[index] = { 
                              ...newAttendees[index], 
                              show_signature_field: e.target.checked 
                            }
                            setAttendees(newAttendees)
                            
                            // Load default signature if checking the box
                            if (e.target.checked) {
                              // Use setTimeout to ensure canvas is rendered
                              setTimeout(() => loadDefaultSignature(attendee.name, index), 100)
                            }
                          }}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>
                          Add drawn signature
                        </span>
                      </label>
                    </div>
                    
                    {attendee.show_signature_field && (
                      <>
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
                                width: 800,
                                height: 200,
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
                      </>
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
          
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked && leaderDefaultSignature && signatureRef.current) {
                    // Load leader's default signature
                    const img = new Image()
                    img.crossOrigin = 'anonymous'
                    img.onload = () => {
                      const ctx = signatureRef.current.getCanvas().getContext('2d')
                      const canvasElement = signatureRef.current.getCanvas()
                      
                      // Clear canvas first
                      signatureRef.current.clear()
                      
                      // Calculate scaling to maintain aspect ratio
                      const canvasWidth = canvasElement.width
                      const canvasHeight = canvasElement.height
                      const imgWidth = img.width
                      const imgHeight = img.height
                      
                      const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
                      
                      const scaledWidth = imgWidth * scale
                      const scaledHeight = imgHeight * scale
                      const x = (canvasWidth - scaledWidth) / 2
                      const y = (canvasHeight - scaledHeight) / 2
                      
                      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
                    }
                    img.src = leaderDefaultSignature
                  }
                }}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                Use my default signature
              </span>
            </label>
          </div>
          
          <div className="signature-container">
            <SignatureCanvas
              ref={signatureRef}
              canvasProps={{
                width: 800,
                height: 200,
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

          <div className="form-group" style={{ marginTop: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.completed}
                onChange={(e) => setFormData({ ...formData, completed: e.target.checked })}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '16px', fontWeight: '500' }}>
                Leader declares that this meeting is completed
              </span>
            </label>
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
