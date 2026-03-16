import { getCurrentDateInputValue, getCurrentTimeInputValue } from './dateTime'

export const LEGAL_CONFIRMATION_CLAUSE = 'The information in this document reflects data entered and confirmed by the user identified above. The accuracy and reliability of the information are the sole responsibility of the user and the organization operating the system.'

export const MEETING_TOPIC_ATTESTATION_CLAUSE = 'Organizer of this toolbox meeting attests that the training delivered during this meeting was materially consistent with the selected safety topic. The training content does not need to match the topic description word-for-word, provided that the purpose of the training, its jobsite-specific focus, and the hazards, issues, or safety problems discussed substantially align with the selected topic.'

export const BULK_MEETING_TOPIC_ATTESTATION_CLAUSE = 'Organizers of the toolbox meetings attest that the trainings delivered during those meetings were materially consistent with the selected safety topics. The training content does not need to match the topic descriptions word-for-word, provided that the purpose of each training, its jobsite-specific focus, and the hazards, issues, or safety problems discussed substantially align with the selected topic for the relevant meeting.'

export const JURISDICTION_WARNING_MESSAGE = 'Before accepting this meeting, you must ensure that your actions comply with the laws and recordkeeping requirements applicable in your jurisdiction.'

export const getMeetingTopicAttestationClause = ({ plural = false } = {}) => (
  plural ? BULK_MEETING_TOPIC_ATTESTATION_CLAUSE : MEETING_TOPIC_ATTESTATION_CLAUSE
)

export const getLocalDateString = (value = new Date()) => (
  getCurrentDateInputValue({ value })
)

export const getLocalTimeString = (value = new Date()) => (
  getCurrentTimeInputValue({ value })
)

const normalizeTimeString = (value) => {
  if (!value) return ''
  const match = String(value).match(/(\d{2}:\d{2})/)
  return match ? match[1] : ''
}

const parseMinutes = (value) => {
  const normalized = normalizeTimeString(value)
  if (!normalized) return null

  const [hours, minutes] = normalized.split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
  return hours * 60 + minutes
}

export const getSystemDateTimeMismatchDetails = ({ date, time }, now = new Date(), timeToleranceMinutes = 5) => {
  const mismatches = []

  if (date && date !== getLocalDateString(now)) {
    mismatches.push('date')
  }

  const selectedMinutes = parseMinutes(time)
  const currentMinutes = parseMinutes(getLocalTimeString(now))
  if (
    selectedMinutes !== null &&
    currentMinutes !== null &&
    Math.abs(selectedMinutes - currentMinutes) > timeToleranceMinutes
  ) {
    mismatches.push('time')
  }

  return mismatches
}

export const hasSystemDateTimeMismatch = (value, now = new Date(), timeToleranceMinutes = 5) => (
  getSystemDateTimeMismatchDetails(value, now, timeToleranceMinutes).length > 0
)

export const describeSystemDateTimeMismatch = (details) => {
  if (details.includes('date') && details.includes('time')) return 'date and time differ'
  if (details.includes('date')) return 'date differs'
  if (details.includes('time')) return 'time differs'
  return 'date or time differs'
}