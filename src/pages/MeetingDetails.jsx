import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './MeetingForm.css'

export default function MeetingDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [meeting, setMeeting] = useState(null)

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
    }
    
    if (id) {
      await fetchMeeting()
    }
  }

  const fetchMeeting = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        project:projects(name),
        attendees:meeting_attendees(*),
        photos:meeting_photos(*)
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      setMeeting(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="spinner"></div>

  if (!meeting) {
    return (
      <div>
        <h2 className="page-title">Meeting Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/meetings')}>
          Back to Meetings
        </button>
      </div>
    )
  }

  return (
    <div className="meeting-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="page-title">Meeting Details</h2>
        {isAdmin && (
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/meetings/${id}/edit`)}
          >
            Edit Meeting
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">Meeting Information</h3>

        <div className="form-group">
          <label className="form-label">Project</label>
          <p className="detail-value">{meeting.project?.name || 'No project assigned'}</p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Date</label>
            <p className="detail-value">{new Date(meeting.date).toLocaleDateString()}</p>
          </div>

          <div className="form-group">
            <label className="form-label">Time</label>
            <p className="detail-value">{meeting.time.substring(0, 5)}</p>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location</label>
          <p className="detail-value">{meeting.location || 'Not specified'}</p>
        </div>

        <div className="form-group">
          <label className="form-label">Leader</label>
          <p className="detail-value">{meeting.leader_name}</p>
        </div>

        <div className="form-group">
          <label className="form-label">Topic</label>
          <p className="detail-value">{meeting.topic}</p>
        </div>

        {meeting.notes && (
          <div className="form-group">
            <label className="form-label">Notes</label>
            <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{meeting.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="section-title">Attendees</h3>
        
        {meeting.attendees && meeting.attendees.length > 0 ? (
          <div className="attendees-list">
            {meeting.attendees.map((attendee, index) => (
              <div key={index} className="attendee-item" style={{ cursor: 'default' }}>
                <span>{attendee.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="detail-value">No attendees recorded</p>
        )}
      </div>

      {meeting.photos && meeting.photos.length > 0 && (
        <div className="card">
          <h3 className="section-title">Photos</h3>
          
          <div className="photos-grid">
            {meeting.photos.map((photo, index) => (
              <div key={index} className="photo-item" style={{ cursor: 'default' }}>
                <img src={photo.photo_url} alt={`Photo ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {meeting.signature_url && (
        <div className="card">
          <h3 className="section-title">Signature</h3>
          <div className="signature-container">
            <img src={meeting.signature_url} alt="Signature" style={{ maxWidth: '100%', border: '1px solid var(--color-border)', borderRadius: '8px' }} />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/meetings')}>
          Back to Meetings
        </button>
      </div>
    </div>
  )
}
