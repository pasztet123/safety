import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAllPages, fetchByIdsInBatches, supabase } from '../lib/supabase'
import { generateMeetingPDF } from '../lib/pdfGenerator'
import { generateIncidentPDF } from '../lib/pdfGenerator'
import LocationMap from '../components/LocationMap'
import './ProjectDetail.css'

export default function ProjectDetail() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [project, setProject] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [incidents, setIncidents] = useState([])
  const [correctiveActions, setCorrectiveActions] = useState({})
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('meetings')
  const [meetingPdfLoading, setMeetingPdfLoading] = useState(null)
  const [incidentPdfLoading, setIncidentPdfLoading] = useState(null)

  useEffect(() => {
    checkAdmin()
    fetchAll()
  }, [id])

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

  const fetchAll = async () => {
    setLoading(true)
    await Promise.all([
      fetchProject(),
      fetchMeetings(),
      fetchIncidents(),
      fetchInvolvedPersons(),
    ])
    setLoading(false)
  }

  const fetchProject = async () => {
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single()
    if (data) setProject(data)
  }

  const fetchMeetings = async () => {
    try {
      const data = await fetchAllPages(() => supabase
        .from('meetings')
        .select(`
          *,
          attendees:meeting_attendees(name),
          photos:meeting_photos(photo_url)
        `)
        .is('deleted_at', null)
        .eq('project_id', id)
        .eq('is_draft', false)
        .order('date', { ascending: false })
        .order('time', { ascending: false }))

      const meetingIds = data.map(m => m.id)
      if (meetingIds.length === 0) {
        setMeetings([])
        return
      }

      const checklistsData = await fetchByIdsInBatches({
        table: 'meeting_checklists',
        select: 'meeting_id, checklist:checklists(name)',
        ids: meetingIds,
        idColumn: 'meeting_id',
      })

      const checklistsByMeeting = {}
      checklistsData.forEach(mc => {
        if (!checklistsByMeeting[mc.meeting_id]) checklistsByMeeting[mc.meeting_id] = []
        checklistsByMeeting[mc.meeting_id].push(mc.checklist)
      })

      setMeetings(data.map(m => ({
        ...m,
        checklists: checklistsByMeeting[m.id] || [],
      })))
    } catch (error) {
      setMeetings([])
    }
  }

  const fetchIncidents = async () => {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .is('deleted_at', null)
      .eq('project_id', id)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (!error && data) {
      setIncidents(data)
      const incidentIds = data.map(i => i.id)
      if (incidentIds.length > 0) {
        const { data: actions } = await supabase
          .from('corrective_actions')
          .select('*')
          .in('incident_id', incidentIds)

        if (actions) {
          const actionsByIncident = {}
          actions.forEach(a => {
            if (!actionsByIncident[a.incident_id]) actionsByIncident[a.incident_id] = []
            actionsByIncident[a.incident_id].push(a)
          })
          setCorrectiveActions(actionsByIncident)
        }
      }
    }
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name')
      .order('name')
    if (data) setInvolvedPersons(data)
  }

  const handleToggleActionStatus = async (actionId, currentStatus) => {
    const { data: { user } } = await supabase.auth.getUser()

    const newStatus = currentStatus === 'open' ? 'completed' : 'open'
    const updateData = {
      status: newStatus,
      completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
      updated_by: user?.id || null,
    }
    const { error } = await supabase
      .from('corrective_actions')
      .update(updateData)
      .eq('id', actionId)
    if (!error) fetchIncidents()
  }

  const handleDeleteMeeting = async (meetingId, topic) => {
    if (!confirm(`Delete meeting "${topic}"? This cannot be undone.`)) return
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId)
    if (error) {
      alert('Error deleting meeting: ' + error.message)
      return
    }
    fetchMeetings()
  }

  const handleDeleteIncident = async (incidentId, typeName) => {
    if (!confirm(`Delete incident "${typeName}"? This cannot be undone.`)) return
    await supabase.from('incidents').delete().eq('id', incidentId)
    fetchIncidents()
  }

  const handleMeetingPDF = async (meeting) => {
    setMeetingPdfLoading(meeting.id)
    try {
      const { data, error: meetingErr } = await supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name),
          attendees:meeting_attendees(name, signature_url, signed_with_checkbox),
          photos:meeting_photos(photo_url)
        `)
        .eq('id', meeting.id)
        .single()

      if (!data || meetingErr) {
        alert('Error loading meeting data')
        return
      }

      const { data: mcRows } = await supabase
        .from('meeting_checklists')
        .select('checklist_id')
        .eq('meeting_id', data.id)

      let checklists = []
      if (mcRows && mcRows.length > 0) {
        const checklistIds = mcRows.map(r => r.checklist_id)
        const { data: clData } = await supabase
          .from('checklists')
          .select('id, name, category')
          .in('id', checklistIds)
        const { data: itemsData } = await supabase
          .from('checklist_items')
          .select('id, checklist_id, title, description, display_order, is_section_header')
          .in('checklist_id', checklistIds)
        checklists = (clData || []).map(cl => ({
          ...cl,
          items: (itemsData || []).filter(it => it.checklist_id === cl.id),
        }))
      }
      data.checklists = checklists

      let topicDetails = null
      if (data.topic) {
        const { data: td } = await supabase
          .from('safety_topics')
          .select('name, description, osha_reference, risk_level, category')
          .eq('name', data.topic)
          .single()
        topicDetails = td || null
      }

      const { data: completions } = await supabase
        .from('checklist_completions')
        .select('id, checklist_id, notes')
        .eq('meeting_id', data.id)

      let checklistCompletions = []
      if (completions && completions.length > 0) {
        const completionIds = completions.map(c => c.id)
        const { data: ciData } = await supabase
          .from('checklist_completion_items')
          .select('completion_id, checklist_item_id, is_checked, notes')
          .in('completion_id', completionIds)

        checklistCompletions = completions.map(c => ({
          ...c,
          items: (ciData || [])
            .filter(ci => ci.completion_id === c.id)
            .map(ci => ({ ...ci, item_id: ci.checklist_item_id })),
        }))
      }

      await generateMeetingPDF({ ...data, topicDetails, checklistCompletions })
    } catch (e) {
      console.error('Error generating PDF:', e)
      alert('Error generating PDF')
    } finally {
      setMeetingPdfLoading(null)
    }
  }

  const handleIncidentPDF = async (incident) => {
    setIncidentPdfLoading(incident.id)
    try {
      await generateIncidentPDF(incident)
    } finally {
      setIncidentPdfLoading(null)
    }
  }

  if (loading) return <div className="spinner"></div>

  if (!project) {
    return (
      <div>
        <div className="pd-back-row">
          <button className="pd-back-btn" onClick={() => navigate('/projects')}>← Projects</button>
        </div>
        <p>Project not found.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Back */}
      <div className="pd-back-row">
        <button className="pd-back-btn" onClick={() => navigate('/projects')}>
          ← Projects
        </button>
      </div>

      {/* Project header card */}
      <div className="card pd-project-header">
        <div className="pd-project-header-top">
          <h2 className="pd-project-name">{project.name}</h2>
          <span className={`project-status status-${project.status}`}>{project.status}</span>
        </div>
        {project.client_name && (
          <p className="project-detail">
            <span className="project-detail-label">Client:</span> {project.client_name}
          </p>
        )}
        {project.job_address && (
          <p className="project-detail">
            <span className="project-detail-label">Address:</span> {project.job_address}
          </p>
        )}
        {project.description && (
          <p className="project-description">{project.description}</p>
        )}
        {project.trades && project.trades.length > 0 && (
          <div className="project-trades">
            {project.trades.map(t => (
              <span key={t} className="project-trade-badge">{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="pd-tabs">
        <button
          className={`pd-tab-btn${activeTab === 'meetings' ? ' pd-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('meetings')}
        >
          Toolbox Meetings
          <span className="pd-tab-count">{meetings.length}</span>
        </button>
        <button
          className={`pd-tab-btn${activeTab === 'incidents' ? ' pd-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('incidents')}
        >
          Incidents
          <span className="pd-tab-count pd-tab-count--incident">{incidents.length}</span>
        </button>
      </div>

      {/* ── MEETINGS TAB ── */}
      {activeTab === 'meetings' && (
        <div>
          <div className="pd-tab-actions">
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/meetings/new?project_id=${id}`)}
            >
              + New Meeting
            </button>
          </div>

          <div className="meetings-list">
            {meetings.length === 0 ? (
              <div className="empty-state">
                <p>No toolbox meetings for this project yet.</p>
              </div>
            ) : (
              meetings.map(meeting => (
                <div key={meeting.id} className="card">
                  <div className="meeting-header">
                    <div>
                      <h3 className="meeting-topic">{meeting.topic}</h3>
                      <p className="meeting-meta">
                        {new Date(meeting.date).toLocaleDateString()} at {meeting.time}
                      </p>
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
                          onClick={() => handleDeleteMeeting(meeting.id, meeting.topic)}
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
                    {meeting.checklists?.length > 0 && (
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
                    {meeting.photos?.length > 0 && (
                      <div className="meeting-detail-item">
                        <strong>Photos:</strong> {meeting.photos.length} attached
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/meetings/${meeting.id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleMeetingPDF(meeting)}
                      disabled={meetingPdfLoading === meeting.id}
                      style={{ minWidth: '70px' }}
                    >
                      {meetingPdfLoading === meeting.id ? '…' : 'PDF'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── INCIDENTS TAB ── */}
      {activeTab === 'incidents' && (
        <div>
          <div className="pd-tab-actions">
            <button
              className="btn btn-accent"
              onClick={() => navigate(`/incidents/new?project_id=${id}`)}
            >
              + Report Incident
            </button>
          </div>

          <div className="incidents-list">
            {incidents.length === 0 ? (
              <div className="empty-state">
                <p>No incidents for this project. Stay safe!</p>
              </div>
            ) : (
              incidents.map(incident => (
                <div key={incident.id} className="card incident-card">
                  <div className="incident-header">
                    <div>
                      <div>
                        <span className="incident-type-badge">{incident.type_name}</span>
                        {incident.incident_subtype && (
                          <span className="incident-subtype-badge">
                            {incident.incident_subtype.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      <p className="incident-meta">
                        {new Date(incident.date).toLocaleDateString()} at {incident.time}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => navigate(`/incidents/${incident.id}/edit`)}
                      >
                        Edit
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleDeleteIncident(incident.id, incident.type_name)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="incident-details">
                    <div className="incident-detail-item">
                      <strong>Employee:</strong> {incident.employee_name}
                    </div>
                    {incident.phone && (
                      <div className="incident-detail-item">
                        <strong>Phone:</strong> {incident.phone}
                      </div>
                    )}
                    <div className="incident-detail-item">
                      <strong>Reporter:</strong> {incident.reporter_name}
                    </div>
                    {incident.location && (
                      <div className="incident-detail-item">
                        <strong>Location:</strong> {incident.location}
                        <LocationMap latitude={incident.latitude} longitude={incident.longitude} height={180} />
                      </div>
                    )}
                    <div className="incident-detail-item">
                      <strong>Details:</strong>
                      <p>{incident.details}</p>
                    </div>
                    {incident.notes && (
                      <div className="incident-detail-item">
                        <strong>Notes:</strong>
                        <p>{incident.notes}</p>
                      </div>
                    )}
                    {incident.photo_url && (
                      <div className="incident-detail-item">
                        <strong>Photo:</strong> Attached
                      </div>
                    )}
                    {incident.signature_url && (
                      <div className="incident-detail-item">
                        <strong>Signature:</strong> Signed by {incident.reporter_name}
                      </div>
                    )}
                  </div>

                  {correctiveActions[incident.id]?.length > 0 && (
                    <div className="ica-section">
                      <p className="ica-title">
                        Corrective Actions{' '}
                        <span className="ica-count">{correctiveActions[incident.id].length}</span>
                      </p>
                      <div className="ica-list">
                        {correctiveActions[incident.id].map(action => (
                          <div key={action.id} className={`ica-row ${action.status}`}>
                            <input
                              type="checkbox"
                              className="ica-checkbox"
                              checked={action.status === 'completed'}
                              onChange={() => handleToggleActionStatus(action.id, action.status)}
                              disabled={!isAdmin}
                            />
                            <div className="ica-body">
                              <p className="ica-desc">{action.description}</p>
                              <div className="ica-meta">
                                {action.responsible_person_id && (
                                  <span className="ica-tag">
                                    {involvedPersons.find(p => p.id === action.responsible_person_id)?.name || 'Unknown'}
                                  </span>
                                )}
                                {action.due_date && (
                                  <span className="ica-tag ica-tag--date">
                                    Due {new Date(action.due_date).toLocaleDateString()}
                                  </span>
                                )}
                                {action.completion_date && (
                                  <span className="ica-tag ica-tag--done">
                                    Completed {new Date(action.completion_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => navigate(`/incidents/${incident.id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleIncidentPDF(incident)}
                      disabled={incidentPdfLoading === incident.id}
                      style={{ minWidth: '70px' }}
                    >
                      {incidentPdfLoading === incident.id ? '…' : 'PDF'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
