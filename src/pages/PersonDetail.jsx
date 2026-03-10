import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchAllPages, fetchByIdsInBatches, supabase } from '../lib/supabase'
import './People.css'

export default function PersonDetail() {
  const navigate = useNavigate()
  const { type, id } = useParams() // type = 'worker' | 'leader'

  const [person, setPerson] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [projects, setProjects] = useState([])
  const [incidents, setIncidents] = useState([])
  const [correctiveActions, setCorrectiveActions] = useState([])
  const [disciplinaryActions, setDisciplinaryActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('meetings')

  useEffect(() => {
    fetchAll()
  }, [id, type])

  const fetchAll = async () => {
    setLoading(true)
    const personData = await fetchPerson()
    if (personData) {
      await Promise.all([
        fetchMeetings(personData),
        fetchIncidents(personData),
        type === 'worker' ? fetchCorrectiveActions() : Promise.resolve(),
        fetchDisciplinaryActions(),
      ])
    }
    setLoading(false)
  }

  const fetchPerson = async () => {
    const { data, error } = type === 'worker'
      ? await supabase
          .from('involved_persons')
          .select('id, name, email, phone, leader_id, company:companies(name)')
          .eq('id', id)
          .single()
      : await supabase
          .from('leaders')
          .select('id, name, email, phone, default_signature_url')
          .eq('id', id)
          .single()

    if (data) {
      setPerson(data)
      return data
    }
    console.error('fetchPerson error:', error)
    return null
  }

  const fetchMeetings = async (personData) => {
    let meetingIds = []

    if (type === 'worker') {
      // Attendee name match
      const { data: attendeeRows } = await supabase
        .from('meeting_attendees')
        .select('meeting_id')
        .ilike('name', personData.name)

      meetingIds = (attendeeRows || []).map((r) => r.meeting_id)

      // Also as leader (if linked)
      if (personData.leader_id) {
        const leaderMeetings = await fetchAllPages(() => supabase
          .from('meetings')
          .select('id')
          .eq('leader_id', personData.leader_id)
          .eq('is_draft', false))
        ;(leaderMeetings || []).forEach((r) => {
          if (!meetingIds.includes(r.id)) meetingIds.push(r.id)
        })
      }
    } else {
      // Leader: meetings where leader_id = id
      const leaderMeetings = await fetchAllPages(() => supabase
        .from('meetings')
        .select('id')
        .eq('leader_id', id)
        .eq('is_draft', false))

      meetingIds = (leaderMeetings || []).map((r) => r.id)
    }

    if (meetingIds.length === 0) {
      setMeetings([])
      setProjects([])
      return
    }

    const meetingData = await fetchByIdsInBatches({
      table: 'meetings',
      select: 'id, date, topic, project_id, project:projects(id, name, job_address)',
      ids: meetingIds,
      buildQuery: (query) => query.eq('is_draft', false),
    })

    meetingData.sort((left, right) => (right.date || '').localeCompare(left.date || ''))

    setMeetings(meetingData || [])

    // Derive distinct projects from meetings
    const projectMap = {}
    ;(meetingData || []).forEach((m) => {
      if (m.project) {
        projectMap[m.project.id] = m.project
      }
    })
    setProjects(Object.values(projectMap))
  }

  const fetchIncidents = async (personData) => {
    const name = personData.name

    // Two separate ILIKE queries — avoids PostgREST .or() space-in-value bug
    const [{ data: byEmployee }, { data: byReporter }] = await Promise.all([
      supabase
        .from('incidents')
        .select('*, project:projects(name)')
        .ilike('employee_name', name)
        .order('date', { ascending: false }),
      supabase
        .from('incidents')
        .select('*, project:projects(name)')
        .ilike('reporter_name', name)
        .order('date', { ascending: false }),
    ])

    // Dedupe by id
    const seen = new Set()
    let allIncidents = []
    ;[...(byEmployee || []), ...(byReporter || [])].forEach((inc) => {
      if (!seen.has(inc.id)) {
        seen.add(inc.id)
        allIncidents.push(inc)
      }
    })
    allIncidents.sort((a, b) => (b.date > a.date ? 1 : -1))

    if (type === 'worker') {
      // Also fetch via incident_witnesses FK (harder link)
      const { data: witnessRows } = await supabase
        .from('incident_witnesses')
        .select('incident_id')
        .eq('person_id', id)

      const witnessIds = (witnessRows || []).map((r) => r.incident_id)

      if (witnessIds.length > 0) {
        const { data: witnessIncidents } = await supabase
          .from('incidents')
          .select('*, project:projects(name)')
          .in('id', witnessIds)
          .order('date', { ascending: false })

        // Merge, dedupe by id
        const existingIds = new Set(allIncidents.map((i) => i.id))
        ;(witnessIncidents || []).forEach((inc) => {
          if (!existingIds.has(inc.id)) {
            allIncidents.push({ ...inc, _asWitness: true })
          }
        })
      }
    }

    // Annotate name-matched items
    allIncidents = allIncidents.map((inc) => ({
      ...inc,
      _nameMatch:
        !inc._asWitness &&
        ((inc.employee_name || '').toLowerCase() === name.toLowerCase() ||
          (inc.reporter_name || '').toLowerCase() === name.toLowerCase()),
      _fuzzyMatch:
        !inc._asWitness &&
        ((inc.employee_name || '').toLowerCase() !== name.toLowerCase() &&
          (inc.reporter_name || '').toLowerCase() !== name.toLowerCase()),
    }))

    setIncidents(allIncidents)
  }

  const fetchCorrectiveActions = async () => {
    const { data } = await supabase
      .from('corrective_actions')
      .select('*, incident:incidents(details, date)')
      .eq('responsible_person_id', id)
      .order('declared_created_date', { ascending: false })
      .order('due_date', { ascending: false })

    setCorrectiveActions(data || [])
  }

  const fetchDisciplinaryActions = async () => {
    const query = type === 'worker'
      ? supabase
          .from('disciplinary_actions')
          .select('*, incident:incidents(id, details, date, safety_violation_type), recipient:involved_persons(name)')
          .eq('recipient_person_id', id)
      : supabase
          .from('disciplinary_actions')
          .select('*, incident:incidents(id, details, date, safety_violation_type), recipient:involved_persons(name)')
          .eq('responsible_leader_id', id)

    const { data } = await query.order('action_date', { ascending: false }).order('action_time', { ascending: false })
    setDisciplinaryActions(data || [])
  }

  if (loading) return <div className="spinner"></div>

  if (!person) {
    return (
      <div>
        <button className="person-detail-back" onClick={() => navigate('/people')}>
          ← Back to People
        </button>
        <p>Person not found.</p>
      </div>
    )
  }

  const tabs = [
    { key: 'meetings', label: `Meetings (${meetings.length})` },
    { key: 'projects', label: `Projects (${projects.length})` },
    { key: 'incidents', label: `Incidents (${incidents.length})` },
    ...(type === 'worker'
      ? [
          { key: 'corrective', label: `Corrective Actions (${correctiveActions.length})` },
          { key: 'disciplinary', label: `Disciplinary Actions (${disciplinaryActions.length})` },
        ]
      : [{ key: 'disciplinary', label: `Disciplinary Actions (${disciplinaryActions.length})` }]),
  ]

  return (
    <div>
      <button className="person-detail-back" onClick={() => navigate('/people')}>
        ← Back to People
      </button>

      {/* Profile header */}
      <div className="person-profile-header">
        <div className="person-profile-avatar">
          {(person.name || '?').charAt(0).toUpperCase()}
        </div>
        <div className="person-profile-meta">
          <h2 className="person-profile-name">{person.name}</h2>
          {person.leader_id ? (
            <div className="person-badge-group">
              <span className="person-badge person-badge--worker">Worker</span>
              <span className="person-badge person-badge--leader">Leader</span>
            </div>
          ) : (
            <span className={`person-badge person-badge--${type}`}>
              {type === 'worker' ? 'Worker' : 'Leader'}
            </span>
          )}
          {type === 'worker' && person.company?.name && (
            <span className="person-profile-company">{person.company.name}</span>
          )}
        </div>
      </div>

      {/* Contact details */}
      {(person.email || person.phone) && (
        <div className="person-profile-contacts">
          {person.email && (
            <div className="person-profile-contact-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <a href={`mailto:${person.email}`} onClick={(e) => e.stopPropagation()}>
                {person.email}
              </a>
            </div>
          )}
          {person.phone && (
            <div className="person-profile-contact-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <a href={`tel:${person.phone}`} onClick={(e) => e.stopPropagation()}>
                {person.phone}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="person-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`person-tab${activeTab === tab.key ? ' is-active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="person-tab-content">
        {/* ─── Meetings ─── */}
        {activeTab === 'meetings' && (
          meetings.length === 0 ? (
            <div className="person-empty-section">No meetings found.</div>
          ) : (
            <div className="person-activity-list">
              {meetings.map((m) => (
                <button
                  key={m.id}
                  className="person-activity-row"
                  onClick={() => navigate(`/meetings/${m.id}`)}
                >
                  <div className="person-activity-main">
                    <span className="person-activity-title">{m.topic || 'Toolbox Meeting'}</span>
                    {m.project && (
                      <span className="person-activity-sub">{m.project.name}</span>
                    )}
                  </div>
                  <span className="person-activity-date">
                    {m.date ? new Date(m.date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    }) : '—'}
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {/* ─── Projects ─── */}
        {activeTab === 'projects' && (
          projects.length === 0 ? (
            <div className="person-empty-section">No projects found.</div>
          ) : (
            <div className="person-activity-list">
              {projects.map((p) => (
                <button
                  key={p.id}
                  className="person-activity-row"
                  onClick={() => navigate(`/projects/${p.id}`)}
                >
                  <div className="person-activity-main">
                    <span className="person-activity-title">{p.name}</span>
                    {p.job_address && (
                      <span className="person-activity-sub">{p.job_address}</span>
                    )}
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          )
        )}

        {/* ─── Incidents ─── */}
        {activeTab === 'incidents' && (
          <>
            {incidents.length > 0 && (
              <div className="person-section-disclaimer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                Name-based matching may include false positives. Witness entries are linked by exact ID.
              </div>
            )}
            {incidents.length === 0 ? (
              <div className="person-empty-section">No incidents found.</div>
            ) : (
              <div className="person-activity-list">
                {incidents.map((inc) => (
                  <button
                    key={inc.id}
                    className="person-activity-row"
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                  >
                    <div className="person-activity-main">
                      <span className="person-activity-title">
                        {inc.details
                          ? inc.details.substring(0, 80) + (inc.details.length > 80 ? '…' : '')
                          : 'Incident'}
                      </span>
                      <div className="person-activity-tags">
                        {inc.employee_name?.toLowerCase() === person.name.toLowerCase() && (
                          <span className="person-role-tag person-role-tag--victim">Employee</span>
                        )}
                        {inc.reporter_name?.toLowerCase() === person.name.toLowerCase() && (
                          <span className="person-role-tag person-role-tag--reporter">Reporter</span>
                        )}
                        {inc._asWitness && (
                          <span className="person-role-tag person-role-tag--witness">Witness</span>
                        )}
                        {inc.project && (
                          <span className="person-activity-sub">{inc.project.name}</span>
                        )}
                      </div>
                    </div>
                    <span className="person-activity-date">
                      {inc.date ? new Date(inc.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                      }) : '—'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* ─── Corrective Actions (workers only) ─── */}
        {activeTab === 'corrective' && (
          correctiveActions.length === 0 ? (
            <div className="person-empty-section">No corrective actions assigned.</div>
          ) : (
            <div className="person-activity-list">
              {correctiveActions.map((ca) => (
                <button
                  key={ca.id}
                  className="person-activity-row"
                  onClick={() => navigate(`/corrective-actions`)}
                >
                  <div className="person-activity-main">
                    <span className="person-activity-title">{ca.description || 'Corrective Action'}</span>
                    {ca.incident && (
                      <span className="person-activity-sub">
                        Incident: {ca.incident.details?.substring(0, 50) || ca.incident.date}
                      </span>
                    )}
                  </div>
                  <span className={`person-ca-status person-ca-status--${ca.status}`}>
                    {ca.status === 'completed' ? 'Completed' : 'Open'}
                  </span>
                </button>
              ))}
            </div>
          )
        )}

        {activeTab === 'disciplinary' && (
          disciplinaryActions.length === 0 ? (
            <div className="person-empty-section">
              {type === 'worker' ? 'No disciplinary actions assigned.' : 'No disciplinary actions recorded under this leader.'}
            </div>
          ) : (
            <div className="person-activity-list">
              {disciplinaryActions.map((action) => (
                <button
                  key={action.id}
                  className="person-activity-row"
                  onClick={() => navigate(action.incident?.id ? `/incidents/${action.incident.id}` : '/disciplinary-actions')}
                >
                  <div className="person-activity-main">
                    <span className="person-activity-title">{action.action_type}</span>
                    <span className="person-activity-sub">
                      {action.incident?.safety_violation_type || 'Safety violation'}
                      {type === 'leader' && action.recipient?.name ? ` · Recipient: ${action.recipient.name}` : ''}
                      {action.incident?.date ? ` · Incident date: ${new Date(action.incident.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </span>
                    {action.action_notes && (
                      <span className="person-activity-sub">{action.action_notes.substring(0, 90)}{action.action_notes.length > 90 ? '…' : ''}</span>
                    )}
                  </div>
                  <span className="person-ca-status person-ca-status--open">
                    {new Date(action.action_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
