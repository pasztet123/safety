import { supabase } from './supabase'

export const ATTENDANCE_RISK_STATUSES = ['open', 'acked', 'resolved']

const uniqueValues = (items) => [...new Set((items || []).filter(Boolean))]

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
  forceRun = true,
} = {}) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Missing session token for attendance risk evaluation.')
  }

  const { data, error } = await supabase.functions.invoke('attendance-risk-evaluator', {
    body: {
      sendEmails,
      forceRun,
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
}