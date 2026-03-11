import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  eachMonthOfInterval,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { fetchAllPages, supabase } from './supabase'
import { fetchChecklistCompletionsFull } from './exportHelpers'

export const ANALYTICS_TYPE_META = {
  meetings: {
    key: 'meetings',
    label: 'Meetings',
    shortLabel: 'Meetings',
    color: '#1f4e79',
    lightColor: '#d7e5f2',
  },
  checklistCompletions: {
    key: 'checklistCompletions',
    label: 'Checklist Completions',
    shortLabel: 'Checklists',
    color: '#3f7d20',
    lightColor: '#ddeecf',
  },
  incidents: {
    key: 'incidents',
    label: 'Incidents',
    shortLabel: 'Incidents',
    color: '#b44b24',
    lightColor: '#f7dfd4',
  },
  correctiveActions: {
    key: 'correctiveActions',
    label: 'Corrective Actions',
    shortLabel: 'Corrective',
    color: '#8f6415',
    lightColor: '#f4e6c7',
  },
  disciplinaryActions: {
    key: 'disciplinaryActions',
    label: 'Disciplinary Actions',
    shortLabel: 'Disciplinary',
    color: '#6a2d91',
    lightColor: '#e9d9f6',
  },
}

export const ANALYTICS_TYPE_KEYS = Object.keys(ANALYTICS_TYPE_META)

const normalizeName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ')

const parseDateTime = (dateValue, timeValue) => {
  if (!dateValue) return null

  if (!timeValue && String(dateValue).includes('T')) {
    const parsedDateTime = parseISO(String(dateValue))
    if (isValid(parsedDateTime)) return parsedDateTime
  }

  const datePart = String(dateValue).slice(0, 10)

  if (timeValue) {
    const parsed = parseISO(`${datePart}T${String(timeValue).slice(0, 5)}:00`)
    if (isValid(parsed)) return parsed
  }

  const parsedDate = parseISO(`${datePart}T12:00:00`)
  return isValid(parsedDate) ? parsedDate : null
}

const sortByLabel = (items) => [...items].sort((left, right) => left.label.localeCompare(right.label))

const uniqueStrings = (values) => [...new Set(values.filter(Boolean))]

const truncate = (value, maxLength = 70) => {
  if (!value) return ''
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value
}

export const getDefaultAnalyticsDateRange = () => {
  const now = new Date()
  return {
    dateFrom: format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'),
    dateTo: format(now, 'yyyy-MM-dd'),
  }
}

export const fetchAdminAnalyticsDataset = async ({ dateFrom, dateTo }) => {
  const incidentsQuery = supabase
    .from('incidents')
    .select('id, date, time, type_name, severity, employee_name, reporter_name, project:projects(name)')
    .is('deleted_at', null)
    .order('date', { ascending: false })
    .order('time', { ascending: false })

  const correctiveActionsQuery = supabase
    .from('corrective_actions')
    .select('id, description, status, due_date, completion_date, declared_created_date, responsible_person_id, incident_id')
    .order('due_date', { ascending: false, nullsFirst: false })

  const disciplinaryActionsQuery = supabase
    .from('disciplinary_actions')
    .select('id, action_type, action_notes, action_date, action_time, recipient_person_id, responsible_leader_id, incident_id')
    .order('action_date', { ascending: false })
    .order('action_time', { ascending: false })

  const involvedPersonsQuery = supabase
    .from('involved_persons')
    .select('id, name')
    .order('name')

  const leadersQuery = supabase
    .from('leaders')
    .select('id, name')
    .order('name')

  if (dateFrom) {
    incidentsQuery.gte('date', dateFrom)
    disciplinaryActionsQuery.gte('action_date', dateFrom)
  }

  if (dateTo) {
    incidentsQuery.lte('date', dateTo)
    disciplinaryActionsQuery.lte('action_date', dateTo)
  }

  const [
    meetings,
    incidentsRes,
    correctiveActionsRes,
    disciplinaryActionsRes,
    involvedPersonsRes,
    leadersRes,
    checklistCompletions,
  ] = await Promise.all([
    fetchAllPages(() => {
      let query = supabase
        .from('meetings')
        .select(`
          id,
          date,
          time,
          is_draft,
          topic,
          trade,
          leader_name,
          project:projects(name),
          attendees:meeting_attendees(name)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false })

      if (dateFrom) query = query.gte('date', dateFrom)
      if (dateTo) query = query.lte('date', dateTo)

      return query
    }),
    incidentsQuery,
    correctiveActionsQuery,
    disciplinaryActionsQuery,
    involvedPersonsQuery,
    leadersQuery,
    fetchChecklistCompletionsFull({ dateFrom, dateTo }),
  ])

  return {
    meetings: meetings || [],
    incidents: incidentsRes.data || [],
    correctiveActions: correctiveActionsRes.data || [],
    disciplinaryActions: disciplinaryActionsRes.data || [],
    checklistCompletions: checklistCompletions || [],
    involvedPersons: involvedPersonsRes.data || [],
    leaders: leadersRes.data || [],
  }
}

const buildPersonOptions = (involvedPersons, leaders) => {
  const people = involvedPersons.map((person) => ({
    id: `person:${person.id}`,
    entityId: person.id,
    kind: 'person',
    label: person.name,
    normalizedName: normalizeName(person.name),
  }))

  const leaderItems = leaders.map((leader) => ({
    id: `leader:${leader.id}`,
    entityId: leader.id,
    kind: 'leader',
    label: leader.name,
    normalizedName: normalizeName(leader.name),
  }))

  return sortByLabel([...people, ...leaderItems])
}

const buildLookupMaps = (dataset) => {
  const personOptions = buildPersonOptions(dataset.involvedPersons, dataset.leaders)
  const peopleByToken = new Map(personOptions.map((person) => [person.id, person]))
  const peopleByName = new Map()

  personOptions.forEach((person) => {
    const items = peopleByName.get(person.normalizedName) || []
    items.push(person)
    peopleByName.set(person.normalizedName, items)
  })

  return { personOptions, peopleByToken, peopleByName }
}

const eventBase = ({
  id,
  type,
  title,
  subtitle,
  start,
  end,
  projectName,
  personTokens,
  personNames,
  sourcePath,
  sourceId,
  resource,
}) => ({
  id,
  title,
  start,
  end,
  allDay: false,
  resource: {
    type,
    subtitle,
    projectName,
    personTokens,
    personNames,
    normalizedNames: personNames.map((name) => normalizeName(name)).filter(Boolean),
    sourcePath,
    sourceId,
    ...resource,
  },
})

const resolvePeopleFromNames = (names, peopleByName) => {
  const resolved = []

  names.forEach((name) => {
    const matches = peopleByName.get(normalizeName(name)) || []
    matches.forEach((match) => resolved.push(match.id))
  })

  return uniqueStrings(resolved)
}

const buildMeetingEvents = (meetings, lookups) => {
  return meetings
    .map((meeting) => {
      const start = parseDateTime(meeting.date, meeting.time)
      if (!start) return null

      const attendeeNames = uniqueStrings([
        ...(meeting.attendees || []).map((attendee) => attendee.name),
        meeting.leader_name,
      ])

      const personTokens = resolvePeopleFromNames(attendeeNames, lookups.peopleByName)

      return eventBase({
        id: `meeting:${meeting.id}`,
        type: ANALYTICS_TYPE_META.meetings.key,
        title: meeting.is_draft ? `Draft: ${meeting.topic || 'Safety meeting'}` : meeting.topic || 'Safety meeting',
        subtitle: `${attendeeNames.length} participant${attendeeNames.length === 1 ? '' : 's'}`,
        start,
        end: addMinutes(start, 45),
        projectName: meeting.project?.name || '',
        personTokens,
        personNames: attendeeNames,
        sourcePath: `/meetings/${meeting.id}`,
        sourceId: meeting.id,
        resource: {
          isDraft: Boolean(meeting.is_draft),
          meetingStatus: meeting.is_draft ? 'draft' : 'approved',
          trade: meeting.trade || '',
          leaderName: meeting.leader_name || '',
        },
      })
    })
    .filter(Boolean)
}

const buildChecklistEvents = (checklistCompletions, lookups) => {
  return checklistCompletions
    .map((completion) => {
      const start = parseDateTime(completion.completion_datetime, null)
      if (!start) return null

      const actorName = completion.user?.name || completion.user?.email || 'Unknown user'
      const personNames = [actorName]
      const personTokens = resolvePeopleFromNames(personNames, lookups.peopleByName)

      return eventBase({
        id: `checklist:${completion.id}`,
        type: ANALYTICS_TYPE_META.checklistCompletions.key,
        title: completion.checklist?.name || 'Checklist completion',
        subtitle: actorName,
        start,
        end: addMinutes(start, 30),
        projectName: completion.project?.name || '',
        personTokens,
        personNames,
        sourcePath: `/checklist-history/${completion.id}`,
        sourceId: completion.id,
        resource: {
          checklistName: completion.checklist?.name || '',
        },
      })
    })
    .filter(Boolean)
}

const buildIncidentEvents = (incidents, lookups) => {
  return incidents
    .map((incident) => {
      const start = parseDateTime(incident.date, incident.time)
      if (!start) return null

      const personNames = uniqueStrings([incident.employee_name, incident.reporter_name])
      const personTokens = resolvePeopleFromNames(personNames, lookups.peopleByName)

      return eventBase({
        id: `incident:${incident.id}`,
        type: ANALYTICS_TYPE_META.incidents.key,
        title: incident.type_name || 'Incident',
        subtitle: uniqueStrings([incident.employee_name, incident.reporter_name]).join(' · '),
        start,
        end: addMinutes(start, 30),
        projectName: incident.project?.name || '',
        personTokens,
        personNames,
        sourcePath: `/incidents/${incident.id}`,
        sourceId: incident.id,
        resource: {
          severity: incident.severity || '',
        },
      })
    })
    .filter(Boolean)
}

const buildCorrectiveActionEvents = (correctiveActions, lookups) => {
  return correctiveActions
    .map((action) => {
      const start = parseDateTime(action.completion_date || action.due_date || action.declared_created_date, null)
      if (!start) return null

      const personTokens = action.responsible_person_id ? [`person:${action.responsible_person_id}`] : []
      const personNames = personTokens
        .map((token) => lookups.peopleByToken.get(token)?.label)
        .filter(Boolean)

      return eventBase({
        id: `corrective:${action.id}`,
        type: ANALYTICS_TYPE_META.correctiveActions.key,
        title: truncate(action.description || 'Corrective action', 80),
        subtitle: action.status === 'completed' ? 'Completed action' : 'Open action',
        start,
        end: addMinutes(start, 30),
        projectName: '',
        personTokens,
        personNames,
        sourcePath: '/corrective-actions',
        sourceId: action.id,
        resource: {
          status: action.status || 'open',
          dueDate: action.due_date || '',
        },
      })
    })
    .filter(Boolean)
}

const buildDisciplinaryActionEvents = (disciplinaryActions, lookups) => {
  return disciplinaryActions
    .map((action) => {
      const start = parseDateTime(action.action_date, action.action_time)
      if (!start) return null

      const personTokens = uniqueStrings([
        action.recipient_person_id ? `person:${action.recipient_person_id}` : '',
        action.responsible_leader_id ? `leader:${action.responsible_leader_id}` : '',
      ])

      const personNames = personTokens
        .map((token) => lookups.peopleByToken.get(token)?.label)
        .filter(Boolean)

      return eventBase({
        id: `disciplinary:${action.id}`,
        type: ANALYTICS_TYPE_META.disciplinaryActions.key,
        title: action.action_type || 'Disciplinary action',
        subtitle: truncate(action.action_notes || 'Disciplinary record', 80),
        start,
        end: addMinutes(start, 45),
        projectName: '',
        personTokens,
        personNames,
        sourcePath: '/disciplinary-actions',
        sourceId: action.id,
        resource: {
          actionType: action.action_type || '',
        },
      })
    })
    .filter(Boolean)
}

const eventMatchesProject = (event, projectName) => {
  if (!projectName) return true
  return event.resource.projectName === projectName
}

const eventMatchesType = (event, enabledTypes) => enabledTypes.has(event.resource.type)

const eventMatchesMeetingStatus = (event, meetingStatus) => {
  if (event.resource.type !== ANALYTICS_TYPE_META.meetings.key) return true
  if (meetingStatus === 'all') return true
  return event.resource.meetingStatus === meetingStatus
}

const eventMatchesPeople = (event, selectedPeople, personMode) => {
  if (selectedPeople.length === 0) return true

  const tokenSet = new Set(selectedPeople.map((person) => person.id))
  const normalizedNameSet = new Set(selectedPeople.map((person) => person.normalizedName))
  const eventTokenSet = new Set(event.resource.personTokens || [])
  const eventNameSet = new Set(event.resource.normalizedNames || [])

  const anyMatch = selectedPeople.some((person) => eventTokenSet.has(person.id) || eventNameSet.has(person.normalizedName))
  if (personMode === 'ANY') return anyMatch

  if (event.resource.type === ANALYTICS_TYPE_META.meetings.key) {
    return selectedPeople.every((person) => eventTokenSet.has(person.id) || eventNameSet.has(person.normalizedName))
  }

  return anyMatch
}

const buildMonthlySeries = (events, dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return []

  const interval = {
    start: parseISO(`${dateFrom}T00:00:00`),
    end: parseISO(`${dateTo}T00:00:00`),
  }

  if (!isValid(interval.start) || !isValid(interval.end) || interval.start > interval.end) return []

  const months = eachMonthOfInterval(interval)
  const rows = months.map((month) => {
    const row = {
      key: format(month, 'yyyy-MM'),
      label: format(month, 'MMM yyyy'),
      total: 0,
    }

    ANALYTICS_TYPE_KEYS.forEach((typeKey) => {
      row[typeKey] = 0
    })

    return row
  })

  const rowByKey = new Map(rows.map((row) => [row.key, row]))

  events.forEach((event) => {
    const key = format(startOfMonth(event.start), 'yyyy-MM')
    const row = rowByKey.get(key)
    if (!row) return
    row[event.resource.type] += 1
    row.total += 1
  })

  return rows
}

const buildWeeklySeries = (events) => {
  const rows = new Map()

  events.forEach((event) => {
    const bucket = startOfWeek(event.start, { weekStartsOn: 1 })
    const key = format(bucket, 'yyyy-MM-dd')
    const row = rows.get(key) || { key, label: format(bucket, 'dd MMM'), total: 0 }
    row.total += 1
    rows.set(key, row)
  })

  return [...rows.values()].sort((left, right) => left.key.localeCompare(right.key))
}

const buildGapAnalysis = (events, dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) {
    return { longestGapDays: 0, silentWindows: [], coverageRate: 0, activeDays: 0 }
  }

  const start = parseISO(`${dateFrom}T00:00:00`)
  const end = parseISO(`${dateTo}T00:00:00`)
  if (!isValid(start) || !isValid(end) || start > end) {
    return { longestGapDays: 0, silentWindows: [], coverageRate: 0, activeDays: 0 }
  }

  const activeDayStrings = uniqueStrings(events.map((event) => format(event.start, 'yyyy-MM-dd'))).sort()
  const activeDays = activeDayStrings.length
  const totalDays = differenceInCalendarDays(end, start) + 1
  const coverageRate = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0

  if (activeDayStrings.length === 0) {
    return {
      longestGapDays: totalDays,
      silentWindows: totalDays > 0 ? [{ start: dateFrom, end: dateTo, days: totalDays }] : [],
      coverageRate,
      activeDays,
    }
  }

  const checkpoints = [dateFrom, ...activeDayStrings, dateTo]
  const windows = []

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const current = parseISO(`${checkpoints[index]}T00:00:00`)
    const next = parseISO(`${checkpoints[index + 1]}T00:00:00`)
    const rawGap = differenceInCalendarDays(next, current) - 1

    if (rawGap > 0) {
      windows.push({
        start: format(addDays(current, 1), 'yyyy-MM-dd'),
        end: format(addDays(next, -1), 'yyyy-MM-dd'),
        days: rawGap,
      })
    }
  }

  windows.sort((left, right) => right.days - left.days)

  return {
    longestGapDays: windows[0]?.days || 0,
    silentWindows: windows.slice(0, 3),
    coverageRate,
    activeDays,
  }
}

export const buildAdminAnalyticsView = ({ dataset, filters }) => {
  const lookups = buildLookupMaps(dataset)
  const rangeStart = filters.dateFrom ? parseISO(`${filters.dateFrom}T00:00:00`) : null
  const rangeEnd = filters.dateTo ? parseISO(`${filters.dateTo}T23:59:59`) : null

  const allEvents = [
    ...buildMeetingEvents(dataset.meetings, lookups),
    ...buildChecklistEvents(dataset.checklistCompletions, lookups),
    ...buildIncidentEvents(dataset.incidents, lookups),
    ...buildCorrectiveActionEvents(dataset.correctiveActions, lookups),
    ...buildDisciplinaryActionEvents(dataset.disciplinaryActions, lookups),
  ]
    .filter((event) => {
      if (rangeStart && event.start < rangeStart) return false
      if (rangeEnd && event.start > rangeEnd) return false
      return true
    })
    .sort((left, right) => left.start - right.start)

  const enabledTypes = new Set(filters.enabledTypes)
  const selectedPeople = lookups.personOptions.filter((person) => filters.selectedPersonIds.includes(person.id))

  const filteredEvents = allEvents.filter((event) => (
    eventMatchesType(event, enabledTypes)
    && eventMatchesMeetingStatus(event, filters.meetingStatus)
    && eventMatchesProject(event, filters.projectName)
    && eventMatchesPeople(event, selectedPeople, filters.personMode)
  ))

  const typeCounts = ANALYTICS_TYPE_KEYS.reduce((accumulator, key) => {
    accumulator[key] = filteredEvents.filter((event) => event.resource.type === key).length
    return accumulator
  }, {})

  const monthlySeries = buildMonthlySeries(filteredEvents, filters.dateFrom, filters.dateTo)
  const weeklySeries = buildWeeklySeries(filteredEvents)
  const gapAnalysis = buildGapAnalysis(filteredEvents, filters.dateFrom, filters.dateTo)
  const projects = sortByLabel(uniqueStrings(allEvents.map((event) => event.resource.projectName)).map((projectName) => ({ label: projectName })))
  const busiestMonth = [...monthlySeries].sort((left, right) => right.total - left.total)[0]

  return {
    personOptions: lookups.personOptions,
    projectOptions: projects.map((project) => project.label),
    events: filteredEvents,
    monthlySeries,
    weeklySeries,
    typeCounts,
    metrics: {
      totalEvents: filteredEvents.length,
      meetings: typeCounts.meetings,
      checklists: typeCounts.checklistCompletions,
      incidents: typeCounts.incidents,
      correctiveActions: typeCounts.correctiveActions,
      disciplinaryActions: typeCounts.disciplinaryActions,
      coverageRate: gapAnalysis.coverageRate,
      activeDays: gapAnalysis.activeDays,
      longestGapDays: gapAnalysis.longestGapDays,
      silentWeeks: gapAnalysis.silentWindows.filter((window) => window.days >= 7).length,
      busiestMonth: busiestMonth?.label || '—',
      busiestMonthCount: busiestMonth?.total || 0,
      overdueActions: dataset.correctiveActions.filter((action) => action.status !== 'completed' && action.due_date && action.due_date < filters.dateTo).length,
    },
    silentWindows: gapAnalysis.silentWindows,
    allModeNoteVisible: filters.personMode === 'ALL' && selectedPeople.length > 1,
  }
}
