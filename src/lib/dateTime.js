import { DEFAULT_APP_TIMEZONE, getAppTimezoneSync } from './appSettings'

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/
const TIME_PATTERN = /^(\d{1,2}):(\d{2})/
const formatterCache = new Map()

const pad = (value) => String(value).padStart(2, '0')

const buildFormatterCacheKey = (locale, timeZone, options) => JSON.stringify([locale, timeZone, options])

const getFormatter = (locale, timeZone, options) => {
  const key = buildFormatterCacheKey(locale, timeZone, options)
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.DateTimeFormat(locale, { timeZone, ...options }))
  }
  return formatterCache.get(key)
}

const extractDateOnlyParts = (value) => {
  if (!value) return null
  const match = String(value).match(DATE_ONLY_PATTERN)
  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  }
}

const extractTimeParts = (value) => {
  if (!value) return { hours: 0, minutes: 0 }
  const match = String(value).match(TIME_PATTERN)
  if (!match) return { hours: 0, minutes: 0 }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2]),
  }
}

const dateFromDateOnlyParts = ({ year, month, day }) => (
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
)

const getDateTimePartsInTimeZone = (value, timeZone) => {
  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return null

  const formatter = getFormatter('en-CA', timeZone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  const parts = formatter.formatToParts(parsed)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  }
}

export const resolveAppTimeZone = (timeZone) => timeZone || getAppTimezoneSync() || DEFAULT_APP_TIMEZONE

export const formatDateOnly = (value, {
  locale = 'en-US',
  options = { year: 'numeric', month: 'numeric', day: 'numeric' },
  fallback = '',
} = {}) => {
  if (!value) return fallback

  const parts = extractDateOnlyParts(value)
  if (!parts) return String(value)

  return getFormatter(locale, 'UTC', options).format(dateFromDateOnlyParts(parts))
}

export const formatDateTimeInTimeZone = (value, {
  locale = 'en-US',
  timeZone,
  options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
  fallback = '',
} = {}) => {
  if (!value) return fallback

  const parsed = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(parsed.getTime())) return fallback || String(value)

  return getFormatter(locale, resolveAppTimeZone(timeZone), options).format(parsed)
}

export const getCurrentDateInputValue = ({ timeZone, value = new Date() } = {}) => {
  const parts = getDateTimePartsInTimeZone(value, resolveAppTimeZone(timeZone))
  return parts ? `${parts.year}-${parts.month}-${parts.day}` : ''
}

export const getCurrentTimeInputValue = ({ timeZone, value = new Date() } = {}) => {
  const parts = getDateTimePartsInTimeZone(value, resolveAppTimeZone(timeZone))
  return parts ? `${parts.hour}:${parts.minute}` : ''
}

export const getDateTimeInputValueForTimeZone = (value, { timeZone } = {}) => {
  if (!value) return ''

  const parts = getDateTimePartsInTimeZone(value, resolveAppTimeZone(timeZone))
  if (!parts) return ''

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

export const dateTimeInputToUtcIsoString = (value, { timeZone } = {}) => {
  if (!value) return null

  const normalizedTimeZone = resolveAppTimeZone(timeZone)
  const [datePart, timePart = '00:00'] = String(value).split('T')
  const dateParts = extractDateOnlyParts(datePart)
  if (!dateParts) return null

  const { hours, minutes } = extractTimeParts(timePart)
  let candidateMs = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, 0)

  for (let iteration = 0; iteration < 3; iteration += 1) {
    const zonedParts = getDateTimePartsInTimeZone(new Date(candidateMs), normalizedTimeZone)
    if (!zonedParts) break

    const desiredMs = Date.UTC(dateParts.year, dateParts.month - 1, dateParts.day, hours, minutes, 0)
    const zonedMs = Date.UTC(
      Number(zonedParts.year),
      Number(zonedParts.month) - 1,
      Number(zonedParts.day),
      Number(zonedParts.hour),
      Number(zonedParts.minute),
      0,
    )

    const delta = desiredMs - zonedMs
    if (delta === 0) break
    candidateMs += delta
  }

  return new Date(candidateMs).toISOString()
}

export const getDateTimeSortKey = (dateValue, timeValue = '00:00') => {
  const dateParts = extractDateOnlyParts(dateValue)
  if (!dateParts) return 0

  const { hours, minutes } = extractTimeParts(timeValue)
  return Number(`${dateParts.year}${pad(dateParts.month)}${pad(dateParts.day)}${pad(hours)}${pad(minutes)}`)
}
