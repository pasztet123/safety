import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './People.css'

export default function People() {
  const navigate = useNavigate()
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPersons()
  }, [])

  const fetchPersons = async () => {
    setLoading(true)

    const [workersRes, leadersRes, attendeesRes, leaderMeetingsRes] = await Promise.all([
      supabase
        .from('involved_persons')
        .select('id, name, email, phone, leader_id, company:companies(name)')
        .order('name'),
      supabase
        .from('leaders')
        .select('id, name, email, phone')
        .order('name'),
      supabase
        .from('meeting_attendees')
        .select('name, meeting:meetings(date, is_draft)'),
      supabase
        .from('meetings')
        .select('leader_id, date')
        .eq('is_draft', false)
        .not('leader_id', 'is', null),
    ])

    // Worker meeting stats: normalized name → { count, lastDate }
    const workerMeetingMap = {}
    ;(attendeesRes.data || []).forEach(({ name, meeting }) => {
      if (!meeting || meeting.is_draft) return
      const key = (name || '').toLowerCase().trim()
      if (!workerMeetingMap[key]) workerMeetingMap[key] = { count: 0, lastDate: null }
      workerMeetingMap[key].count++
      if (!workerMeetingMap[key].lastDate || meeting.date > workerMeetingMap[key].lastDate) {
        workerMeetingMap[key].lastDate = meeting.date
      }
    })

    // Leader meeting stats: leader_id → { count, lastDate }
    const leaderMeetingMap = {}
    ;(leaderMeetingsRes.data || []).forEach(({ leader_id, date }) => {
      if (!leaderMeetingMap[leader_id]) leaderMeetingMap[leader_id] = { count: 0, lastDate: null }
      leaderMeetingMap[leader_id].count++
      if (!leaderMeetingMap[leader_id].lastDate || date > leaderMeetingMap[leader_id].lastDate) {
        leaderMeetingMap[leader_id].lastDate = date
      }
    })

    // Set of leader IDs that are linked to a worker — these get suppressed from leaders list
    const linkedLeaderIds = new Set(
      (workersRes.data || []).map((p) => p.leader_id).filter(Boolean)
    )

    const workers = (workersRes.data || []).map((p) => {
      const nameKey = (p.name || '').toLowerCase().trim()
      // Stats from meeting_attendees (as attendee)
      const attendeeMs = workerMeetingMap[nameKey] || { count: 0, lastDate: null }
      // Stats from meetings.leader_id (as leader), if linked
      const leaderMs = p.leader_id ? (leaderMeetingMap[p.leader_id] || { count: 0, lastDate: null }) : { count: 0, lastDate: null }
      // Merge: sum counts, take latest date
      const totalCount = attendeeMs.count + leaderMs.count
      let lastDate = null
      if (attendeeMs.lastDate && leaderMs.lastDate) lastDate = attendeeMs.lastDate > leaderMs.lastDate ? attendeeMs.lastDate : leaderMs.lastDate
      else lastDate = attendeeMs.lastDate || leaderMs.lastDate

      return {
        ...p,
        _type: p.leader_id ? 'both' : 'worker',
        _companyName: p.company?.name || null,
        _meetingCount: totalCount,
        _lastMeeting: lastDate,
      }
    })

    const leaders = (leadersRes.data || []).filter((l) => !linkedLeaderIds.has(l.id)).map((p) => {
      const ms = leaderMeetingMap[p.id] || { count: 0, lastDate: null }
      return { ...p, _type: 'leader', _companyName: null, _meetingCount: ms.count, _lastMeeting: ms.lastDate }
    })

    // Merge and sort by name
    const merged = [...workers, ...leaders].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' })
    )

    setPersons(merged)
    setLoading(false)
  }

  const filtered = search.trim()
    ? persons.filter((p) =>
        (p.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : persons

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">People</h2>
      </div>

      <div className="people-controls">
        <input
          className="people-search"
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="people-empty">
          {search ? 'No people found matching your search.' : 'No people found.'}
        </div>
      ) : (
        <div className="people-grid">
          {filtered.map((person) => (
            <button
              key={`${person._type}-${person.id}`}
              className="person-card"
              onClick={() => navigate(`/people/${person._type === 'leader' ? 'leader' : 'worker'}/${person.id}`)}
            >
              <div className="person-card-top">
                <div className="person-avatar">
                  {(person.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="person-card-info">
                  <div className="person-name">{person.name}</div>
                  {person._companyName && (
                    <div className="person-company">{person._companyName}</div>
                  )}
                </div>
              </div>
              {person._type === 'both' ? (
                <div className="person-badge-group">
                  <span className="person-badge person-badge--worker">Worker</span>
                  <span className="person-badge person-badge--leader">Leader</span>
                </div>
              ) : (
                <span className={`person-badge person-badge-abs person-badge--${person._type}`}>
                  {person._type === 'worker' ? 'Worker' : 'Leader'}
                </span>
              )}

              {(person.email || person.phone) && (
                <div className="person-card-contact">
                  {person.email && (
                    <span className="person-contact-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {person.email}
                    </span>
                  )}
                  {person.phone && (
                    <span className="person-contact-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {person.phone}
                    </span>
                  )}
                </div>
              )}

              <div className="person-card-meeting-stats">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1"/>
                </svg>
                <span className="person-card-meeting-count">
                  {person._meetingCount === 0
                    ? 'No meetings'
                    : `${person._meetingCount} meeting${person._meetingCount !== 1 ? 's' : ''}`}
                </span>
                {person._lastMeeting && (
                  <span className="person-card-meeting-last">
                    · last {new Date(person._lastMeeting).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="people-footer-count">
        {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
        {search ? ` found for "${search}"` : ' total'}
      </div>
    </div>
  )
}
