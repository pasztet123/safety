/**
 * exportHelpers.js
 * Data fetching helpers and CSV builders for the bulk export feature.
 */

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { fetchAllPages, fetchByIdsInBatches, supabase } from './supabase'

export const MEETING_SINGLE_PDF_MAX_RECORDS = 250
export const DEFAULT_MEETING_CHUNK_SIZE = 200
export const MEETING_CHUNK_SIZE_OPTIONS = [50, 100, 150, 200, 300, 500]

const uniqueValues = (items) => [...new Set((items || []).filter(Boolean))]
const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const normalizeMeetingFilters = (filters = {}) => ({
  dateFrom: normalizeText(filters.dateFrom),
  dateTo: normalizeText(filters.dateTo),
  projectId: normalizeText(filters.projectId),
  attendeeName: normalizeText(filters.attendeeName),
  trade: normalizeText(filters.trade),
  topic: normalizeText(filters.topic),
  leaderName: normalizeText(filters.leaderName),
  location: normalizeText(filters.location),
  timeRange: normalizeText(filters.timeRange),
  sortBy: normalizeText(filters.sortBy) || 'newest',
  selfTraining: normalizeText(filters.selfTraining || filters.selfTrainingMode || 'all') || 'all',
})

const compareText = (left, right, direction = 'asc') => {
  const result = String(left || '').localeCompare(String(right || ''), 'en', { sensitivity: 'base' })
  return direction === 'desc' ? -result : result
}

const compareNumber = (left, right, direction = 'desc') => {
  const safeLeft = Number.isFinite(left) ? left : -Infinity
  const safeRight = Number.isFinite(right) ? right : -Infinity
  return direction === 'asc' ? safeLeft - safeRight : safeRight - safeLeft
}

const getMeetingMinutes = (meeting) => {
  const rawTime = (meeting?.time || '').trim()
  const match = rawTime.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  return (hours * 60) + minutes
}

const getTimestampValue = (meeting, field = 'date-time-desc') => {
  const baseValue = field === 'created-asc' || field === 'created-desc'
    ? meeting?.created_at
    : meeting?.date

  if (!baseValue) return 0

  const timeValue = field === 'created-asc' || field === 'created-desc'
    ? ''
    : (meeting?.time || '00:00')

  const parsed = new Date(`${baseValue}${timeValue ? `T${timeValue}` : ''}`)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

const sortMeetingRecords = (records, sortBy) => {
  const result = [...records]

  result.sort((left, right) => {
    switch (sortBy) {
      case 'date-asc':
      case 'oldest':
        return compareNumber(getTimestampValue(left), getTimestampValue(right), 'asc')
      case 'newest':
      case 'date-desc':
        return compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'time-asc':
        return compareNumber(getMeetingMinutes(left), getMeetingMinutes(right), 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'asc')
      case 'time-desc':
        return compareNumber(getMeetingMinutes(left), getMeetingMinutes(right), 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'topic-asc':
      case 'az':
        return compareText(left?.topic, right?.topic, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'topic-desc':
      case 'za':
        return compareText(left?.topic, right?.topic, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'trade-asc':
      case 'trade':
        return compareText(left?.trade, right?.trade, 'asc') || compareText(left?.topic, right?.topic, 'asc')
      case 'trade-desc':
        return compareText(left?.trade, right?.trade, 'desc') || compareText(left?.topic, right?.topic, 'asc')
      case 'leader-asc':
        return compareText(left?.leader_name, right?.leader_name, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'leader-desc':
        return compareText(left?.leader_name, right?.leader_name, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'project-asc':
        return compareText(left?.project?.name, right?.project?.name, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'project-desc':
        return compareText(left?.project?.name, right?.project?.name, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'location-asc':
        return compareText(left?.location, right?.location, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'location-desc':
        return compareText(left?.location, right?.location, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'attendees-asc':
      case 'least-attendees':
        return compareNumber(left?.attendees?.length || 0, right?.attendees?.length || 0, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'attendees-desc':
      case 'attendees':
      case 'most-attendees':
        return compareNumber(left?.attendees?.length || 0, right?.attendees?.length || 0, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'created-asc':
        return compareNumber(getTimestampValue(left, 'created-asc'), getTimestampValue(right, 'created-asc'), 'asc')
      case 'created-desc':
        return compareNumber(getTimestampValue(left, 'created-desc'), getTimestampValue(right, 'created-desc'), 'desc')
      default:
        return compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
    }
  })

  return result
}

const hasUnsupportedServerSort = (sortBy) => (
  sortBy === 'project-asc' ||
  sortBy === 'project-desc' ||
  sortBy === 'attendees-asc' ||
  sortBy === 'least-attendees' ||
  sortBy === 'attendees-desc' ||
  sortBy === 'attendees' ||
  sortBy === 'most-attendees'
)

const applyMeetingTimeRange = (query, timeRange) => {
  switch (timeRange) {
    case 'before-06':
      return query.lt('time', '06:00')
    case 'morning':
      return query.gte('time', '06:00').lt('time', '12:00')
    case 'midday':
      return query.gte('time', '12:00').lt('time', '15:00')
    case 'afternoon':
      return query.gte('time', '15:00').lt('time', '18:00')
    case 'evening':
      return query.gte('time', '18:00').lt('time', '22:00')
    case 'night':
      return query.or('time.gte.22:00,time.lt.06:00')
    default:
      return query
  }
}

const applyMeetingDirectFilters = (query, rawFilters = {}) => {
  const filters = normalizeMeetingFilters(rawFilters)
  let nextQuery = query
    .is('deleted_at', null)
    .eq('is_draft', false)

  if (filters.dateFrom) nextQuery = nextQuery.gte('date', filters.dateFrom)
  if (filters.dateTo) nextQuery = nextQuery.lte('date', filters.dateTo)
  if (filters.projectId) nextQuery = nextQuery.eq('project_id', filters.projectId)
  if (filters.trade) nextQuery = nextQuery.eq('trade', filters.trade)
  if (filters.topic) nextQuery = nextQuery.ilike('topic', `%${filters.topic}%`)
  if (filters.leaderName) nextQuery = nextQuery.ilike('leader_name', `%${filters.leaderName}%`)
  if (filters.location) nextQuery = nextQuery.ilike('location', `%${filters.location}%`)
  if (filters.selfTraining === 'true') nextQuery = nextQuery.eq('is_self_training', true)
  if (filters.selfTraining === 'false') nextQuery = nextQuery.eq('is_self_training', false)
  if (filters.timeRange) nextQuery = applyMeetingTimeRange(nextQuery, filters.timeRange)

  return nextQuery
}

const applyMeetingServerSort = (query, rawSortBy = 'newest') => {
  const sortBy = normalizeText(rawSortBy) || 'newest'

  switch (sortBy) {
    case 'date-asc':
    case 'oldest':
      return query.order('date', { ascending: true }).order('time', { ascending: true })
    case 'time-asc':
      return query.order('time', { ascending: true }).order('date', { ascending: true })
    case 'time-desc':
      return query.order('time', { ascending: false }).order('date', { ascending: false })
    case 'topic-asc':
    case 'az':
      return query.order('topic', { ascending: true }).order('date', { ascending: false })
    case 'topic-desc':
    case 'za':
      return query.order('topic', { ascending: false }).order('date', { ascending: false })
    case 'trade-asc':
    case 'trade':
      return query.order('trade', { ascending: true }).order('date', { ascending: false })
    case 'trade-desc':
      return query.order('trade', { ascending: false }).order('date', { ascending: false })
    case 'leader-asc':
      return query.order('leader_name', { ascending: true }).order('date', { ascending: false })
    case 'leader-desc':
      return query.order('leader_name', { ascending: false }).order('date', { ascending: false })
    case 'location-asc':
      return query.order('location', { ascending: true }).order('date', { ascending: false })
    case 'location-desc':
      return query.order('location', { ascending: false }).order('date', { ascending: false })
    case 'created-asc':
      return query.order('created_at', { ascending: true })
    case 'created-desc':
      return query.order('created_at', { ascending: false })
    case 'project-asc':
    case 'project-desc':
    case 'attendees-asc':
    case 'least-attendees':
    case 'attendees-desc':
    case 'attendees':
    case 'most-attendees':
    case 'newest':
    case 'date-desc':
    default:
      return query.order('date', { ascending: false }).order('time', { ascending: false })
  }
}

const hydrateMeetingChecklists = async (meetings = []) => {
  const meetingIds = uniqueValues(meetings.map(meeting => meeting.id))
  if (meetingIds.length === 0) return []

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
  checklistsData.forEach((row) => {
    if (!checklistsByMeeting[row.meeting_id]) checklistsByMeeting[row.meeting_id] = []
    if (row.checklist) checklistsByMeeting[row.meeting_id].push(row.checklist)
  })

  return meetings.map((meeting) => ({
    ...meeting,
    checklists: checklistsByMeeting[meeting.id] || [],
  }))
}

const fetchMatchingMeetingIdsByAttendee = async (attendeeName) => {
  const trimmedName = normalizeText(attendeeName)
  if (!trimmedName) return null

  const rows = await fetchAllPages(() => supabase
    .from('meeting_attendees')
    .select('meeting_id')
    .ilike('name', `%${trimmedName}%`))

  return uniqueValues(rows.map(row => row.meeting_id))
}

const fetchMeetingsByIds = async ({ ids = [], filters = {} }) => {
  const uniqueIds = uniqueValues(ids)
  if (uniqueIds.length === 0) return []

  const rows = await fetchByIdsInBatches({
    table: 'meetings',
    select: `
      *,
      project:projects(name),
      attendees:meeting_attendees(name),
      photos:meeting_photos(photo_url)
    `,
    ids: uniqueIds,
    idColumn: 'id',
    batchSize: 150,
    buildQuery: (query) => applyMeetingDirectFilters(query, filters),
  })

  const hydratedRows = await hydrateMeetingChecklists(rows || [])
  return sortMeetingRecords(hydratedRows, normalizeMeetingFilters(filters).sortBy)
}

export const fetchMeetingFilterOptions = async () => {
  const [projects, trades, attendeeRows, leaderRows] = await Promise.all([
    fetchProjects(),
    supabase.from('trades').select('name').order('name'),
    fetchAllPages(() => supabase.from('meeting_attendees').select('name')),
    fetchAllPages(() => supabase.from('meetings').select('leader_name').eq('is_draft', false).is('deleted_at', null)),
  ])

  return {
    projects,
    trades: uniqueValues((trades.data || []).map(item => item.name)).sort((left, right) => compareText(left, right, 'asc')),
    attendees: uniqueValues(attendeeRows.map(item => item.name)).sort((left, right) => compareText(left, right, 'asc')),
    leaders: uniqueValues(leaderRows.map(item => item.leader_name)).sort((left, right) => compareText(left, right, 'asc')),
  }
}

export const fetchMeetingsWindow = async (rawFilters = {}, options = {}) => {
  const filters = normalizeMeetingFilters(rawFilters)
  const page = Math.max(1, Number(options.page) || 1)
  const pageSize = Math.max(1, Number(options.pageSize) || 50)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  try {
    const attendeeIds = await fetchMatchingMeetingIdsByAttendee(filters.attendeeName)

    if (Array.isArray(attendeeIds)) {
      if (attendeeIds.length === 0) return { rows: [], count: 0 }
      const allRows = await fetchMeetingsByIds({ ids: attendeeIds, filters })
      return {
        rows: allRows.slice(from, to + 1),
        count: allRows.length,
      }
    }

    const countQuery = applyMeetingDirectFilters(
      supabase.from('meetings').select('id', { count: 'exact', head: true }),
      filters,
    )

    const rowsQuery = applyMeetingServerSort(
      applyMeetingDirectFilters(
        supabase
          .from('meetings')
          .select(`
            *,
            project:projects(name),
            attendees:meeting_attendees(name),
            photos:meeting_photos(photo_url)
          `),
        filters,
      ),
      filters.sortBy,
    ).range(from, to)

    const [{ count, error: countError }, { data, error: rowsError }] = await Promise.all([countQuery, rowsQuery])
    if (countError) throw countError
    if (rowsError) throw rowsError

    let rows = await hydrateMeetingChecklists(data || [])
    if (hasUnsupportedServerSort(filters.sortBy)) {
      rows = sortMeetingRecords(rows, filters.sortBy)
    }

    return { rows, count: count || 0 }
  } catch (error) {
    console.error('fetchMeetingsWindow error:', error)
    return { rows: [], count: 0 }
  }
}

export const fetchMeetingExportChunk = async (rawFilters = {}, options = {}) => {
  const filters = normalizeMeetingFilters(rawFilters)
  const offset = Math.max(0, Number(options.offset) || 0)
  const limit = Math.max(1, Number(options.limit) || DEFAULT_MEETING_CHUNK_SIZE)

  try {
    const attendeeIds = await fetchMatchingMeetingIdsByAttendee(filters.attendeeName)

    if (Array.isArray(attendeeIds)) {
      if (attendeeIds.length === 0) return { rows: [], count: 0 }
      const allRows = await fetchMeetingsByIds({ ids: attendeeIds, filters })
      return {
        rows: allRows.slice(offset, offset + limit),
        count: allRows.length,
      }
    }

    const query = applyMeetingServerSort(
      applyMeetingDirectFilters(
        supabase
          .from('meetings')
          .select(`
            *,
            project:projects(name),
            attendees:meeting_attendees(name),
            photos:meeting_photos(photo_url)
          `, { count: 'exact' }),
        filters,
      ),
      filters.sortBy,
    ).range(offset, offset + limit - 1)

    const { data, count, error } = await query
    if (error) throw error

    let rows = await hydrateMeetingChecklists(data || [])
    if (hasUnsupportedServerSort(filters.sortBy)) {
      rows = sortMeetingRecords(rows, filters.sortBy)
    }

    return { rows, count: count || 0 }
  } catch (error) {
    console.error('fetchMeetingExportChunk error:', error)
    return { rows: [], count: 0 }
  }
}

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
  try {
    const attendeeIds = await fetchMatchingMeetingIdsByAttendee(filters.attendeeName)

    if (Array.isArray(attendeeIds)) {
      return fetchMeetingsByIds({ ids: attendeeIds, filters })
    }

    const data = await fetchAllPages(() => applyMeetingServerSort(
      applyMeetingDirectFilters(
        supabase
          .from('meetings')
          .select(`
            *,
            project:projects(name),
            attendees:meeting_attendees(name),
            photos:meeting_photos(photo_url)
          `),
        filters,
      ),
      normalizeMeetingFilters(filters).sortBy,
    ))

    let rows = await hydrateMeetingChecklists(data || [])
    if (hasUnsupportedServerSort(normalizeMeetingFilters(filters).sortBy)) {
      rows = sortMeetingRecords(rows, normalizeMeetingFilters(filters).sortBy)
    }

    return rows
  } catch (error) {
    return []
  }
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
  const lines = [csvHeader('Description','Status','Responsible Person','Due Date','Completed Date','Incident Type','Incident Date')]
  for (const a of actions) {
    const inc = a.incident_id ? incidentMap[a.incident_id] : null
    lines.push(csvRow([
      a.description || '', a.status || '',
      a.responsible_person_id ? (personMap[a.responsible_person_id] || '') : '',
      fmtCSVDate(a.due_date), fmtCSVDate(a.declared_completion_date || a.completion_date),
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
