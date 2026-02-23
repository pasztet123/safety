import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateMeetingPDF } from '../lib/pdfGenerator'

export default function Meetings() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMeetings()
  }, [])

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
      setMeetings(data)
    }
    setLoading(false)
  }

  const handleGeneratePDF = async (meeting) => {
    await generateMeetingPDF(meeting)
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Safety Meetings</h2>
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
                <button 
                  className="btn btn-accent"
                  onClick={() => handleGeneratePDF(meeting)}
                >
                  📄 PDF
                </button>
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
