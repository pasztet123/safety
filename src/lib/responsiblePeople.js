const RESPONSIBLE_LEADER_PREFIX = 'leader:'

const compareNames = (left, right) => (
  (left || '').localeCompare(right || '', 'pl', { sensitivity: 'base' })
)

const normalizeName = (value) => (value || '').trim().toLowerCase()

export const buildResponsiblePersonOptions = ({ involvedPersons = [], leaders = [] }) => {
  const linkedLeaderIds = new Set(involvedPersons.map(person => person.leader_id).filter(Boolean))

  return [
    ...involvedPersons.map(person => ({
      value: person.id,
      label: person.name,
    })),
    ...leaders
      .filter(leader => !linkedLeaderIds.has(leader.id))
      .map(leader => ({
        value: `${RESPONSIBLE_LEADER_PREFIX}${leader.id}`,
        label: leader.name,
      })),
  ].sort((left, right) => compareNames(left.label, right.label))
}

export const mergeResponsiblePerson = (persons = [], nextPerson) => {
  if (!nextPerson) return persons

  const merged = [
    ...persons.filter(person => person.id !== nextPerson.id),
    nextPerson,
  ]

  return merged.sort((left, right) => compareNames(left.name, right.name))
}

export const resolveResponsiblePersonId = async ({
  selectedValue,
  involvedPersons = [],
  leaders = [],
  supabase,
}) => {
  if (!selectedValue) {
    return { responsiblePersonId: null, syncedPerson: null }
  }

  if (!selectedValue.startsWith(RESPONSIBLE_LEADER_PREFIX)) {
    return { responsiblePersonId: selectedValue, syncedPerson: null }
  }

  const leaderId = selectedValue.slice(RESPONSIBLE_LEADER_PREFIX.length)
  const linkedPerson = involvedPersons.find(person => person.leader_id === leaderId)
  if (linkedPerson) {
    return { responsiblePersonId: linkedPerson.id, syncedPerson: null }
  }

  const leader = leaders.find(person => person.id === leaderId)
  if (!leader) {
    return { responsiblePersonId: null, syncedPerson: null }
  }

  const nameMatch = involvedPersons.find(person => (
    !person.leader_id && normalizeName(person.name) === normalizeName(leader.name)
  ))

  if (nameMatch) {
    const { data, error } = await supabase
      .from('involved_persons')
      .update({ leader_id: leaderId })
      .eq('id', nameMatch.id)
      .select('id, name, leader_id')
      .single()

    if (error) throw error

    return {
      responsiblePersonId: data.id,
      syncedPerson: data,
    }
  }

  const { data, error } = await supabase
    .from('involved_persons')
    .insert({
      name: leader.name,
      leader_id: leader.id,
    })
    .select('id, name, leader_id')
    .single()

  if (error) throw error

  return {
    responsiblePersonId: data.id,
    syncedPerson: data,
  }
}