import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  parseBusyBusyCsv,
  groupIntoDraftMeetings,
  detectDuplicateDates,
  pickRandomTopic,
  ALL_TRADES,
} from '../lib/csvImport'
import './BulkImport.css'

export default function BulkImport() {
  const navigate = useNavigate()
  const fileRef = useRef()

  // ── Data loaded from DB ──────────────────────────────────────────────────
  const [projects, setProjects]       = useState([])
  const [safetyTopics, setSafetyTopics] = useState([])
  const [existingMeetings, setExistingMeetings] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)

  // ── Step 1 state ─────────────────────────────────────────────────────────
  const [projectId, setProjectId]     = useState('')
  const [csvText, setCsvText]         = useState('')
  const [fileName, setFileName]       = useState('')

  // ── Step 2 state ─────────────────────────────────────────────────────────
  const [step, setStep]               = useState(1)   // 1 or 2
  const [draftMeetings, setDraftMeetings] = useState([]) // generated drafts
  const [duplicateDates, setDuplicateDates] = useState(new Set())
  const [skippedDates, setSkippedDates] = useState(new Set())
  const [newPersons, setNewPersons]   = useState([])   // names that must be created in involved_persons
  const [parseError, setParseError]   = useState('')

  // ── Saving state ─────────────────────────────────────────────────────────
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    checkAdmin()
    loadProjects()
    loadSafetyTopics()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
    if (!data?.is_admin) { navigate('/meetings'); return }
    setIsAdmin(true)
  }

  const loadProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name, job_address')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
  }

  const loadSafetyTopics = async () => {
    const { data } = await supabase
      .from('safety_topics')
      .select('id, name, trades')
      .order('name')
    if (data) setSafetyTopics(data)
  }

  const loadExistingMeetings = async (pid) => {
    const { data } = await supabase
      .from('meetings')
      .select('project_id, date')
      .eq('project_id', pid)
    setExistingMeetings(data || [])
  }

  // ── File pick ─────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setCsvText(ev.target.result || '')
    reader.readAsText(file)
  }

  // ── Step 1 → Step 2 ───────────────────────────────────────────────────
  const handlePreview = async () => {
    setParseError('')
    if (!projectId) { setParseError('Please select a project.'); return }
    if (!csvText)   { setParseError('Please upload a CSV file.'); return }

    let rows
    try {
      rows = parseBusyBusyCsv(csvText)
    } catch (err) {
      setParseError('CSV parse error: ' + err.message)
      return
    }
    if (rows.length === 0) { setParseError('No valid time-entry rows found in the CSV.'); return }

    const project = projects.find(p => p.id === projectId)
    const projLocation = project?.job_address || ''

    await loadExistingMeetings(projectId)

    // Re-fetch existing meetings synchronously since state update is async
    const { data: existingData } = await supabase
      .from('meetings')
      .select('project_id, date')
      .eq('project_id', projectId)
    const existing = existingData || []

    const drafts = groupIntoDraftMeetings(rows, projectId, safetyTopics, projLocation)
    const dupDates = detectDuplicateDates(drafts, existing)

    // Find attendee names that don't exist in involved_persons
    const allNames = [...new Set(drafts.flatMap(d => d.attendeeNames))]
    const { data: persons } = await supabase
      .from('involved_persons')
      .select('name')
    const existingNames = new Set((persons || []).map(p => p.name.trim().toLowerCase()))
    const unknownNames = allNames.filter(n => !existingNames.has(n.trim().toLowerCase()))

    setDraftMeetings(drafts)
    setDuplicateDates(dupDates)
    setSkippedDates(new Set())
    setNewPersons(unknownNames)
    setStep(2)
  }

  const toggleSkip = (date) => {
    setSkippedDates(prev => {
      const next = new Set(prev)
      if (next.has(date)) next.delete(date); else next.add(date)
      return next
    })
  }

  // Refresh a random topic for a single draft
  const refreshTopic = (index) => {
    setDraftMeetings(prev => {
      const next = [...prev]
      next[index] = { ...next[index], topic: pickRandomTopic(next[index].trade, safetyTopics) || next[index].topic }
      return next
    })
  }

  // Update trade and auto-pick a matching topic in one render
  const updateTrade = (index, newTrade) => {
    const newTopic = pickRandomTopic(newTrade, safetyTopics)
    setDraftMeetings(prev => {
      const next = [...prev]
      next[index] = { ...next[index], trade: newTrade, ...(newTopic ? { topic: newTopic } : {}) }
      return next
    })
  }

  // Return topics available for a given trade (trade-specific + General fallback)
  const topicsForTrade = (trade) => {
    if (!trade || trade === 'General') return safetyTopics
    return safetyTopics.filter(
      t => !t.trades || t.trades.length === 0 || t.trades.includes(trade) || t.trades.includes('General')
    )
  }

  const updateDraftField = (index, field, value) => {
    setDraftMeetings(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  // ── Confirm & Save ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const toSave = draftMeetings.filter(d => !skippedDates.has(d.date))
      if (toSave.length === 0) { setSaving(false); return }

      // Generate a batch UUID (fallback for browsers without crypto.randomUUID)
      const batchId = (crypto.randomUUID
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
          }))

      // 1. Create any missing involved_persons
      if (newPersons.length > 0) {
        const { data: existingNow } = await supabase
          .from('involved_persons')
          .select('name')
        const existingSet = new Set((existingNow || []).map(p => p.name.trim().toLowerCase()))
        const toCreate = newPersons.filter(n => !existingSet.has(n.trim().toLowerCase()))
        if (toCreate.length > 0) {
          await supabase.from('involved_persons').insert(
            toCreate.map(name => ({
              name,
              created_by: user.id,
              updated_by: user.id,
            }))
          )
        }
      }

      // 2. Insert draft meetings
      let inserted = 0
      for (const draft of toSave) {
        const { data: meeting, error: meetErr } = await supabase
          .from('meetings')
          .insert([{
            project_id: draft.project_id,
            date: draft.date,
            time: draft.time,
            location: draft.location || null,
            leader_name: null,  // intentionally blank — autoDetectLeader resolves on approval
            trade: draft.trade || null,
            topic: draft.topic,
            notes: null,
            completed: false,
            is_draft: true,
            source: 'busybusy_csv',
            import_batch_id: batchId,
            created_by: user.id,
            updated_by: user.id,
          }])
          .select()
          .single()

        if (meetErr) { console.error('Error inserting draft:', meetErr); continue }

        // 3. Insert attendees
        if (draft.attendeeNames.length > 0) {
          await supabase.from('meeting_attendees').insert(
            draft.attendeeNames.map(name => ({
              meeting_id: meeting.id,
              name,
              signed_with_checkbox: false,
            }))
          )
        }
        inserted++
      }

      // 4. Log the import
      await supabase.from('csv_imports').insert([{
        project_id: projectId,
        imported_by: user.id,
        filename: fileName,
        meeting_count: inserted,
      }])

      setSaved(true)
      setTimeout(() => navigate('/meetings'), 1800)
    } catch (err) {
      console.error('Error saving drafts:', err)
      alert('Error saving drafts: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────
  const toSaveCount = draftMeetings.filter(d => !skippedDates.has(d.date)).length

  if (!isAdmin) return <div className="spinner"></div>

  return (
    <div className="bulk-import">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">Bulk Import — CSV to Draft Meetings</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/meetings')}>
          ← Back to Meetings
        </button>
      </div>

      {/* Progress */}
      <div className="bi-steps">
        <div className={`bi-step ${step >= 1 ? 'bi-step--active' : ''}`}>
          <span className="bi-step-num">1</span> Upload CSV
        </div>
        <div className="bi-step-arrow">→</div>
        <div className={`bi-step ${step >= 2 ? 'bi-step--active' : ''}`}>
          <span className="bi-step-num">2</span> Preview &amp; Confirm
        </div>
      </div>

      {/* ── STEP 1 ── */}
      {step === 1 && (
        <div className="card bi-card">
          <h3 className="bi-section-title">1. Select Project and Upload CSV</h3>

          <div className="form-group">
            <label className="form-label">Project *</label>
            <select
              className="form-select"
              value={projectId}
              onChange={e => { setProjectId(e.target.value) }}
            >
              <option value="">— Select project —</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">BusyBusy Time Export (.csv) *</label>
            <div className="bi-file-row">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => fileRef.current.click()}
              >
                Choose File
              </button>
              <span className="bi-file-name">{fileName || 'No file chosen'}</span>
            </div>
            <p className="bi-hint">
              Export from BusyBusy → Time Entries → Export CSV. The file must include
              columns: <strong>First Name, Last Name, Start, Cost Code</strong>.
            </p>
          </div>

          {parseError && <div className="bi-error">{parseError}</div>}

          <div className="bi-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handlePreview}
            >
              Preview Drafts →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step === 2 && (
        <>
          {/* Summary bar */}
          <div className="bi-summary-bar">
            <span>
              <strong>{draftMeetings.length}</strong> days found in CSV
              {duplicateDates.size > 0 && (
                <span className="bi-dup-badge">
                  {' '}· {duplicateDates.size} duplicate{duplicateDates.size > 1 ? 's' : ''}
                </span>
              )}
            </span>
            {newPersons.length > 0 && (
              <span className="bi-new-persons-badge">
                {newPersons.length} new person{newPersons.length > 1 ? 's' : ''} will be created in DB
              </span>
            )}
          </div>

          {/* New persons notice */}
          {newPersons.length > 0 && (
            <div className="card bi-new-persons-card">
              <h4 className="bi-new-persons-title">
                New Involved Persons (will be created automatically)
              </h4>
              <div className="bi-new-persons-list">
                {newPersons.map(n => (
                  <span key={n} className="bi-person-chip">{n}</span>
                ))}
              </div>
              <p className="bi-hint">
                These names were not found in the database. They will be added to
                Involved Persons with basic info. You can update their profiles later.
              </p>
            </div>
          )}

          {/* Draft table */}
          <div className="card bi-card">
            <table className="bi-table">
              <thead>
                <tr>
                  <th>Skip</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Attendees</th>
                  <th>Cost Code(s)</th>
                  <th>Trade</th>
                  <th>Topic</th>
                </tr>
              </thead>
              <tbody>
                {draftMeetings.map((d, idx) => {
                  const isDup = duplicateDates.has(d.date)
                  const isSkipped = skippedDates.has(d.date)
                  return (
                    <tr
                      key={d.date}
                      className={`${isDup ? 'bi-row--dup' : ''} ${isSkipped ? 'bi-row--skip' : ''}`}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSkipped}
                          onChange={() => toggleSkip(d.date)}
                          title={isDup ? 'Duplicate! Uncheck to include anyway.' : 'Skip this day'}
                        />
                      </td>
                      <td className="bi-cell-date">
                        {d.date}
                        {isDup && <span className="bi-dup-tag" title="A meeting already exists for this date &amp; project">DUP</span>}
                      </td>
                      <td>
                        <input
                          type="time"
                          className="bi-time-input"
                          value={d.time}
                          onChange={e => updateDraftField(idx, 'time', e.target.value)}
                          disabled={isSkipped}
                        />
                      </td>
                      <td className="bi-cell-attendees">
                        <span className="bi-attendees-count">{d.attendeeNames.length}</span>
                        <span className="bi-attendees-names">{d.attendeeNames.join(', ')}</span>
                      </td>
                      <td className="bi-cell-cost">
                        {d.costCodes.length > 0 ? d.costCodes.join(', ') : <em>—</em>}
                      </td>
                      <td>
                        <select
                          className="bi-select"
                          value={d.trade || ''}
                          onChange={e => updateTrade(idx, e.target.value)}
                          disabled={isSkipped}
                        >
                          {ALL_TRADES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </td>
                      <td className="bi-cell-topic">
                        <select
                          className="bi-select bi-select--topic"
                          value={d.topic || ''}
                          onChange={e => updateDraftField(idx, 'topic', e.target.value)}
                          disabled={isSkipped}
                        >
                          <option value="">— none —</option>
                          {topicsForTrade(d.trade).map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-icon bi-refresh-btn"
                          title="Pick another random topic"
                          onClick={() => refreshTopic(idx)}
                          disabled={isSkipped}
                        >↺</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {saved && (
            <div className="bi-success">
              ✓ {toSaveCount} draft meetings saved — redirecting…
            </div>
          )}

          <div className="bi-actions bi-actions--step2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setStep(1)}
              disabled={saving}
            >
              ← Back
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={saving || toSaveCount === 0}
            >
              {saving ? 'Saving…' : `Generate ${toSaveCount} Draft${toSaveCount !== 1 ? 's' : ''}`}
            </button>
          </div>

          {toSaveCount === 0 && (
            <p className="bi-warning">All meetings are skipped — nothing to save.</p>
          )}
        </>
      )}
    </div>
  )
}
