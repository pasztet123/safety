import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllPages, supabase } from '../lib/supabase'
import { SAFETY_CATEGORIES } from '../lib/categories'
import ExportProgress from '../components/ExportProgress'
import {
  downloadMeetingListPDF,
  downloadMeetingsAsZIP,
  downloadSafetyTopicsBrochurePDF,
  downloadIncidentListPDF,
  downloadCorrectiveActionsListPDF,
  downloadChecklistHistoryPDF,
} from '../lib/pdfBulkGenerator'
import {
  fetchMeetingsFull,
  fetchIncidentsFull,
  fetchCorrectiveActionsFull,
  fetchChecklistCompletionsFull,
  fetchPersons,
  fetchIncidentsList,
  fetchProjects,
  downloadCSVsAsZIP,
} from '../lib/exportHelpers'
import './ExportPanel.css'

// ─── Section skeleton ─────────────────────────────────────────────────────────
function ExportSection({ title, children }) {
  return (
    <div className="ep-section">
      <div className="ep-section-header">
        <h3 className="ep-section-title">{title}</h3>
      </div>
      <div className="ep-section-body">{children}</div>
    </div>
  )
}

// ─── Filter row helpers ───────────────────────────────────────────────────────
function DateRange({ from, to, onFrom, onTo }) {
  return (
    <div className="ep-filter-group">
      <label className="ep-label">Date range</label>
      <div className="ep-date-row">
        <input type="date" className="ep-input ep-date" value={from} onChange={e => onFrom(e.target.value)} placeholder="From" />
        <span className="ep-date-sep">—</span>
        <input type="date" className="ep-input ep-date" value={to} onChange={e => onTo(e.target.value)} placeholder="To" />
      </div>
    </div>
  )
}

function ProjectSelect({ value, onChange, projects, allLabel = 'All projects' }) {
  return (
    <div className="ep-filter-group">
      <label className="ep-label">Project</label>
      <select className="ep-select" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{allLabel}</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExportPanel() {
  const navigate = useNavigate()
  const cancelRef = useRef(false)

  // Auth / meta
  const [ready, setReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  // Reference data (loaded once)
  const [projects, setProjects] = useState([])
  const [trades, setTrades] = useState([])
  const [topics, setTopics] = useState([])
  const [allAttendeeNames, setAllAttendeeNames] = useState([])
  const [allLeaderNames, setAllLeaderNames] = useState([])
  const [severities] = useState(['lost_time','first_aid','near_miss','property_damage','medical_treatment','recordable','fatality'])
  const SEV_LABELS = { lost_time:'Lost Time', first_aid:'First Aid', near_miss:'Near Miss',
    property_damage:'Property Damage', medical_treatment:'Medical Treatment', recordable:'Recordable', fatality:'Fatality' }

  // Progress modal
  const [progress, setProgress] = useState({ visible: false, done: 0, total: 0, label: '' })

  // ── Meetings filters ───────────────────────────────────────────────────────
  const [mDateFrom, setMDateFrom] = useState('')
  const [mDateTo, setMDateTo]     = useState('')
  const [mProject, setMProject]   = useState('')
  const [mTrade, setMTrade]       = useState('')
  const [mAttendee, setMAttendee] = useState('')
  const [mLeader, setMLeader]     = useState('')
  const [mTopic, setMTopic]       = useState('')

  // ── Safety Topics filters ──────────────────────────────────────────────────
  const [stCategory, setStCategory] = useState('')
  const [stRisk, setStRisk]         = useState('')
  const [stTrade, setStTrade]       = useState('')

  // ── Incidents filters ──────────────────────────────────────────────────────
  const [iDateFrom, setIDateFrom] = useState('')
  const [iDateTo, setIDateTo]     = useState('')
  const [iProject, setIProject]   = useState('')
  const [iSeverity, setISeverity] = useState('')

  // ── Corrective Actions filters ─────────────────────────────────────────────
  const [aDateFrom, setADateFrom] = useState('')
  const [aDateTo, setADateTo]     = useState('')
  const [aStatus, setAStatus]     = useState('all')

  // ── Checklist History filters ──────────────────────────────────────────────
  const [clDateFrom, setClDateFrom] = useState('')
  const [clDateTo, setClDateTo]     = useState('')
  const [clProject, setClProject]   = useState('')
  const [clName, setClName]         = useState('')

  // ── CSV options ────────────────────────────────────────────────────────────
  const [csvDateFrom, setCsvDateFrom] = useState('')
  const [csvDateTo, setCsvDateTo]     = useState('')
  const [csvProject, setCsvProject]   = useState('')
  const [csvOpts, setCsvOpts] = useState({
    meetings: true, incidents: true, corrective_actions: true, statistics: true, attendance: true,
  })

  // ── Load meta data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      const { data: userData } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
      if (!userData?.is_admin) { navigate('/'); return }
      setIsAdmin(true)

      // Load reference data in parallel
      const [projs, tradesData, topicsData] = await Promise.all([
        fetchProjects(),
        supabase.from('trades').select('name').order('name').then(r => (r.data || []).map(t => t.name)),
        supabase.from('safety_topics').select('id,name,category,risk_level,description,osha_reference,image_url,trades').order('name').then(r => r.data || []),
      ])

      setProjects(projs)
      setTrades(tradesData)
      setTopics(topicsData)

      // Load unique attendee names for autocomplete
      const atData = await fetchAllPages(() => supabase.from('meeting_attendees').select('name'))
      if (atData) {
        const names = [...new Set(atData.map(a => a.name).filter(Boolean))].sort()
        setAllAttendeeNames(names)
      }

      // Load unique leader names for autocomplete
      const leadData = await fetchAllPages(() => supabase.from('meetings').select('leader_name').eq('is_draft', false))
      if (leadData) {
        const leaders = [...new Set(leadData.map(l => l.leader_name).filter(Boolean))].sort()
        setAllLeaderNames(leaders)
      }

      setReady(true)
    }
    init()
  }, [navigate])

  // ── Utility: build readable filter summary ─────────────────────────────────
  const filterDesc = (parts) => parts.filter(Boolean).join(' · ') || 'All records'

  // ── Generic wrapper for any async export ───────────────────────────────────
  const runExport = async (label, fn) => {
    cancelRef.current = false
    setProgress({ visible: true, done: 0, total: 0, label })
    try {
      await fn()
    } catch (err) {
      console.error('Export error:', err)
      alert('Export failed: ' + (err.message || 'Unknown error'))
    } finally {
      setProgress({ visible: false, done: 0, total: 0, label: '' })
    }
  }

  // ── Meetings: list PDF ─────────────────────────────────────────────────────
  const handleMeetingListPDF = () => runExport('Fetching meetings…', async () => {
    const filters = { dateFrom: mDateFrom, dateTo: mDateTo, projectId: mProject, trade: mTrade, attendeeName: mAttendee, leaderName: mLeader, topic: mTopic }
    const meetings = await fetchMeetingsFull(filters)
    if (!meetings.length) { alert('No meetings found for the selected filters.'); return }
    setProgress(p => ({ ...p, label: `Building PDF for ${meetings.length} meetings…` }))
    const projectName = mProject ? projects.find(p => p.id === mProject)?.name : ''
    const parts = [mDateFrom && mDateTo ? `${mDateFrom} – ${mDateTo}` : (mDateFrom ? `from ${mDateFrom}` : (mDateTo ? `to ${mDateTo}` : '')), projectName, mTrade, mLeader ? `Leader: ${mLeader}` : '', mAttendee ? `Attendee: ${mAttendee}` : '', mTopic ? `Topic: ${mTopic}` : '']
    await downloadMeetingListPDF(meetings, 'Toolbox Meetings Report', filterDesc(parts))
  })

  // ── Meetings: individual PDFs as ZIP ──────────────────────────────────────
  const handleMeetingZIP = () => {
    cancelRef.current = false
    const runZip = async () => {
      setProgress({ visible: true, done: 0, total: 0, label: 'Fetching meetings…' })
      try {
        const filters = { dateFrom: mDateFrom, dateTo: mDateTo, projectId: mProject, trade: mTrade, attendeeName: mAttendee, leaderName: mLeader, topic: mTopic }
        const meetings = await fetchMeetingsFull(filters)
        if (!meetings.length) { alert('No meetings found for the selected filters.'); setProgress({ visible: false }); return }

        setProgress({ visible: true, done: 0, total: meetings.length, label: 'Generating PDFs…' })

        await downloadMeetingsAsZIP(meetings, (done, total) => {
          if (cancelRef.current) throw new Error('Cancelled')
          setProgress({ visible: true, done, total, label: `Generating PDF ${done + 1} of ${total}…` })
        })
      } catch (err) {
        if (!cancelRef.current) {
          console.error('ZIP error:', err)
          alert('Export failed: ' + (err.message || 'Unknown error'))
        }
      } finally {
        setProgress({ visible: false, done: 0, total: 0, label: '' })
      }
    }
    runZip()
  }

  const handleCancelZIP = () => { cancelRef.current = true }

  // ── Safety Topics brochure ─────────────────────────────────────────────────
  const handleTopicsBrochure = () => runExport('Generating safety topics brochure…', async () => {
    let filtered = [...topics]
    if (stCategory) filtered = filtered.filter(t => t.category === stCategory)
    if (stRisk) filtered = filtered.filter(t => t.risk_level === stRisk)
    if (stTrade) filtered = filtered.filter(t => (t.trades || []).includes(stTrade))
    if (!filtered.length) { alert('No topics found for the selected filters.'); return }
    await downloadSafetyTopicsBrochurePDF(filtered, 'Safety Topics Brochure')
  })

  // ── Incidents list ─────────────────────────────────────────────────────────
  const handleIncidentList = () => runExport('Fetching incidents…', async () => {
    const filters = { dateFrom: iDateFrom, dateTo: iDateTo, projectId: iProject, severity: iSeverity }
    const incidents = await fetchIncidentsFull(filters)
    if (!incidents.length) { alert('No incidents found for the selected filters.'); return }
    setProgress(p => ({ ...p, label: `Building PDF for ${incidents.length} incidents…` }))
    const projectName = iProject ? projects.find(p => p.id === iProject)?.name : ''
    const parts = [iDateFrom && iDateTo ? `${iDateFrom} – ${iDateTo}` : '', projectName, iSeverity ? SEV_LABELS[iSeverity] : '']
    await downloadIncidentListPDF(incidents, 'Incidents Report', filterDesc(parts))
  })

  // ── Corrective Actions ─────────────────────────────────────────────────────
  const handleCorrectiveActions = () => runExport('Fetching corrective actions…', async () => {
    const filters = { dateFrom: aDateFrom, dateTo: aDateTo, status: aStatus }
    const [actions, persons, incidents] = await Promise.all([
      fetchCorrectiveActionsFull(filters),
      fetchPersons(),
      fetchIncidentsList(),
    ])
    if (!actions.length) { alert('No corrective actions found for the selected filters.'); return }
    setProgress(p => ({ ...p, label: `Building PDF for ${actions.length} actions…` }))
    const parts = [aDateFrom && aDateTo ? `${aDateFrom} – ${aDateTo}` : '', aStatus !== 'all' ? aStatus : '']
    await downloadCorrectiveActionsListPDF(actions, persons, incidents, 'Corrective Actions Report', filterDesc(parts))
  })

  // ── Checklist History ──────────────────────────────────────────────────────
  const handleChecklistHistory = () => runExport('Fetching checklist history…', async () => {
    const filters = { dateFrom: clDateFrom, dateTo: clDateTo, projectId: clProject, checklistName: clName }
    const completions = await fetchChecklistCompletionsFull(filters)
    if (!completions.length) { alert('No checklist completions found for the selected filters.'); return }
    setProgress(p => ({ ...p, label: `Building PDF for ${completions.length} completions…` }))
    const projectName = clProject ? projects.find(p => p.id === clProject)?.name : ''
    const parts = [clDateFrom && clDateTo ? `${clDateFrom} – ${clDateTo}` : '', projectName, clName ? `Checklist: ${clName}` : '']
    await downloadChecklistHistoryPDF(completions, 'Checklist History Report', filterDesc(parts))
  })

  // ── CSV export ─────────────────────────────────────────────────────────────
  const handleCSV = () => runExport('Building CSV files…', async () => {
    const anySelected = Object.values(csvOpts).some(Boolean)
    if (!anySelected) { alert('Select at least one data type.'); return }
    const filters = { dateFrom: csvDateFrom, dateTo: csvDateTo, projectId: csvProject }
    await downloadCSVsAsZIP(csvOpts, filters)
  })

  // ─────────────────────────────────────────────────────────────────────────
  if (!ready) return <div className="spinner" />

  const filteredTopics = topics
    .filter(t => !stCategory || t.category === stCategory)
    .filter(t => !stRisk || t.risk_level === stRisk)
    .filter(t => !stTrade || (t.trades || []).includes(stTrade))

  return (
    <div className="ep-wrap">
      <ExportProgress
        visible={progress.visible}
        done={progress.done}
        total={progress.total}
        label={progress.label}
        onCancel={progress.total > 0 ? handleCancelZIP : undefined}
      />

      <div className="ep-page-header">
        <h2 className="ep-page-title">Data Export</h2>
        <p className="ep-page-sub">Generate PDF reports and CSV spreadsheets from your safety data. Admin only.</p>
      </div>

      {/* ══════════════════════════════════════════════════════
          1. TOOLBOX MEETINGS
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Toolbox Meetings">
        <p className="ep-desc">
          Export a list PDF of all toolbox meetings, optionally filtered by date, project, leader, worker, trade, or topic.
          Or download all filtered meetings as individual PDFs packed into a ZIP file.
        </p>

        <div className="ep-filters">
          <DateRange from={mDateFrom} to={mDateTo} onFrom={setMDateFrom} onTo={setMDateTo} />
          <ProjectSelect value={mProject} onChange={setMProject} projects={projects} />

          <div className="ep-filter-group">
            <label className="ep-label">Trade</label>
            <select className="ep-select" value={mTrade} onChange={e => setMTrade(e.target.value)}>
              <option value="">All trades</option>
              {trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Leader</label>
            <input
              list="ep-leaders"
              className="ep-input"
              placeholder="Leader name…"
              value={mLeader}
              onChange={e => setMLeader(e.target.value)}
            />
            <datalist id="ep-leaders">
              {allLeaderNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Attendee / Worker</label>
            <input
              list="ep-attendees"
              className="ep-input"
              placeholder="Worker name…"
              value={mAttendee}
              onChange={e => setMAttendee(e.target.value)}
            />
            <datalist id="ep-attendees">
              {allAttendeeNames.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Topic keyword</label>
            <input className="ep-input" placeholder="e.g. Fall Protection" value={mTopic} onChange={e => setMTopic(e.target.value)} />
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleMeetingListPDF}>
            Download List PDF
          </button>
          <button className="btn btn-secondary ep-btn ep-btn--zip" onClick={handleMeetingZIP}>
            Download Individual PDFs (ZIP)
          </button>
        </div>

        <div className="ep-hint">
          The <strong>List PDF</strong> creates one document with all matching meetings summarised as cards (fastest).
          The <strong>ZIP</strong> generates a full individual PDF for every meeting — may take a few minutes for large sets.
        </div>
      </ExportSection>

      {/* ══════════════════════════════════════════════════════
          2. SAFETY TOPICS BROCHURE
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Safety Topics — Brochure">
        <p className="ep-desc">
          Export a PDF brochure with a table of contents followed by one full-page entry per safety topic.
          {filteredTopics.length > 0 && ` ${filteredTopics.length} topic${filteredTopics.length !== 1 ? 's' : ''} match current filters.`}
        </p>

        <div className="ep-filters">
          <div className="ep-filter-group">
            <label className="ep-label">Category</label>
            <select className="ep-select" value={stCategory} onChange={e => setStCategory(e.target.value)}>
              <option value="">All categories</option>
              {SAFETY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Risk level</label>
            <select className="ep-select" value={stRisk} onChange={e => setStRisk(e.target.value)}>
              <option value="">All risk levels</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Trade</label>
            <select className="ep-select" value={stTrade} onChange={e => setStTrade(e.target.value)}>
              <option value="">All trades</option>
              {trades.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleTopicsBrochure} disabled={filteredTopics.length === 0}>
            Download Brochure PDF
          </button>
        </div>
      </ExportSection>

      {/* ══════════════════════════════════════════════════════
          3. INCIDENTS
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Incidents">
        <p className="ep-desc">Export a PDF report listing all incident records with classification, personnel, and details.</p>

        <div className="ep-filters">
          <DateRange from={iDateFrom} to={iDateTo} onFrom={setIDateFrom} onTo={setIDateTo} />
          <ProjectSelect value={iProject} onChange={setIProject} projects={projects} />

          <div className="ep-filter-group">
            <label className="ep-label">Severity</label>
            <select className="ep-select" value={iSeverity} onChange={e => setISeverity(e.target.value)}>
              <option value="">All severities</option>
              {severities.map(s => <option key={s} value={s}>{SEV_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleIncidentList}>
            Download Incidents PDF
          </button>
        </div>
      </ExportSection>

      {/* ══════════════════════════════════════════════════════
          4. CORRECTIVE ACTIONS
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Corrective Actions">
        <p className="ep-desc">Export a PDF listing all corrective actions with status, assignee, and due dates.</p>

        <div className="ep-filters">
          <DateRange from={aDateFrom} to={aDateTo} onFrom={setADateFrom} onTo={setADateTo} />

          <div className="ep-filter-group">
            <label className="ep-label">Status</label>
            <select className="ep-select" value={aStatus} onChange={e => setAStatus(e.target.value)}>
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleCorrectiveActions}>
            Download Actions PDF
          </button>
        </div>
      </ExportSection>

      {/* ══════════════════════════════════════════════════════
          5. CHECKLIST HISTORY
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Checklist History">
        <p className="ep-desc">Export completed checklist records — what was inspected, by whom, and when.</p>

        <div className="ep-filters">
          <DateRange from={clDateFrom} to={clDateTo} onFrom={setClDateFrom} onTo={setClDateTo} />
          <ProjectSelect value={clProject} onChange={setClProject} projects={projects} />

          <div className="ep-filter-group">
            <label className="ep-label">Checklist name</label>
            <input className="ep-input" placeholder="Filter by checklist name…" value={clName} onChange={e => setClName(e.target.value)} />
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleChecklistHistory}>
            Download History PDF
          </button>
        </div>
      </ExportSection>

      {/* ══════════════════════════════════════════════════════
          6. CSV / SPREADSHEET EXPORT
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Spreadsheet Export (CSV)">
        <p className="ep-desc">
          Download a ZIP containing selected CSV files — ready to open in Excel, Google Sheets, or any spreadsheet app.
          The UTF-8 BOM ensures proper character encoding on all platforms.
        </p>

        <div className="ep-filters">
          <DateRange from={csvDateFrom} to={csvDateTo} onFrom={setCsvDateFrom} onTo={setCsvDateTo} />
          <ProjectSelect value={csvProject} onChange={setCsvProject} projects={projects} />
        </div>

        <div className="ep-csv-opts">
          <label className="ep-csv-label">Include in export:</label>
          <div className="ep-checkboxes">
            {[
              { key: 'meetings',            label: 'meetings.csv',            desc: 'Date, project, topic, leader, trade, attendees' },
              { key: 'incidents',           label: 'incidents.csv',           desc: 'Date, type, severity, employee, reporter, details' },
              { key: 'corrective_actions',  label: 'corrective_actions.csv',  desc: 'Description, status, assignee, due date, incident' },
              { key: 'statistics',          label: 'statistics.csv',          desc: 'Monthly counts per project: meetings, incidents, actions' },
              { key: 'attendance',          label: 'attendance.csv',          desc: 'Per-worker totals: meeting count, projects, last attendance' },
            ].map(({ key, label, desc }) => (
              <label key={key} className="ep-checkbox-row">
                <input
                  type="checkbox"
                  checked={csvOpts[key]}
                  onChange={e => setCsvOpts(o => ({ ...o, [key]: e.target.checked }))}
                />
                <span className="ep-checkbox-label">{label}</span>
                <span className="ep-checkbox-desc">{desc}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="ep-actions">
          <button
            className="btn btn-primary ep-btn"
            onClick={handleCSV}
            disabled={!Object.values(csvOpts).some(Boolean)}
          >
            Download CSV (ZIP)
          </button>
        </div>

        <div className="ep-hint">
          File will be named <code>export_YYYY-MM-DD.zip</code>. Filters apply to meetings, incidents, and corrective actions; statistics and attendance are always calculated from all matching meetings.
        </div>
      </ExportSection>
    </div>
  )
}
