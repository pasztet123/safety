import { fetchAppSettings } from './appSettings'
import { fetchAllPages, supabase } from './supabase'

export const ATTENDANCE_RISK_STATUSES = ['open', 'acked', 'resolved']

const uniqueValues = (items) => [...new Set((items || []).filter(Boolean))]
const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export const formatAttendanceRiskRunHourLabel = (hourValue) => {
  const hour = Number.isFinite(Number(hourValue)) ? Math.min(23, Math.max(0, Number(hourValue))) : 10
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const normalizedHour = hour % 12 || 12
  return `${normalizedHour}:00 ${suffix}`
}

export const fetchAttendanceRiskAlerts = async ({
  alertDate,
  status = 'open',
  limit = 200,
} = {}) => {
  let query = supabase
    .from('meeting_attendance_risk_alerts')
    .select('*')
    .order('alert_date', { ascending: false })
    .order('days_without_meeting', { ascending: false })
    .order('display_name', { ascending: true })
    .limit(limit)

  if (alertDate) {
    query = query.eq('alert_date', alertDate)
  }

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: alerts, error } = await query
  if (error) throw error

  const acknowledgingUserIds = uniqueValues((alerts || []).map((alert) => alert.acknowledged_by))

  const acknowledgingUsers = acknowledgingUserIds.length > 0
    ? await supabase
        .from('users')
        .select('id, name, email')
        .in('id', acknowledgingUserIds)
    : { data: [], error: null }

  if (acknowledgingUsers.error) throw acknowledgingUsers.error

  const userMap = new Map((acknowledgingUsers.data || []).map((user) => [user.id, user]))

  return (alerts || []).map((alert) => ({
    ...alert,
    acknowledged_by_user: alert.acknowledged_by ? (userMap.get(alert.acknowledged_by) || null) : null,
  }))
}

export const acknowledgeAttendanceRiskAlert = async ({
  alertId,
  note = '',
}) => {
  if (!alertId) throw new Error('Missing alert id.')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('You must be signed in to acknowledge an alert.')

  const payload = {
    status: 'acked',
    acknowledged_at: new Date().toISOString(),
    acknowledged_by: user.id,
    ack_note: note.trim() || null,
  }

  const { data, error } = await supabase
    .from('meeting_attendance_risk_alerts')
    .update(payload)
    .eq('id', alertId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export const runAttendanceRiskEvaluation = async ({
  sendEmails = true,
  sendNotifications = true,
  forceRun = true,
  alertDate,
  retries = 0,
  retryDelayMs = 400,
} = {}) => {
  let lastError = null

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Missing session token for attendance risk evaluation.')
      }

      const { data, error } = await supabase.functions.invoke('attendance-risk-evaluator', {
        body: {
          sendEmails,
          sendNotifications,
          forceRun,
          alertDate: alertDate || undefined,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        throw new Error(error.message || 'Unable to run attendance risk evaluation.')
      }

      if (data?.error) {
        throw new Error(data.error)
      }

      return data
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unable to run attendance risk evaluation.')

      const normalizedMessage = String(lastError.message || '').toLowerCase()
      const transientFailure = normalizedMessage.includes('failed to send a request')
        || normalizedMessage.includes('failed to fetch')
        || normalizedMessage.includes('network')
        || normalizedMessage.includes('missing session token')

      if (attempt >= retries || !transientFailure) {
        throw lastError
      }

      await wait(retryDelayMs * (attempt + 1))
    }
  }

  throw lastError || new Error('Unable to run attendance risk evaluation.')
}

export const fetchAttendanceRiskFeed = async () => {
  const settings = await fetchAppSettings()
  const timeZone = String(settings?.timezone || 'America/Chicago')
  const featureEnabled = Boolean(settings?.attendance_risk_notifications_enabled)
  const pushEnabled = Boolean(settings?.attendance_risk_push_enabled)

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })

  const getParts = (value) => {
    const entries = Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]))
    return {
      year: Number(entries.year),
      month: Number(entries.month),
      day: Number(entries.day),
      weekday: entries.weekday,
    }
  }

  const pad = (value) => String(value).padStart(2, '0')
  const currentParts = getParts(new Date())
  const alertDate = `${currentParts.year}-${pad(currentParts.month)}-${pad(currentParts.day)}`
  const weekend = currentParts.weekday === 'Sat' || currentParts.weekday === 'Sun'

  if (!featureEnabled) {
    return {
      featureEnabled: false,
      pushEnabled,
      weekend,
      alertDate,
      openCount: 0,
      alerts: [],
    }
  }

  const dateOnlyToUtcDate = (value) => {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (!match) return null
    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0))
  }

  const normalizeDateOnly = (value) => {
    const parsed = dateOnlyToUtcDate(value)
    if (!parsed) return ''
    return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(parsed.getUTCDate())}`
  }

  const addDaysToDateOnly = (value, days) => {
    const baseDate = dateOnlyToUtcDate(value)
    if (!baseDate) return value
    baseDate.setUTCDate(baseDate.getUTCDate() + days)
    return `${baseDate.getUTCFullYear()}-${pad(baseDate.getUTCMonth() + 1)}-${pad(baseDate.getUTCDate())}`
  }

  const diffDaysBetweenDateOnly = (fromValue, toValue) => {
    const fromDate = dateOnlyToUtcDate(fromValue)
    const toDate = dateOnlyToUtcDate(toValue)
    if (!fromDate || !toDate) return 0
    return Math.max(0, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000))
  }

  const normalizeName = (value) => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase()
  const windowStartDate = addDaysToDateOnly(alertDate, -7)

  const meetings = await fetchAllPages(() => supabase
    .from('meetings')
    .select('id, date, time, leader_name, is_draft, deleted_at')
    .not('is_draft', 'is', true)
    .is('deleted_at', null)
    .gte('date', windowStartDate)
    .lte('date', alertDate)
    .order('date', { ascending: false }))

  const meetingIds = (meetings || []).map((meeting) => meeting.id)
  const attendeeRows = meetingIds.length === 0
    ? []
    : await fetchAllPages(() => supabase
        .from('meeting_attendees')
        .select('meeting_id, name')
        .in('meeting_id', meetingIds))

  const meetingsById = new Map((meetings || []).map((meeting) => [meeting.id, meeting]))
  const subjectMap = new Map()

  const recordParticipation = ({ rawName, meetingDate }) => {
    const displayName = String(rawName || '').trim()
    const normalizedName = normalizeName(displayName)
    const normalizedMeetingDate = normalizeDateOnly(meetingDate)
    if (!displayName || !normalizedName) return
    if (!normalizedMeetingDate || normalizedMeetingDate < windowStartDate || normalizedMeetingDate > alertDate) return

    if (!subjectMap.has(normalizedName)) {
      subjectMap.set(normalizedName, {
        display_name: displayName,
        latest_meeting_date: null,
        has_today_participation: false,
      })
    }

    const subject = subjectMap.get(normalizedName)
    if (!subject.latest_meeting_date || normalizedMeetingDate > subject.latest_meeting_date) {
      subject.latest_meeting_date = normalizedMeetingDate
    }
    if (normalizedMeetingDate === alertDate) {
      subject.has_today_participation = true
    }
  }

  ;(meetings || []).forEach((meeting) => {
    if (meeting?.leader_name) {
      recordParticipation({ rawName: meeting.leader_name, meetingDate: meeting.date })
    }
  })

  ;(attendeeRows || []).forEach((row) => {
    const meeting = meetingsById.get(row.meeting_id)
    if (!meeting) return
    recordParticipation({ rawName: row.name, meetingDate: meeting.date })
  })

  const alerts = [...subjectMap.values()]
    .filter((subject) => subject.latest_meeting_date && !subject.has_today_participation)
    .map((subject) => ({
      display_name: subject.display_name,
      days_without_meeting: diffDaysBetweenDateOnly(subject.latest_meeting_date, alertDate),
      latest_meeting_date: subject.latest_meeting_date,
    }))
    .filter((alert) => alert.days_without_meeting >= 1)
    .sort((left, right) => right.days_without_meeting - left.days_without_meeting || left.display_name.localeCompare(right.display_name))

  return {
    featureEnabled: true,
    pushEnabled,
    weekend,
    alertDate,
    openCount: alerts.length,
    alerts: alerts.slice(0, 8),
  }
}