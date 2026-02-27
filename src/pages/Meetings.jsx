import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Meetings() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    checkAdmin()
    fetchMeetings()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
  }

  const fetchMeetings = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        project:projects(name),
        attendees:meeting_attendees(name),
        photos:meeting_photos(photo_url)
      `)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (!error && data) {
      // Fetch checklists for all meetings
      const meetingIds = data.map(m => m.id)
      const { data: checklistsData } = await supabase
        .from('meeting_checklists')
        .select(`
          meeting_id,
          checklist:checklists(name)
        `)
        .in('meeting_id', meetingIds)
      
      // Group checklists by meeting_id
      const checklistsByMeeting = {}
      checklistsData?.forEach(mc => {
        if (!checklistsByMeeting[mc.meeting_id]) {
          checklistsByMeeting[mc.meeting_id] = []
        }
        checklistsByMeeting[mc.meeting_id].push(mc.checklist)
      })
      
      // Add checklists to meetings
      const meetingsWithChecklists = data.map(meeting => ({
        ...meeting,
        checklists: checklistsByMeeting[meeting.id] || []
      }))
      
      setMeetings(meetingsWithChecklists)
    }
    setLoading(false)
  }

  const handleDelete = async (meetingId, topic) => {
    if (!confirm(`Are you sure you want to delete the meeting "${topic}"? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId)

    if (error) {
      alert('Error deleting meeting: ' + error.message)
    } else {
      fetchMeetings()
    }
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Toolbox Meetings</h2>
        <button className="btn btn-primary" onClick={() => navigate('/meetings/new')}>
          + New Meeting
        </button>
      </div>

      <div className="meetings-list">
        {meetings.length === 0 ? (
          <div className="empty-state">
            <p>No meetings recorded yet. Create your first safety meeting!</p>
          </div>
        ) : (
          meetings.map((meeting) => (
            <div key={meeting.id} className="card">
              <div className="meeting-header">
                <div>
                  <h3 className="meeting-topic">{meeting.topic}</h3>
                  <p className="meeting-meta">
                    {new Date(meeting.date).toLocaleDateString()} at{' '}
                    {meeting.time}
                  </p>
                  {meeting.project && (
                    <p className="meeting-project">Project: {meeting.project.name}</p>
                  )}
                </div>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn btn-primary"
                      onClick={() => navigate(`/meetings/${meeting.id}/edit`)}
                    >
                      Edit
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDelete(meeting.id, meeting.topic)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <div className="meeting-details">
                <div className="meeting-detail-item">
                  <strong>Leader:</strong> {meeting.leader_name}
                </div>
                {meeting.location && (
                  <div className="meeting-detail-item">
                    <strong>Location:</strong> {meeting.location}
                  </div>
                )}
                {meeting.checklists && meeting.checklists.length > 0 && (
                  <div className="meeting-detail-item">
                    <strong>Checklists ({meeting.checklists.length}):</strong>{' '}
                    {meeting.checklists.map(c => c.name).join(', ')}
                  </div>
                )}
                <div className="meeting-detail-item">
                  <strong>Attendees:</strong>{' '}
                  {meeting.attendees?.map(a => a.name).join(', ') || 'None'}
                </div>
                {meeting.notes && (
                  <div className="meeting-detail-item">
                    <strong>Notes:</strong>
                    <p>{meeting.notes}</p>
                  </div>
                )}
                {meeting.photos && meeting.photos.length > 0 && (
                  <div className="meeting-detail-item">
                    <strong>Photos:</strong> {meeting.photos.length} attached
                  </div>
                )}
              </div>

              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/meetings/${meeting.id}`)}
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
