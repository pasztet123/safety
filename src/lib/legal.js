export const LEGAL_CONFIRMATION_CLAUSE = 'The information in this document reflects data entered and confirmed by the user identified above. The accuracy and reliability of the information are the sole responsibility of the user and the organization operating the system.'

export const JURISDICTION_WARNING_MESSAGE = 'Before accepting this meeting, you must ensure that your actions comply with the laws and recordkeeping requirements applicable in your jurisdiction.'

const pad = (value) => String(value).padStart(2, '0')

export const getLocalDateString = (value = new Date()) => (
  `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
)

export const getLocalTimeString = (value = new Date()) => (
  `${pad(value.getHours())}:${pad(value.getMinutes())}`
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