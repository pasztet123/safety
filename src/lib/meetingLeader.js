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
    return {
      leaderId: directLeader?.id || '',
      leaderName: attendee.name,
      leaderDefaultSignature: directLeader?.default_signature_url || null,
      isSelfTraining: true,
      resolution: directLeader ? 'self-training-direct-match' : 'self-training-attendee',
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