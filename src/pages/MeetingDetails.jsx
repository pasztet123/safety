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
      // Fetch associated checklists
      const { data: checklistsData } = await supabase
        .from('meeting_checklists')
        .select(`
          checklist:checklists(id, name, category, trades)
        `)
        .eq('meeting_id', id)
      
      setMeeting({
        ...data,
        checklists: checklistsData?.map(mc => mc.checklist) || []
      })
    }
    setLoading(false)
  }

  if (loading) return <div className="spinner"></div>

  if (!meeting) {
    return (
      <div>
        <h2 className="page-title">Meeting Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/meetings')}>
          Back to Toolbox Meetings
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

        {meeting.checklists && meeting.checklists.length > 0 && (
          <div className="form-group">
            <label className="form-label">Associated Checklists ({meeting.checklists.length})</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {meeting.checklists.map(checklist => (
                <div 
                  key={checklist.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '500', marginBottom: '4px' }}>
                      {checklist.name}
                    </p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {checklist.category && (
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {checklist.category}
                        </span>
                      )}
                      {checklist.trades && checklist.trades.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {checklist.trades.map(trade => (
                            <span key={trade} style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              padding: '4px 10px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              {trade}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate(`/checklists/${checklist.id}`)}
                  >
                    View Checklist
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {meeting.attendees.map((attendee, index) => (
              <div 
                key={index} 
                style={{ 
                  borderBottom: index < meeting.attendees.length - 1 ? '1px solid var(--color-border)' : 'none',
                  paddingBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: '500', marginBottom: '4px' }}>{attendee.name}</p>
                    {attendee.signed_with_checkbox && (
                      <p style={{ fontSize: '13px', color: 'var(--color-primary)', marginTop: '4px' }}>
                        ✓ Confirmed attendance
                      </p>
                    )}
                  </div>
                  
                  {attendee.signature_url && (
                    <div style={{ flex: 1, maxWidth: '300px' }}>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                        Signature:
                      </p>
                      <img 
                        src={attendee.signature_url} 
                        alt={`Signature of ${attendee.name}`}
                        style={{ 
                          width: '100%',
                          maxHeight: '100px',
                          objectFit: 'contain',
                          border: '1px solid var(--color-border)', 
                          borderRadius: '4px',
                          padding: '4px',
                          backgroundColor: '#fff'
                        }} 
                      />
                    </div>
                  )}
                </div>
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
          Back to Toolbox Meetings
        </button>
      </div>
    </div>
  )
}
