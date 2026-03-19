import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Calendar, dateFnsLocalizer } from 'react-big-calendar'
import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isAfter,
  isBefore,
  isSameDay,
  parse,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { enUS } from 'date-fns/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ANALYTICS_TYPE_KEYS,
  ANALYTICS_TYPE_META,
  buildAdminAnalyticsView,
  fetchAdminAnalyticsDataset,
  getDefaultAnalyticsDateRange,
} from '../lib/adminAnalytics'
import { NEW_TAB_LINK_PROPS, followAppPath } from '../lib/navigation'
import 'react-big-calendar/lib/css/react-big-calendar.css'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales,
})

const formatDate = (value) => {
  if (!value) return '—'
  return format(new Date(`${value}T00:00:00`), 'd.M.yyyy')
}

const metricCards = (metrics) => [
  { key: 'total', label: 'Filtered events', value: metrics.totalEvents, tone: 'primary' },
  { key: 'meetings', label: 'Meetings', value: metrics.meetings, tone: 'meetings' },
  { key: 'checklists', label: 'Safety Checklists', value: metrics.checklists, tone: 'checklistCompletions' },
  { key: 'incidents', label: 'Incidents', value: metrics.incidents, tone: 'incidents' },
  { key: 'coverage', label: 'Coverage', value: `${metrics.coverageRate}%`, tone: 'success' },
  { key: 'gap', label: 'Longest gap', value: `${metrics.longestGapDays}d`, tone: 'warning' },
]

function AnalyticsCalendarToolbar({ currentDate, currentView, onNavigate, onChangeView }) {
  const getTitle = () => {
    if (currentView === 'month') {
      return format(currentDate, 'M.yyyy')
    }

    if (currentView === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(weekStart, 'd.M.yyyy')} - ${format(weekEnd, 'd.M.yyyy')}`
    }

    const agendaEnd = addDays(currentDate, 29)
    return `${format(currentDate, 'd.M.yyyy')} - ${format(agendaEnd, 'd.M.yyyy')}`
  }

  return (
    <div className="analytics-calendar-toolbar">
      <div className="analytics-calendar-toolbar-nav">
        <button type="button" className="analytics-toolbar-btn" onClick={() => onNavigate('TODAY')}>
          Today
        </button>
        <button type="button" className="analytics-toolbar-btn" onClick={() => onNavigate('PREV')}>
          Back
        </button>
        <button type="button" className="analytics-toolbar-btn" onClick={() => onNavigate('NEXT')}>
          Next
        </button>
      </div>

      <h5 className="analytics-calendar-toolbar-title">{getTitle()}</h5>

      <div className="analytics-calendar-toolbar-views">
        {['month', 'week', 'agenda'].map((view) => (
          <button
            key={view}
            type="button"
            className={`analytics-toolbar-btn ${currentView === view ? 'is-active' : ''}`}
            onClick={() => onChangeView(view)}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}

const formatAgendaDate = (date) => format(date, 'd.M.yyyy')
const formatAgendaTime = (date) => format(date, 'HH:mm')

const ANALYTICS_PERSON_COLOR_PALETTE = [
  '#2563eb',
  '#16a34a',
  '#dc2626',
  '#ca8a04',
  '#7c3aed',
  '#db2777',
  '#0891b2',
  '#ea580c',
  '#475569',
  '#0f766e',
  '#be123c',
  '#4338ca',
]

const buildExtendedPersonColor = (index) => {
  const hue = Math.round((index * 137.508) % 360)
  return `hsl(${hue} 72% 44%)`
}

const getAnalyticsPersonColor = (index) => ANALYTICS_PERSON_COLOR_PALETTE[index] || buildExtendedPersonColor(index)

const buildMeetingSegmentsGradient = (colors) => {
  if (colors.length === 0) return ''
  if (colors.length === 1) return colors[0]

  const step = 100 / colors.length
  const stops = colors.map((color, index) => {
    const start = (step * index).toFixed(2)
    const end = (step * (index + 1)).toFixed(2)
    return `${color} ${start}%, ${color} ${end}%`
  })

  return `linear-gradient(90deg, ${stops.join(', ')})`
}

const getMeetingMatchedPeople = (event, selectedPeople) => {
  if (event?.resource?.type !== ANALYTICS_TYPE_META.meetings.key) return []
  if (!selectedPeople.length) return []

  const eventTokenSet = new Set(event.resource.personTokens || [])
  const eventNameSet = new Set(event.resource.normalizedNames || [])

  return selectedPeople.filter((person) => (
    eventTokenSet.has(person.id) || eventNameSet.has(person.normalizedName)
  ))
}

function MeetingColorPreview({ matchedPeople, className = '' }) {
  if (!matchedPeople.length) return null

  const gradient = buildMeetingSegmentsGradient(matchedPeople.map((person) => person.color))

  return (
    <span
      className={`analytics-meeting-preview ${className}`.trim()}
      style={{ '--meeting-preview-gradient': gradient }}
      aria-hidden="true"
    />
  )
}

function AnalyticsCalendarEvent({ event, matchedPeople }) {
  const showLocation = event.resource.type === ANALYTICS_TYPE_META.meetings.key && event.resource.location

  return (
    <div className="analytics-calendar-event">
      <MeetingColorPreview matchedPeople={matchedPeople} className="analytics-meeting-preview--calendar" />
      <strong>{event.title}</strong>
      {showLocation && <span>{event.resource.location}</span>}
    </div>
  )
}

function AnalyticsAgendaTable({ events, getMeetingColoring }) {
  if (events.length === 0) {
    return <p className="analytics-empty">No events in the current filter set.</p>
  }

  return (
    <div className="analytics-agenda-shell">
      <table className="analytics-agenda-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
            <th>Title</th>
            <th>Project</th>
            <th>Leader</th>
            <th>Address</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const meta = ANALYTICS_TYPE_META[event.resource.type]
            const leaderName = event.resource.leaderName || '—'
            const location = event.resource.location || '—'
            const path = event.resource.sourcePath
            const meetingColoring = getMeetingColoring(event)

            return (
              <tr key={event.id}>
                <td>{formatAgendaDate(event.start)}</td>
                <td>{formatAgendaTime(event.start)}</td>
                <td>
                  <span className="analytics-agenda-type" style={{ '--agenda-accent': meta.color, '--agenda-accent-soft': meta.lightColor }}>
                    {meta.shortLabel}
                  </span>
                </td>
                <td>
                  <div className="analytics-agenda-title-cell">
                    {meetingColoring.matchedPeople.length > 0 && (
                      <div className="analytics-agenda-meeting-colors">
                        <MeetingColorPreview matchedPeople={meetingColoring.matchedPeople} />
                        <span>
                          {meetingColoring.matchedPeople.map((person) => person.label).join(' · ')}
                        </span>
                      </div>
                    )}
                    <strong>{event.title}</strong>
                    <span>{event.resource.subtitle || '—'}</span>
                  </div>
                </td>
                <td>{event.resource.projectName || '—'}</td>
                <td>{event.resource.type === ANALYTICS_TYPE_META.meetings.key ? leaderName : '—'}</td>
                <td>{event.resource.type === ANALYTICS_TYPE_META.meetings.key ? location : '—'}</td>
                <td>
                  {path ? (
                    <div className="analytics-agenda-actions">
                      <Link className="btn btn-secondary btn-sm" to={path}>Open</Link>
                      <Link className="btn btn-secondary btn-sm" to={path} {...NEW_TAB_LINK_PROPS}>New Tab</Link>
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AdminAnalyticsDashboard() {
  const navigate = useNavigate()
  const defaults = useMemo(() => getDefaultAnalyticsDateRange(), [])
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [calendarView, setCalendarView] = useState('month')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(null)
  const [filters, setFilters] = useState({
    ...defaults,
    selectedPersonIds: [],
    personMode: 'ANY',
    meetingStatus: 'all',
    projectName: '',
    personSearch: '',
    enabledTypes: ANALYTICS_TYPE_KEYS,
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')

      try {
        const nextDataset = await fetchAdminAnalyticsDataset({
          dateFrom: filters.dateFrom,
          dateTo: filters.dateTo,
        })
        setDataset(nextDataset)
      } catch (loadError) {
        setError(loadError.message || 'Failed to load analytics data.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [filters.dateFrom, filters.dateTo])

  const analytics = useMemo(() => {
    if (!dataset) return null
    return buildAdminAnalyticsView({ dataset, filters })
  }, [dataset, filters])

  const filteredPersonOptions = useMemo(() => {
    if (!analytics) return []
    const query = filters.personSearch.trim().toLowerCase()
    if (!query) return analytics.personOptions
    return analytics.personOptions.filter((person) => person.label.toLowerCase().includes(query))
  }, [analytics, filters.personSearch])

  const selectedPeople = useMemo(() => {
    if (!analytics) return []

    const personById = new Map(analytics.personOptions.map((person) => [person.id, person]))

    return filters.selectedPersonIds
      .map((personId, index) => {
        const person = personById.get(personId)
        if (!person) return null

        return {
          ...person,
          order: index + 1,
          color: getAnalyticsPersonColor(index),
        }
      })
      .filter(Boolean)
  }, [analytics, filters.selectedPersonIds])

  const selectedDayMeetings = useMemo(() => {
    if (!analytics || !selectedCalendarDate) return []

    return analytics.events
      .filter((event) => event.resource.type === ANALYTICS_TYPE_META.meetings.key && isSameDay(event.start, selectedCalendarDate))
      .sort((left, right) => left.start - right.start)
  }, [analytics, selectedCalendarDate])

  const agendaEvents = useMemo(() => {
    if (!analytics) return []
    const agendaStart = startOfDay(calendarDate)
    const agendaEnd = endOfDay(addDays(calendarDate, 29))

    return analytics.events
      .filter((event) => {
        if (isBefore(event.start, agendaStart)) return false
        if (isAfter(event.start, agendaEnd)) return false
        return true
      })
      .sort((left, right) => left.start - right.start)
  }, [analytics, calendarDate])

  const handleCalendarNavigate = (action) => {
    if (action === 'TODAY') {
      setCalendarDate(new Date())
      return
    }

    if (calendarView === 'month') {
      setCalendarDate((current) => {
        const monthDelta = action === 'NEXT' ? 1 : -1
        return new Date(current.getFullYear(), current.getMonth() + monthDelta, 1)
      })
      return
    }

    if (calendarView === 'week') {
      setCalendarDate((current) => addDays(current, action === 'NEXT' ? 7 : -7))
      return
    }

    setCalendarDate((current) => addDays(current, action === 'NEXT' ? 30 : -30))
  }

  const handleCalendarViewChange = (view) => {
    setCalendarView(view)
  }

  const toggleType = (typeKey) => {
    setFilters((current) => {
      const enabled = current.enabledTypes.includes(typeKey)
      const nextTypes = enabled
        ? current.enabledTypes.filter((key) => key !== typeKey)
        : [...current.enabledTypes, typeKey]

      return {
        ...current,
        enabledTypes: nextTypes.length > 0 ? nextTypes : current.enabledTypes,
      }
    })
  }

  const togglePerson = (personId) => {
    setFilters((current) => ({
      ...current,
      selectedPersonIds: current.selectedPersonIds.includes(personId)
        ? current.selectedPersonIds.filter((id) => id !== personId)
        : [...current.selectedPersonIds, personId],
    }))
  }

  const handleSelectEvent = (event, mouseEvent) => {
    const path = event.resource?.sourcePath
    if (!path) return

    followAppPath(navigate, path, {
      event: mouseEvent,
      defaultNewTab: event.resource?.type === ANALYTICS_TYPE_META.meetings.key,
    })
  }

  const openDayModal = (date) => {
    if (!date) return
    setSelectedCalendarDate(date)
  }

  const closeDayModal = () => {
    setSelectedCalendarDate(null)
  }

  const getMeetingColoring = (event) => {
    const matchedPeople = getMeetingMatchedPeople(event, selectedPeople)
    return {
      matchedPeople,
      gradient: buildMeetingSegmentsGradient(matchedPeople.map((person) => person.color)),
    }
  }

  const eventStyleGetter = (event) => {
    const meta = ANALYTICS_TYPE_META[event.resource.type]
    const isDraftMeeting = event.resource.type === ANALYTICS_TYPE_META.meetings.key && event.resource.isDraft
    const meetingColoring = getMeetingColoring(event)
    const hasMeetingColors = meetingColoring.matchedPeople.length > 0

    return {
      style: {
        background: hasMeetingColors
          ? meetingColoring.gradient
          : (isDraftMeeting ? meta.lightColor : meta.color),
        backgroundColor: hasMeetingColors
          ? meetingColoring.matchedPeople[0].color
          : (isDraftMeeting ? meta.lightColor : meta.color),
        borderColor: hasMeetingColors
          ? meetingColoring.matchedPeople[0].color
          : meta.color,
        color: hasMeetingColors ? '#fff' : (isDraftMeeting ? meta.color : '#fff'),
        borderRadius: '8px',
        boxShadow: 'none',
        fontSize: '12px',
        borderStyle: isDraftMeeting ? 'dashed' : 'solid',
        borderWidth: '1px',
        fontWeight: isDraftMeeting ? 700 : 600,
        overflow: 'hidden',
      },
    }
  }

  if (loading) {
    return <div className="spinner"></div>
  }

  if (error) {
    return (
      <div className="data-table">
        <h3 className="section-title">Analytics</h3>
        <p>{error}</p>
      </div>
    )
  }

  if (!analytics) return null

  return (
    <div className="analytics-dashboard">
      <div className="analytics-toolbar">
        <div>
          <h3 className="section-title">Reporting Analytics</h3>
          <p className="analytics-subtitle">
            Calendar and trend analysis for meetings, checklists, incidents, corrective actions, and disciplinary actions.
          </p>
        </div>
        <div className="analytics-view-toggle">
          <button
            type="button"
            className={`analytics-chip ${calendarView === 'month' ? 'is-active' : ''}`}
            onClick={() => setCalendarView('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`analytics-chip ${calendarView === 'week' ? 'is-active' : ''}`}
            onClick={() => setCalendarView('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`analytics-chip ${calendarView === 'agenda' ? 'is-active' : ''}`}
            onClick={() => setCalendarView('agenda')}
          >
            Agenda
          </button>
        </div>
      </div>

      <div className="analytics-filters">
        <div className="analytics-filter-group analytics-filter-group--date">
          <label className="analytics-label">Date from</label>
          <input
            type="date"
            className="analytics-input"
            value={filters.dateFrom}
            onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
          />
        </div>
        <div className="analytics-filter-group analytics-filter-group--date">
          <label className="analytics-label">Date to</label>
          <input
            type="date"
            className="analytics-input"
            value={filters.dateTo}
            onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
          />
        </div>
        <div className="analytics-filter-group">
          <label className="analytics-label">Project</label>
          <select
            className="analytics-input analytics-select"
            value={filters.projectName}
            onChange={(event) => setFilters((current) => ({ ...current, projectName: event.target.value }))}
          >
            <option value="">All projects</option>
            {analytics.projectOptions.map((projectName) => (
              <option key={projectName} value={projectName}>{projectName}</option>
            ))}
          </select>
        </div>
        <div className="analytics-filter-group analytics-filter-group--person-mode">
          <label className="analytics-label">Person mode</label>
          <div className="analytics-inline-toggle">
            <button
              type="button"
              className={`analytics-chip ${filters.personMode === 'ANY' ? 'is-active' : ''}`}
              onClick={() => setFilters((current) => ({ ...current, personMode: 'ANY' }))}
            >
              ANY
            </button>
            <button
              type="button"
              className={`analytics-chip ${filters.personMode === 'ALL' ? 'is-active' : ''}`}
              onClick={() => setFilters((current) => ({ ...current, personMode: 'ALL' }))}
            >
              ALL
            </button>
          </div>
        </div>
        <div className="analytics-filter-group analytics-filter-group--meeting-scope">
          <label className="analytics-label">Meetings scope</label>
          <div className="analytics-inline-toggle">
            <button
              type="button"
              className={`analytics-chip ${filters.meetingStatus === 'all' ? 'is-active' : ''}`}
              onClick={() => setFilters((current) => ({ ...current, meetingStatus: 'all' }))}
            >
              Drafts + approved
            </button>
            <button
              type="button"
              className={`analytics-chip ${filters.meetingStatus === 'approved' ? 'is-active' : ''}`}
              onClick={() => setFilters((current) => ({ ...current, meetingStatus: 'approved' }))}
            >
              Approved only
            </button>
            <button
              type="button"
              className={`analytics-chip ${filters.meetingStatus === 'draft' ? 'is-active' : ''}`}
              onClick={() => setFilters((current) => ({ ...current, meetingStatus: 'draft' }))}
            >
              Drafts only
            </button>
          </div>
        </div>
      </div>

      <div className="analytics-type-filters">
        {ANALYTICS_TYPE_KEYS.map((typeKey) => {
          const meta = ANALYTICS_TYPE_META[typeKey]
          const checked = filters.enabledTypes.includes(typeKey)
          return (
            <button
              key={typeKey}
              type="button"
              className={`analytics-type-pill ${checked ? 'is-active' : ''}`}
              onClick={() => toggleType(typeKey)}
              style={{ '--analytics-accent': meta.color, '--analytics-accent-soft': meta.lightColor }}
            >
              <span className="analytics-type-pill-dot" />
              {meta.label}
            </button>
          )
        })}
      </div>

      <div className="analytics-people-panel">
        <div className="analytics-people-header">
          <div>
            <strong>People filter</strong>
            <span>{filters.selectedPersonIds.length} selected</span>
          </div>
          <input
            type="text"
            className="analytics-input analytics-search"
            placeholder="Search people..."
            value={filters.personSearch}
            onChange={(event) => setFilters((current) => ({ ...current, personSearch: event.target.value }))}
          />
        </div>
        <div className="analytics-people-list">
          {filteredPersonOptions.map((person) => {
            const selectedPerson = selectedPeople.find((item) => item.id === person.id)

            return (
              <button
                key={person.id}
                type="button"
                className={`analytics-person-pill ${selectedPerson ? 'is-selected' : ''}`}
                onClick={() => togglePerson(person.id)}
                style={selectedPerson ? { '--person-accent': selectedPerson.color } : undefined}
              >
                <div className="analytics-person-pill-title-row">
                  {selectedPerson && (
                    <span className="analytics-person-pill-swatch" aria-hidden="true">
                      {selectedPerson.order}
                    </span>
                  )}
                  <span>{person.label}</span>
                </div>
                <small>{person.kind === 'leader' ? 'Performs the meetings' : 'Person'}</small>
              </button>
            )
          })}
        </div>
        {selectedPeople.length > 0 && (
          <div className="analytics-people-legend">
            {selectedPeople.map((person) => (
              <div key={person.id} className="analytics-people-legend-item">
                <MeetingColorPreview matchedPeople={[person]} />
                <span>{person.order}. {person.label}</span>
              </div>
            ))}
            <p className="analytics-people-legend-note">
              Meetings shared by multiple selected people use split colors to expose overlaps and suspicious records.
            </p>
          </div>
        )}
      </div>

      {analytics.allModeNoteVisible && (
        <div className="analytics-note">
          `ALL` is exact for meetings. For incidents, checklist completions, corrective actions, and disciplinary actions the current data model can only approximate multi-person intersections, so those sources still behave as `ANY`.
        </div>
      )}

      <div className="analytics-inline-stats analytics-inline-stats-top">
        <span><strong>Approved meetings:</strong> {analytics.events.filter((event) => event.resource.type === ANALYTICS_TYPE_META.meetings.key && event.resource.meetingStatus === 'approved').length}</span>
        <span><strong>Draft meetings:</strong> {analytics.events.filter((event) => event.resource.type === ANALYTICS_TYPE_META.meetings.key && event.resource.meetingStatus === 'draft').length}</span>
      </div>

      <div className="analytics-metrics-grid">
        {metricCards(analytics.metrics).map((card) => (
          <div key={card.key} className={`analytics-metric-card tone-${card.tone}`}>
            <span className="analytics-metric-label">{card.label}</span>
            <strong className="analytics-metric-value">{card.value}</strong>
          </div>
        ))}
      </div>

      <div className="analytics-layout-grid">
        <div className="analytics-panel analytics-calendar-panel">
          <div className="analytics-panel-header">
            <div>
              <h4>Calendar view</h4>
              <p>{analytics.events.length} events in the current filter set</p>
            </div>
          </div>
          <AnalyticsCalendarToolbar
            currentDate={calendarDate}
            currentView={calendarView}
            onNavigate={handleCalendarNavigate}
            onChangeView={handleCalendarViewChange}
          />
          <div className="analytics-calendar-shell">
            {calendarView === 'agenda' ? (
              <AnalyticsAgendaTable events={agendaEvents} getMeetingColoring={getMeetingColoring} />
            ) : (
              <Calendar
                localizer={localizer}
                events={analytics.events}
                date={calendarDate}
                startAccessor="start"
                endAccessor="end"
                view={calendarView}
                onNavigate={setCalendarDate}
                onView={setCalendarView}
                views={['month', 'week']}
                toolbar={false}
                popup
                selectable
                components={{
                  event: (props) => (
                    <AnalyticsCalendarEvent {...props} matchedPeople={getMeetingColoring(props.event).matchedPeople} />
                  ),
                }}
                eventPropGetter={eventStyleGetter}
                onSelectEvent={handleSelectEvent}
                onSelectSlot={(slotInfo) => openDayModal(slotInfo.start)}
                onShowMore={(events, date) => openDayModal(date)}
              />
            )}
          </div>
        </div>

        <div className="analytics-side-stack">
          <div className="analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h4>Monthly trend</h4>
                <p>Stacked event volume by month</p>
              </div>
            </div>
            <div className="analytics-chart-shell">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={analytics.monthlySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  {ANALYTICS_TYPE_KEYS.map((typeKey) => (
                    <Bar
                      key={typeKey}
                      dataKey={typeKey}
                      stackId="events"
                      fill={ANALYTICS_TYPE_META[typeKey].color}
                      name={ANALYTICS_TYPE_META[typeKey].shortLabel}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="analytics-panel">
            <div className="analytics-panel-header">
              <div>
                <h4>Weekly rhythm</h4>
                <p>Reporting continuity week over week</p>
              </div>
            </div>
            <div className="analytics-chart-shell">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analytics.weeklySeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="#1f4e79" strokeWidth={3} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="analytics-bottom-grid">
        <div className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h4>Gap analysis</h4>
              <p>Longest silent reporting windows in the selected range</p>
            </div>
          </div>
          {analytics.silentWindows.length === 0 ? (
            <p className="analytics-empty">No silent windows detected in the selected period.</p>
          ) : (
            <div className="analytics-gap-list">
              {analytics.silentWindows.map((window) => (
                <div key={`${window.start}-${window.end}`} className="analytics-gap-card">
                  <strong>{window.days} day gap</strong>
                  <span>{formatDate(window.start)} to {formatDate(window.end)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="analytics-panel">
          <div className="analytics-panel-header">
            <div>
              <h4>Volume split</h4>
              <p>Current filtered distribution by source</p>
            </div>
          </div>
          <div className="analytics-chart-shell">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={ANALYTICS_TYPE_KEYS.map((typeKey) => ({
                  name: ANALYTICS_TYPE_META[typeKey].shortLabel,
                  value: analytics.typeCounts[typeKey],
                  color: ANALYTICS_TYPE_META[typeKey].color,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {ANALYTICS_TYPE_KEYS.map((typeKey) => (
                    <Cell key={typeKey} fill={ANALYTICS_TYPE_META[typeKey].color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="analytics-inline-stats">
            <span>Busiest month: <strong>{analytics.metrics.busiestMonth}</strong></span>
            <span>Events in busiest month: <strong>{analytics.metrics.busiestMonthCount}</strong></span>
            <span>Overdue actions: <strong>{analytics.metrics.overdueActions}</strong></span>
          </div>
        </div>
      </div>

      {selectedCalendarDate && (
        <div className="analytics-day-modal-overlay" onClick={closeDayModal}>
          <div className="analytics-day-modal" onClick={(event) => event.stopPropagation()}>
            <div className="analytics-day-modal-header">
              <div>
                <h4>Meetings on {format(selectedCalendarDate, 'MMMM d, yyyy')}</h4>
                <p>{selectedDayMeetings.length} meeting{selectedDayMeetings.length === 1 ? '' : 's'} in the current filter set</p>
              </div>
              <button type="button" className="analytics-day-modal-close" onClick={closeDayModal}>
                ×
              </button>
            </div>

            {selectedDayMeetings.length === 0 ? (
              <p className="analytics-empty">No meetings for this day in the current filters.</p>
            ) : (
              <div className="analytics-day-meetings-list">
                {selectedDayMeetings.map((event) => (
                  (() => {
                    const leaderName = event.resource.leaderName || '—'
                    const attendeeNames = (event.resource.personNames || []).filter((name) => name && name !== event.resource.leaderName)
                    const meetingColoring = getMeetingColoring(event)

                    return (
                      <div key={event.id} className="analytics-day-meeting-item">
                        <div className="analytics-day-meeting-time">{format(event.start, 'HH:mm')}</div>
                        <div className="analytics-day-meeting-content">
                          {meetingColoring.matchedPeople.length > 0 && (
                            <div className="analytics-day-meeting-colors">
                              <MeetingColorPreview matchedPeople={meetingColoring.matchedPeople} />
                              <span>{meetingColoring.matchedPeople.map((person) => person.label).join(' · ')}</span>
                            </div>
                          )}
                          <strong>{event.title}</strong>
                          <span>
                            {event.resource.projectName || 'No project'}
                            {event.resource.meetingStatus === 'draft' ? ' · Draft' : ' · Approved'}
                          </span>
                          <div className="analytics-day-meeting-meta">
                            <span><strong>Worker performing the meeting:</strong> {leaderName}</span>
                            <span><strong>Address:</strong> {event.resource.location || '—'}</span>
                            <span><strong>Attendees:</strong> {attendeeNames.length > 0 ? attendeeNames.join(', ') : '—'}</span>
                          </div>
                          <div className="analytics-day-meeting-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={(mouseEvent) => handleSelectEvent(event, mouseEvent)}
                            >
                              Open Here
                            </button>
                            <Link className="btn btn-secondary btn-sm" to={event.resource.sourcePath} {...NEW_TAB_LINK_PROPS}>
                              New Tab
                            </Link>
                          </div>
                        </div>
                      </div>
                    )
                  })()
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}