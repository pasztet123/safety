/**
 * exportHelpers.js
 * Data fetching helpers and CSV builders for the bulk export feature.
 */

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { fetchAllPages, fetchByIdsInBatches, supabase } from './supabase'

// ─── Fetch Meetings (with filters) ───────────────────────────────────────────

/**
 * Fetches meetings from Supabase with optional filters.
 * Returns the array of meeting objects with project + attendees populated.
 *
 * @param {Object} filters
 * @param {string} [filters.dateFrom]      YYYY-MM-DD
 * @param {string} [filters.dateTo]        YYYY-MM-DD
 * @param {string} [filters.projectId]
 * @param {string} [filters.attendeeName]  partial name match (client-side)
 * @param {string} [filters.trade]
 * @param {string} [filters.topic]         partial topic match (client-side)
 */
export const fetchMeetingsFull = async (filters = {}) => {
  let data = []

  try {
    data = await fetchAllPages(() => {
      let query = supabase
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

      if (filters.dateFrom) query = query.gte('date', filters.dateFrom)
      if (filters.dateTo) query = query.lte('date', filters.dateTo)
      if (filters.projectId) query = query.eq('project_id', filters.projectId)
      if (filters.trade) query = query.eq('trade', filters.trade)

      return query
    })
  } catch (error) {
    return []
  }

  // Fetch checklist names for all meetings
  const meetingIds = data.map(m => m.id)
  let checklistsData = []

  try {
    checklistsData = await fetchByIdsInBatches({
      table: 'meeting_checklists',
      select: 'meeting_id, checklist:checklists(name)',
      ids: meetingIds,
      idColumn: 'meeting_id',
    })
  } catch (error) {
    checklistsData = []
  }

  const checklistsByMeeting = {}
  checklistsData?.forEach(mc => {
    if (!checklistsByMeeting[mc.meeting_id]) checklistsByMeeting[mc.meeting_id] = []
    if (mc.checklist) checklistsByMeeting[mc.meeting_id].push(mc.checklist)
  })

  let result = data.map(m => ({ ...m, checklists: checklistsByMeeting[m.id] || [] }))

  // Client-side filters
  if (filters.attendeeName?.trim()) {
    const q2 = filters.attendeeName.toLowerCase()
    result = result.filter(m => m.attendees?.some(a => a.name?.toLowerCase().includes(q2)))
  }
  if (filters.topic?.trim()) {
    const q2 = filters.topic.toLowerCase()
    result = result.filter(m => m.topic?.toLowerCase().includes(q2))
  }
  if (filters.leaderName?.trim()) {
    const q2 = filters.leaderName.toLowerCase()
    result = result.filter(m => m.leader_name?.toLowerCase().includes(q2))
  }

  return result
}

// ─── Fetch Incidents (with filters) ──────────────────────────────────────────

export const fetchIncidentsFull = async (filters = {}) => {
  let q = supabase
    .from('incidents')
    .select('*, project:projects(name), incident_photos(photo_url, display_order)')
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('time', { ascending: false })

  if (filters.dateFrom)  q = q.gte('date', filters.dateFrom)
  if (filters.dateTo)    q = q.lte('date', filters.dateTo)
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  if (filters.severity)  q = q.eq('severity', filters.severity)
  if (filters.type)      q = q.eq('type_name', filters.type)

  const { data, error } = await q
  if (error) return []
  return data || []
}

// ─── Fetch Corrective Actions (with filters) ──────────────────────────────────

export const fetchCorrectiveActionsFull = async (filters = {}) => {
  let q = supabase
    .from('corrective_actions')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('declared_created_date', { ascending: false })

  if (filters.status && filters.status !== 'all') q = q.eq('status', filters.status)
  if (filters.dateFrom) q = q.gte('due_date', filters.dateFrom)
  if (filters.dateTo)   q = q.lte('due_date', filters.dateTo)

  const { data, error } = await q
  if (error) return []

  return data || []
}

// ─── Fetch supporting lookup data ─────────────────────────────────────────────

export const fetchPersons = async () => {
  const { data } = await supabase.from('involved_persons').select('id, name').order('name')
  return data || []
}

export const fetchIncidentsList = async () => {
  const { data } = await supabase
    .from('incidents')
    .select('id, type_name, date, project_id, employee_name')
    .is('deleted_at', null)
    .order('date', { ascending: false })
  return data || []
}

export const fetchProjects = async () => {
  const { data } = await supabase.from('projects').select('id, name').order('name')
  return data || []
}

export const fetchChecklistCompletionsFull = async (filters = {}) => {
  let q = supabase
    .from('checklist_completions')
    .select('id, checklist_id, project_id, completed_by, completion_datetime, notes')
    .order('completion_datetime', { ascending: false })

  if (filters.dateFrom) q = q.gte('completion_datetime', filters.dateFrom)
  if (filters.dateTo)   q = q.lte('completion_datetime', filters.dateTo + 'T23:59:59')
  if (filters.projectId) q = q.eq('project_id', filters.projectId)
  if (filters.checklistId) q = q.eq('checklist_id', filters.checklistId)

  const { data: completionsData, error } = await q
  if (error) return []

  const checklistIds = [...new Set(completionsData.map(c => c.checklist_id))]
  const projectIds = [...new Set(completionsData.filter(c => c.project_id).map(c => c.project_id))]
  const userIds = [...new Set(completionsData.map(c => c.completed_by))]

  const [checklistsRes, projectsRes, usersRes] = await Promise.all([
    checklistIds.length > 0 ? supabase.from('checklists').select('id, name').in('id', checklistIds) : { data: [] },
    projectIds.length > 0   ? supabase.from('projects').select('id, name').in('id', projectIds)  : { data: [] },
    userIds.length > 0      ? supabase.from('users').select('id, name, email').in('id', userIds) : { data: [] },
  ])

  const checklistsMap = new Map((checklistsRes.data || []).map(c => [c.id, c]))
  const projectsMap   = new Map((projectsRes.data  || []).map(p => [p.id, p]))
  const usersMap      = new Map((usersRes.data     || []).map(u => [u.id, u]))

  let result = completionsData.map(c => ({
    ...c,
    checklist: checklistsMap.get(c.checklist_id) || null,
    project:   projectsMap.get(c.project_id) || null,
    user:      usersMap.get(c.completed_by) || null,
  }))

  if (filters.checklistName?.trim()) {
    const q2 = filters.checklistName.toLowerCase()
    result = result.filter(c => c.checklist?.name?.toLowerCase().includes(q2))
  }

  return result
}

// ─── CSV Builders ─────────────────────────────────────────────────────────────

const csvRow    = (arr) => arr.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
const csvHeader = (...cols) => csvRow(cols)

const fmtCSVDate = (d) => d ? String(d).substring(0, 10) : ''

const buildMeetingsCSV = (meetings) => {
  const lines = [csvHeader('Date','Time','Project','Topic','Worker performing the meeting','Trade','Attendees','Attendee Count','Checklists')]
  for (const m of meetings) {
    const attendees = (m.attendees || []).map(a => a.name).filter(Boolean).join('; ')
    const checklists = (m.checklists || []).map(c => c.name).filter(Boolean).join('; ')
    lines.push(csvRow([
      fmtCSVDate(m.date), m.time ? m.time.substring(0, 5) : '',
      m.project?.name || '', m.topic || '', m.leader_name || '',
      m.trade || '', attendees, (m.attendees || []).length, checklists,
    ]))
  }
  return lines.join('\r\n')
}

const buildIncidentsCSV = (incidents) => {
  const lines = [csvHeader('Date','Time','Project','Type','Subtype','Severity','OSHA Recordable','Employee','Phone','Reporter','Location','Details')]
  for (const i of incidents) {
    lines.push(csvRow([
      fmtCSVDate(i.date), i.time || '', i.project?.name || '',
      i.type_name || '', i.incident_subtype || '',
      i.severity || '', i.osha_recordable ? 'Yes' : 'No',
      i.employee_name || '', i.phone || '', i.reporter_name || '',
      i.location || '', i.details || '',
    ]))
  }
  return lines.join('\r\n')
}

const buildCorrectiveActionsCSV = (actions, persons = [], incidents = []) => {
  const personMap   = Object.fromEntries(persons.map(p => [p.id, p.name]))
  const incidentMap = Object.fromEntries(incidents.map(i => [i.id, i]))
  const lines = [csvHeader('Description','Status','Responsible Person','Due Date','Declared Completion Date','Marked Completed Date','Incident Type','Incident Date')]
  for (const a of actions) {
    const inc = a.incident_id ? incidentMap[a.incident_id] : null
    lines.push(csvRow([
      a.description || '', a.status || '',
      a.responsible_person_id ? (personMap[a.responsible_person_id] || '') : '',
      fmtCSVDate(a.due_date), fmtCSVDate(a.declared_completion_date || a.completion_date), fmtCSVDate(a.completion_date),
      inc?.type_name || '', fmtCSVDate(inc?.date),
    ]))
  }
  return lines.join('\r\n')
}

/**
 * Builds monthly statistics per project from meetings and incidents.
 */
const buildStatisticsCSV = (meetings, incidents, actions) => {
  const stats = {}
  const key = (ym, pid, pname) => `${ym}||${pid}||${pname}`
  const ensure = (ym, pid, pname) => {
    const k = key(ym, pid, pname)
    if (!stats[k]) stats[k] = { ym, project: pname, meetings: 0, incidents: 0, open_actions: 0, completed_actions: 0 }
    return stats[k]
  }

  for (const m of meetings) {
    if (m.date) {
      const ym = m.date.substring(0, 7)
      ensure(ym, m.project_id || '', m.project?.name || 'No Project').meetings++
    }
  }
  for (const i of incidents) {
    if (i.date) {
      const ym = i.date.substring(0, 7)
      ensure(ym, i.project_id || '', i.project?.name || 'No Project').incidents++
    }
  }
  for (const a of actions) {
    // Use due date month for corrective action stats
    if (a.due_date) {
      const ym = a.due_date.substring(0, 7)
      const entry = ensure(ym, '', 'All Projects')
      if (a.status === 'open') entry.open_actions++
      else entry.completed_actions++
    }
  }

  const rows = Object.values(stats).sort((a, b) => b.ym.localeCompare(a.ym))
  const lines = [csvHeader('Year-Month','Project','Meetings','Incidents','Open Actions','Completed Actions')]
  for (const r of rows) {
    lines.push(csvRow([r.ym, r.project, r.meetings, r.incidents, r.open_actions, r.completed_actions]))
  }
  return lines.join('\r\n')
}

/**
 * Builds per-worker attendance stats from meetings.
 */
const buildAttendanceCSV = (meetings) => {
  const workers = {}
  for (const m of meetings) {
    for (const a of (m.attendees || [])) {
      const name = a.name?.trim()
      if (!name) continue
      if (!workers[name]) workers[name] = { name, count: 0, projects: new Set(), last: null }
      workers[name].count++
      if (m.project?.name) workers[name].projects.add(m.project.name)
      if (!workers[name].last || m.date > workers[name].last) workers[name].last = m.date
    }
  }

  const rows = Object.values(workers).sort((a, b) => b.count - a.count)
  const lines = [csvHeader('Worker','Total Meetings','Projects','Last Meeting')]
  for (const r of rows) {
    lines.push(csvRow([r.name, r.count, [...r.projects].join('; '), fmtCSVDate(r.last)]))
  }
  return lines.join('\r\n')
}

// ─── Master CSV ZIP downloader ────────────────────────────────────────────────

/**
 * Downloads a ZIP containing selected CSV files.
 *
 * @param {Object} options
 * @param {boolean} options.meetings
 * @param {boolean} options.incidents
 * @param {boolean} options.corrective_actions
 * @param {boolean} options.statistics
 * @param {boolean} options.attendance
 * @param {Object} filters  { dateFrom, dateTo, projectId }
 */
export const downloadCSVsAsZIP = async (options = {}, filters = {}) => {
  const zip = new JSZip()
  const dateStr = new Date().toISOString().split('T')[0]

  // Always fetch meetings (needed for statistics + attendance even if CSV not selected)
  const needMeetings = options.meetings || options.statistics || options.attendance
  const needIncidents = options.incidents || options.statistics
  const needActions = options.corrective_actions || options.statistics

  const [meetingsData, incidentsData, actionsData, personsData] = await Promise.all([
    needMeetings  ? fetchMeetingsFull(filters)               : Promise.resolve([]),
    needIncidents ? fetchIncidentsFull(filters)              : Promise.resolve([]),
    needActions   ? fetchCorrectiveActionsFull(filters)      : Promise.resolve([]),
    (options.corrective_actions) ? fetchPersons()            : Promise.resolve([]),
  ])

  const incidentsForActions = needActions ? await fetchIncidentsList() : []

  if (options.meetings && meetingsData.length > 0) {
    zip.file('meetings.csv', '\uFEFF' + buildMeetingsCSV(meetingsData))
  }
  if (options.incidents && incidentsData.length > 0) {
    zip.file('incidents.csv', '\uFEFF' + buildIncidentsCSV(incidentsData))
  }
  if (options.corrective_actions && actionsData.length > 0) {
    zip.file('corrective_actions.csv', '\uFEFF' + buildCorrectiveActionsCSV(actionsData, personsData, incidentsForActions))
  }
  if (options.statistics) {
    zip.file('statistics.csv', '\uFEFF' + buildStatisticsCSV(meetingsData, incidentsData, actionsData))
  }
  if (options.attendance && meetingsData.length > 0) {
    zip.file('attendance.csv', '\uFEFF' + buildAttendanceCSV(meetingsData))
  }

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  saveAs(blob, `export_${dateStr}.zip`)
}
