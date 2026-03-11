import { supabase } from './supabase'

export const AUDIT_SUPERADMIN_EMAIL = 'stas@abmdistributing.com'

const UTC_FORMAT_OPTIONS = {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}

export const formatUtcDateTime = (isoString) => {
  const value = new Date(isoString)
  const formatted = value.toLocaleString('en-US', UTC_FORMAT_OPTIONS)
  return `${formatted} UTC`
}

export const isAuditSuperadminEmail = (email) => {
  return String(email || '').trim().toLowerCase() === AUDIT_SUPERADMIN_EMAIL
}

export const generateClientUuid = () => {
  const cryptoApi = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined

  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }

  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)

    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80

    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
    return [
      hex.slice(0, 4).join(''),
      hex.slice(4, 6).join(''),
      hex.slice(6, 8).join(''),
      hex.slice(8, 10).join(''),
      hex.slice(10, 16).join(''),
    ].join('-')
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const randomNibble = Math.floor(Math.random() * 16)
    const value = char === 'x' ? randomNibble : ((randomNibble & 0x3) | 0x8)
    return value.toString(16)
  })
}

export const getCurrentActorProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      userId: null,
      name: null,
      email: null,
      label: 'Unknown user',
    }
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .maybeSingle()

  const name = userRow?.name || user.user_metadata?.name || null
  const email = userRow?.email || user.email || null
  const label = name && email ? `${name} (${email})` : (name || email || 'Unknown user')

  return {
    userId: user.id,
    name,
    email,
    label,
  }
}

export const logAuditEvent = async ({
  eventType,
  tableName = null,
  recordId = null,
  metadata = {},
}) => {
  if (!eventType) return null

  try {
    const { data, error } = await supabase.rpc('record_audit_event', {
      p_event_type: eventType,
      p_table_name: tableName,
      p_record_id: recordId,
      p_metadata: metadata,
    })

    if (error) {
      console.error('Audit log error:', error)
      return null
    }

    return data || null
  } catch (error) {
    console.error('Audit log request failed:', error)
    return null
  }
}

export const createPdfExportContext = async ({
  eventType,
  fileName,
  tableName = null,
  recordId = null,
  metadata = {},
}) => {
  const actor = await getCurrentActorProfile()
  const exportId = generateClientUuid()
  const generatedAtIso = new Date().toISOString()

  await logAuditEvent({
    eventType,
    tableName,
    recordId,
    metadata: {
      export_id: exportId,
      file_name: fileName || null,
      generated_at: generatedAtIso,
      generated_by: actor.label,
      ...metadata,
    },
  })

  return {
    exportId,
    generatedAtIso,
    generatedAtLabel: formatUtcDateTime(generatedAtIso),
    generatedByLabel: actor.label,
    generatedByEmail: actor.email,
    generatedByUserId: actor.userId,
  }
}