/**
 * csvImport.js
 * Utilities for parsing BusyBusy time-tracking exports and generating
 * draft meeting and safety survey objects.
 */

// ─── Cost Code → Trade mapping ────────────────────────────────────────────────
// Any code not listed here falls back to 'General'.

const COST_CODE_TRADE_MAP = {
  // Roofing
  'Roofing - Asphalt': 'Roofing',
  'Roofing - Cedar': 'Roofing',
  'Roofing - Copper': 'Roofing',
  'Roofing - Flat': 'Roofing',
  'Roofing - Leak': 'Roofing',
  'Roofing - Maintenance': 'Roofing',
  'Roofing - Metal': 'Roofing',
  'Roofing - Skylights': 'Roofing',
  'Roofing - Slate': 'Roofing',
  'Gutters': 'Roofing',
  'Gutters Cleaning': 'Roofing',
  'Gutter Guards': 'Roofing',
  'Diverters In The Gutters': 'Roofing',
  'Flashing': 'Roofing',
  'Flashing Installation': 'Roofing',
  'Soffit/Fascia': 'Roofing',
  'Downspouts Repair': 'Roofing',
  'Roof & Attic Inspection': 'Roofing',
  'Roof Penetration Flashing/Sealing': 'Roofing',
  'Closing Roof Opening': 'Roofing',
  'Core Roof Inspection': 'Roofing',
  'Standing Snow Repairs': 'Roofing',
  'Temporary Roof': 'Roofing',
  'Plywood Installation': 'Roofing',
  'Heating Cable': 'Roofing',

  // Electrical
  'Electrical': 'Electrical',

  // Plumbing
  'Plumbing': 'Plumbing',
  'Drain Installation': 'Plumbing',
  'Drain Cleanout': 'Plumbing',
  'Sewer Cleanout': 'Plumbing',
  'Sewer System': 'Plumbing',
  'Storm System': 'Plumbing',
  'Burst Pipe Inspection': 'Plumbing',
  'Leak': 'Plumbing',
  'Leak Inspection/Plumbing': 'Plumbing',
  'Water Heater': 'Plumbing',
  'Toilet': 'Plumbing',

  // HVAC
  'HVAC': 'HVAC',
  'Furnace Installation': 'HVAC',

  // Carpentry / Framing
  'Framing': 'Carpentry',
  'Rough Carpentry': 'Carpentry',
  'Finish Carpentry': 'Carpentry',
  'Extra Framing': 'Carpentry',
  'Deck': 'Carpentry',
  'Stairs': 'Carpentry',
  'Windows Installation': 'Carpentry',
  'Windows And Doors Installation': 'Carpentry',
  'Door Installation': 'Carpentry',
  'Door Hardware Replacement': 'Carpentry',
  'Door Lock': 'Carpentry',
  'Window Well': 'Carpentry',
  'Window Well Covers': 'Carpentry',
  'SS Windows Pans': 'Carpentry',
  'Fixing The Windows': 'Carpentry',
  'Change Order - Reframe Windows': 'Carpentry',
  'House Wrap Install': 'Carpentry',
  'Bay Window': 'Carpentry',
  'Bay Window Coopers': 'Carpentry',
  'Crown Moulding': 'Carpentry',

  // Masonry
  'Masonry': 'Masonry',
  'Brick Work': 'Masonry',
  'Concrete': 'Masonry',
  'Concrete Stairs': 'Masonry',
  'Concrete Cutting': 'Masonry',
  'Concrete Cutting - Sewer System': 'Masonry',
  'Concrete Excavator': 'Masonry',
  'Limestone': 'Masonry',
  'Limestone Power Washing & Sanding': 'Masonry',
  'Stucco': 'Masonry',
  'Masonry Winterizing': 'Masonry',
  'Chimney - Chimney Cap': 'Masonry',
  'Chimney - Tuckpointing': 'Masonry',
  'Demo Masonry Wall': 'Masonry',

  // Drywall
  'Drywall': 'Drywall',

  // Painting
  'Painting': 'Painting',
  'Exterior Painting': 'Painting',

  // Metal / Sheet Metal
  'Metal Work': 'Metal Work',
  'ABM Metal Work': 'Metal Work',
  'Sheet Metal': 'Metal Work',
  'Reynobond': 'Metal Work',
  'Welding': 'Metal Work',
  'Structural Steel': 'Metal Work',
}

/** Sorted list of all trade values used in the app */
export const ALL_TRADES = [
  'Carpentry',
  'Drywall',
  'Electrical',
  'General',
  'HVAC',
  'Masonry',
  'Metal Work',
  'Painting',
  'Plumbing',
  'Roofing',
]

export const TRADE_TOPIC_SUGGESTION_NAMES = Object.freeze({
  Carpentry: 'Hand and Power Tools',
  Drywall: 'Respiratory Protection',
  Electrical: 'Electrical Safety',
  General: 'Personal Protective Equipment (PPE)',
  HVAC: 'Lockout/Tagout',
  Masonry: 'Scaffolding Safety',
  'Metal Work': 'Fire Prevention',
  Painting: 'Hazard Communication',
  Plumbing: 'Ladder Safety',
  Roofing: 'Fall Protection',
})

export function getSuggestedTopicNameForTrade(trade) {
  return TRADE_TOPIC_SUGGESTION_NAMES[trade] || TRADE_TOPIC_SUGGESTION_NAMES.General || ''
}

export function getSuggestedTopicForTrade(trade, topics = []) {
  if (!Array.isArray(topics) || topics.length === 0) return null

  const suggestedName = getSuggestedTopicNameForTrade(trade)
  if (suggestedName) {
    const exactMatch = topics.find((topic) => topic?.name === suggestedName)
    if (exactMatch) return exactMatch
  }

  if (trade && trade !== 'General') {
    const generalSuggestion = TRADE_TOPIC_SUGGESTION_NAMES.General
    if (generalSuggestion) {
      return topics.find((topic) => topic?.name === generalSuggestion) || null
    }
  }

  return null
}

/**
 * Map a cost code string to a trade name.
 * Falls back to 'General' for unknown codes.
 * @param {string} costCode
 * @returns {string}
 */
export function costCodeToTrade(costCode) {
  if (!costCode) return 'General'
  const direct = COST_CODE_TRADE_MAP[costCode.trim()]
  if (direct) return direct

  // Prefix-based fallback
  const lower = costCode.toLowerCase()
  if (lower.startsWith('roofing')) return 'Roofing'
  if (lower.startsWith('gutters') || lower.startsWith('gutter')) return 'Roofing'
  if (lower.includes('flashing')) return 'Roofing'
  if (lower.startsWith('concrete')) return 'Masonry'
  if (lower.startsWith('masonry')) return 'Masonry'
  if (lower.startsWith('electrical')) return 'Electrical'
  if (lower.startsWith('plumbing') || lower.startsWith('sewer') || lower.startsWith('drain')) return 'Plumbing'
  if (lower.startsWith('hvac') || lower.startsWith('furnace') || lower.startsWith('heating cable')) return 'HVAC'
  if (lower.startsWith('framing') || lower.startsWith('carpentry') || lower.startsWith('window')) return 'Carpentry'

  return 'General'
}

/**
 * Parse a CSV string exported from BusyBusy.
 * Handles quoted fields with embedded commas/newlines.
 *
 * Required columns (by header name):
 *   First Name, Last Name, Start, Cost Code
 *
 * @param {string} csvText  Raw file content
 * @returns {{ firstName, lastName, start, costCode }[]}
 */
export function parseBusyBusyCsv(csvText) {
  const rows = parseCSV(csvText)
  if (rows.length < 2) return []

  const headers = rows[0].map(h => h.trim().toLowerCase())

  const colIndex = (name) => headers.indexOf(name.toLowerCase())

  const iFirst = colIndex('first name')
  const iLast  = colIndex('last name')
  const iStart = colIndex('start')
  const iCost  = colIndex('cost code')

  if (iFirst === -1 || iLast === -1 || iStart === -1) {
    throw new Error('CSV is missing required columns: First Name, Last Name, Start')
  }

  const result = []
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row.length < 2) continue  // skip blank lines

    const firstName = (row[iFirst] || '').trim()
    const lastName  = (row[iLast]  || '').trim()
    const startRaw  = (row[iStart] || '').trim()
    const costCode  = iCost !== -1 ? (row[iCost] || '').trim() : ''

    if (!firstName && !lastName) continue  // skip empty rows
    if (!startRaw) continue               // skip rows without a time entry

    result.push({ firstName, lastName, start: startRaw, costCode })
  }

  return result
}

/**
 * Full RFC-4180-compatible CSV parser.
 * Returns an array of rows, each row an array of string cells.
 */
function parseCSV(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false
  let i = 0

  // Normalise line endings
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  while (i < s.length) {
    const ch = s[i]
    const next = s[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i += 2; continue }  // escaped quote
      if (ch === '"') { inQuotes = false; i++; continue }
      cell += ch; i++
    } else {
      if (ch === '"') { inQuotes = true; i++; continue }
      if (ch === ',') { row.push(cell); cell = ''; i++; continue }
      if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue }
      cell += ch; i++
    }
  }
  row.push(cell)
  if (row.some(c => c !== '')) rows.push(row)

  return rows
}

/**
 * Group parsed CSV rows into draft meeting objects (Project + Date = 1 meeting).
 *
 * @param {{ firstName, lastName, start, costCode }[]} rows
 * @param {string} projectId  UUID of the project this batch belongs to
 * @param {string} projectLocation  Default location (project.job_address or '')
 * @returns {DraftMeeting[]}
 *
 * @typedef DraftMeeting
 * @property {string} date          'YYYY-MM-DD'
 * @property {string} time          'HH:MM'
 * @property {string} project_id
 * @property {string} location
 * @property {string} trade
 * @property {string} topic
 * @property {string[]} attendeeNames   sorted unique names
 * @property {string[]} costCodes       all distinct cost codes for this day
 */
export function groupIntoDraftMeetings(rows, projectId, projectLocation = '') {
  // 1. Group rows by date
  const byDate = {}
  for (const row of rows) {
    const dateKey = isoDateFromStart(row.start)
    if (!dateKey) continue
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(row)
  }

  const meetings = []
  for (const [date, dayRows] of Object.entries(byDate)) {
    // 2. Earliest start → meeting time = +15 min
    const startTimes = dayRows
      .map(r => parseStartTime(r.start))
      .filter(Boolean)
      .sort()
    const meetingTime = startTimes.length > 0
      ? addMinutes(startTimes[0], 15)
      : '07:00'

    // 3. Resolve trade from cost codes — prefer most-specific (non-General) one
    const costCodes = [...new Set(dayRows.map(r => r.costCode).filter(Boolean))]
    const trade = pickBestTrade(costCodes)

    // 4. Topic stays empty so the user must choose it manually.
    const topic = ''

    // 5. Unique attendee names
    const attendeeNames = [...new Set(
      dayRows.map(r => `${r.firstName} ${r.lastName}`.trim()).filter(Boolean)
    )].sort()

    meetings.push({
      date,
      time: meetingTime,
      project_id: projectId,
      location: projectLocation,
      trade,
      topic,
      attendeeNames,
      costCodes,
    })
  }

  // Sort by date ascending
  meetings.sort((a, b) => a.date.localeCompare(b.date))
  return meetings
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract 'YYYY-MM-DD' from an ISO timestamp like '2025-09-29T17:49:00.000-05:00' */
function isoDateFromStart(startStr) {
  if (!startStr) return null
  const m = startStr.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** Extract 'HH:MM' from an ISO timestamp */
function parseStartTime(startStr) {
  if (!startStr) return null
  // Handle both ISO with offset and plain time components
  const m = startStr.match(/T(\d{2}:\d{2})/)
  return m ? m[1] : null
}

/** Add N minutes to an 'HH:MM' string, returning 'HH:MM' */
function addMinutes(hhmm, minutes) {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + minutes
  const newH = Math.floor(total / 60) % 24
  const newM = total % 60
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`
}

/**
 * Given a list of cost codes, return the most specific trade
 * (prefers any non-General trade; falls back to General).
 */
function pickBestTrade(costCodes) {
  const trades = costCodes.map(c => costCodeToTrade(c))
  const nonGeneral = trades.find(t => t !== 'General')
  return nonGeneral || 'General'
}

/**
 * Check which of the proposed draft meetings already exist in the DB.
 * A duplicate is any meeting (draft or published) with the same project_id and date.
 *
 * @param {DraftMeeting[]} drafts
 * @param {{ project_id: string, date: string }[]} existingMeetings
 * @returns {Set<string>}  Set of 'YYYY-MM-DD' keys that are duplicates
 */
export function detectDuplicateDates(drafts, existingMeetings) {
  const existing = new Set(
    existingMeetings
      .filter(m => m.project_id)
      .map(m => `${m.project_id}::${m.date}`)
  )
  const duplicates = new Set()
  for (const d of drafts) {
    if (existing.has(`${d.project_id}::${d.date}`)) {
      duplicates.add(d.date)
    }
  }
  return duplicates
}
