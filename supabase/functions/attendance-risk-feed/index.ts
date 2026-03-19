import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_SETTINGS_DEFAULTS = {
  timezone: 'America/Chicago',
  attendance_risk_notifications_enabled: false,
  attendance_risk_push_enabled: false,
}

const cleanValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const pad = (value: number | string) => String(value).padStart(2, '0')

const getZonedParts = (value: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  })

  const parts = formatter.formatToParts(value)
  const entries = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(entries.year),
    month: Number(entries.month),
    day: Number(entries.day),
    weekday: entries.weekday,
  }
}

const getCurrentDateInTimeZone = (timeZone: string, value = new Date()) => {
  const parts = getZonedParts(value, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

const isWeekendInTimeZone = (timeZone: string, value = new Date()) => {
  const weekday = getZonedParts(value, timeZone).weekday
  return weekday === 'Sat' || weekday === 'Sun'
}

const parseDateOnly = (value: string) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

const dateOnlyToUtcDate = (value: string) => {
  const parts = parseDateOnly(value)
  if (!parts) return null
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0))
}

const addDaysToDateOnly = (value: string, days: number) => {
  const baseDate = dateOnlyToUtcDate(value)
  if (!baseDate) return value
  baseDate.setUTCDate(baseDate.getUTCDate() + days)
  return `${baseDate.getUTCFullYear()}-${pad(baseDate.getUTCMonth() + 1)}-${pad(baseDate.getUTCDate())}`
}

const diffDaysBetweenDateOnly = (fromValue: string, toValue: string) => {
  const fromDate = dateOnlyToUtcDate(fromValue)
  const toDate = dateOnlyToUtcDate(toValue)
  if (!fromDate || !toDate) return 0
  return Math.max(0, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000))
}

const normalizeName = (value: unknown) => cleanValue(value).replace(/\s+/g, ' ').toLowerCase()

const buildRawAttendanceRiskFeed = ({
  meetings,
  attendeeRows,
  alertDate,
  windowStartDate,
}: {
  meetings: Array<{ id: string, date: string, time: string | null, leader_name: string | null }>
  attendeeRows: Array<{ meeting_id: string, name: string }>
  alertDate: string
  windowStartDate: string
}) => {
  const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
  const subjectMap = new Map<string, {
    display_name: string
    normalized_name: string
    latest_meeting_date: string | null
    has_today_participation: boolean
  }>()

  const recordParticipation = ({ rawName, meetingDate }: { rawName: string, meetingDate: string }) => {
    const displayName = cleanValue(rawName)
    const normalizedName = normalizeName(displayName)
    if (!displayName || !normalizedName) return
    if (!meetingDate || meetingDate < windowStartDate || meetingDate > alertDate) return

    if (!subjectMap.has(normalizedName)) {
      subjectMap.set(normalizedName, {
        display_name: displayName,
        normalized_name: normalizedName,
        latest_meeting_date: null,
        has_today_participation: false,
      })
    }

    const subject = subjectMap.get(normalizedName)!
    if (!subject.latest_meeting_date || meetingDate > subject.latest_meeting_date) {
      subject.latest_meeting_date = meetingDate
    }
    if (meetingDate === alertDate) {
      subject.has_today_participation = true
    }
  }

  meetings.forEach((meeting) => {
    if (cleanValue(meeting.leader_name)) {
      recordParticipation({ rawName: cleanValue(meeting.leader_name), meetingDate: meeting.date })
    }
  })

  attendeeRows.forEach((row) => {
    const meeting = meetingsById.get(row.meeting_id)
    if (!meeting) return
    recordParticipation({ rawName: cleanValue(row.name), meetingDate: meeting.date })
  })

  const alerts = [...subjectMap.values()]
    .filter((subject) => subject.latest_meeting_date && !subject.has_today_participation)
    .map((subject) => ({
      display_name: subject.display_name,
      days_without_meeting: diffDaysBetweenDateOnly(subject.latest_meeting_date!, alertDate),
      latest_meeting_date: subject.latest_meeting_date,
    }))
    .filter((alert) => alert.days_without_meeting >= 1)
    .sort((left, right) => right.days_without_meeting - left.days_without_meeting || left.display_name.localeCompare(right.display_name))

  return alerts
}

const authenticateRequest = async (req: Request, supabaseAdmin: ReturnType<typeof createClient>) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Authorization header.')
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !authData.user) {
    throw new Error('Unauthorized request.')
  }

  const { data: userRow, error: userError } = await supabaseAdmin
    .from('users')
    .select('id, deleted_at')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (userError) throw userError
  if (!userRow || userRow.deleted_at) {
    throw new Error('Forbidden: inactive user.')
  }

  return authData.user.id
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  try {
    await authenticateRequest(req, supabaseAdmin)

    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from('app_settings')
      .select('timezone, attendance_risk_notifications_enabled, attendance_risk_push_enabled')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError) throw settingsError

    const settings = {
      ...APP_SETTINGS_DEFAULTS,
      ...(settingsRow || {}),
    }

    const timeZone = cleanValue(settings.timezone) || APP_SETTINGS_DEFAULTS.timezone
    const alertDate = getCurrentDateInTimeZone(timeZone)
    const windowStartDate = addDaysToDateOnly(alertDate, -7)
    const weekend = isWeekendInTimeZone(timeZone)
    const featureEnabled = Boolean(settings.attendance_risk_notifications_enabled)

    if (!featureEnabled) {
      return new Response(JSON.stringify({
        featureEnabled: false,
        pushEnabled: Boolean(settings.attendance_risk_push_enabled),
        weekend,
        alertDate,
        openCount: 0,
        alerts: [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: meetings, error: meetingsError } = await supabaseAdmin
      .from('meetings')
      .select('id, date, time, leader_name')
      .not('is_draft', 'is', true)
      .is('deleted_at', null)
      .gte('date', windowStartDate)
      .lte('date', alertDate)
      .order('date', { ascending: false })

    if (meetingsError) throw meetingsError

    const meetingIds = (meetings || []).map((meeting) => meeting.id)
    const attendeeRows = meetingIds.length === 0
      ? []
      : await supabaseAdmin
          .from('meeting_attendees')
          .select('meeting_id, name')
          .in('meeting_id', meetingIds)

    if (attendeeRows.error) throw attendeeRows.error

    const computedAlerts = buildRawAttendanceRiskFeed({
      meetings: meetings || [],
      attendeeRows: attendeeRows.data || [],
      alertDate,
      windowStartDate,
    })

    return new Response(JSON.stringify({
      featureEnabled: true,
      pushEnabled: Boolean(settings.attendance_risk_push_enabled),
      weekend,
      alertDate,
      openCount: computedAlerts.length,
      alerts: computedAlerts.slice(0, 8),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown attendance risk feed error.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})