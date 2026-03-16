import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchTrades } from '../lib/trades'
import { fetchAllPages, supabase } from '../lib/supabase'
import { applyResolvedMeetingLeader, normalizeMeetingPersonName, resolveMeetingLeader } from '../lib/meetingLeader'
import { generateMeetingPDF } from '../lib/pdfGenerator'
import { downloadChunkedMeetingListPDFZIP, downloadMeetingListPDF, downloadMeetingsAsZIP } from '../lib/pdfBulkGenerator'
import {
  DEFAULT_MEETING_CHUNK_SIZE,
  MEETING_CHUNK_SIZE_OPTIONS,
  MEETING_SINGLE_PDF_MAX_RECORDS,
  fetchMeetingExportChunk,
  fetchMeetingFilterOptions,
  fetchMeetingsFull,
  fetchMeetingsWindow,
} from '../lib/exportHelpers'
import { NEW_TAB_LINK_PROPS } from '../lib/navigation'
import ExportProgress from '../components/ExportProgress'
import ApproveDraftsModal from '../components/ApproveDraftsModal'
import { formatDateOnly, getDateTimeSortKey } from '../lib/dateTime'
import './Meetings.css'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 250, 500, 1000]
const MEETINGS_PAGE_SIZE_STORAGE_KEY = 'meetings:page-size'
const DRAFTS_PAGE_SIZE_STORAGE_KEY = 'meetings:drafts-page-size'
const MEETINGS_EXPORT_CHUNK_STORAGE_KEY = 'meetings:export-chunk-size'
const SERVER_FILTER_DEBOUNCE_MS = 350

const normalizeText = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const addSignatureEntries = (target, items = []) => {
  ;(items || []).forEach((item) => {
    if (!item?.name || !item?.default_signature_url) return
    target[item.name] = item.default_signature_url
    target[normalizeMeetingPersonName(item.name)] = item.default_signature_url
  })
}

const getDefaultSignatureForName = (signatureByName, name) => {
  if (!name) return null
  return signatureByName[name] || signatureByName[normalizeMeetingPersonName(name)] || null
}

const getProjectName = (meeting) => meeting?.project?.name || ''
const getLocationName = (meeting) => meeting?.location || ''

const getMeetingMinutes = (meeting) => {
  const rawTime = (meeting?.time || '').trim()
  const match = rawTime.match(/^(\d{1,2}):(\d{2})/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

  return (hours * 60) + minutes
}

const getTimestampValue = (meeting, field = 'date-time-desc') => {
  const baseValue = field === 'created-asc' || field === 'created-desc'
    ? meeting?.created_at
    : meeting?.date

  if (!baseValue) return 0

  if (field === 'created-asc' || field === 'created-desc') {
    const parsed = new Date(baseValue)
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
  }

  return getDateTimeSortKey(baseValue, meeting?.time || '00:00')
}

const compareText = (left, right, direction = 'asc') => {
  const result = String(left || '').localeCompare(String(right || ''), 'en', { sensitivity: 'base' })
  return direction === 'desc' ? -result : result
}

const compareNumber = (left, right, direction = 'desc') => {
  const safeLeft = Number.isFinite(left) ? left : -Infinity
  const safeRight = Number.isFinite(right) ? right : -Infinity
  return direction === 'asc' ? safeLeft - safeRight : safeRight - safeLeft
}

const matchesTimeRange = (meeting, timeRange) => {
  if (!timeRange) return true

  const minutes = getMeetingMinutes(meeting)
  if (minutes == null) return false

  switch (timeRange) {
    case 'before-06': return minutes < 360
    case 'morning': return minutes >= 360 && minutes < 720
    case 'midday': return minutes >= 720 && minutes < 900
    case 'afternoon': return minutes >= 900 && minutes < 1080
    case 'evening': return minutes >= 1080 && minutes < 1320
    case 'night': return minutes >= 1320 || minutes < 360
    default: return true
  }
}

const matchesDateRange = (meeting, dateFrom, dateTo) => {
  const dateValue = meeting?.date?.slice(0, 10) || ''
  if (dateFrom && (!dateValue || dateValue < dateFrom)) return false
  if (dateTo && (!dateValue || dateValue > dateTo)) return false
  return true
}

const sortMeetingRecords = (records, sortBy) => {
  const result = [...records]

  result.sort((left, right) => {
    switch (sortBy) {
      case 'date-asc':
      case 'oldest':
        return compareNumber(getTimestampValue(left), getTimestampValue(right), 'asc')
      case 'newest':
      case 'date-desc':
        return compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'time-asc':
        return compareNumber(getMeetingMinutes(left), getMeetingMinutes(right), 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'asc')
      case 'time-desc':
        return compareNumber(getMeetingMinutes(left), getMeetingMinutes(right), 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'topic-asc':
      case 'az':
        return compareText(left?.topic, right?.topic, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'topic-desc':
      case 'za':
        return compareText(left?.topic, right?.topic, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'trade-asc':
      case 'trade':
        return compareText(left?.trade, right?.trade, 'asc') || compareText(left?.topic, right?.topic, 'asc')
      case 'trade-desc':
        return compareText(left?.trade, right?.trade, 'desc') || compareText(left?.topic, right?.topic, 'asc')
      case 'leader-asc':
        return compareText(left?.leader_name, right?.leader_name, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'leader-desc':
        return compareText(left?.leader_name, right?.leader_name, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'project-asc':
        return compareText(getProjectName(left), getProjectName(right), 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'project-desc':
        return compareText(getProjectName(left), getProjectName(right), 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'location-asc':
        return compareText(getLocationName(left), getLocationName(right), 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'location-desc':
        return compareText(getLocationName(left), getLocationName(right), 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'attendees-asc':
      case 'least-attendees':
        return compareNumber(left?.attendees?.length || 0, right?.attendees?.length || 0, 'asc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'attendees-desc':
      case 'attendees':
      case 'most-attendees':
        return compareNumber(left?.attendees?.length || 0, right?.attendees?.length || 0, 'desc') || compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
      case 'created-asc':
        return compareNumber(getTimestampValue(left, 'created-asc'), getTimestampValue(right, 'created-asc'), 'asc')
      case 'created-desc':
        return compareNumber(getTimestampValue(left, 'created-desc'), getTimestampValue(right, 'created-desc'), 'desc')
      default:
        return compareNumber(getTimestampValue(left), getTimestampValue(right), 'desc')
    }
  })

  return result
}

const getPageRangeLabel = (page, pageSize, total) => {
  if (!total) return '0 results'
  const start = ((page - 1) * pageSize) + 1
  const end = Math.min(page * pageSize, total)
  return `${start}-${end} of ${total}`
}

const formatMeetingDate = (value) => {
  if (!value) return 'No date'
  return formatDateOnly(value, { fallback: value })
}

const summarizeList = (items, limit = 3) => {
  const normalizedItems = (items || []).filter(Boolean)
  if (normalizedItems.length <= limit) return normalizedItems.join(', ')
  return `${normalizedItems.slice(0, limit).join(', ')} +${normalizedItems.length - limit}`
}

const getStoredPageSize = (storageKey, fallback = 50) => {
  if (typeof window === 'undefined') return fallback

  const storedValue = Number(window.localStorage.getItem(storageKey))
  return PAGE_SIZE_OPTIONS.includes(storedValue) ? storedValue : fallback
}

const getStoredOption = (storageKey, allowedValues, fallback) => {
  if (typeof window === 'undefined') return fallback

  const storedValue = Number(window.localStorage.getItem(storageKey))
  return allowedValues.includes(storedValue) ? storedValue : fallback
}

const useDebouncedValue = (value, delay = SERVER_FILTER_DEBOUNCE_MS) => {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => window.clearTimeout(timeoutId)
  }, [value, delay])

  return debouncedValue
}

const FilterField = ({ label, span = '', children }) => (
  <div className={[
    'filter-field',
    span ? `filter-field--${span}` : '',
  ].filter(Boolean).join(' ')}>
    <span className="filter-field-label">{label}</span>
    {children}
  </div>
)

export default function Meetings() {
  const navigate = useNavigate()
  const cancelExportRef = useRef(false)
  const [meetings, setMeetings] = useState([])
  const [meetingTotalCount, setMeetingTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [exportListLoading, setExportListLoading] = useState(false)
  const [chunkedExportLoading, setChunkedExportLoading] = useState(false)
  const [zipProgress, setZipProgress] = useState({ visible: false, done: 0, total: 0, label: '' })
  const [meetingFilterOptions, setMeetingFilterOptions] = useState({ projects: [], trades: [], attendees: [], leaders: [] })
  const [meetingLeaderLookups, setMeetingLeaderLookups] = useState({ leaders: [], involvedPersons: [] })

  // Search / filter / sort
  const [searchText, setSearchText] = useState('')
  const [filterTrade, setFilterTrade] = useState('')
  const [filterPerson, setFilterPerson] = useState('')
  const [filterLeader, setFilterLeader] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterTopic, setFilterTopic] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterTimeRange, setFilterTimeRange] = useState('')
  const [filterSelfTraining, setFilterSelfTraining] = useState('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [meetingPageSize, setMeetingPageSize] = useState(() => getStoredPageSize(MEETINGS_PAGE_SIZE_STORAGE_KEY, 50))
  const [exportChunkSize, setExportChunkSize] = useState(() => getStoredOption(MEETINGS_EXPORT_CHUNK_STORAGE_KEY, MEETING_CHUNK_SIZE_OPTIONS, DEFAULT_MEETING_CHUNK_SIZE))
  const [selectedMeetingIds, setSelectedMeetingIds] = useState(new Set())
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  const debouncedFilterPerson = useDebouncedValue(filterPerson)
  const debouncedFilterLeader = useDebouncedValue(filterLeader)
  const debouncedFilterTopic = useDebouncedValue(filterTopic)
  const debouncedFilterLocation = useDebouncedValue(filterLocation)

  const meetingQueryFilters = useMemo(() => ({
    dateFrom: filterDateFrom,
    dateTo: filterDateTo,
    projectId: filterProject,
    trade: filterTrade,
    attendeeName: debouncedFilterPerson,
    leaderName: debouncedFilterLeader,
    topic: debouncedFilterTopic,
    location: debouncedFilterLocation,
    timeRange: filterTimeRange,
    selfTraining: filterSelfTraining,
    sortBy,
  }), [filterDateFrom, filterDateTo, filterProject, filterTrade, debouncedFilterPerson, debouncedFilterLeader, debouncedFilterTopic, debouncedFilterLocation, filterTimeRange, filterSelfTraining, sortBy])

  const filteredMeetings = useMemo(() => {
    let result = [...meetings]
    if (searchText.trim()) {
      const q = normalizeText(searchText)
      result = result.filter(m =>
        normalizeText(m.topic).includes(q) ||
        normalizeText(m.leader_name).includes(q) ||
        normalizeText(m.trade).includes(q) ||
        normalizeText(getProjectName(m)).includes(q) ||
        normalizeText(m.location).includes(q) ||
        m.attendees?.some(a => normalizeText(a.name).includes(q))
      )
    }
    return sortMeetingRecords(result, sortBy)
  }, [meetings, searchText, sortBy])

  const filtersActive = Boolean(
    searchText || filterTrade || filterPerson || filterLeader || filterProject || filterTopic || filterLocation || filterTimeRange || filterDateFrom || filterDateTo || filterSelfTraining !== 'all' || sortBy !== 'newest'
  )

  const [draftMeetings, setDraftMeetings] = useState([])
  const [draftsExpanded, setDraftsExpanded] = useState(false)
  const [selectedDraftIds, setSelectedDraftIds] = useState(new Set())
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [draftSearchText, setDraftSearchText] = useState('')
  const [draftFilterLeader, setDraftFilterLeader] = useState('')
  const [draftFilterAttendee, setDraftFilterAttendee] = useState('')
  const [draftFilterTrade, setDraftFilterTrade] = useState('')
  const [draftFilterProject, setDraftFilterProject] = useState('')
  const [draftFilterLocation, setDraftFilterLocation] = useState('')
  const [draftFilterTimeRange, setDraftFilterTimeRange] = useState('')
  const [draftFilterSelfTraining, setDraftFilterSelfTraining] = useState('all')
  const [draftDateFrom, setDraftDateFrom] = useState('')
  const [draftDateTo, setDraftDateTo] = useState('')
  const [draftSortBy, setDraftSortBy] = useState('date-desc')
  const [draftPageSize, setDraftPageSize] = useState(() => getStoredPageSize(DRAFTS_PAGE_SIZE_STORAGE_KEY, 50))

  // Draft editing
  const [showDraftEditModal, setShowDraftEditModal] = useState(false)
  const [draftEditIds, setDraftEditIds] = useState([])
  const [editLeaders, setEditLeaders] = useState([])
  const [editTrades, setEditTrades] = useState([])
  const [editTopics, setEditTopics] = useState([])
  const [draftEditFields, setDraftEditFields] = useState({ leader_id: '', leader_name: '', trade: '', topic: '', addAttendees: '' })
  const [draftEditLoading, setDraftEditLoading] = useState(false)

  const draftLeaderOptions = useMemo(() => {
    const s = new Set(draftMeetings.map(d => d.leader_name).filter(Boolean))
    return [...s].sort()
  }, [draftMeetings])

  const draftAttendeeOptions = useMemo(() => {
    const s = new Set()
    draftMeetings.forEach(d => d.attendees?.forEach(a => a.name && s.add(a.name)))
    return [...s].sort()
  }, [draftMeetings])

  const draftTradeOptions = useMemo(() => {
    const trades = new Set(draftMeetings.map(d => d.trade).filter(Boolean))
    return [...trades].sort((left, right) => compareText(left, right, 'asc'))
  }, [draftMeetings])

  const draftProjectOptions = useMemo(() => {
    const projects = new Set(draftMeetings.map(d => getProjectName(d)).filter(Boolean))
    return [...projects].sort((left, right) => compareText(left, right, 'asc'))
  }, [draftMeetings])

  const filteredDrafts = useMemo(() => {
    let result = [...draftMeetings]
    if (draftSearchText.trim()) {
      const q = normalizeText(draftSearchText)
      result = result.filter(d =>
        normalizeText(d.topic).includes(q) ||
        normalizeText(d.leader_name).includes(q) ||
        normalizeText(d.trade).includes(q) ||
        normalizeText(getProjectName(d)).includes(q) ||
        normalizeText(d.location).includes(q) ||
        d.attendees?.some(a => normalizeText(a.name).includes(q))
      )
    }
    if (draftFilterLeader) result = result.filter(d => d.leader_name === draftFilterLeader)
    if (draftFilterAttendee) result = result.filter(d => d.attendees?.some(a => a.name === draftFilterAttendee))
    if (draftFilterTrade) result = result.filter(d => d.trade === draftFilterTrade)
    if (draftFilterProject) result = result.filter(d => getProjectName(d) === draftFilterProject)
    if (draftFilterLocation.trim()) {
      const locationQuery = normalizeText(draftFilterLocation)
      result = result.filter(d => normalizeText(d.location).includes(locationQuery))
    }
    if (draftFilterSelfTraining !== 'all') {
      result = result.filter(d => String(Boolean(d.is_self_training)) === draftFilterSelfTraining)
    }
    result = result.filter(d => matchesDateRange(d, draftDateFrom, draftDateTo))
    result = result.filter(d => matchesTimeRange(d, draftFilterTimeRange))
    return sortMeetingRecords(result, draftSortBy)
  }, [draftMeetings, draftSearchText, draftFilterLeader, draftFilterAttendee, draftFilterTrade, draftFilterProject, draftFilterLocation, draftFilterTimeRange, draftFilterSelfTraining, draftDateFrom, draftDateTo, draftSortBy])

  // Pagination
  const [draftPage, setDraftPage] = useState(1)
  const [meetingPage, setMeetingPage] = useState(1)
  const [syncRunning, setSyncRunning] = useState(false)
  const [syncResult, setSyncResult] = useState(null)

  const draftTotalPages = Math.max(1, Math.ceil(filteredDrafts.length / draftPageSize))
  const pagedDrafts = filteredDrafts.slice((draftPage - 1) * draftPageSize, draftPage * draftPageSize)
  const meetingTotalPages = Math.max(1, Math.ceil(meetingTotalCount / meetingPageSize))
  const pagedMeetings = filteredMeetings

  useEffect(() => {
    checkAdmin()
    loadMeetingMeta()
  }, [])

  // Load drafts once we know we're admin
  useEffect(() => {
    if (isAdmin) {
      fetchDraftMeetings()
      fetchEditOptions()
    }
  }, [isAdmin])

  useEffect(() => {
    fetchMeetings()
  }, [meetingPage, meetingPageSize, meetingQueryFilters, meetingLeaderLookups])

  // Reset meeting page when server-side filters change
  useEffect(() => { setMeetingPage(1) }, [filterTrade, debouncedFilterPerson, debouncedFilterLeader, filterProject, debouncedFilterTopic, debouncedFilterLocation, filterTimeRange, filterSelfTraining, filterDateFrom, filterDateTo, sortBy, meetingPageSize])
  // Reset draft page when draft filters/sort change
  useEffect(() => { setDraftPage(1) }, [draftSearchText, draftFilterLeader, draftFilterAttendee, draftFilterTrade, draftFilterProject, draftFilterLocation, draftFilterTimeRange, draftFilterSelfTraining, draftDateFrom, draftDateTo, draftSortBy, draftPageSize])
  useEffect(() => {
    if (meetingPage > meetingTotalPages) setMeetingPage(meetingTotalPages)
  }, [meetingPage, meetingTotalPages])
  useEffect(() => {
    if (draftPage > draftTotalPages) setDraftPage(draftTotalPages)
  }, [draftPage, draftTotalPages])
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MEETINGS_PAGE_SIZE_STORAGE_KEY, String(meetingPageSize))
  }, [meetingPageSize])
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MEETINGS_EXPORT_CHUNK_STORAGE_KEY, String(exportChunkSize))
  }, [exportChunkSize])
  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DRAFTS_PAGE_SIZE_STORAGE_KEY, String(draftPageSize))
  }, [draftPageSize])
  useEffect(() => {
    setSelectedMeetingIds(prev => {
      const validIds = new Set(meetings.map(meeting => meeting.id))
      const next = new Set([...prev].filter(id => validIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [meetings])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
  }

  const loadMeetingMeta = async () => {
    try {
      const [options, leadersRes, involvedRes] = await Promise.all([
        fetchMeetingFilterOptions(),
        supabase.from('leaders').select('id, name, default_signature_url').order('name'),
        supabase.from('involved_persons').select('id, name, leader_id, default_signature_url').order('name'),
      ])

      setMeetingFilterOptions(options)
      setMeetingLeaderLookups({
        leaders: leadersRes.data || [],
        involvedPersons: involvedRes.data || [],
      })
    } catch (error) {
      console.error('Failed to load meeting filter metadata:', error)
    }
  }

  const fetchDraftMeetings = async () => {
    try {
      const [data, leadersRes, involvedRes] = await Promise.all([
        fetchAllPages(() => supabase
          .from('meetings')
          .select(`
            *,
            project:projects(name),
            attendees:meeting_attendees(name)
          `)
          .is('deleted_at', null)
          .eq('is_draft', true)
          .order('date', { ascending: false })),
        supabase.from('leaders').select('id, name, default_signature_url').order('name'),
        supabase.from('involved_persons').select('id, name, leader_id, default_signature_url').order('name'),
      ])

      const resolvedDrafts = (data || []).map((meeting) => applyResolvedMeetingLeader({
        meeting,
        leaders: leadersRes.data || [],
        involvedPersons: involvedRes.data || [],
      }))

      setDraftMeetings(resolvedDrafts)
    } catch (error) {
      setDraftMeetings([])
    }
  }

  const fetchEditOptions = async () => {
    const [{ data: ld }, { data: tp }] = await Promise.all([
      supabase.from('leaders').select('id, name, default_signature_url').order('name'),
      supabase.from('safety_topics').select('name').order('name'),
    ])
    setEditLeaders(ld || [])
    setEditTopics((tp || []).map(t => t.name))
    const tr = await fetchTrades()
    setEditTrades(tr || [])
  }

  const fetchMeetings = async () => {
    setLoading(true)
    try {
      const { rows, count } = await fetchMeetingsWindow(meetingQueryFilters, {
        page: meetingPage,
        pageSize: meetingPageSize,
      })

      const resolvedMeetings = rows.map((meeting) => applyResolvedMeetingLeader({
        meeting,
        leaders: meetingLeaderLookups.leaders || [],
        involvedPersons: meetingLeaderLookups.involvedPersons || [],
      }))

      setMeetings(resolvedMeetings)
      setMeetingTotalCount(count)
    } catch (error) {
      setMeetings([])
      setMeetingTotalCount(0)
    } finally {
      setHasLoadedOnce(true)
      setLoading(false)
    }
  }

  const toggleDraftSelect = (id) => {
    setSelectedDraftIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleSelectAllDrafts = () => {
    const allPageSelected = pagedDrafts.length > 0 && pagedDrafts.every(d => selectedDraftIds.has(d.id))
    if (allPageSelected) {
      setSelectedDraftIds(prev => {
        const next = new Set(prev)
        pagedDrafts.forEach(d => next.delete(d.id))
        return next
      })
    } else {
      setSelectedDraftIds(prev => {
        const next = new Set(prev)
        pagedDrafts.forEach(d => next.add(d.id))
        return next
      })
    }
  }

  const draftsToApprove = showApproveModal
    ? draftMeetings.filter(d => selectedDraftIds.has(d.id))
    : []

  const handleApproveAll = () => {
    setSelectedDraftIds(new Set(pagedDrafts.map(d => d.id)))
    setShowApproveModal(true)
  }

  const handleApproveSelected = () => {
    if (selectedDraftIds.size === 0) return
    setShowApproveModal(true)
  }

  const handleDraftApproved = () => {
    setShowApproveModal(false)
    setSelectedDraftIds(new Set())
    fetchDraftMeetings()
    fetchMeetings()
  }

  const handleDeleteDraft = async (meetingId, topic) => {
    if (!confirm(`Delete draft "${topic}"? This cannot be undone.`)) return
    const { error } = await supabase.from('meetings').delete().eq('id', meetingId)
    if (error) {
      alert('Error deleting draft: ' + error.message)
      return
    }
    fetchDraftMeetings()
  }

  const handleOpenDraftEdit = (ids, singleDraft = null) => {
    setDraftEditIds(ids)
    if (singleDraft) {
      setDraftEditFields({
        leader_id: singleDraft.leader_id || '',
        leader_name: singleDraft.leader_name || '',
        trade: singleDraft.trade || '',
        topic: singleDraft.topic || '',
        addAttendees: '',
      })
    } else {
      setDraftEditFields({ leader_id: '', leader_name: '', trade: '', topic: '', addAttendees: '' })
    }
    setShowDraftEditModal(true)
  }

  const handleSaveDraftEdit = async () => {
    setDraftEditLoading(true)
    try {
      const updates = {}
      if (draftEditFields.leader_id) {
        updates.leader_id = draftEditFields.leader_id
        updates.leader_name = draftEditFields.leader_name
        const leader = editLeaders.find(l => l.id === draftEditFields.leader_id)
        if (leader?.default_signature_url) updates.signature_url = leader.default_signature_url
      }
      if (draftEditFields.trade) updates.trade = draftEditFields.trade
      if (draftEditFields.topic) updates.topic = draftEditFields.topic

      const newAttendeeNames = draftEditFields.addAttendees
        .split('\n')
        .map(n => n.trim())
        .filter(Boolean)

      for (const meetingId of draftEditIds) {
        if (Object.keys(updates).length > 0) {
          await supabase.from('meetings').update(updates).eq('id', meetingId)
        }
        if (newAttendeeNames.length > 0) {
          const { data: existing } = await supabase
            .from('meeting_attendees')
            .select('name')
            .eq('meeting_id', meetingId)
          const existingNames = new Set((existing || []).map(a => a.name.toLowerCase().trim()))
          const toInsert = newAttendeeNames
            .filter(n => !existingNames.has(n.toLowerCase()))
            .map(name => ({ meeting_id: meetingId, name, signed_with_checkbox: true }))
          if (toInsert.length > 0) {
            await supabase.from('meeting_attendees').insert(toInsert)
          }
        }
      }
      setShowDraftEditModal(false)
      fetchDraftMeetings()
    } catch (err) {
      alert('Error saving: ' + err.message)
    } finally {
      setDraftEditLoading(false)
    }
  }

  const handleSyncDrafts = async () => {
    if (!confirm(`Sync will scan draft and approved meetings. Drafts will be auto-fixed, duplicate drafts may be deleted, and approved self-trainings with the wrong auto-assigned signature will be moved back to draft for manual correction. Continue?`)) return
    setSyncRunning(true)
    setSyncResult(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const [allMeetings, leadersRes, involvedRes, usersRes] = await Promise.all([
        fetchAllPages(() => supabase
          .from('meetings')
          .select(`
            id,
            date,
            project_id,
            leader_id,
            leader_name,
            signature_url,
            is_draft,
            completed,
            is_self_training,
            attendees:meeting_attendees(id, name, signature_url, signed_with_checkbox)
          `)
          .is('deleted_at', null)
          .order('date', { ascending: false })
          .order('time', { ascending: false })),
        supabase.from('leaders').select('id, name, default_signature_url').order('name'),
        supabase.from('involved_persons').select('id, name, leader_id, default_signature_url').order('name'),
        supabase.from('users').select('name, default_signature_url').order('name'),
      ])

      const leaders = leadersRes.data || []
      const involvedPersons = involvedRes.data || []
      const users = usersRes.data || []
      const signatureByName = {}
      addSignatureEntries(signatureByName, leaders)
      addSignatureEntries(signatureByName, involvedPersons)
      addSignatureEntries(signatureByName, users)

      const leaderById = {}
      leaders.forEach((leader) => {
        leaderById[leader.id] = leader
      })

      const personByName = {}
      involvedPersons.forEach((person) => {
        const key = normalizeMeetingPersonName(person.name)
        if (key && !personByName[key]) {
          personByName[key] = person
        }
      })

      let fixedDrafts = 0
      let fixedApproved = 0
      let requeuedApproved = 0
      let deletedDuplicates = 0
      let unchanged = 0
      let unresolvedDrafts = 0
      const seen = new Map() // "date|project_id|sorted_attendee_names" -> meeting id (duplicate detection)

      for (const meeting of allMeetings) {
        const meetingAttendees = meeting.attendees || []
        const attendeeNames = meetingAttendees.map((attendee) => attendee.name).filter(Boolean)

        if (meeting.is_draft) {
          const names = attendeeNames.map((name) => name.toLowerCase().trim())
          const key = `${meeting.date}|${meeting.project_id || ''}|${[...names].sort().join(',')}`
          if (seen.has(key)) {
            await supabase.from('meetings').delete().eq('id', meeting.id)
            deletedDuplicates++
            continue
          }
          seen.set(key, meeting.id)
        }

        const resolution = resolveMeetingLeader({
          attendees: meetingAttendees,
          leaders,
          involvedPersons,
          signatureByName,
          isSelfTraining: meeting.is_self_training || meetingAttendees.length === 1,
        })

        const singleAttendeeName = meetingAttendees.length === 1
          ? String(meetingAttendees[0]?.name || '').trim()
          : ''
        const hasResolvedLeader = Boolean((resolution.leaderName || '').trim())
        const nextLeaderId = hasResolvedLeader
          ? (resolution.leaderId || null)
          : (meeting.leader_id || null)
        const nextLeaderName = hasResolvedLeader
          ? resolution.leaderName
          : (singleAttendeeName || meeting.leader_name || '')
        const nextSignatureUrl = hasResolvedLeader ? (resolution.signatureDefaultUrl || null) : (meeting.signature_url || null)
        const isSelfTrainingMeeting = resolution.isSelfTraining && meetingAttendees.length === 1
        const selfTrainingAttendee = isSelfTrainingMeeting ? meetingAttendees[0] : null
        const linkedLeader = selfTrainingAttendee
          ? leaderById[personByName[normalizeMeetingPersonName(selfTrainingAttendee.name)]?.leader_id]
          : null
        const linkedLeaderSignature = linkedLeader
          ? (linkedLeader.default_signature_url || getDefaultSignatureForName(signatureByName, linkedLeader.name))
          : null
        const approvedSelfTrainingNeedsRequeue = Boolean(
          !meeting.is_draft
          && isSelfTrainingMeeting
          && linkedLeaderSignature
          && linkedLeaderSignature !== nextSignatureUrl
          && (
            (meeting.signature_url || null) === linkedLeaderSignature
            || (selfTrainingAttendee?.signature_url || null) === linkedLeaderSignature
          )
        )
        const approvedHasMissingLeader = !meeting.is_draft && !String(nextLeaderName || '').trim()
        const approvedNeedsLeaderFix = Boolean(
          !meeting.is_draft
          && String(nextLeaderName || '').trim()
          && (
            (meeting.leader_id || null) !== nextLeaderId
            || (meeting.leader_name || '') !== nextLeaderName
            || !!meeting.is_self_training !== resolution.isSelfTraining
          )
        )

        if (!meeting.is_draft) {
          if (approvedSelfTrainingNeedsRequeue || approvedHasMissingLeader) {
            const fallbackLeaderName = singleAttendeeName || meeting.leader_name || ''
            const { error: approvedUpdateError } = await supabase
              .from('meetings')
              .update({
                is_draft: true,
                completed: false,
                leader_id: nextLeaderId,
                leader_name: fallbackLeaderName,
                signature_url: null,
                is_self_training: resolution.isSelfTraining,
                updated_by: user?.id || null,
              })
              .eq('id', meeting.id)

            if (approvedUpdateError) {
              throw approvedUpdateError
            }

            if (selfTrainingAttendee?.id) {
              const { error: attendeeResetError } = await supabase
                .from('meeting_attendees')
                .update({
                  signature_url: null,
                  signed_with_checkbox: false,
                })
                .eq('id', selfTrainingAttendee.id)

              if (attendeeResetError) {
                throw attendeeResetError
              }
            }

            requeuedApproved++
            continue
          }

          if (approvedNeedsLeaderFix) {
            const { error: approvedFixError } = await supabase
              .from('meetings')
              .update({
                leader_id: nextLeaderId,
                leader_name: nextLeaderName,
                ...(meeting.signature_url ? {} : { signature_url: nextSignatureUrl }),
                is_self_training: resolution.isSelfTraining,
                updated_by: user?.id || null,
              })
              .eq('id', meeting.id)

            if (approvedFixError) {
              throw approvedFixError
            }

            fixedApproved++
            continue
          }

          unchanged++
          continue
        }

        if (!nextLeaderName.trim()) {
          unresolvedDrafts++
          continue
        }

        const draftHasMeetingChanges =
          (meeting.leader_id || null) !== nextLeaderId ||
          (meeting.leader_name || null) !== nextLeaderName ||
          (meeting.signature_url || null) !== nextSignatureUrl ||
          !!meeting.is_self_training !== resolution.isSelfTraining
        const draftNeedsAttendeeSync = Boolean(
          isSelfTrainingMeeting
          && selfTrainingAttendee?.id
          && (
            (selfTrainingAttendee.signature_url || null) !== nextSignatureUrl
            || selfTrainingAttendee.signed_with_checkbox
          )
        )

        if (!draftHasMeetingChanges && !draftNeedsAttendeeSync) {
          unchanged++
          continue
        }

        if (draftHasMeetingChanges) {
          const { error: draftUpdateError } = await supabase
            .from('meetings')
            .update({
              leader_id: nextLeaderId,
              leader_name: nextLeaderName,
              signature_url: nextSignatureUrl,
              is_self_training: resolution.isSelfTraining,
            })
            .eq('id', meeting.id)

          if (draftUpdateError) {
            throw draftUpdateError
          }
        }

        if (draftNeedsAttendeeSync) {
          const { error: attendeeUpdateError } = await supabase
            .from('meeting_attendees')
            .update({
              signature_url: nextSignatureUrl,
              signed_with_checkbox: false,
            })
            .eq('id', selfTrainingAttendee.id)

          if (attendeeUpdateError) {
            throw attendeeUpdateError
          }
        }

        fixedDrafts++
      }

      setSyncResult(`Done: ${fixedDrafts} drafts fixed, ${fixedApproved} approved meetings auto-fixed, ${requeuedApproved} approved meetings moved back to draft, ${deletedDuplicates} duplicate drafts deleted, ${unresolvedDrafts} drafts need manual leader assignment, ${unchanged} unchanged.`)
      fetchDraftMeetings()
      fetchMeetings()
    } catch (err) {
      setSyncResult('Error: ' + err.message)
    } finally {
      setSyncRunning(false)
    }
  }

  const handleDelete = async (meetingId, topic) => {
    if (!confirm(`Are you sure you want to delete the meeting "${topic}"? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', meetingId)

    if (error) {
      alert('Error deleting meeting: ' + error.message)
    } else {
      fetchDraftMeetings()
      fetchMeetings()
    }
  }

  const toggleMeetingSelect = (id) => {
    setSelectedMeetingIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllMeetings = () => {
    const allPageSelected = pagedMeetings.length > 0 && pagedMeetings.every(meeting => selectedMeetingIds.has(meeting.id))

    setSelectedMeetingIds(prev => {
      const next = new Set(prev)
      if (allPageSelected) {
        pagedMeetings.forEach(meeting => next.delete(meeting.id))
      } else {
        pagedMeetings.forEach(meeting => next.add(meeting.id))
      }
      return next
    })
  }

  const clearSelectedMeetings = () => {
    setSelectedMeetingIds(new Set())
  }

  const handleDeleteSelectedMeetings = async () => {
    const meetingIds = Array.from(selectedMeetingIds)
    if (meetingIds.length === 0) return
    if (!confirm(`Delete ${meetingIds.length} approved meeting${meetingIds.length !== 1 ? 's' : ''}? This action cannot be undone.`)) return

    const { error } = await supabase
      .from('meetings')
      .delete()
      .in('id', meetingIds)

    if (error) {
      alert('Error deleting meetings: ' + error.message)
      return
    }

    clearSelectedMeetings()
    fetchMeetings()
  }

  const handleExportSelectedZIP = async () => {
    const selectedMeetings = filteredMeetings.filter(meeting => selectedMeetingIds.has(meeting.id))
    if (!selectedMeetings.length) return
    if (selectedMeetings.length > 20 && !confirm(`This will generate ${selectedMeetings.length} individual PDFs packed into a ZIP. This may take several minutes. Continue?`)) return

    cancelExportRef.current = false
    setZipProgress({ visible: true, done: 0, total: selectedMeetings.length, label: 'Generating selected meeting PDFs…' })
    try {
      await downloadMeetingsAsZIP(selectedMeetings, (done, total) => {
        if (cancelExportRef.current) throw new Error('Cancelled')
        setZipProgress({ visible: true, done, total, label: `Generating selected PDF ${done + 1} of ${total}…` })
      })
    } catch (error) {
      if (!cancelExportRef.current) console.error(error)
    } finally {
      setZipProgress({ visible: false, done: 0, total: 0, label: '' })
    }
  }

  const handlePDF = async (meeting) => {
    setPdfLoading(meeting.id)
    try {
      const { data, error: meetingErr } = await supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name),
          attendees:meeting_attendees(name, signature_url, signed_with_checkbox),
          photos:meeting_photos(photo_url)
        `)
        .eq('id', meeting.id)
        .single()

      if (!data || meetingErr) {
        console.error('Error loading meeting:', meetingErr)
        alert('Error loading meeting data')
        return
      }

      const [{ data: leaders }, { data: involvedPersons }] = await Promise.all([
        supabase.from('leaders').select('id, name, default_signature_url').order('name'),
        supabase.from('involved_persons').select('id, name, leader_id, default_signature_url').order('name'),
      ])

      // Fetch checklists for this meeting (separate queries to avoid PostgREST deep-join 400)
      const { data: mcRows } = await supabase
        .from('meeting_checklists')
        .select('checklist_id')
        .eq('meeting_id', data.id)

      let checklists = []
      if (mcRows && mcRows.length > 0) {
        const checklistIds = mcRows.map(r => r.checklist_id)
        const { data: clData } = await supabase
          .from('checklists')
          .select('id, name, category')
          .in('id', checklistIds)
        const { data: itemsData } = await supabase
          .from('checklist_items')
          .select('id, checklist_id, title, description, display_order, is_section_header')
          .in('checklist_id', checklistIds)
        checklists = (clData || []).map(cl => ({
          ...cl,
          items: (itemsData || []).filter(it => it.checklist_id === cl.id)
        }))
      }
      data.checklists = checklists

      // Fetch topic details (topic is stored as a name string, not FK)
      let topicDetails = null
      if (data.topic) {
        const { data: td } = await supabase
          .from('safety_topics')
          .select('name, description, osha_reference, risk_level, category')
          .eq('name', data.topic)
          .single()
        topicDetails = td || null
      }

      // Fetch checklist completions linked to this meeting (flat query, no nested)
      const { data: completions } = await supabase
        .from('checklist_completions')
        .select('id, checklist_id, notes')
        .eq('meeting_id', data.id)

      let checklistCompletions = []
      if (completions && completions.length > 0) {
        const completionIds = completions.map(c => c.id)
        const { data: ciData } = await supabase
          .from('checklist_completion_items')
          .select('completion_id, checklist_item_id, is_checked, notes')
          .in('completion_id', completionIds)

        // Attach items to their parent completion; rename key to item_id for PDF generator
        checklistCompletions = completions.map(c => ({
          ...c,
          items: (ciData || [])
            .filter(ci => ci.completion_id === c.id)
            .map(ci => ({ ...ci, item_id: ci.checklist_item_id }))
        }))
      }

      const resolvedMeeting = applyResolvedMeetingLeader({
        meeting: { ...data, topicDetails, checklistCompletions },
        leaders: leaders || [],
        involvedPersons: involvedPersons || [],
      })

      await generateMeetingPDF(resolvedMeeting)
    } catch (e) {
      console.error('Error generating PDF:', e)
      alert('Error generating PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  if (loading && !hasLoadedOnce) return <div className="spinner"></div>

  const buildMeetingExportScopeLabel = () => {
    const parts = []
    if (filterDateFrom && filterDateTo) parts.push(`${filterDateFrom} – ${filterDateTo}`)
    else if (filterDateFrom) parts.push(`from ${filterDateFrom}`)
    else if (filterDateTo) parts.push(`to ${filterDateTo}`)

    const projectName = meetingFilterOptions.projects.find(project => project.id === filterProject)?.name
    if (projectName) parts.push(projectName)
    if (filterTrade) parts.push(filterTrade)
    if (filterLeader) parts.push(`Leader: ${filterLeader}`)
    if (filterPerson) parts.push(`Attendee: ${filterPerson}`)
    if (filterTopic) parts.push(`Topic: ${filterTopic}`)
    if (filterLocation) parts.push(`Address: ${filterLocation}`)
    if (filterSelfTraining === 'true') parts.push('Self-training only')
    if (filterSelfTraining === 'false') parts.push('Led meetings only')
    if (filterTimeRange) parts.push(`Time: ${filterTimeRange}`)
    return parts.join(' · ')
  }

  const handleExportListPDF = async () => {
    if (!meetingTotalCount) return
    if (meetingTotalCount > MEETING_SINGLE_PDF_MAX_RECORDS) {
      alert(`Single list PDF is limited to ${MEETING_SINGLE_PDF_MAX_RECORDS} meetings. Use the chunked list export for larger result sets.`)
      return
    }

    setExportListLoading(true)
    try {
      const meetingsForExport = await fetchMeetingsFull(meetingQueryFilters)
      await downloadMeetingListPDF(meetingsForExport, 'Meetings & Safety Surveys Report', buildMeetingExportScopeLabel() || `${meetingTotalCount} meetings`)
    } catch (e) { console.error(e) }
    finally { setExportListLoading(false) }
  }

  const handleChunkedExportListPDF = async () => {
    if (!meetingTotalCount) return

    cancelExportRef.current = false
    setChunkedExportLoading(true)
    try {
      await downloadChunkedMeetingListPDFZIP({
        totalCount: meetingTotalCount,
        chunkSize: exportChunkSize,
        title: 'Meetings & Safety Surveys Report',
        subtitle: buildMeetingExportScopeLabel() || `${meetingTotalCount} meetings`,
        shouldCancel: () => cancelExportRef.current,
        getChunk: async ({ offset, limit }) => {
          const { rows } = await fetchMeetingExportChunk(meetingQueryFilters, { offset, limit })
          return rows
        },
        onProgress: ({ done, total, label }) => {
          setZipProgress({ visible: true, done, total, label })
        },
      })
    } catch (error) {
      if (!cancelExportRef.current) {
        console.error(error)
        alert('Chunked export failed: ' + (error.message || 'Unknown error'))
      }
    } finally {
      setChunkedExportLoading(false)
      setZipProgress({ visible: false, done: 0, total: 0, label: '' })
    }
  }

  const handleExportZIP = async () => {
    if (!meetingTotalCount) return

    if (meetingTotalCount > 20 && !confirm(`This will generate ${meetingTotalCount} individual PDFs packed into a ZIP. This may take several minutes. Continue?`)) return

    cancelExportRef.current = false
    setZipProgress({ visible: true, done: 0, total: meetingTotalCount, label: 'Preparing ZIP export…' })
    try {
      await downloadMeetingsAsZIP({
        totalCount: meetingTotalCount,
        chunkSize: exportChunkSize,
        shouldCancel: () => cancelExportRef.current,
        getChunk: async ({ offset, limit }) => {
          const { rows } = await fetchMeetingExportChunk(meetingQueryFilters, { offset, limit })
          return rows
        },
        onProgress: (done, total) => {
          setZipProgress({ visible: true, done, total, label: `Generating PDF ${done + 1} of ${total}…` })
        },
      })
    } catch (e) {
      if (!cancelExportRef.current) console.error(e)
    } finally { setZipProgress({ visible: false, done: 0, total: 0, label: '' }) }
  }

  const draftFiltersActive = Boolean(
    draftSearchText || draftFilterLeader || draftFilterAttendee || draftFilterTrade || draftFilterProject || draftFilterLocation || draftFilterTimeRange || draftDateFrom || draftDateTo || draftFilterSelfTraining !== 'all' || draftSortBy !== 'date-desc'
  )

  const resetMeetingFilters = () => {
    setSearchText('')
    setFilterTrade('')
    setFilterPerson('')
    setFilterLeader('')
    setFilterProject('')
    setFilterTopic('')
    setFilterLocation('')
    setFilterTimeRange('')
    setFilterSelfTraining('all')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSortBy('newest')
  }

  const handleCancelExport = () => {
    cancelExportRef.current = true
  }

  const resetDraftFilters = () => {
    setDraftSearchText('')
    setDraftFilterLeader('')
    setDraftFilterAttendee('')
    setDraftFilterTrade('')
    setDraftFilterProject('')
    setDraftFilterLocation('')
    setDraftFilterTimeRange('')
    setDraftFilterSelfTraining('all')
    setDraftDateFrom('')
    setDraftDateTo('')
    setDraftSortBy('date-desc')
  }

  return (
    <div>
      {/* ── ZIP Progress ── */}
      <ExportProgress
        visible={zipProgress.visible}
        done={zipProgress.done}
        total={zipProgress.total}
        label={zipProgress.label || `Generating PDF ${zipProgress.done + 1} of ${zipProgress.total}…`}
        onCancel={zipProgress.total > 0 ? handleCancelExport : undefined}
      />

      {/* ── Approve Modal ── */}
      {showApproveModal && draftsToApprove.length > 0 && (
        <ApproveDraftsModal
          drafts={draftsToApprove}
          onClose={() => setShowApproveModal(false)}
          onApproved={handleDraftApproved}
        />
      )}

      {/* ── Draft Edit Modal ── */}
      {showDraftEditModal && (
        <div className="modal-overlay" onClick={() => setShowDraftEditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                {draftEditIds.length === 1 ? 'Edit Draft' : `Bulk Edit — ${draftEditIds.length} drafts`}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowDraftEditModal(false)}>✕</button>
            </div>
            {draftEditIds.length > 1 && (
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '16px', background: '#f9fafb', padding: '8px 12px', borderRadius: '6px' }}>
                Leave a field blank to keep existing values. Only filled fields will be updated.
              </p>
            )}
            <div className="form-group">
              <label className="form-label">Worker performing the meeting</label>
              <select
                className="form-select"
                value={draftEditFields.leader_id}
                onChange={e => {
                  const leader = editLeaders.find(l => l.id === e.target.value)
                  setDraftEditFields(prev => ({ ...prev, leader_id: e.target.value, leader_name: leader?.name || '' }))
                }}
              >
                <option value="">{draftEditIds.length > 1 ? '— no change —' : '— select worker performing the meeting —'}</option>
                {editLeaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Trade</label>
              <select
                className="form-select"
                value={draftEditFields.trade}
                onChange={e => setDraftEditFields(prev => ({ ...prev, trade: e.target.value }))}
              >
                <option value="">{draftEditIds.length > 1 ? '— no change —' : '— select trade —'}</option>
                {editTrades.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <select
                className="form-select"
                value={draftEditFields.topic}
                onChange={e => setDraftEditFields(prev => ({ ...prev, topic: e.target.value }))}
              >
                <option value="">{draftEditIds.length > 1 ? '— no change —' : '— select topic —'}</option>
                {editTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Add attendees <span style={{ fontWeight: 400, color: '#6b7280' }}>(one name per line, duplicates skipped)</span></label>
              <textarea
                className="form-control"
                rows={4}
                value={draftEditFields.addAttendees}
                onChange={e => setDraftEditFields(prev => ({ ...prev, addAttendees: e.target.value }))}
                placeholder={`John Smith\nJane Doe`}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setShowDraftEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveDraftEdit} disabled={draftEditLoading}>
                {draftEditLoading ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <h2 className="page-title">Meetings & Safety Surveys</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <Link className="btn btn-secondary" to="/bulk-import">
              ⬆ Import CSV
            </Link>
          )}
          {isAdmin && meetingTotalCount > 0 && (
            <>
              <button
                className="btn btn-secondary"
                onClick={handleExportListPDF}
                disabled={exportListLoading}
                title="Download a summary PDF of the current filtered result"
              >
                {exportListLoading ? '…' : '↓ List PDF'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleChunkedExportListPDF}
                disabled={chunkedExportLoading}
                title="Split the current filtered result into smaller list PDFs"
              >
                {chunkedExportLoading ? '…' : '↓ Chunked List'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleExportZIP}
                title="Download each meeting as its own PDF inside a ZIP"
              >
                ↓ ZIP PDFs
              </button>
            </>
          )}
          <Link className="btn btn-primary" to="/meetings/new">
            + New Meeting
          </Link>
        </div>
      </div>

      {/* ── DRAFTS SECTION (admin only) ── */}
      {isAdmin && (
        <div className="drafts-section">
          <div className={`drafts-header ${draftsExpanded ? '' : 'drafts-header--collapsed'}`.trim()}>
            <h3 className="drafts-title">
              Drafts
              <span className="drafts-badge">{draftMeetings.length}</span>
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                className="drafts-toggle-btn"
                onClick={() => setDraftsExpanded(prev => !prev)}
                aria-expanded={draftsExpanded}
                aria-controls="meetings-drafts-panel"
                aria-label={draftsExpanded ? 'Collapse drafts' : 'Expand drafts'}
                title={draftsExpanded ? 'Collapse drafts' : 'Expand drafts'}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true" className={`drafts-toggle-icon ${draftsExpanded ? 'is-expanded' : ''}`.trim()}>
                  <path d="M5 7.5 10 12.5 15 7.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          {draftsExpanded && (
            <>
          {/* Draft filter bar */}
          <div id="meetings-drafts-panel" className="draft-filter-bar draft-filter-bar--stacked">
            <div className="drafts-panel-actions">
              <div className="drafts-panel-actions-group">
                <button
                  className="btn btn-secondary btn-sm drafts-sync-btn"
                  onClick={handleSyncDrafts}
                  disabled={syncRunning}
                  title="Fix draft signatures/leaders, delete duplicate drafts, and move contaminated approved self-trainings back to draft"
                >
                  <svg viewBox="0 0 20 20" aria-hidden="true" className={`drafts-sync-icon ${syncRunning ? 'is-spinning' : ''}`.trim()}>
                    <path d="M16.8 10a6.8 6.8 0 1 1-2-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M13 3.2h3.8V7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{syncRunning ? 'Syncing…' : 'Sync & fix the data'}</span>
                </button>
                {selectedDraftIds.size > 0 && draftMeetings.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleApproveSelected}
                  >
                    Approve Selected ({selectedDraftIds.size})
                  </button>
                )}
                <button className="btn btn-primary btn-sm" onClick={handleApproveAll} disabled={draftMeetings.length === 0}>
                  Approve All
                </button>
              </div>
              {syncResult && (
                <span className="drafts-sync-result">{syncResult}</span>
              )}
            </div>
            <div className="filter-grid filter-grid--top filter-grid--draft-top">
              <FilterField label="Search">
                <input
                  className="filter-search-input"
                  type="text"
                  placeholder="Search topic, address, attendee, project..."
                  value={draftSearchText}
                  onChange={e => setDraftSearchText(e.target.value)}
                />
              </FilterField>
              <FilterField label="Worker performing the meeting">
                <select className="filter-select" value={draftFilterLeader} onChange={e => setDraftFilterLeader(e.target.value)}>
                  <option value="">All workers performing the meetings</option>
                  {draftLeaderOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </FilterField>
              <FilterField label="Attendee">
                <select className="filter-select" value={draftFilterAttendee} onChange={e => setDraftFilterAttendee(e.target.value)}>
                  <option value="">All attendees</option>
                  {draftAttendeeOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </FilterField>
              <FilterField label="Trade">
                <select className="filter-select" value={draftFilterTrade} onChange={e => setDraftFilterTrade(e.target.value)}>
                  <option value="">All trades</option>
                  {draftTradeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </FilterField>
              <FilterField label="Project">
                <select className="filter-select" value={draftFilterProject} onChange={e => setDraftFilterProject(e.target.value)}>
                  <option value="">All projects</option>
                  {draftProjectOptions.map(project => <option key={project} value={project}>{project}</option>)}
                </select>
              </FilterField>
            </div>

            <div className="filter-grid filter-grid--bottom filter-grid--draft-bottom">
              <FilterField label="Address">
                <input
                  className="meetings-filter-input"
                  type="text"
                  placeholder="Address contains..."
                  value={draftFilterLocation}
                  onChange={e => setDraftFilterLocation(e.target.value)}
                />
              </FilterField>
              <FilterField label="Date from">
                <input className="meetings-filter-input meetings-filter-input--date" type="date" value={draftDateFrom} onChange={e => setDraftDateFrom(e.target.value)} />
              </FilterField>
              <FilterField label="Date to">
                <input className="meetings-filter-input meetings-filter-input--date" type="date" value={draftDateTo} onChange={e => setDraftDateTo(e.target.value)} />
              </FilterField>
              <FilterField label="Time range">
                <select className="filter-select" value={draftFilterTimeRange} onChange={e => setDraftFilterTimeRange(e.target.value)}>
                  <option value="">Any time</option>
                  <option value="before-06">Before 06:00</option>
                  <option value="morning">06:00-11:59</option>
                  <option value="midday">12:00-14:59</option>
                  <option value="afternoon">15:00-17:59</option>
                  <option value="evening">18:00-21:59</option>
                  <option value="night">22:00-05:59</option>
                </select>
              </FilterField>
              <FilterField label="Meeting type">
                <select className="filter-select" value={draftFilterSelfTraining} onChange={e => setDraftFilterSelfTraining(e.target.value)}>
                  <option value="all">All meeting types</option>
                  <option value="true">Self-training only</option>
                  <option value="false">Led meetings only</option>
                </select>
              </FilterField>
              <FilterField label="Sort by">
                <select className="filter-select" value={draftSortBy} onChange={e => setDraftSortBy(e.target.value)}>
                  <option value="date-desc">Newest date</option>
                  <option value="date-asc">Oldest date</option>
                  <option value="time-asc">Time earliest</option>
                  <option value="time-desc">Time latest</option>
                  <option value="topic-asc">Topic A-Z</option>
                  <option value="topic-desc">Topic Z-A</option>
                  <option value="trade-asc">Trade A-Z</option>
                  <option value="trade-desc">Trade Z-A</option>
                  <option value="leader-asc">Leader A-Z</option>
                  <option value="leader-desc">Leader Z-A</option>
                  <option value="project-asc">Project A-Z</option>
                  <option value="project-desc">Project Z-A</option>
                  <option value="location-asc">Address A-Z</option>
                  <option value="location-desc">Address Z-A</option>
                  <option value="attendees-desc">Most attendees</option>
                  <option value="attendees-asc">Least attendees</option>
                  <option value="created-desc">Newest created</option>
                  <option value="created-asc">Oldest created</option>
                </select>
              </FilterField>
            </div>

            <div className="filter-toolbar">
              <div className="pagination-page-size">
                <span className="pagination-page-size-label">Rows per page</span>
                <select className="filter-select filter-select--compact" value={draftPageSize} onChange={e => setDraftPageSize(Number(e.target.value))}>
                  {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
                </select>
              </div>
              <div className="filter-toolbar-actions">
                {draftFiltersActive && (
                  <button className="filter-clear-btn" onClick={resetDraftFilters}>Clear filters</button>
                )}
                {selectedDraftIds.size > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={() => handleOpenDraftEdit(Array.from(selectedDraftIds))}>
                    ✎ Edit ({selectedDraftIds.size})
                  </button>
                )}
              </div>
              <span className="pagination-info draft-filter-summary filter-summary-pill">
                {filteredDrafts.length !== draftMeetings.length
                  ? `${getPageRangeLabel(draftPage, draftPageSize, filteredDrafts.length)} filtered from ${draftMeetings.length}`
                  : `${getPageRangeLabel(draftPage, draftPageSize, draftMeetings.length)} total`}
              </span>
            </div>
          </div>

          {draftMeetings.length === 0 ? (
            <div className="drafts-empty-state">No draft meetings.</div>
          ) : (
          <div className="drafts-table-wrap">
            <table className="drafts-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={pagedDrafts.length > 0 && pagedDrafts.every(d => selectedDraftIds.has(d.id))}
                      onChange={toggleSelectAllDrafts}
                      title="Select all on this page"
                    />
                  </th>
                  <th>Date</th>
                  <th>Project</th>
                  <th>Time</th>
                  <th>Trade</th>
                  <th>Topic</th>
                  <th>Attendees</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pagedDrafts.map(d => (
                  <tr key={d.id} className={selectedDraftIds.has(d.id) ? 'draft-row--selected' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDraftIds.has(d.id)}
                        onChange={() => toggleDraftSelect(d.id)}
                      />
                    </td>
                    <td className="draft-cell-date">{d.date ? d.date.slice(0, 10) : '—'}</td>
                    <td>{d.project?.name || '—'}</td>
                    <td>{d.time}</td>
                    <td>{d.trade || '—'}</td>
                    <td className="draft-cell-topic">{d.topic}</td>
                    <td>{d.attendees?.length ?? 0}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate(`/meetings/${d.id}/edit`, {
                            state: {
                              draftIds: pagedDrafts.map(x => x.id),
                              draftIndex: pagedDrafts.findIndex(x => x.id === d.id),
                            }
                          })}
                        >
                          Review
                        </button>
                        <Link
                          className="btn btn-secondary btn-sm"
                          to={`/meetings/${d.id}/edit`}
                          {...NEW_TAB_LINK_PROPS}
                          title="Open this draft in a new tab"
                        >
                          New Tab
                        </Link>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenDraftEdit([d.id], d)}
                          title="Quick edit worker performing the meeting, trade, topic or add attendees"
                        >
                          ✎
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteDraft(d.id, d.topic)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          {draftMeetings.length > 0 && draftTotalPages > 1 && (
            <div className="pagination-bar">
              <span className="pagination-info">Page {draftPage} of {draftTotalPages}</span>
              <div className="pagination-controls">
                <button className="btn btn-secondary btn-sm" onClick={() => setDraftPage(1)} disabled={draftPage === 1}>« First</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setDraftPage(p => Math.max(1, p - 1))} disabled={draftPage === 1}>← Prev</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setDraftPage(p => Math.min(draftTotalPages, p + 1))} disabled={draftPage === draftTotalPages}>Next →</button>
                <button className="btn btn-secondary btn-sm" onClick={() => setDraftPage(draftTotalPages)} disabled={draftPage === draftTotalPages}>Last »</button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="filter-bar meetings-filter-bar">
        <div className="filter-grid filter-grid--top">
          <FilterField label="Loaded-page search">
            <input
              className="filter-search-input"
              type="text"
              placeholder="Quick search inside loaded results..."
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </FilterField>
          <FilterField label="Topic keyword">
            <input
              className="meetings-filter-input"
              type="text"
              placeholder="Topic contains..."
              value={filterTopic}
              onChange={e => setFilterTopic(e.target.value)}
            />
          </FilterField>
          <FilterField label="Trade">
            <select value={filterTrade} onChange={e => setFilterTrade(e.target.value)} className="filter-select">
              <option value="">All trades</option>
              {meetingFilterOptions.trades.map(trade => <option key={trade} value={trade}>{trade}</option>)}
            </select>
          </FilterField>
          <FilterField label="Attendee">
            <input
              list="meeting-attendee-options"
              className="meetings-filter-input"
              type="text"
              placeholder="Attendee name..."
              value={filterPerson}
              onChange={e => setFilterPerson(e.target.value)}
            />
            <datalist id="meeting-attendee-options">
              {meetingFilterOptions.attendees.map(attendee => <option key={attendee} value={attendee} />)}
            </datalist>
          </FilterField>
          <FilterField label="Leader">
            <input
              list="meeting-leader-options"
              className="meetings-filter-input"
              type="text"
              placeholder="Leader name..."
              value={filterLeader}
              onChange={e => setFilterLeader(e.target.value)}
            />
            <datalist id="meeting-leader-options">
              {meetingFilterOptions.leaders.map(leader => <option key={leader} value={leader} />)}
            </datalist>
          </FilterField>
          <FilterField label="Project">
            <select value={filterProject} onChange={e => setFilterProject(e.target.value)} className="filter-select">
              <option value="">All projects</option>
              {meetingFilterOptions.projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </FilterField>
        </div>

        <div className="filter-grid filter-grid--bottom">
          <FilterField label="Address">
            <input
              className="meetings-filter-input"
              type="text"
              placeholder="Address contains..."
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
            />
          </FilterField>
          <FilterField label="Date from">
            <input className="meetings-filter-input meetings-filter-input--date" type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </FilterField>
          <FilterField label="Date to">
            <input className="meetings-filter-input meetings-filter-input--date" type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </FilterField>
          <FilterField label="Time range">
            <select value={filterTimeRange} onChange={e => setFilterTimeRange(e.target.value)} className="filter-select">
              <option value="">Any time</option>
              <option value="before-06">Before 06:00</option>
              <option value="morning">06:00-11:59</option>
              <option value="midday">12:00-14:59</option>
              <option value="afternoon">15:00-17:59</option>
              <option value="evening">18:00-21:59</option>
              <option value="night">22:00-05:59</option>
            </select>
          </FilterField>
          <FilterField label="Meeting type">
            <select value={filterSelfTraining} onChange={e => setFilterSelfTraining(e.target.value)} className="filter-select">
              <option value="all">All meeting types</option>
              <option value="true">Self-training only</option>
              <option value="false">Led meetings only</option>
            </select>
          </FilterField>
          <FilterField label="Sort by">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
              <option value="newest">Newest date</option>
              <option value="oldest">Oldest date</option>
              <option value="time-asc">Time earliest</option>
              <option value="time-desc">Time latest</option>
              <option value="az">Topic A-Z</option>
              <option value="za">Topic Z-A</option>
              <option value="trade-asc">Trade A-Z</option>
              <option value="trade-desc">Trade Z-A</option>
              <option value="leader-asc">Leader A-Z</option>
              <option value="leader-desc">Leader Z-A</option>
              <option value="project-asc">Project A-Z</option>
              <option value="project-desc">Project Z-A</option>
              <option value="location-asc">Address A-Z</option>
              <option value="location-desc">Address Z-A</option>
              <option value="most-attendees">Most attendees</option>
              <option value="least-attendees">Least attendees</option>
              <option value="created-desc">Newest created</option>
              <option value="created-asc">Oldest created</option>
            </select>
          </FilterField>
        </div>

        <div className="filter-toolbar filter-toolbar--meetings">
          <div className="meeting-toolbar-groups">
            <div className="pagination-page-size">
              <span className="pagination-page-size-label">Rows per page</span>
              <select className="filter-select filter-select--compact" value={meetingPageSize} onChange={e => setMeetingPageSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <div className="pagination-page-size">
              <span className="pagination-page-size-label">Export chunk</span>
              <select className="filter-select filter-select--compact" value={exportChunkSize} onChange={e => setExportChunkSize(Number(e.target.value))}>
                {MEETING_CHUNK_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>
          <div className="filter-toolbar-actions">
            {filtersActive && (
              <button className="filter-clear-btn" onClick={resetMeetingFilters}>
                Clear filters
              </button>
            )}
          </div>
          <span className="pagination-info meetings-filter-summary filter-summary-pill">
            {getPageRangeLabel(meetingPage, meetingPageSize, meetingTotalCount)} total{loading ? ' · Updating…' : ''}
          </span>
        </div>
        {searchText && (
          <div className="meetings-inline-note">
            Quick search applies only to the currently loaded page. Server-side filters above control the full result set and exports.
          </div>
        )}
      </div>

      {isAdmin && pagedMeetings.length > 0 && (
        <div className="meeting-selection-toolbar">
          <label className="meeting-selection-toggle">
            <input
              type="checkbox"
              checked={pagedMeetings.length > 0 && pagedMeetings.every(meeting => selectedMeetingIds.has(meeting.id))}
              onChange={toggleSelectAllMeetings}
            />
            <span>Select page</span>
          </label>
          <span className="meeting-selection-count">
            Selected: {selectedMeetingIds.size}
          </span>
          {selectedMeetingIds.size > 0 && (
            <div className="meeting-selection-actions">
              <button className="btn btn-secondary btn-sm" onClick={clearSelectedMeetings}>
                Clear selection
              </button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportSelectedZIP}>
                ZIP selected ({selectedMeetingIds.size})
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteSelectedMeetings}>
                Delete selected
              </button>
            </div>
          )}
        </div>
      )}

      <div className="meetings-list">
        {pagedMeetings.length === 0 ? (
          <div className="empty-state">
            <p>{meetingTotalCount === 0 ? 'No meetings recorded for the selected filters.' : 'No loaded-page matches for the current quick search.'}</p>
          </div>
        ) : (
          pagedMeetings.map((meeting) => (
            <div key={meeting.id} className={`meeting-row ${selectedMeetingIds.has(meeting.id) ? 'meeting-row--selected' : ''}`}>
              {isAdmin && (
                <div className="meeting-row-select">
                  <input
                    type="checkbox"
                    checked={selectedMeetingIds.has(meeting.id)}
                    onChange={() => toggleMeetingSelect(meeting.id)}
                    aria-label={`Select meeting ${meeting.topic}`}
                  />
                </div>
              )}

              <div className="meeting-row-body">
                <div className="meeting-row-top">
                  <div className="meeting-row-heading">
                    <h3 className="meeting-row-topic">{meeting.topic}</h3>
                    <div className="meeting-row-meta">
                      <span>{formatMeetingDate(meeting.date)}</span>
                      {meeting.time && <><span className="meta-sep">•</span><span>{meeting.time}</span></>}
                      {meeting.project?.name && <><span className="meta-sep">•</span><span>{meeting.project.name}</span></>}
                      {meeting.location && <><span className="meta-sep">•</span><span>{meeting.location}</span></>}
                    </div>
                  </div>

                  <div className="meeting-row-actions">
                    <Link className="meeting-action-btn" to={`/meetings/${meeting.id}`} title="View details" aria-label="View details">
                      →
                    </Link>
                    <Link className="meeting-action-btn" to={`/meetings/${meeting.id}`} {...NEW_TAB_LINK_PROPS} title="Open in new tab" aria-label="Open in new tab">
                      ↗
                    </Link>
                    <button
                      className="meeting-action-btn meeting-action-btn--pdf"
                      onClick={() => handlePDF(meeting)}
                      disabled={pdfLoading === meeting.id}
                      title="Download PDF"
                      aria-label="Download PDF"
                    >
                      {pdfLoading === meeting.id ? '…' : 'PDF'}
                    </button>
                    {isAdmin && (
                      <>
                        <Link className="meeting-action-btn" to={`/meetings/${meeting.id}/edit`} title="Edit" aria-label="Edit">
                          ✎
                        </Link>
                        <button
                          className="meeting-action-btn meeting-action-btn--danger"
                          onClick={() => handleDelete(meeting.id, meeting.topic)}
                          title="Delete"
                          aria-label="Delete"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="meeting-row-chips">
                  {meeting.leader_name && <span className="meeting-chip meeting-chip--leader">Leader: {meeting.leader_name}</span>}
                  {meeting.trade && <span className="meeting-chip">Trade: {meeting.trade}</span>}
                  <span className="meeting-chip">Attendees: {meeting.attendees?.length ?? 0}</span>
                  {meeting.checklists?.length > 0 && <span className="meeting-chip">Checklists: {meeting.checklists.length}</span>}
                  {meeting.photos?.length > 0 && <span className="meeting-chip">Photos: {meeting.photos.length}</span>}
                  {meeting.is_self_training && <span className="meeting-chip">Self-training</span>}
                </div>

                {meeting.attendees?.length > 0 && (
                  <div className="meeting-row-summary">
                    <strong>Attendees:</strong> {summarizeList(meeting.attendees.map(attendee => attendee.name), 4)}
                  </div>
                )}

                {meeting.checklists?.length > 0 && (
                  <div className="meeting-row-summary meeting-row-summary--muted">
                    <strong>Checklists:</strong> {summarizeList(meeting.checklists.map(checklist => checklist.name), 3)}
                  </div>
                )}
              </div>

              <Link className="meeting-row-arrow" to={`/meetings/${meeting.id}`} aria-label={`Open ${meeting.topic}`}>
                ›
              </Link>
            </div>
          ))
        )}

        {meetingTotalPages > 1 && (
          <div className="pagination-bar">
            <span className="pagination-info">Page {meetingPage} of {meetingTotalPages}</span>
            <div className="pagination-controls">
              <button className="btn btn-secondary btn-sm" onClick={() => setMeetingPage(1)} disabled={meetingPage === 1}>« First</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMeetingPage(p => Math.max(1, p - 1))} disabled={meetingPage === 1}>← Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMeetingPage(p => Math.min(meetingTotalPages, p + 1))} disabled={meetingPage === meetingTotalPages}>Next →</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setMeetingPage(meetingTotalPages)} disabled={meetingPage === meetingTotalPages}>Last »</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
