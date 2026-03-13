import { fetchAllPages, supabase } from './supabase'

const cleanValue = (value) => (typeof value === 'string' ? value.trim() : '')

const uniqueValues = (items) => [...new Set((items || []).filter(Boolean))]

const isValidDateValue = (value) => {
  if (!value) return false
  return !Number.isNaN(new Date(value).getTime())
}

const normalizeMeetingTime = (value) => {
  const timeValue = cleanValue(value)
  if (!timeValue) return '12:00:00'

  if (/^\d{2}:\d{2}:\d{2}$/.test(timeValue)) return timeValue
  if (/^\d{2}:\d{2}$/.test(timeValue)) return `${timeValue}:00`

  const parsed = new Date(`1970-01-01T${timeValue}`)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toTimeString().slice(0, 8)
  }

  const spaced = timeValue.replace(/([ap]m)$/i, ' $1')
  const reparsed = new Date(`1970-01-01 ${spaced}`)
  if (!Number.isNaN(reparsed.getTime())) {
    return reparsed.toTimeString().slice(0, 8)
  }

  return '12:00:00'
}

const maxByTimestamp = (timestamps) => timestamps.reduce((latest, current) => {
  if (!current) return latest
  if (!isValidDateValue(current)) return latest
  if (!latest) return current
  if (!isValidDateValue(latest)) return current
  return new Date(current).getTime() > new Date(latest).getTime() ? current : latest
}, null)

export const normalizePersonProfileName = (value) => cleanValue(value).replace(/\s+/g, ' ').toLowerCase()

export const buildMeetingTimestamp = (date, time) => {
  if (!date) return null
  const safeTime = normalizeMeetingTime(time)
  const timestamp = `${date}T${safeTime}`
  return isValidDateValue(timestamp) ? timestamp : `${date}T12:00:00`
}

export const formatElapsedSince = (timestamp) => {
  if (!timestamp || !isValidDateValue(timestamp)) return 'unknown'

  const diff = Math.max(0, Date.now() - new Date(timestamp).getTime())
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (hours < 24) {
    return `${hours}h`
  }

  return `${days}d ${hours % 24}h`
}

const getProfileValuesFromSource = ({ sourceRecord, currentProfile, fallbackName }) => ({
  display_name: cleanValue(sourceRecord?.name) || cleanValue(currentProfile?.display_name) || cleanValue(fallbackName),
  normalized_name:
    normalizePersonProfileName(sourceRecord?.name) ||
    normalizePersonProfileName(currentProfile?.display_name) ||
    normalizePersonProfileName(fallbackName),
  email: cleanValue(sourceRecord?.email) || cleanValue(currentProfile?.email) || null,
  phone: cleanValue(sourceRecord?.phone) || cleanValue(currentProfile?.phone) || null,
  default_signature_url:
    cleanValue(sourceRecord?.default_signature_url) ||
    cleanValue(currentProfile?.default_signature_url) ||
    null,
})

const fetchSingleRow = async (table, select, id) => {
  if (!id) return null

  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

const getUserContactInvokeErrorMessage = async (error) => {
  const context = error?.context
  if (context && typeof context.json === 'function') {
    try {
      const body = await context.json()
      if (cleanValue(body?.error)) {
        return cleanValue(body.error)
      }
    } catch {
      // Fall through to generic handling when the edge function response is not JSON.
    }
  }

  const message = cleanValue(error?.message)
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('failed to fetch') ||
    normalizedMessage.includes('failed to send a request') ||
    normalizedMessage.includes('networkerror')
  ) {
    return 'Unable to reach the admin contact update service. Check the Supabase edge function deployment or network access, then try again.'
  }

  return message || 'Unable to update linked user record.'
}

const callAdminUpdateUserContact = async (payload) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Missing session token for admin user update.')
  }

  const { data, error } = await supabase.functions.invoke('admin-update-user-contact', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error) {
    throw new Error(await getUserContactInvokeErrorMessage(error))
  }

  if (cleanValue(data?.error)) {
    throw new Error(cleanValue(data.error))
  }

  return data
}

export const fetchPersonLinkCandidates = async () => {
  const [
    usersData,
    leadersData,
    involvedPersonsData,
    profilesRes,
    aliasesRes,
    attendeeRows,
    leaderMeetingRows,
  ] = await Promise.all([
    supabase
      .from('users')
      .select('id, name, email, default_signature_url, person_profile_id, deleted_at')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('leaders')
      .select('id, name, email, phone, default_signature_url, person_profile_id, deleted_at')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('involved_persons')
      .select('id, name, email, phone, default_signature_url, person_profile_id, deleted_at')
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('person_profiles')
      .select('*'),
    supabase
      .from('person_profile_name_aliases')
      .select('person_profile_id, display_name, normalized_name'),
    fetchAllPages(() => supabase
      .from('meeting_attendees')
      .select('id, name, meeting:meetings(date, time, is_draft, deleted_at)')),
    fetchAllPages(() => supabase
      .from('meetings')
      .select('leader_id, date, time')
      .eq('is_draft', false)
      .is('deleted_at', null)
      .not('leader_id', 'is', null)),
  ])

  if (usersData.error) throw usersData.error
  if (leadersData.error) throw leadersData.error
  if (involvedPersonsData.error) throw involvedPersonsData.error
  if (profilesRes.error) throw profilesRes.error
  if (aliasesRes.error) throw aliasesRes.error

  const profilesById = Object.fromEntries((profilesRes.data || []).map((profile) => [profile.id, profile]))
  const groups = new Map()
  const leaderMeetingStats = {}

  ;(leaderMeetingRows || []).forEach((meeting) => {
    if (!meeting?.leader_id) return

    const timestamp = buildMeetingTimestamp(meeting.date, meeting.time)
    const current = leaderMeetingStats[meeting.leader_id] || { count: 0, lastMeetingAt: null }
    current.count += 1
    current.lastMeetingAt = maxByTimestamp([current.lastMeetingAt, timestamp])
    leaderMeetingStats[meeting.leader_id] = current
  })

  const ensureGroup = (nameValue) => {
    const normalizedName = normalizePersonProfileName(nameValue)
    if (!normalizedName) return null

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, {
        normalizedName,
        displayName: cleanValue(nameValue),
        users: [],
        leaders: [],
        involvedPersons: [],
        attendee: { count: 0, lastMeetingAt: null, variants: [] },
        aliasProfileIds: [],
      })
    }

    const existing = groups.get(normalizedName)
    if (!existing.displayName && cleanValue(nameValue)) {
      existing.displayName = cleanValue(nameValue)
    }
    return existing
  }

  ;(usersData.data || []).forEach((user) => {
    const group = ensureGroup(user.name)
    if (group) group.users.push(user)
  })

  ;(leadersData.data || []).forEach((leader) => {
    const group = ensureGroup(leader.name)
    if (!group) return

    const stats = leaderMeetingStats[leader.id] || { count: 0, lastMeetingAt: null }
    group.leaders.push({
      ...leader,
      _meetingCount: stats.count,
      _lastMeetingAt: stats.lastMeetingAt,
    })
  })

  ;(involvedPersonsData.data || []).forEach((person) => {
    const group = ensureGroup(person.name)
    if (group) group.involvedPersons.push(person)
  })

  ;(attendeeRows || []).forEach((row) => {
    const meeting = row?.meeting
    if (!meeting || meeting.is_draft || meeting.deleted_at) return

    const group = ensureGroup(row.name)
    if (!group) return

    const timestamp = buildMeetingTimestamp(meeting.date, meeting.time)
    group.attendee.count += 1
    group.attendee.lastMeetingAt = maxByTimestamp([group.attendee.lastMeetingAt, timestamp])
    if (cleanValue(row.name) && !group.attendee.variants.includes(cleanValue(row.name))) {
      group.attendee.variants.push(cleanValue(row.name))
    }
  })

  ;(aliasesRes.data || []).forEach((alias) => {
    const group = ensureGroup(alias.display_name || alias.normalized_name)
    if (!group) return
    group.aliasProfileIds.push(alias.person_profile_id)
    if (cleanValue(alias.display_name) && !group.attendee.variants.includes(cleanValue(alias.display_name))) {
      group.attendee.variants.push(cleanValue(alias.display_name))
    }
  })

  return [...groups.values()]
    .map((group) => {
      const linkedProfileIds = uniqueValues([
        ...group.users.map((user) => user.person_profile_id),
        ...group.leaders.map((leader) => leader.person_profile_id),
        ...group.involvedPersons.map((person) => person.person_profile_id),
        ...group.aliasProfileIds,
      ])
      const linkedProfiles = linkedProfileIds.map((profileId) => profilesById[profileId]).filter(Boolean)
      const currentProfile = linkedProfiles.length === 1 ? linkedProfiles[0] : null
      const lastLeaderMeetingAt = maxByTimestamp(group.leaders.map((leader) => leader._lastMeetingAt))
      const totalMeetingCount =
        group.attendee.count + group.leaders.reduce((count, leader) => count + (leader._meetingCount || 0), 0)
      const overallLastMeetingAt = maxByTimestamp([group.attendee.lastMeetingAt, lastLeaderMeetingAt])
      const needsReview = Boolean(group.users.length && (group.leaders.length || group.involvedPersons.length || group.attendee.count))

      return {
        ...group,
        linkedProfileIds,
        linkedProfiles,
        currentProfile,
        hasConflict: linkedProfiles.length > 1,
        needsReview,
        totalMeetingCount,
        overallLastMeetingAt,
      }
    })
    .filter((group) => group.needsReview || group.linkedProfileIds.length > 0)
    .sort((left, right) => {
      if (left.hasConflict !== right.hasConflict) return left.hasConflict ? -1 : 1
      if (left.needsReview !== right.needsReview) return left.needsReview ? -1 : 1

      const leftTs = left.overallLastMeetingAt ? new Date(left.overallLastMeetingAt).getTime() : 0
      const rightTs = right.overallLastMeetingAt ? new Date(right.overallLastMeetingAt).getTime() : 0
      if (rightTs !== leftTs) return rightTs - leftTs

      return left.displayName.localeCompare(right.displayName, 'en', { sensitivity: 'base' })
    })
}

export const syncPersonProfileToLinkedRecords = async (profileId) => {
  if (!profileId) throw new Error('Missing person profile id for sync.')

  const [{ data: profile, error: profileError }, usersRes, leadersRes, personsRes] = await Promise.all([
    supabase.from('person_profiles').select('*').eq('id', profileId).single(),
    supabase.from('users').select('id, email, default_signature_url').eq('person_profile_id', profileId),
    supabase.from('leaders').select('id').eq('person_profile_id', profileId),
    supabase.from('involved_persons').select('id').eq('person_profile_id', profileId),
  ])

  if (profileError) throw profileError
  if (usersRes.error) throw usersRes.error
  if (leadersRes.error) throw leadersRes.error
  if (personsRes.error) throw personsRes.error

  await Promise.all((usersRes.data || []).map((user) => callAdminUpdateUserContact({
    userId: user.id,
    person_profile_id: profileId,
    ...(profile.email ? { email: profile.email } : {}),
    ...(profile.default_signature_url ? { default_signature_url: profile.default_signature_url } : {}),
  })))

  const leaderUpdates = { person_profile_id: profileId }
  if (profile.email) leaderUpdates.email = profile.email
  if (profile.phone) leaderUpdates.phone = profile.phone
  if (profile.default_signature_url) leaderUpdates.default_signature_url = profile.default_signature_url

  const involvedPersonUpdates = { person_profile_id: profileId }
  if (profile.email) involvedPersonUpdates.email = profile.email
  if (profile.phone) involvedPersonUpdates.phone = profile.phone
  if (profile.default_signature_url) involvedPersonUpdates.default_signature_url = profile.default_signature_url

  if ((leadersRes.data || []).length > 0) {
    const { error } = await supabase
      .from('leaders')
      .update(leaderUpdates)
      .in('id', leadersRes.data.map((leader) => leader.id))

    if (error) throw error
  }

  if ((personsRes.data || []).length > 0) {
    const { error } = await supabase
      .from('involved_persons')
      .update(involvedPersonUpdates)
      .in('id', personsRes.data.map((person) => person.id))

    if (error) throw error
  }

  return profile
}

export const savePersonLink = async ({
  selectedUserId,
  selectedLeaderId,
  selectedInvolvedPersonId,
  currentProfileId,
  attendeeNames = [],
  fallbackName,
  sourceType,
  sharedEmail,
  sharedPhone,
  sharedSignatureUrl,
}) => {
  const [user, leader, involvedPerson] = await Promise.all([
    fetchSingleRow('users', 'id, name, email, default_signature_url, person_profile_id', selectedUserId),
    fetchSingleRow('leaders', 'id, name, email, phone, default_signature_url, person_profile_id', selectedLeaderId),
    fetchSingleRow('involved_persons', 'id, name, email, phone, default_signature_url, person_profile_id', selectedInvolvedPersonId),
  ])

  const currentProfile = currentProfileId
    ? await fetchSingleRow('person_profiles', '*', currentProfileId)
    : null

  const sourceRecord =
    (sourceType === 'user' && user) ||
    (sourceType === 'leader' && leader) ||
    (sourceType === 'worker' && involvedPerson) ||
    (sourceType === 'profile' && currentProfile) ||
    currentProfile ||
    null

  const profileIds = uniqueValues([
    currentProfileId,
    user?.person_profile_id,
    leader?.person_profile_id,
    involvedPerson?.person_profile_id,
  ])

  if (profileIds.length > 1) {
    throw new Error('Selected records are already linked to different shared profiles.')
  }

  const profileValues = getProfileValuesFromSource({
    sourceRecord,
    currentProfile,
    fallbackName,
  })

  if (typeof sharedEmail === 'string') {
    profileValues.email = cleanValue(sharedEmail) || null
  }
  if (typeof sharedPhone === 'string') {
    profileValues.phone = cleanValue(sharedPhone) || null
  }
  if (typeof sharedSignatureUrl === 'string') {
    profileValues.default_signature_url = cleanValue(sharedSignatureUrl) || null
  }

  if (!profileValues.display_name || !profileValues.normalized_name) {
    throw new Error('A shared profile needs at least a valid name.')
  }

  let profileId = profileIds[0] || null
  if (profileId) {
    const { error } = await supabase
      .from('person_profiles')
      .update(profileValues)
      .eq('id', profileId)

    if (error) throw error
  } else {
    const { data, error } = await supabase
      .from('person_profiles')
      .insert([profileValues])
      .select('*')
      .single()

    if (error) throw error
    profileId = data.id
  }

  if (selectedUserId) {
    await callAdminUpdateUserContact({
      userId: selectedUserId,
      person_profile_id: profileId,
      ...(profileValues.email ? { email: profileValues.email } : {}),
      ...(profileValues.default_signature_url ? { default_signature_url: profileValues.default_signature_url } : {}),
    })
  }

  if (selectedLeaderId) {
    const leaderUpdates = { person_profile_id: profileId }
    if (profileValues.email) leaderUpdates.email = profileValues.email
    if (profileValues.phone) leaderUpdates.phone = profileValues.phone
    if (profileValues.default_signature_url) leaderUpdates.default_signature_url = profileValues.default_signature_url

    const { error } = await supabase
      .from('leaders')
      .update(leaderUpdates)
      .eq('id', selectedLeaderId)

    if (error) throw error
  }

  if (selectedInvolvedPersonId) {
    const involvedUpdates = { person_profile_id: profileId }
    if (profileValues.email) involvedUpdates.email = profileValues.email
    if (profileValues.phone) involvedUpdates.phone = profileValues.phone
    if (profileValues.default_signature_url) involvedUpdates.default_signature_url = profileValues.default_signature_url

    const { error } = await supabase
      .from('involved_persons')
      .update(involvedUpdates)
      .eq('id', selectedInvolvedPersonId)

    if (error) throw error
  }

  const aliasRows = uniqueValues([
    fallbackName,
    user?.name,
    leader?.name,
    involvedPerson?.name,
    ...attendeeNames,
  ])
    .map((displayName) => ({
      person_profile_id: profileId,
      display_name: displayName,
      normalized_name: normalizePersonProfileName(displayName),
    }))
    .filter((row) => row.display_name && row.normalized_name)

  if (aliasRows.length > 0) {
    const { error } = await supabase
      .from('person_profile_name_aliases')
      .upsert(aliasRows, { onConflict: 'person_profile_id,normalized_name' })

    if (error) throw error
  }

  await syncPersonProfileToLinkedRecords(profileId)
  return profileId
}

export const getToolboxMeetingReminderForCurrentUser = async (userId) => {
  if (!userId) return null

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, person_profile_id')
    .eq('id', userId)
    .maybeSingle()

  if (userError) throw userError
  if (!user?.person_profile_id) return null

  const [profileRes, aliasRes, leadersRes] = await Promise.all([
    supabase.from('person_profiles').select('*').eq('id', user.person_profile_id).single(),
    supabase.from('person_profile_name_aliases').select('display_name, normalized_name').eq('person_profile_id', user.person_profile_id),
    supabase.from('leaders').select('id').eq('person_profile_id', user.person_profile_id),
  ])

  if (profileRes.error) throw profileRes.error
  if (aliasRes.error) throw aliasRes.error
  if (leadersRes.error) throw leadersRes.error

  const aliasDisplayNames = uniqueValues([
    user.name,
    profileRes.data?.display_name,
    ...(aliasRes.data || []).map((alias) => alias.display_name),
  ])
  const aliasKeys = new Set(uniqueValues([
    normalizePersonProfileName(user.name),
    normalizePersonProfileName(profileRes.data?.display_name),
    ...(aliasRes.data || []).map((alias) => alias.normalized_name),
  ]))

  const attendeeRows = aliasDisplayNames.length > 0
    ? await fetchAllPages(() => supabase
        .from('meeting_attendees')
        .select('name, meeting:meetings(date, time, is_draft, deleted_at)')
        .in('name', aliasDisplayNames))
    : []

  const attendeeTimestamps = (attendeeRows || [])
    .filter((row) => {
      const meeting = row?.meeting
      if (!meeting || meeting.is_draft || meeting.deleted_at) return false
      return aliasKeys.has(normalizePersonProfileName(row.name))
    })
    .map((row) => buildMeetingTimestamp(row.meeting.date, row.meeting.time))

  const leaderIds = (leadersRes.data || []).map((leader) => leader.id)
  const leaderMeetings = leaderIds.length > 0
    ? await fetchAllPages(() => supabase
        .from('meetings')
        .select('date, time')
        .eq('is_draft', false)
        .is('deleted_at', null)
        .in('leader_id', leaderIds))
    : []

  const leaderTimestamps = (leaderMeetings || []).map((meeting) => buildMeetingTimestamp(meeting.date, meeting.time))
  const latestMeetingAt = maxByTimestamp([...attendeeTimestamps, ...leaderTimestamps])
  const hoursSinceLastMeeting = latestMeetingAt
    ? Math.floor((Date.now() - new Date(latestMeetingAt).getTime()) / 3600000)
    : null

  return {
    profileId: user.person_profile_id,
    displayName: profileRes.data?.display_name || user.name,
    latestMeetingAt,
    hoursSinceLastMeeting,
    shouldRemind: latestMeetingAt ? hoursSinceLastMeeting > 24 : true,
    meetingCount: attendeeTimestamps.length + leaderTimestamps.length,
  }
}