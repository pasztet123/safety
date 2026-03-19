import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-attendance-risk-secret',
}

const APP_SETTINGS_DEFAULTS = {
  timezone: 'America/Chicago',
  attendance_risk_notifications_enabled: false,
  attendance_risk_email_enabled: true,
  attendance_risk_in_app_enabled: true,
  attendance_risk_run_hour: 10,
}

const uniqueValues = <T,>(items: T[] = []) => [...new Set(items.filter(Boolean))]

const cleanValue = (value: unknown) => (typeof value === 'string' ? value.trim() : '')

const normalizeName = (value: unknown) => cleanValue(value).replace(/\s+/g, ' ').toLowerCase()

const pad = (value: number | string) => String(value).padStart(2, '0')

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

const getZonedParts = (value: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(value)
  const entries = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    year: Number(entries.year),
    month: Number(entries.month),
    day: Number(entries.day),
    hour: Number(entries.hour),
    minute: Number(entries.minute),
    second: Number(entries.second),
    weekday: entries.weekday,
  }
}

const getCurrentDateInTimeZone = (timeZone: string, value = new Date()) => {
  const parts = getZonedParts(value, timeZone)
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

const getCurrentHourInTimeZone = (timeZone: string, value = new Date()) => getZonedParts(value, timeZone).hour

const isWeekendInTimeZone = (timeZone: string, value = new Date()) => {
  const weekday = getZonedParts(value, timeZone).weekday
  return weekday === 'Sat' || weekday === 'Sun'
}

const normalizeMeetingTime = (value: unknown) => {
  const timeValue = cleanValue(value)
  if (!timeValue) return '12:00:00'
  if (/^\d{2}:\d{2}:\d{2}$/.test(timeValue)) return timeValue
  if (/^\d{2}:\d{2}$/.test(timeValue)) return `${timeValue}:00`
  return '12:00:00'
}

const buildMeetingTimestamp = (date: string, time: unknown) => {
  if (!date) return null
  return `${date}T${normalizeMeetingTime(time)}`
}

const fetchAllPages = async <T,>(queryFactory: () => any, pageSize = 1000): Promise<T[]> => {
  const rows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await queryFactory().range(from, from + pageSize - 1)
    if (error) throw error
    if (!data?.length) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

const authenticateRequest = async (req: Request, supabaseAdmin: ReturnType<typeof createClient>) => {
  const sharedSecret = cleanValue(req.headers.get('x-attendance-risk-secret'))
  const expectedSecret = cleanValue(Deno.env.get('ATTENDANCE_RISK_CRON_SECRET'))

  if (sharedSecret && expectedSecret && sharedSecret === expectedSecret) {
    return { mode: 'cron', actorUserId: null, actorEmail: null }
  }

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
    .select('id, email, is_admin, deleted_at')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (userError) throw userError
  if (!userRow?.is_admin || userRow.deleted_at) {
    throw new Error('Forbidden: admin access required.')
  }

  return {
    mode: 'admin',
    actorUserId: userRow.id,
    actorEmail: userRow.email || authData.user.email || null,
  }
}

const insertAuditEvent = async ({
  supabaseAdmin,
  actorUserId,
  actorEmail,
  eventType,
  metadata,
}: {
  supabaseAdmin: ReturnType<typeof createClient>
  actorUserId: string | null
  actorEmail: string | null
  eventType: string
  metadata: Record<string, unknown>
}) => {
  const { error } = await supabaseAdmin.from('audit_events').insert([{
    event_type: eventType,
    table_name: 'meeting_attendance_risk_alerts',
    record_id: null,
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    metadata,
  }])

  if (error) {
    console.error('Attendance risk audit insert error:', error)
  }
}

const buildDigestHtml = ({
  alertDate,
  alerts,
  appBaseUrl,
}: {
  alertDate: string
  alerts: Array<Record<string, unknown>>
  appBaseUrl: string
}) => {
  const baseUrl = cleanValue(appBaseUrl)
  const adminUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/admin/attendance-risk` : ''
  const rows = alerts
    .map((alert) => {
      const displayName = cleanValue(alert.display_name)
      const daysWithoutMeeting = Number(alert.days_without_meeting || 0)
      return `<li><strong>${displayName}</strong> — ${daysWithoutMeeting} day${daysWithoutMeeting === 1 ? '' : 's'} without a toolbox meeting</li>`
    })
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
      <h2 style="margin:0 0 12px 0">Attendance Risk Alerts</h2>
      <p style="margin:0 0 16px 0">The following workers participated in a toolbox meeting within the last 7 calendar days but are not recorded today (${alertDate}).</p>
      <ul style="padding-left:20px;margin:0 0 18px 0">${rows}</ul>
      ${adminUrl ? `<p style="margin:0"><a href="${adminUrl}" style="color:#1d4ed8">Open the admin attendance risk panel</a></p>` : ''}
    </div>
  `
}

const buildDigestText = ({
  alertDate,
  alerts,
  appBaseUrl,
}: {
  alertDate: string
  alerts: Array<Record<string, unknown>>
  appBaseUrl: string
}) => {
  const baseUrl = cleanValue(appBaseUrl)
  const adminUrl = baseUrl ? `${baseUrl.replace(/\/$/, '')}/admin/attendance-risk` : ''
  const lines = alerts.map((alert) => {
    const displayName = cleanValue(alert.display_name)
    const daysWithoutMeeting = Number(alert.days_without_meeting || 0)
    return `- ${displayName}: ${daysWithoutMeeting} day${daysWithoutMeeting === 1 ? '' : 's'} without a toolbox meeting`
  })

  return [
    `Attendance risk alerts for ${alertDate}`,
    '',
    'The following workers participated in a toolbox meeting within the last 7 calendar days but are not recorded today:',
    ...lines,
    adminUrl ? ['', `Open admin panel: ${adminUrl}`] : [],
  ].flat().join('\n')
}

const sendMailerSendEmail = async ({
  apiKey,
  fromEmail,
  fromName,
  toEmail,
  toName,
  subject,
  html,
  text,
}: {
  apiKey: string
  fromEmail: string
  fromName: string
  toEmail: string
  toName: string
  subject: string
  html: string
  text: string
}) => {
  const response = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: {
        email: fromEmail,
        name: fromName,
      },
      to: [{
        email: toEmail,
        name: toName || toEmail,
      }],
      subject,
      html,
      text,
    }),
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(responseText || `MailerSend request failed with ${response.status}`)
  }

  return {
    providerMessageId: response.headers.get('x-message-id'),
  }
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
    const auth = await authenticateRequest(req, supabaseAdmin)
    const payload = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const forceRun = Boolean(payload?.forceRun)
    const requestedAlertDate = cleanValue(payload?.alertDate)
    const requestedSendEmails = payload?.sendEmails !== false

    const { data: settingsRow, error: settingsError } = await supabaseAdmin
      .from('app_settings')
      .select('timezone, attendance_risk_notifications_enabled, attendance_risk_email_enabled, attendance_risk_in_app_enabled, attendance_risk_run_hour')
      .eq('id', 1)
      .maybeSingle()

    if (settingsError) throw settingsError

    const settings = {
      ...APP_SETTINGS_DEFAULTS,
      ...(settingsRow || {}),
    }

    const timeZone = cleanValue(settings.timezone) || APP_SETTINGS_DEFAULTS.timezone
    const alertDate = requestedAlertDate || getCurrentDateInTimeZone(timeZone)
    const now = new Date()

    if (isWeekendInTimeZone(timeZone, now)) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'weekend',
        alertDate,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const currentHour = getCurrentHourInTimeZone(timeZone, now)
    if (!forceRun && currentHour !== Number(settings.attendance_risk_run_hour)) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'outside_run_hour',
        configuredHour: settings.attendance_risk_run_hour,
        currentHour,
        alertDate,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!forceRun && !settings.attendance_risk_notifications_enabled) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: 'feature_disabled',
        alertDate,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const windowStartDate = addDaysToDateOnly(alertDate, -7)
    const evaluationRunId = crypto.randomUUID()

    const [
      profiles,
      aliases,
      leaders,
      meetings,
      admins,
      existingAlerts,
    ] = await Promise.all([
      fetchAllPages<{ id: string, display_name: string, normalized_name: string }>(() => supabaseAdmin
        .from('person_profiles')
        .select('id, display_name, normalized_name')
        .order('display_name')),
      fetchAllPages<{ person_profile_id: string, display_name: string, normalized_name: string }>(() => supabaseAdmin
        .from('person_profile_name_aliases')
        .select('person_profile_id, display_name, normalized_name')),
      fetchAllPages<{ id: string, person_profile_id: string | null, name: string | null }>(() => supabaseAdmin
        .from('leaders')
        .select('id, person_profile_id, name')
        .is('deleted_at', null)),
      fetchAllPages<{ id: string, date: string, time: string | null, leader_id: string | null, leader_name: string | null }>(() => supabaseAdmin
        .from('meetings')
        .select('id, date, time, leader_id, leader_name')
        .eq('is_draft', false)
        .is('deleted_at', null)
        .gte('date', windowStartDate)
        .lte('date', alertDate)
        .order('date', { ascending: false })),
      fetchAllPages<{ id: string, email: string | null, name: string | null }>(() => supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('is_admin', true)
        .is('deleted_at', null)),
      fetchAllPages<any>(() => supabaseAdmin
        .from('meeting_attendance_risk_alerts')
        .select('*')
        .eq('alert_date', alertDate)),
    ])

    const meetingsById = new Map(meetings.map((meeting) => [meeting.id, meeting]))
    const meetingIds = meetings.map((meeting) => meeting.id)
    const attendeeRows = meetingIds.length === 0
      ? []
      : await fetchAllPages<{ meeting_id: string, name: string }>(() => supabaseAdmin
          .from('meeting_attendees')
          .select('meeting_id, name')
          .in('meeting_id', meetingIds))

    const profileMap = new Map<string, { id: string, displayName: string, normalizedName: string }>()
    profiles.forEach((profile) => {
      profileMap.set(profile.id, {
        id: profile.id,
        displayName: cleanValue(profile.display_name) || cleanValue(profile.normalized_name),
        normalizedName: normalizeName(profile.normalized_name || profile.display_name),
      })
    })

    const aliasProfileSets = new Map<string, Set<string>>()
    const registerAlias = (normalizedName: string, profileId: string) => {
      if (!normalizedName || !profileId) return
      if (!aliasProfileSets.has(normalizedName)) aliasProfileSets.set(normalizedName, new Set())
      aliasProfileSets.get(normalizedName)?.add(profileId)
    }

    aliases.forEach((alias) => {
      registerAlias(normalizeName(alias.normalized_name || alias.display_name), alias.person_profile_id)
    })

    profiles.forEach((profile) => {
      registerAlias(normalizeName(profile.normalized_name || profile.display_name), profile.id)
    })

    const aliasUniqueProfileMap = new Map<string, string>()
    aliasProfileSets.forEach((profileIds, normalizedAlias) => {
      const ids = [...profileIds]
      if (ids.length === 1) aliasUniqueProfileMap.set(normalizedAlias, ids[0])
    })

    const leaderMap = new Map(leaders.map((leader) => [leader.id, leader]))
    const subjectMap = new Map<string, any>()

    const ensureSubject = ({
      subjectKey,
      personProfileId = null,
      displayName,
      normalizedName,
    }: {
      subjectKey: string
      personProfileId?: string | null
      displayName: string
      normalizedName: string
    }) => {
      if (!subjectMap.has(subjectKey)) {
        subjectMap.set(subjectKey, {
          subjectKey,
          personProfileId,
          displayName,
          normalizedName,
          latestMeetingAt: null,
          latestMeetingDate: null,
          hasTodayParticipation: false,
        })
      }

      return subjectMap.get(subjectKey)
    }

    const resolveIdentity = (rawName: string, profileId: string | null = null) => {
      const normalizedName = normalizeName(rawName)
      const mappedProfileId = profileId || aliasUniqueProfileMap.get(normalizedName) || null

      if (mappedProfileId && profileMap.has(mappedProfileId)) {
        const profile = profileMap.get(mappedProfileId)!
        return {
          subjectKey: `profile:${mappedProfileId}`,
          personProfileId: mappedProfileId,
          displayName: profile.displayName || cleanValue(rawName),
          normalizedName: profile.normalizedName || normalizedName,
        }
      }

      return {
        subjectKey: `name:${normalizedName}`,
        personProfileId: null,
        displayName: cleanValue(rawName) || normalizedName,
        normalizedName,
      }
    }

    const recordParticipation = ({
      rawName,
      profileId = null,
      meetingDate,
      meetingTime,
    }: {
      rawName: string
      profileId?: string | null
      meetingDate: string
      meetingTime: string | null
    }) => {
      if (!meetingDate || meetingDate < windowStartDate || meetingDate > alertDate) return

      const identity = resolveIdentity(rawName, profileId)
      if (!identity.normalizedName) return

      const subject = ensureSubject({
        subjectKey: identity.subjectKey,
        personProfileId: identity.personProfileId,
        displayName: identity.displayName,
        normalizedName: identity.normalizedName,
      })

      const timestamp = buildMeetingTimestamp(meetingDate, meetingTime)
      if (!subject.latestMeetingAt || (timestamp && new Date(timestamp).getTime() > new Date(subject.latestMeetingAt).getTime())) {
        subject.latestMeetingAt = timestamp
        subject.latestMeetingDate = meetingDate
      }

      if (meetingDate === alertDate) {
        subject.hasTodayParticipation = true
      }
    }

    meetings.forEach((meeting) => {
      if (!meeting.date) return

      if (meeting.leader_id && leaderMap.has(meeting.leader_id)) {
        const leader = leaderMap.get(meeting.leader_id)
        recordParticipation({
          rawName: cleanValue(leader?.name) || cleanValue(meeting.leader_name),
          profileId: leader?.person_profile_id || null,
          meetingDate: meeting.date,
          meetingTime: meeting.time,
        })
      } else if (cleanValue(meeting.leader_name)) {
        recordParticipation({
          rawName: cleanValue(meeting.leader_name),
          meetingDate: meeting.date,
          meetingTime: meeting.time,
        })
      }
    })

    attendeeRows.forEach((row) => {
      const meeting = meetingsById.get(row.meeting_id)
      if (!meeting) return
      if (!meeting.date || meeting.date < windowStartDate || meeting.date > alertDate) return
      if (!cleanValue(row.name)) return

      recordParticipation({
        rawName: cleanValue(row.name),
        meetingDate: meeting.date,
        meetingTime: meeting.time,
      })
    })

    const candidateAlerts = [...subjectMap.values()]
      .filter((subject) => subject.latestMeetingDate && subject.latestMeetingDate >= windowStartDate)
      .filter((subject) => !subject.hasTodayParticipation)
      .map((subject) => ({
        subject_key: subject.subjectKey,
        person_profile_id: subject.personProfileId,
        normalized_name: subject.normalizedName,
        display_name: subject.displayName,
        days_without_meeting: diffDaysBetweenDateOnly(subject.latestMeetingDate, alertDate),
        latest_meeting_at: subject.latestMeetingAt,
        latest_meeting_date: subject.latestMeetingDate,
        evaluation_run_id: evaluationRunId,
      }))
      .filter((alert) => alert.days_without_meeting >= 1)
      .sort((left, right) => right.days_without_meeting - left.days_without_meeting || left.display_name.localeCompare(right.display_name))

    const existingAlertMap = new Map(existingAlerts.map((alert) => [alert.subject_key, alert]))
    const candidateSubjectKeys = new Set(candidateAlerts.map((alert) => alert.subject_key))

    const inserts = []
    const updates = []
    const resolves = []

    candidateAlerts.forEach((candidate) => {
      const existing = existingAlertMap.get(candidate.subject_key)
      if (!existing) {
        inserts.push({
          alert_date: alertDate,
          ...candidate,
          status: 'open',
        })
        return
      }

      updates.push({
        id: existing.id,
        person_profile_id: candidate.person_profile_id,
        normalized_name: candidate.normalized_name,
        display_name: candidate.display_name,
        days_without_meeting: candidate.days_without_meeting,
        latest_meeting_at: candidate.latest_meeting_at,
        latest_meeting_date: candidate.latest_meeting_date,
        evaluation_run_id: evaluationRunId,
        status: existing.status === 'acked' ? 'acked' : 'open',
        resolved_at: null,
        resolved_reason: null,
      })
    })

    existingAlerts.forEach((existing) => {
      if (candidateSubjectKeys.has(existing.subject_key)) return
      if (existing.status === 'resolved') return

      resolves.push({
        id: existing.id,
        status: 'resolved',
        resolved_at: now.toISOString(),
        resolved_reason: 'no_longer_at_risk',
        evaluation_run_id: evaluationRunId,
      })
    })

    if (inserts.length > 0) {
      const { error } = await supabaseAdmin
        .from('meeting_attendance_risk_alerts')
        .insert(inserts)
      if (error) throw error
    }

    for (const updateRow of updates) {
      const { error } = await supabaseAdmin
        .from('meeting_attendance_risk_alerts')
        .update(updateRow)
        .eq('id', updateRow.id)
      if (error) throw error
    }

    for (const resolvedRow of resolves) {
      const { error } = await supabaseAdmin
        .from('meeting_attendance_risk_alerts')
        .update(resolvedRow)
        .eq('id', resolvedRow.id)
      if (error) throw error
    }

    const { data: persistedAlerts, error: persistedAlertsError } = await supabaseAdmin
      .from('meeting_attendance_risk_alerts')
      .select('id, display_name, days_without_meeting, status')
      .eq('alert_date', alertDate)
      .in('status', ['open', 'acked'])
      .order('days_without_meeting', { ascending: false })

    if (persistedAlertsError) throw persistedAlertsError

    let emailDeliveryCount = 0
    const emailEnabled = Boolean(settings.attendance_risk_notifications_enabled && settings.attendance_risk_email_enabled && requestedSendEmails)
    const openAlerts = (persistedAlerts || []).filter((alert) => alert.status === 'open' || alert.status === 'acked')

    if (emailEnabled && openAlerts.length > 0 && admins.length > 0) {
      const mailerSendApiKey = cleanValue(Deno.env.get('MAILERSEND_API_KEY'))
      const mailerSendFromEmail = cleanValue(Deno.env.get('MAILERSEND_FROM_EMAIL'))
      const mailerSendFromName = cleanValue(Deno.env.get('MAILERSEND_FROM_NAME')) || 'Safety Meetings App'
      const appBaseUrl = cleanValue(Deno.env.get('APP_BASE_URL'))

      const deliveryRecords = []
      const subject = `Attendance risk alerts for ${alertDate}`
      const html = buildDigestHtml({ alertDate, alerts: openAlerts, appBaseUrl })
      const text = buildDigestText({ alertDate, alerts: openAlerts, appBaseUrl })
      const alertIds = openAlerts.map((alert) => alert.id)

      for (const admin of admins) {
        const recipientEmail = cleanValue(admin.email)
        if (!recipientEmail) {
          deliveryRecords.push({
            alert_id: null,
            delivery_scope: 'digest',
            channel: 'email',
            recipient_user_id: admin.id,
            recipient_email_snapshot: null,
            status: 'skipped',
            metadata: {
              alert_date: alertDate,
              alert_ids: alertIds,
              reason: 'missing_recipient_email',
            },
          })
          continue
        }

        if (!mailerSendApiKey || !mailerSendFromEmail) {
          deliveryRecords.push({
            alert_id: null,
            delivery_scope: 'digest',
            channel: 'email',
            recipient_user_id: admin.id,
            recipient_email_snapshot: recipientEmail,
            status: 'skipped',
            metadata: {
              alert_date: alertDate,
              alert_ids: alertIds,
              reason: 'missing_mailersend_configuration',
            },
          })
          continue
        }

        try {
          const delivery = await sendMailerSendEmail({
            apiKey: mailerSendApiKey,
            fromEmail: mailerSendFromEmail,
            fromName: mailerSendFromName,
            toEmail: recipientEmail,
            toName: cleanValue(admin.name) || recipientEmail,
            subject,
            html,
            text,
          })

          deliveryRecords.push({
            alert_id: null,
            delivery_scope: 'digest',
            channel: 'email',
            recipient_user_id: admin.id,
            recipient_email_snapshot: recipientEmail,
            provider_message_id: delivery.providerMessageId,
            status: 'sent',
            sent_at: now.toISOString(),
            metadata: {
              alert_date: alertDate,
              alert_ids: alertIds,
              alert_count: alertIds.length,
            },
          })
          emailDeliveryCount += 1
        } catch (deliveryError) {
          deliveryRecords.push({
            alert_id: null,
            delivery_scope: 'digest',
            channel: 'email',
            recipient_user_id: admin.id,
            recipient_email_snapshot: recipientEmail,
            status: 'failed',
            metadata: {
              alert_date: alertDate,
              alert_ids: alertIds,
              reason: deliveryError instanceof Error ? deliveryError.message : 'unknown_delivery_error',
            },
          })
        }
      }

      if (deliveryRecords.length > 0) {
        const { error: deliveriesError } = await supabaseAdmin
          .from('meeting_attendance_risk_deliveries')
          .insert(deliveryRecords)
        if (deliveriesError) throw deliveriesError
      }
    }

    await insertAuditEvent({
      supabaseAdmin,
      actorUserId: auth.actorUserId,
      actorEmail: auth.actorEmail,
      eventType: 'meeting_attendance_risk.evaluated',
      metadata: {
        alert_date: alertDate,
        created_count: inserts.length,
        updated_count: updates.length,
        resolved_count: resolves.length,
        open_count: candidateAlerts.length,
        email_delivery_count: emailDeliveryCount,
        evaluation_run_id: evaluationRunId,
        auth_mode: auth.mode,
      },
    })

    return new Response(JSON.stringify({
      success: true,
      alertDate,
      evaluationRunId,
      createdCount: inserts.length,
      updatedCount: updates.length,
      resolvedCount: resolves.length,
      openCount: candidateAlerts.length,
      emailDeliveryCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Attendance risk evaluator error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown attendance risk evaluator error.',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})