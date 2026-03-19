import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllPages, supabase } from '../lib/supabase'
import { SAFETY_CATEGORIES } from '../lib/categories'
import ExportProgress from '../components/ExportProgress'
import {
  downloadChunkedMeetingListPDFZIP,
  downloadMeetingListPDF,
  downloadMeetingsAsZIP,
  downloadSafetySurveyListPDF,
  downloadSafetyTopicsBrochurePDF,
  downloadIncidentListPDF,
  downloadCorrectiveActionsListPDF,
  downloadDisciplinaryActionsListPDF,
  downloadChecklistHistoryPDF,
} from '../lib/pdfBulkGenerator'
import {
  DEFAULT_MEETING_CHUNK_SIZE,
  MEETING_CHUNK_SIZE_OPTIONS,
  MEETING_SINGLE_PDF_MAX_RECORDS,
  fetchMeetingExportChunk,
  fetchMeetingsFull,
  fetchSafetySurveysFull,
  fetchIncidentsFull,
  fetchCorrectiveActionsFull,
  fetchDisciplinaryActionsFull,
  fetchChecklistCompletionsFull,
  fetchPersons,
  fetchIncidentsList,
  fetchProjects,
  downloadCSVsAsZIP,
} from '../lib/exportHelpers'
import './ExportPanel.css'

const buildFieldState = (fields) => Object.fromEntries(fields.map(field => [field.key, field.defaultChecked !== false]))

const MEETING_EXPORT_FIELDS = [
  { key: 'topic', label: 'Topic', description: 'Meeting topic or safety survey title' },
  { key: 'date', label: 'Meeting date', description: 'Business meeting date', defaultChecked: true },
  { key: 'time', label: 'Meeting time', description: 'Scheduled meeting time', defaultChecked: true },
  { key: 'project', label: 'Project', description: 'Project name', defaultChecked: true },
  { key: 'trade', label: 'Trade', description: 'Assigned trade', defaultChecked: true },
  { key: 'leader', label: 'Worker performing the meeting', description: 'Meeting leader / presenter', defaultChecked: true },
  { key: 'attendees', label: 'Attendees', description: 'List of attendee names', defaultChecked: true },
  { key: 'attendee_count', label: 'Attendee count', description: 'Total attendance count', defaultChecked: true },
  { key: 'self_training', label: 'Self-training status', description: 'Whether the meeting was self-training', defaultChecked: true },
  { key: 'checklists', label: 'Checklists', description: 'Attached checklists', defaultChecked: true },
  { key: 'created_at', label: 'Date added', description: 'Record creation timestamp', defaultChecked: false },
  { key: 'updated_at', label: 'Last edited date', description: 'Record update timestamp', defaultChecked: false },
  { key: 'created_by', label: 'Created by', description: 'User who created the record', defaultChecked: false },
  { key: 'updated_by', label: 'Edited by', description: 'User who last edited the record', defaultChecked: false },
]

const INCIDENT_EXPORT_FIELDS = [
  { key: 'type_name', label: 'Type', description: 'Incident classification', defaultChecked: true },
  { key: 'date', label: 'Incident date', description: 'Business incident date', defaultChecked: true },
  { key: 'time', label: 'Incident time', description: 'Business incident time', defaultChecked: true },
  { key: 'project', label: 'Project', description: 'Project name', defaultChecked: true },
  { key: 'severity', label: 'Severity', description: 'Incident severity', defaultChecked: true },
  { key: 'employee_name', label: 'Worker', description: 'Impacted worker', defaultChecked: true },
  { key: 'reporter_name', label: 'Reporter', description: 'Reporter name', defaultChecked: true },
  { key: 'location', label: 'Location', description: 'Incident location', defaultChecked: true },
  { key: 'details', label: 'Details', description: 'Incident narrative', defaultChecked: true },
  { key: 'created_at', label: 'Date added', description: 'Record creation timestamp', defaultChecked: false },
  { key: 'updated_at', label: 'Last edited date', description: 'Record update timestamp', defaultChecked: false },
  { key: 'created_by', label: 'Created by', description: 'User who created the record', defaultChecked: false },
  { key: 'updated_by', label: 'Edited by', description: 'User who last edited the record', defaultChecked: false },
]

const CORRECTIVE_ACTION_EXPORT_FIELDS = [
  { key: 'description', label: 'Description', description: 'Action description', defaultChecked: true },
  { key: 'status', label: 'Status', description: 'Open or completed', defaultChecked: true },
  { key: 'responsible_person', label: 'Assigned to', description: 'Responsible person', defaultChecked: true },
  { key: 'due_date', label: 'Due date', description: 'Target due date', defaultChecked: true },
  { key: 'completed_date', label: 'Completed date', description: 'Completion date', defaultChecked: true },
  { key: 'incident', label: 'Incident', description: 'Linked incident reference', defaultChecked: true },
  { key: 'created_at', label: 'Date added', description: 'Record creation timestamp', defaultChecked: false },
  { key: 'updated_at', label: 'Last edited date', description: 'Record update timestamp', defaultChecked: false },
  { key: 'created_by', label: 'Created by', description: 'User who created the record', defaultChecked: false },
  { key: 'updated_by', label: 'Edited by', description: 'User who last edited the record', defaultChecked: false },
]

const DISCIPLINARY_ACTION_EXPORT_FIELDS = [
  { key: 'action_type', label: 'Action type', description: 'Disciplinary action classification', defaultChecked: true },
  { key: 'violation_type', label: 'Violation type', description: 'Linked safety violation type', defaultChecked: true },
  { key: 'project', label: 'Project', description: 'Project name from linked incident', defaultChecked: true },
  { key: 'incident_date', label: 'Incident date', description: 'Original incident date', defaultChecked: true },
  { key: 'action_date', label: 'Action date', description: 'Business action date', defaultChecked: true },
  { key: 'action_time', label: 'Action time', description: 'Business action time', defaultChecked: true },
  { key: 'recipient', label: 'Recipient', description: 'Disciplined person', defaultChecked: true },
  { key: 'leader', label: 'Worker performing the meeting', description: 'Responsible leader', defaultChecked: true },
  { key: 'notes', label: 'Notes', description: 'Action notes', defaultChecked: true },
  { key: 'created_at', label: 'Date added', description: 'Record creation timestamp', defaultChecked: false },
  { key: 'updated_at', label: 'Last edited date', description: 'Record update timestamp', defaultChecked: false },
  { key: 'created_by', label: 'Created by', description: 'User who created the record', defaultChecked: false },
  { key: 'updated_by', label: 'Edited by', description: 'User who last edited the record', defaultChecked: false },
]

const SAFETY_SURVEY_EXPORT_FIELDS = [
  { key: 'survey_title', label: 'Survey title', description: 'Short declared survey title', defaultChecked: true },
  { key: 'survey_date', label: 'Survey date', description: 'Declared survey date', defaultChecked: true },
  { key: 'survey_time', label: 'Survey time', description: 'Declared survey time', defaultChecked: true },
  { key: 'project', label: 'Project', description: 'Project name', defaultChecked: true },
  { key: 'address', label: 'Address', description: 'Address snapshot stored on the survey', defaultChecked: true },
  { key: 'responsible_person', label: 'Responsible person', description: 'Assigned responsible person', defaultChecked: true },
  { key: 'hazards', label: 'Hazards observed', description: 'Declared hazards summary', defaultChecked: true },
  { key: 'recommendations', label: 'Recommendations', description: 'Declared follow-up notes', defaultChecked: true },
  { key: 'compliance', label: 'Compliance status', description: 'Completion and follow-up flags', defaultChecked: true },
]

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

function ExportFieldSettings({ label = 'Fields in export', fields, selected, onToggle }) {
  return (
    <div className="ep-csv-opts ep-export-fields">
      <label className="ep-csv-label">{label}</label>
      <div className="ep-checkboxes ep-checkboxes--grid">
        {fields.map(({ key, label: fieldLabel, description }) => (
          <label key={key} className="ep-checkbox-row ep-checkbox-row--field">
            <input
              type="checkbox"
              checked={Boolean(selected[key])}
              onChange={e => onToggle(key, e.target.checked)}
            />
            <span className="ep-checkbox-copy">
              <span className="ep-checkbox-label ep-checkbox-label--plain">{fieldLabel}</span>
              <span className="ep-checkbox-desc">{description}</span>
            </span>
          </label>
        ))}
      </div>
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
  const [mLocation, setMLocation] = useState('')
  const [mTimeRange, setMTimeRange] = useState('')
  const [mSelfTraining, setMSelfTraining] = useState('all')
  const [mChunkSize, setMChunkSize] = useState(DEFAULT_MEETING_CHUNK_SIZE)

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

  // ── Disciplinary Actions filters ──────────────────────────────────────────
  const [dDateFrom, setDDateFrom] = useState('')
  const [dDateTo, setDDateTo]     = useState('')

  // ── Safety Surveys filters ───────────────────────────────────────────────
  const [sDateFrom, setSDateFrom] = useState('')
  const [sDateTo, setSDateTo] = useState('')
  const [sProject, setSProject] = useState('')
  const [sResponsible, setSResponsible] = useState('')
  const [sAddress, setSAddress] = useState('')
  const [sComplianceMode, setSComplianceMode] = useState('all')

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
  const [meetingExportFields, setMeetingExportFields] = useState(() => buildFieldState(MEETING_EXPORT_FIELDS))
  const [incidentExportFields, setIncidentExportFields] = useState(() => buildFieldState(INCIDENT_EXPORT_FIELDS))
  const [correctiveExportFields, setCorrectiveExportFields] = useState(() => buildFieldState(CORRECTIVE_ACTION_EXPORT_FIELDS))
  const [disciplinaryExportFields, setDisciplinaryExportFields] = useState(() => buildFieldState(DISCIPLINARY_ACTION_EXPORT_FIELDS))
  const [safetySurveyExportFields, setSafetySurveyExportFields] = useState(() => buildFieldState(SAFETY_SURVEY_EXPORT_FIELDS))

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

  const toggleField = (setter) => (key, checked) => {
    setter(prev => ({ ...prev, [key]: checked }))
  }

  const attachAuditUsers = async (records) => {
    const ids = [...new Set(records.flatMap(record => [record?.created_by, record?.updated_by]).filter(Boolean))]
    if (!ids.length) return records

    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', ids)

    const userMap = new Map((users || []).map(user => [user.id, user.name || user.email || user.id]))

    return records.map(record => ({
      ...record,
      created_by_label: record.created_by ? (userMap.get(record.created_by) || record.created_by) : '',
      updated_by_label: record.updated_by ? (userMap.get(record.updated_by) || record.updated_by) : '',
    }))
  }

  const buildMeetingFilters = () => ({
    dateFrom: mDateFrom,
    dateTo: mDateTo,
    projectId: mProject,
    trade: mTrade,
    attendeeName: mAttendee,
    leaderName: mLeader,
    topic: mTopic,
    location: mLocation,
    timeRange: mTimeRange,
    selfTraining: mSelfTraining,
  })

  const buildMeetingFilterDescription = () => {
    const projectName = mProject ? projects.find(p => p.id === mProject)?.name : ''
    return filterDesc([
      mDateFrom && mDateTo ? `${mDateFrom} – ${mDateTo}` : (mDateFrom ? `from ${mDateFrom}` : (mDateTo ? `to ${mDateTo}` : '')),
      projectName,
      mTrade,
      mLeader ? `Worker performing the meeting: ${mLeader}` : '',
      mAttendee ? `Attendee: ${mAttendee}` : '',
      mTopic ? `Topic: ${mTopic}` : '',
      mLocation ? `Address: ${mLocation}` : '',
      mSelfTraining === 'true' ? 'Self-training only' : '',
      mSelfTraining === 'false' ? 'Led meetings only' : '',
      mTimeRange ? `Time: ${mTimeRange}` : '',
    ])
  }

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
    const filters = buildMeetingFilters()
    const { count } = await fetchMeetingExportChunk(filters, { offset: 0, limit: 1 })
    if (!count) { alert('No meetings found for the selected filters.'); return }
    if (count > MEETING_SINGLE_PDF_MAX_RECORDS) {
      alert(`Single list PDF is limited to ${MEETING_SINGLE_PDF_MAX_RECORDS} meetings. Use the chunked list export for larger result sets.`)
      return
    }

    const meetings = await fetchMeetingsFull(filters)
    if (!meetings.length) { alert('No meetings found for the selected filters.'); return }
    const meetingsWithAudit = await attachAuditUsers(meetings)
    setProgress(p => ({ ...p, label: `Building PDF for ${meetings.length} meetings…` }))
    await downloadMeetingListPDF(meetingsWithAudit, 'Meetings Report', buildMeetingFilterDescription(), {
      fields: meetingExportFields,
    })
  })

  const handleMeetingChunkedListPDF = () => {
    cancelRef.current = false
    const runChunked = async () => {
      try {
        const filters = buildMeetingFilters()
        const { count } = await fetchMeetingExportChunk(filters, { offset: 0, limit: 1 })
        if (!count) { alert('No meetings found for the selected filters.'); return }

        setProgress({ visible: true, done: 0, total: Math.ceil(count / mChunkSize), label: 'Preparing chunked list export…' })

        await downloadChunkedMeetingListPDFZIP({
          totalCount: count,
          chunkSize: mChunkSize,
          title: 'Meetings Report',
          subtitle: buildMeetingFilterDescription(),
          fields: meetingExportFields,
          shouldCancel: () => cancelRef.current,
          getChunk: async ({ offset, limit }) => {
            const { rows } = await fetchMeetingExportChunk(filters, { offset, limit })
            return rows
          },
          onProgress: ({ done, total, label }) => {
            setProgress({ visible: true, done, total, label })
          },
        })
      } catch (error) {
        if (!cancelRef.current) {
          console.error('Chunked list export error:', error)
          alert('Export failed: ' + (error.message || 'Unknown error'))
        }
      } finally {
        setProgress({ visible: false, done: 0, total: 0, label: '' })
      }
    }
    runChunked()
  }

  // ── Meetings: individual PDFs as ZIP ──────────────────────────────────────
  const handleMeetingZIP = () => {
    cancelRef.current = false
    const runZip = async () => {
      setProgress({ visible: true, done: 0, total: 0, label: 'Fetching meetings…' })
      try {
        const filters = buildMeetingFilters()
        const { count } = await fetchMeetingExportChunk(filters, { offset: 0, limit: 1 })
        if (!count) { alert('No meetings found for the selected filters.'); setProgress({ visible: false, done: 0, total: 0, label: '' }); return }

        setProgress({ visible: true, done: 0, total: count, label: 'Preparing ZIP export…' })

        await downloadMeetingsAsZIP({
          totalCount: count,
          chunkSize: mChunkSize,
          shouldCancel: () => cancelRef.current,
          getChunk: async ({ offset, limit }) => {
            const { rows } = await fetchMeetingExportChunk(filters, { offset, limit })
            return rows
          },
          onProgress: (done, total) => {
            setProgress({ visible: true, done, total, label: `Generating PDF ${done + 1} of ${total}…` })
          },
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
    const incidentsWithAudit = await attachAuditUsers(incidents)
    setProgress(p => ({ ...p, label: `Building PDF for ${incidents.length} incidents…` }))
    const projectName = iProject ? projects.find(p => p.id === iProject)?.name : ''
    const parts = [iDateFrom && iDateTo ? `${iDateFrom} – ${iDateTo}` : '', projectName, iSeverity ? SEV_LABELS[iSeverity] : '']
    await downloadIncidentListPDF(incidentsWithAudit, 'Incidents Report', filterDesc(parts), {
      fields: incidentExportFields,
    })
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
    const actionsWithAudit = await attachAuditUsers(actions)
    setProgress(p => ({ ...p, label: `Building PDF for ${actions.length} actions…` }))
    const parts = [aDateFrom && aDateTo ? `${aDateFrom} – ${aDateTo}` : '', aStatus !== 'all' ? aStatus : '']
    await downloadCorrectiveActionsListPDF(actionsWithAudit, persons, incidents, 'Corrective Actions Report', filterDesc(parts), {
      fields: correctiveExportFields,
    })
  })

  // ── Disciplinary Actions ───────────────────────────────────────────────────
  const handleDisciplinaryActions = () => runExport('Fetching disciplinary actions…', async () => {
    const filters = { dateFrom: dDateFrom, dateTo: dDateTo }
    const [actions, persons, leaders, incidents] = await Promise.all([
      fetchDisciplinaryActionsFull(filters),
      fetchPersons(),
      supabase.from('leaders').select('id, name').order('name').then(result => result.data || []),
      supabase
        .from('incidents')
        .select('id, type_name, date, employee_name, safety_violation_type, project:projects(name)')
        .is('deleted_at', null)
        .eq('type_name', 'Safety violation')
        .then(result => result.data || []),
    ])

    if (!actions.length) { alert('No disciplinary actions found for the selected filters.'); return }
    const actionsWithAudit = await attachAuditUsers(actions)
    setProgress(p => ({ ...p, label: `Building PDF for ${actions.length} disciplinary actions…` }))
    const parts = [dDateFrom && dDateTo ? `${dDateFrom} – ${dDateTo}` : (dDateFrom ? `from ${dDateFrom}` : (dDateTo ? `to ${dDateTo}` : ''))]
    await downloadDisciplinaryActionsListPDF(
      actionsWithAudit,
      persons,
      leaders,
      incidents,
      'Disciplinary Actions Report',
      filterDesc(parts),
      { fields: disciplinaryExportFields },
    )
  })

  // ── Safety Surveys ────────────────────────────────────────────────────────
  const handleSafetySurveys = () => runExport('Fetching safety surveys…', async () => {
    const filters = {
      dateFrom: sDateFrom,
      dateTo: sDateTo,
      projectId: sProject,
      responsiblePerson: sResponsible,
      address: sAddress,
      complianceMode: sComplianceMode,
      sortBy: 'newest',
    }

    const surveys = await fetchSafetySurveysFull(filters)
    if (!surveys.length) { alert('No safety surveys found for the selected filters.'); return }

    const projectName = sProject ? projects.find(project => project.id === sProject)?.name : ''
    const parts = [
      sDateFrom && sDateTo ? `${sDateFrom} – ${sDateTo}` : (sDateFrom ? `from ${sDateFrom}` : (sDateTo ? `to ${sDateTo}` : '')),
      projectName,
      sResponsible ? `Responsible: ${sResponsible}` : '',
      sAddress ? `Address: ${sAddress}` : '',
      sComplianceMode === 'documented' ? 'Survey complete only' : '',
      sComplianceMode === 'follow-up' ? 'Follow-up required only' : '',
    ]

    const mappedSurveys = surveys.map((survey) => ({
      ...survey,
      project_name: survey.project?.name || '',
      hazards_summary: survey.hazards_observed || '',
      recommendations_summary: survey.recommendations || '',
      compliance_summary: [
        survey.compliance_documented ? 'Survey complete' : '',
        survey.compliance_follow_up_required ? 'Follow-up required' : '',
      ].filter(Boolean).join(' · '),
      export_fields: safetySurveyExportFields,
    }))

    setProgress(progress => ({ ...progress, label: `Building PDF for ${mappedSurveys.length} safety surveys…` }))
    await downloadSafetySurveyListPDF(mappedSurveys, 'Safety Surveys Report', filterDesc(parts), {
      fields: safetySurveyExportFields,
    })
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
          1. MEETINGS
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Meetings">
        <p className="ep-desc">
          Export a list PDF of meetings, optionally filtered by date, project, worker performing the meeting, worker, trade, or topic.
          For large result sets, use chunked list export to split the report into smaller PDF files packed into one ZIP.
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
            <label className="ep-label">Worker performing the meeting</label>
            <input
              list="ep-leaders"
              className="ep-input"
              placeholder="Worker performing the meeting name…"
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

          <div className="ep-filter-group">
            <label className="ep-label">Address</label>
            <input className="ep-input" placeholder="Address contains..." value={mLocation} onChange={e => setMLocation(e.target.value)} />
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Time range</label>
            <select className="ep-select" value={mTimeRange} onChange={e => setMTimeRange(e.target.value)}>
              <option value="">Any time</option>
              <option value="before-06">Before 06:00</option>
              <option value="morning">06:00-11:59</option>
              <option value="midday">12:00-14:59</option>
              <option value="afternoon">15:00-17:59</option>
              <option value="evening">18:00-21:59</option>
              <option value="night">22:00-05:59</option>
            </select>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Meeting type</label>
            <select className="ep-select" value={mSelfTraining} onChange={e => setMSelfTraining(e.target.value)}>
              <option value="all">All meeting types</option>
              <option value="true">Self-training only</option>
              <option value="false">Led meetings only</option>
            </select>
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Chunk size</label>
            <select className="ep-select" value={mChunkSize} onChange={e => setMChunkSize(Number(e.target.value))}>
              {MEETING_CHUNK_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} meetings per file</option>)}
            </select>
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleMeetingListPDF}>
            Download List PDF
          </button>
          <button className="btn btn-secondary ep-btn ep-btn--chunk" onClick={handleMeetingChunkedListPDF}>
            Download Chunked List ZIP
          </button>
          <button className="btn btn-secondary ep-btn ep-btn--zip" onClick={handleMeetingZIP}>
            Download Individual PDFs (ZIP)
          </button>
        </div>

        <div className="ep-hint">
          The <strong>List PDF</strong> is best for smaller result sets. <strong>Chunked List ZIP</strong> splits a large result into multiple list PDFs.
          The <strong>Individual ZIP</strong> generates one full PDF per meeting and processes large exports in batches.
        </div>

        <ExportFieldSettings
          label="Fields in list PDF"
          fields={MEETING_EXPORT_FIELDS}
          selected={meetingExportFields}
          onToggle={toggleField(setMeetingExportFields)}
        />
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
          3. SAFETY SURVEYS
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Safety Surveys">
        <p className="ep-desc">Export declared safety survey dates, address snapshots, responsible person, hazards, recommendations, and compliance status. Audit logs stay only in the database.</p>

        <div className="ep-filters">
          <DateRange from={sDateFrom} to={sDateTo} onFrom={setSDateFrom} onTo={setSDateTo} />
          <ProjectSelect value={sProject} onChange={setSProject} projects={projects} />

          <div className="ep-filter-group">
            <label className="ep-label">Responsible person</label>
            <input className="ep-input" placeholder="Responsible person name..." value={sResponsible} onChange={e => setSResponsible(e.target.value)} />
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Address</label>
            <input className="ep-input" placeholder="Address contains..." value={sAddress} onChange={e => setSAddress(e.target.value)} />
          </div>

          <div className="ep-filter-group">
            <label className="ep-label">Compliance</label>
            <select className="ep-select" value={sComplianceMode} onChange={e => setSComplianceMode(e.target.value)}>
              <option value="all">All records</option>
              <option value="documented">Survey complete</option>
              <option value="follow-up">Follow-up required</option>
            </select>
          </div>
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleSafetySurveys}>
            Download Safety Surveys PDF
          </button>
        </div>

        <ExportFieldSettings
          label="Declared fields in list PDF"
          fields={SAFETY_SURVEY_EXPORT_FIELDS}
          selected={safetySurveyExportFields}
          onToggle={toggleField(setSafetySurveyExportFields)}
        />
      </ExportSection>

      {/* ══════════════════════════════════════════════════════
          4. INCIDENTS
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

        <ExportFieldSettings
          label="Fields in list PDF"
          fields={INCIDENT_EXPORT_FIELDS}
          selected={incidentExportFields}
          onToggle={toggleField(setIncidentExportFields)}
        />
      </ExportSection>

        {/* ══════════════════════════════════════════════════════
          5. CORRECTIVE ACTIONS
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

        <ExportFieldSettings
          label="Fields in list PDF"
          fields={CORRECTIVE_ACTION_EXPORT_FIELDS}
          selected={correctiveExportFields}
          onToggle={toggleField(setCorrectiveExportFields)}
        />
      </ExportSection>

        {/* ══════════════════════════════════════════════════════
          6. DISCIPLINARY ACTIONS
      ══════════════════════════════════════════════════════ */}
      <ExportSection title="Disciplinary Actions">
        <p className="ep-desc">Export a PDF listing disciplinary actions with linked violation context, recipient, and responsible worker performing the meeting.</p>

        <div className="ep-filters">
          <DateRange from={dDateFrom} to={dDateTo} onFrom={setDDateFrom} onTo={setDDateTo} />
        </div>

        <div className="ep-actions">
          <button className="btn btn-primary ep-btn" onClick={handleDisciplinaryActions}>
            Download Disciplinary PDF
          </button>
        </div>

        <ExportFieldSettings
          label="Fields in list PDF"
          fields={DISCIPLINARY_ACTION_EXPORT_FIELDS}
          selected={disciplinaryExportFields}
          onToggle={toggleField(setDisciplinaryExportFields)}
        />
      </ExportSection>

        {/* ══════════════════════════════════════════════════════
          7. CHECKLIST HISTORY
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
          8. CSV / SPREADSHEET EXPORT
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
              { key: 'meetings',            label: 'meetings.csv',            desc: 'Date, project, topic, worker performing the meeting, trade, attendees' },
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
