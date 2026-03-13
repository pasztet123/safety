const normalizeDisplayName = (value) => {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/\s+/g, ' ')
}

export const normalizeMeetingPersonName = (value) => normalizeDisplayName(value).toLowerCase()

export const resolveMeetingLeader = ({
  attendees = [],
  leaders = [],
  involvedPersons = [],
  isSelfTraining = attendees.length === 1,
}) => {
  const normalizedAttendees = attendees
    .map((attendee) => {
      const name = normalizeDisplayName(attendee?.name)
      return name
        ? { name, key: normalizeMeetingPersonName(name) }
        : null
    })
    .filter(Boolean)

  if (normalizedAttendees.length === 0) {
    return {
      leaderId: '',
      leaderName: '',
      leaderDefaultSignature: null,
      isSelfTraining: false,
      resolution: 'none',
    }
  }

  const leaderById = {}
  const leaderByName = {}
  leaders.forEach((leader) => {
    leaderById[leader.id] = leader
    const key = normalizeMeetingPersonName(leader.name)
    if (key && !leaderByName[key]) {
      leaderByName[key] = leader
    }
  })

  const personByName = {}
  involvedPersons.forEach((person) => {
    const key = normalizeMeetingPersonName(person.name)
    if (key && !personByName[key]) {
      personByName[key] = person
    }
  })

  const directLeader = normalizedAttendees
    .map((attendee) => leaderByName[attendee.key])
    .find(Boolean)

  const linkedLeader = normalizedAttendees
    .map((attendee) => {
      const person = personByName[attendee.key]
      return person?.leader_id ? leaderById[person.leader_id] : null
    })
    .find(Boolean)

  if (normalizedAttendees.length === 1 && isSelfTraining) {
    const attendee = normalizedAttendees[0]
    const selfTrainingLeader = directLeader || linkedLeader
    return {
      leaderId: selfTrainingLeader?.id || '',
      leaderName: attendee.name,
      leaderDefaultSignature: selfTrainingLeader?.default_signature_url || null,
      isSelfTraining: true,
      resolution: selfTrainingLeader
        ? (directLeader ? 'self-training-direct-match' : 'self-training-linked-leader')
        : 'self-training-attendee',
    }
  }

  const resolvedLeader = directLeader || linkedLeader
  if (resolvedLeader) {
    return {
      leaderId: resolvedLeader.id,
      leaderName: resolvedLeader.name,
      leaderDefaultSignature: resolvedLeader.default_signature_url || null,
      isSelfTraining: false,
      resolution: directLeader ? 'direct-match' : 'linked-leader',
    }
  }

  return {
    leaderId: '',
    leaderName: '',
    leaderDefaultSignature: null,
    isSelfTraining: false,
    resolution: 'none',
  }
}

export const applyResolvedMeetingLeader = ({
  meeting,
  leaders = [],
  involvedPersons = [],
}) => {
  if (!meeting) return meeting

  const attendees = meeting.attendees || []
  const resolution = resolveMeetingLeader({
    attendees,
    leaders,
    involvedPersons,
    isSelfTraining: meeting.is_self_training || attendees.length === 1,
  })

  if (resolution.resolution === 'none') {
    return meeting
  }

  return {
    ...meeting,
    leader_id: resolution.leaderId || meeting.leader_id || '',
    leader_name: resolution.leaderName || meeting.leader_name || '',
    is_self_training: resolution.isSelfTraining,
    signature_url: resolution.leaderDefaultSignature || meeting.signature_url || null,
  }
}