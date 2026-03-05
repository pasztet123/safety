import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateMeetingPDF } from '../lib/pdfGenerator'
import ApproveDraftsModal from '../components/ApproveDraftsModal'
import './Meetings.css'

export default function Meetings() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)

  // Drafts (admin only)
  const [draftMeetings, setDraftMeetings] = useState([])
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set())
  const [showApproveModal, setShowApproveModal] = useState(false)

  useEffect(() => {
    checkAdmin()
    fetchMeetings()
  }, [])

  // Load drafts once we know we're admin
  useEffect(() => {
    if (isAdmin) fetchDraftMeetings()
  }, [isAdmin])

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

  const fetchDraftMeetings = async () => {
    const { data } = await supabase
      .from('meetings')
      .select(`
        *,
        project:projects(name),
        attendees:meeting_attendees(name)
      `)
      .eq('is_draft', true)
      .order('date', { ascending: false })
    setDraftMeetings(data || [])
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
      .eq('is_draft', false)
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

  const toggleDraftSelect = (id) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAllDrafts = () => {
    if (selectedDraftIds.size === draftMeetings.length) {
      setSelectedDraftIds(new Set())
    } else {
      setSelectedDraftIds(new Set(draftMeetings.map(d => d.id)))
    }
  }

  const draftsToApprove = showApproveModal
    ? draftMeetings.filter(d => selectedDraftIds.has(d.id))
    : []

  const handleApproveAll = () => {
    setSelectedDraftIds(new Set(draftMeetings.map(d => d.id)))
    setShowApproveModal(true)
  }

  const handleApproveSelected = () => {
    if (selectedDraftIds.size === 0) return
    setShowApproveModal(true)
  }

  const handleDraftApproved = () => {
    setShowApproveModal(false)
    setSelectedDraftIds(new Set())
    fetchDraftMeetings()
    fetchMeetings()
  }

  const handleDeleteDraft = async (meetingId, topic) => {
    if (!confirm(`Delete draft "${topic}"? This cannot be undone.`)) return
    await supabase.from('meetings').delete().eq('id', meetingId)
    fetchDraftMeetings()
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

  const handlePDF = async (meeting) => {
    setPdfLoading(meeting.id)
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
        console.error('Error loading meeting:', meetingErr)
        alert('Error loading meeting data')
        return
      }

      // Fetch checklists for this meeting (separate queries to avoid PostgREST deep-join 400)
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
          items: (itemsData || []).filter(it => it.checklist_id === cl.id)
        }))
      }
      data.checklists = checklists

      // Fetch topic details (topic is stored as a name string, not FK)
      let topicDetails = null
      if (data.topic) {
        const { data: td } = await supabase
          .from('safety_topics')
          .select('name, description, osha_reference, risk_level, category')
          .eq('name', data.topic)
          .single()
        topicDetails = td || null
      }

      // Fetch checklist completions linked to this meeting (flat query, no nested)
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

        // Attach items to their parent completion; rename key to item_id for PDF generator
        checklistCompletions = completions.map(c => ({
          ...c,
          items: (ciData || [])
            .filter(ci => ci.completion_id === c.id)
            .map(ci => ({ ...ci, item_id: ci.checklist_item_id }))
        }))
      }

      await generateMeetingPDF({ ...data, topicDetails, checklistCompletions })
    } catch (e) {
      console.error('Error generating PDF:', e)
      alert('Error generating PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      {/* ── Approve Modal ── */}
      {showApproveModal && draftsToApprove.length > 0 && (
        <ApproveDraftsModal
          drafts={draftsToApprove}
          onClose={() => setShowApproveModal(false)}
          onApproved={handleDraftApproved}
        />
      )}

      <div className="page-header">
        <h2 className="page-title">Toolbox Meetings</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => navigate('/bulk-import')}>
              ⬆ Import CSV
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/meetings/new')}>
            + New Meeting
          </button>
        </div>
      </div>

      {/* ── DRAFTS SECTION (admin only) ── */}
      {isAdmin && draftMeetings.length > 0 && (
        <div className="drafts-section">
          <div className="drafts-header">
            <h3 className="drafts-title">
              Drafts
              <span className="drafts-badge">{draftMeetings.length}</span>
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {selectedDraftIds.size > 0 && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleApproveSelected}
                >
                  Approve Selected ({selectedDraftIds.size})
                </button>
              )}
              <button className="btn btn-primary btn-sm" onClick={handleApproveAll}>
                Approve All
              </button>
            </div>
          </div>

          <div className="drafts-table-wrap">
            <table className="drafts-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedDraftIds.size === draftMeetings.length && draftMeetings.length > 0}
                      onChange={toggleSelectAllDrafts}
                      title="Select all"
                    />
                  </th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Time</th>
                  <th>Trade</th>
                  <th>Topic</th>
                  <th>Attendees</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {draftMeetings.map(d => (
                  <tr key={d.id} className={selectedDraftIds.has(d.id) ? 'draft-row--selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDraftIds.has(d.id)}
                        onChange={() => toggleDraftSelect(d.id)}
                      />
                    </td>
                    <td className="draft-cell-date">{d.date}</td>
                    <td>{d.project?.name || '—'}</td>
                    <td>{d.time}</td>
                    <td>{d.trade || '—'}</td>
                    <td className="draft-cell-topic">{d.topic}</td>
                    <td>{d.attendees?.length ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/meetings/${d.id}/edit`)}
                        >
                          Review
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteDraft(d.id, d.topic)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate(`/meetings/${meeting.id}`)}
                >
                  View Details
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handlePDF(meeting)}
                  disabled={pdfLoading === meeting.id}
                  style={{ minWidth: '70px' }}
                >
                  {pdfLoading === meeting.id ? '…' : 'PDF'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
