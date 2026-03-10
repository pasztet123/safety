import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchTrades } from '../lib/trades'
import { fetchAllPages, fetchByIdsInBatches, supabase } from '../lib/supabase'
import { generateMeetingPDF } from '../lib/pdfGenerator'
import { downloadMeetingListPDF, downloadMeetingsAsZIP } from '../lib/pdfBulkGenerator'
import ExportProgress from '../components/ExportProgress'
import ApproveDraftsModal from '../components/ApproveDraftsModal'
import './Meetings.css'

export default function Meetings() {
  const navigate = useNavigate()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [exportListLoading, setExportListLoading] = useState(false)
  const [zipProgress, setZipProgress] = useState({ visible: false, done: 0, total: 0 })

  // Search / filter / sort
  const [searchText, setSearchText] = useState('')
  const [filterTrade, setFilterTrade] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  // Derived filter options
  const tradesInMeetings = useMemo(() => {
    const t = new Set(meetings.map(m => m.trade).filter(Boolean))
    return [...t].sort()
  }, [meetings])

  const personsInMeetings = useMemo(() => {
    const p = new Set()
    meetings.forEach(m => m.attendees?.forEach(a => a.name && p.add(a.name)))
    return [...p].sort()
  }, [meetings])

  const filteredMeetings = useMemo(() => {
    let result = [...meetings]
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(m =>
        m.topic?.toLowerCase().includes(q) ||
        m.leader_name?.toLowerCase().includes(q) ||
        m.project?.name?.toLowerCase().includes(q) ||
        m.attendees?.some(a => a.name?.toLowerCase().includes(q))
      )
    }
    if (filterTrade) result = result.filter(m => m.trade === filterTrade)
    if (filterPerson) result = result.filter(m => m.attendees?.some(a => a.name === filterPerson))
    switch (sortBy) {
      case 'oldest': result.sort((a, b) => a.date.localeCompare(b.date)); break
      case 'az': result.sort((a, b) => (a.topic || '').localeCompare(b.topic || '')); break
      case 'za': result.sort((a, b) => (b.topic || '').localeCompare(a.topic || '')); break
      case 'most-attendees': result.sort((a, b) => (b.attendees?.length || 0) - (a.attendees?.length || 0)); break
      default: result.sort((a, b) => { const d = b.date.localeCompare(a.date); return d !== 0 ? d : (b.time || '').localeCompare(a.time || '') })
    }
    return result
  }, [meetings, searchText, filterTrade, filterPerson, sortBy])

  const filtersActive = searchText || filterTrade || filterPerson || sortBy !== 'newest'

  // Drafts (admin only)
  const [draftMeetings, setDraftMeetings] = useState([])
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set())
  const [showApproveModal, setShowApproveModal] = useState(false)

  // Draft filters
  const [draftFilterLeader, setDraftFilterLeader] = useState('')
  const [draftFilterAttendee, setDraftFilterAttendee] = useState('')
  const [draftSortBy, setDraftSortBy] = useState('date-desc')

  // Draft editing
  const [showDraftEditModal, setShowDraftEditModal] = useState(false)
  const [draftEditIds, setDraftEditIds] = useState([])
  const [editLeaders, setEditLeaders] = useState([])
  const [editTrades, setEditTrades] = useState([])
  const [editTopics, setEditTopics] = useState([])
  const [draftEditFields, setDraftEditFields] = useState({ leader_id: '', leader_name: '', trade: '', topic: '', addAttendees: '' })
  const [draftEditLoading, setDraftEditLoading] = useState(false)

  const draftLeaderOptions = useMemo(() => {
    const s = new Set(draftMeetings.map(d => d.leader_name).filter(Boolean))
    return [...s].sort()
  }, [draftMeetings])

  const draftAttendeeOptions = useMemo(() => {
    const s = new Set()
    draftMeetings.forEach(d => d.attendees?.forEach(a => a.name && s.add(a.name)))
    return [...s].sort()
  }, [draftMeetings])

  const filteredDrafts = useMemo(() => {
    let result = draftMeetings
    if (draftFilterLeader) result = result.filter(d => d.leader_name === draftFilterLeader)
    if (draftFilterAttendee) result = result.filter(d => d.attendees?.some(a => a.name === draftFilterAttendee))
    result = [...result]
    switch (draftSortBy) {
      case 'date-asc': result.sort((a, b) => a.date.localeCompare(b.date)); break
      case 'trade': result.sort((a, b) => (a.trade || '').localeCompare(b.trade || '')); break
      case 'topic': result.sort((a, b) => (a.topic || '').localeCompare(b.topic || '')); break
      case 'time': result.sort((a, b) => (a.time || '').localeCompare(b.time || '')); break
      case 'attendees': result.sort((a, b) => (b.attendees?.length || 0) - (a.attendees?.length || 0)); break
      default: result.sort((a, b) => { const d = b.date.slice(0, 10).localeCompare(a.date.slice(0, 10)); return d !== 0 ? d : (b.time || '').localeCompare(a.time || '') })
    }
    return result
  }, [draftMeetings, draftFilterLeader, draftFilterAttendee, draftSortBy])

  // Pagination
  const DRAFT_PAGE_SIZE = 50
  const MEETING_PAGE_SIZE = 50
  const [draftPage, setDraftPage] = useState(1)
  const [meetingPage, setMeetingPage] = useState(1)
  const [syncRunning, setSyncRunning] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const draftTotalPages = Math.max(1, Math.ceil(filteredDrafts.length / DRAFT_PAGE_SIZE))
  const pagedDrafts = filteredDrafts.slice((draftPage - 1) * DRAFT_PAGE_SIZE, draftPage * DRAFT_PAGE_SIZE)
  const meetingTotalPages = Math.max(1, Math.ceil(filteredMeetings.length / MEETING_PAGE_SIZE))
  const pagedMeetings = filteredMeetings.slice((meetingPage - 1) * MEETING_PAGE_SIZE, meetingPage * MEETING_PAGE_SIZE)

  useEffect(() => {
    checkAdmin()
    fetchMeetings()
  }, [])

  // Load drafts once we know we're admin
  useEffect(() => {
    if (isAdmin) {
      fetchDraftMeetings()
      fetchEditOptions()
    }
  }, [isAdmin])

  // Reset meeting page when filters change
  useEffect(() => { setMeetingPage(1) }, [searchText, filterTrade, filterPerson, sortBy])
  // Reset draft page when draft filters/sort change
  useEffect(() => { setDraftPage(1) }, [draftFilterLeader, draftFilterAttendee, draftSortBy])

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
    try {
      const data = await fetchAllPages(() => supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name),
          attendees:meeting_attendees(name)
        `)
        .eq('is_draft', true)
        .order('date', { ascending: false }))

      setDraftMeetings(data)
    } catch (error) {
      setDraftMeetings([])
    }
  }

  const fetchEditOptions = async () => {
    const [{ data: ld }, { data: tp }] = await Promise.all([
      supabase.from('leaders').select('id, name, default_signature_url').order('name'),
      supabase.from('safety_topics').select('name').order('name'),
    ])
    setEditLeaders(ld || [])
    setEditTopics((tp || []).map(t => t.name))
    const tr = await fetchTrades()
    setEditTrades(tr || [])
  }

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const data = await fetchAllPages(() => supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name),
          attendees:meeting_attendees(name),
          photos:meeting_photos(photo_url)
        `)
        .eq('is_draft', false)
        .order('date', { ascending: false })
        .order('time', { ascending: false }))

      const meetingIds = data.map(m => m.id)
      const checklistsData = await fetchByIdsInBatches({
        table: 'meeting_checklists',
        select: `
          meeting_id,
          checklist:checklists(name)
        `,
        ids: meetingIds,
        idColumn: 'meeting_id',
      })

      const checklistsByMeeting = {}
      checklistsData.forEach(mc => {
        if (!checklistsByMeeting[mc.meeting_id]) {
          checklistsByMeeting[mc.meeting_id] = []
        }
        checklistsByMeeting[mc.meeting_id].push(mc.checklist)
      })

      const meetingsWithChecklists = data.map(meeting => ({
        ...meeting,
        checklists: checklistsByMeeting[meeting.id] || []
      }))

      setMeetings(meetingsWithChecklists)
    } catch (error) {
      setMeetings([])
    } finally {
      setLoading(false)
    }
  }

  const toggleDraftSelect = (id) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAllDrafts = () => {
    const allPageSelected = pagedDrafts.length > 0 && pagedDrafts.every(d => selectedDraftIds.has(d.id))
    if (allPageSelected) {
      setSelectedDraftIds(prev => {
        const next = new Set(prev)
        pagedDrafts.forEach(d => next.delete(d.id))
        return next
      })
    } else {
      setSelectedDraftIds(prev => {
        const next = new Set(prev)
        pagedDrafts.forEach(d => next.add(d.id))
        return next
      })
    }
  }

  const draftsToApprove = showApproveModal
    ? draftMeetings.filter(d => selectedDraftIds.has(d.id))
    : []

  const handleApproveAll = () => {
    setSelectedDraftIds(new Set(pagedDrafts.map(d => d.id)))
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

  const handleOpenDraftEdit = (ids, singleDraft = null) => {
    setDraftEditIds(ids)
    if (singleDraft) {
      setDraftEditFields({
        leader_id: singleDraft.leader_id || '',
        leader_name: singleDraft.leader_name || '',
        trade: singleDraft.trade || '',
        topic: singleDraft.topic || '',
        addAttendees: '',
      })
    } else {
      setDraftEditFields({ leader_id: '', leader_name: '', trade: '', topic: '', addAttendees: '' })
    }
    setShowDraftEditModal(true)
  }

  const handleSaveDraftEdit = async () => {
    setDraftEditLoading(true)
    try {
      const updates = {}
      if (draftEditFields.leader_id) {
        updates.leader_id = draftEditFields.leader_id
        updates.leader_name = draftEditFields.leader_name
        const leader = editLeaders.find(l => l.id === draftEditFields.leader_id)
        if (leader?.default_signature_url) updates.signature_url = leader.default_signature_url
      }
      if (draftEditFields.trade) updates.trade = draftEditFields.trade
      if (draftEditFields.topic) updates.topic = draftEditFields.topic

      const newAttendeeNames = draftEditFields.addAttendees
        .split('\n')
        .map(n => n.trim())
        .filter(Boolean)

      for (const meetingId of draftEditIds) {
        if (Object.keys(updates).length > 0) {
          await supabase.from('meetings').update(updates).eq('id', meetingId)
        }
        if (newAttendeeNames.length > 0) {
          const { data: existing } = await supabase
            .from('meeting_attendees')
            .select('name')
            .eq('meeting_id', meetingId)
          const existingNames = new Set((existing || []).map(a => a.name.toLowerCase().trim()))
          const toInsert = newAttendeeNames
            .filter(n => !existingNames.has(n.toLowerCase()))
            .map(name => ({ meeting_id: meetingId, name, signed_with_checkbox: true }))
          if (toInsert.length > 0) {
            await supabase.from('meeting_attendees').insert(toInsert)
          }
        }
      }
      setShowDraftEditModal(false)
      fetchDraftMeetings()
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setDraftEditLoading(false)
    }
  }

  const handleSyncDrafts = async () => {
    if (!confirm(`Sync all ${draftMeetings.length} drafts? This will auto-assign leaders and signatures based on attendees.`)) return
    setSyncRunning(true)
    setSyncResult(null)
    try {
      // Load leaders and involved_persons once
      const { data: leaders } = await supabase.from('leaders').select('id, name, default_signature_url').order('name')
      const { data: involvedPersons } = await supabase.from('involved_persons').select('id, name, leader_id').order('name')

      const leaderMap = {}
      ;(leaders || []).forEach(l => { leaderMap[l.name.toLowerCase().trim()] = l })

      const personToLeader = {}
      ;(involvedPersons || []).forEach(p => {
        const leader = (leaders || []).find(l => l.id === p.leader_id)
        if (leader) personToLeader[p.name.toLowerCase().trim()] = leader
      })

      let fixed = 0
      let skipped = 0
      const seen = new Map() // "date|project_id|sorted_attendee_names" -> meeting id (duplicate detection)

      // Fetch full attendees for all drafts
      const allDraftIds = draftMeetings.map(d => d.id)
      const { data: allAttendees } = await supabase
        .from('meeting_attendees')
        .select('meeting_id, name')
        .in('meeting_id', allDraftIds)

      const attendeesByMeeting = {}
      ;(allAttendees || []).forEach(a => {
        if (!attendeesByMeeting[a.meeting_id]) attendeesByMeeting[a.meeting_id] = []
        attendeesByMeeting[a.meeting_id].push(a.name)
      })

      for (const draft of draftMeetings) {
        const names = (attendeesByMeeting[draft.id] || []).map(n => n.toLowerCase().trim())
        const key = `${draft.date}|${draft.project_id || ''}|${[...names].sort().join(',')}`
        if (seen.has(key)) {
          // Duplicate — delete this draft
          await supabase.from('meetings').delete().eq('id', draft.id)
          skipped++
          continue
        }
        seen.set(key, draft.id)

        // Detect leader from attendees
        let detectedLeader = null
        for (const name of names) {
          if (leaderMap[name]) { detectedLeader = leaderMap[name]; break }
          if (personToLeader[name]) { detectedLeader = personToLeader[name]; break }
        }

        if (detectedLeader) {
          await supabase.from('meetings').update({
            leader_id: detectedLeader.id,
            leader_name: detectedLeader.name,
            signature_url: detectedLeader.default_signature_url || null,
          }).eq('id', draft.id)
          fixed++
        } else {
          skipped++
        }
      }

      setSyncResult(`Done: ${fixed} leaders assigned, ${skipped} skipped/deleted as duplicates.`)
      fetchDraftMeetings()
    } catch (err) {
      setSyncResult('Error: ' + err.message)
    } finally {
      setSyncRunning(false)
    }
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

  const handleExportListPDF = async () => {
    if (!filteredMeetings.length) return
    setExportListLoading(true)
    try {
      await downloadMeetingListPDF(filteredMeetings, 'Toolbox Meetings Report', `${filteredMeetings.length} meetings`)
    } catch (e) { console.error(e) }
    finally { setExportListLoading(false) }
  }

  const handleExportZIP = async () => {
    if (!filteredMeetings.length) return
    if (filteredMeetings.length > 20 && !confirm(`This will generate ${filteredMeetings.length} individual PDFs packed into a ZIP. This may take several minutes. Continue?`)) return
    setZipProgress({ visible: true, done: 0, total: filteredMeetings.length })
    try {
      await downloadMeetingsAsZIP(filteredMeetings, (done, total) => {
        setZipProgress({ visible: true, done, total })
      })
    } catch (e) { console.error(e) }
    finally { setZipProgress({ visible: false, done: 0, total: 0 }) }
  }

  return (
    <div>
      {/* ── ZIP Progress ── */}
      <ExportProgress
        visible={zipProgress.visible}
        done={zipProgress.done}
        total={zipProgress.total}
        label={`Generating PDF ${zipProgress.done + 1} of ${zipProgress.total}…`}
      />

      {/* ── Approve Modal ── */}
      {showApproveModal && draftsToApprove.length > 0 && (
        <ApproveDraftsModal
          drafts={draftsToApprove}
          onClose={() => setShowApproveModal(false)}
          onApproved={handleDraftApproved}
        />
      )}

      {/* ── Draft Edit Modal ── */}
      {showDraftEditModal && (
        <div className="modal-overlay" onClick={() => setShowDraftEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                {draftEditIds.length === 1 ? 'Edit Draft' : `Bulk Edit — ${draftEditIds.length} drafts`}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDraftEditModal(false)}>✕</button>
            </div>
            {draftEditIds.length > 1 && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', background: '#f9fafb', padding: '8px 12px', borderRadius: '6px' }}>
                Leave a field blank to keep existing values. Only filled fields will be updated.
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Leader</label>
              <select
                className="form-select"
                value={draftEditFields.leader_id}
                onChange={e => {
                  const leader = editLeaders.find(l => l.id === e.target.value)
                  setDraftEditFields(prev => ({ ...prev, leader_id: e.target.value, leader_name: leader?.name || '' }))
                }}
              >
                <option value="">{draftEditIds.length > 1 ? '— no change —' : '— select leader —'}</option>
                {editLeaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trade</label>
              <select
                className="form-select"
                value={draftEditFields.trade}
                onChange={e => setDraftEditFields(prev => ({ ...prev, trade: e.target.value }))}
              >
                <option value="">{draftEditIds.length > 1 ? '— no change —' : '— select trade —'}</option>
                {editTrades.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <select
                className="form-select"
                value={draftEditFields.topic}
                onChange={e => setDraftEditFields(prev => ({ ...prev, topic: e.target.value }))}
              >
                <option value="">{draftEditIds.length > 1 ? '— no change —' : '— select topic —'}</option>
                {editTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Add attendees <span style={{ fontWeight: 400, color: '#6b7280' }}>(one name per line, duplicates skipped)</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={draftEditFields.addAttendees}
                onChange={e => setDraftEditFields(prev => ({ ...prev, addAttendees: e.target.value }))}
                placeholder={`John Smith\nJane Doe`}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDraftEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveDraftEdit} disabled={draftEditLoading}>
                {draftEditLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2 className="page-title">Toolbox Meetings</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <button className="btn btn-secondary" onClick={() => navigate('/bulk-import')}>
              ⬆ Import CSV
            </button>
          )}
          {isAdmin && filteredMeetings.length > 0 && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleExportListPDF}
                disabled={exportListLoading}
                title="Download a summary PDF of filtered meetings"
              >
                {exportListLoading ? '…' : '↓ List PDF'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportZIP}
                title="Download each meeting as its own PDF inside a ZIP"
              >
                ↓ ZIP PDFs
              </button>
            </>
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
              {syncResult && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>{syncResult}</span>
              )}
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSyncDrafts}
                disabled={syncRunning}
                title="Auto-assign leaders and remove duplicate drafts"
              >
                {syncRunning ? '⟳ Syncing…' : '⟳ Sync'}
              </button>
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

          {/* Draft filter bar */}
          <div className="draft-filter-bar">
            <select
              className="filter-select"
              value={draftFilterLeader}
              onChange={e => setDraftFilterLeader(e.target.value)}
            >
              <option value="">All leaders</option>
              {draftLeaderOptions.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select
              className="filter-select"
              value={draftFilterAttendee}
              onChange={e => setDraftFilterAttendee(e.target.value)}
            >
              <option value="">All attendees</option>
              {draftAttendeeOptions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select
              className="filter-select"
              value={draftSortBy}
              onChange={e => setDraftSortBy(e.target.value)}
            >
              <option value="date-desc">Date ↓</option>
              <option value="date-asc">Date ↑</option>
              <option value="trade">Trade A→Z</option>
              <option value="topic">Topic A→Z</option>
              <option value="time">Time ↑</option>
              <option value="attendees">Most attendees</option>
            </select>
            {(draftFilterLeader || draftFilterAttendee) && (
              <button className="filter-clear-btn" onClick={() => { setDraftFilterLeader(''); setDraftFilterAttendee('') }}>Clear</button>
            )}
            {selectedDraftIds.size > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={() => handleOpenDraftEdit(Array.from(selectedDraftIds))}>
                ✎ Edit ({selectedDraftIds.size})
              </button>
            )}
            <span className="pagination-info" style={{ marginLeft: 'auto' }}>
              {filteredDrafts.length !== draftMeetings.length
                ? `${filteredDrafts.length} of ${draftMeetings.length}`
                : `${draftMeetings.length} total`}
            </span>
          </div>

          <div className="drafts-table-wrap">
            <table className="drafts-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={pagedDrafts.length > 0 && pagedDrafts.every(d => selectedDraftIds.has(d.id))}
                      onChange={toggleSelectAllDrafts}
                      title="Select all on this page"
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
                {pagedDrafts.map(d => (
                  <tr key={d.id} className={selectedDraftIds.has(d.id) ? 'draft-row--selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDraftIds.has(d.id)}
                        onChange={() => toggleDraftSelect(d.id)}
                      />
                    </td>
                    <td className="draft-cell-date">{d.date ? d.date.slice(0, 10) : '—'}</td>
                    <td>{d.project?.name || '—'}</td>
                    <td>{d.time}</td>
                    <td>{d.trade || '—'}</td>
                    <td className="draft-cell-topic">{d.topic}</td>
                    <td>{d.attendees?.length ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/meetings/${d.id}/edit`, {
                            state: {
                              draftIds: pagedDrafts.map(x => x.id),
                              draftIndex: pagedDrafts.findIndex(x => x.id === d.id),
                            }
                          })}
                        >
                          Review
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDraftEdit([d.id], d)}
                          title="Quick edit leader, trade, topic or add attendees"
                        >
                          ✎
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

          {draftTotalPages > 1 && (
            <div className="pagination-bar">
              <button className="btn btn-secondary btn-sm" onClick={() => setDraftPage(p => Math.max(1, p - 1))} disabled={draftPage === 1}>← Prev</button>
              <span className="pagination-info">Page {draftPage} of {draftTotalPages} ({filteredDrafts.length} total)</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setDraftPage(p => Math.min(draftTotalPages, p + 1))} disabled={draftPage === draftTotalPages}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="filter-bar">
        <input
          className="filter-search-input"
          type="text"
          placeholder="Search topic, leader, attendee..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
        />
        <select value={filterTrade} onChange={e => setFilterTrade(e.target.value)} className="filter-select">
          <option value="">All trades</option>
          {tradesInMeetings.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterPerson} onChange={e => setFilterPerson(e.target.value)} className="filter-select">
          <option value="">All attendees</option>
          {personsInMeetings.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">Topic A → Z</option>
          <option value="za">Topic Z → A</option>
          <option value="most-attendees">Most attendees</option>
        </select>
        {filtersActive && (
          <button className="filter-clear-btn" onClick={() => { setSearchText(''); setFilterTrade(''); setFilterPerson(''); setSortBy('newest') }}>
            Clear
          </button>
        )}
      </div>

      <div className="meetings-list">
        {filteredMeetings.length === 0 ? (
          <div className="empty-state">
            <p>{meetings.length === 0 ? 'No meetings recorded yet. Create your first safety meeting!' : 'Brak wyników dla podanych filtrów.'}</p>
          </div>
        ) : (
          pagedMeetings.map((meeting) => (
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

        {meetingTotalPages > 1 && (
          <div className="pagination-bar">
            <button className="btn btn-secondary btn-sm" onClick={() => setMeetingPage(p => Math.max(1, p - 1))} disabled={meetingPage === 1}>← Prev</button>
            <span className="pagination-info">Page {meetingPage} of {meetingTotalPages} ({filteredMeetings.length} total)</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setMeetingPage(p => Math.min(meetingTotalPages, p + 1))} disabled={meetingPage === meetingTotalPages}>Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
