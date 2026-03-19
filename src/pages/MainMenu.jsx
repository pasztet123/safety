import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateOnly, formatDateTimeInTimeZone } from '../lib/dateTime'
import { formatElapsedSince, getToolboxMeetingReminderForCurrentUser } from '../lib/personProfiles'
import './MainMenu.css'

/* ── Icons ── */
const FolderIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
  </svg>
)
const ClipboardIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
  </svg>
)
const AlertIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)
const ChecklistIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
)
const SettingsIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
)
const BookIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
)
const WrenchIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
)
const ShieldCheckIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l7 4v6c0 5-3.5 8.74-7 10-3.5-1.26-7-5-7-10V6l7-4z"/>
    <path d="M9 12l2 2 4-4"/>
  </svg>
)
const ExportIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)
const PeopleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)
const ManualIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <path d="M9 7h6"/>
    <path d="M9 11h6"/>
    <path d="M9 15h4"/>
  </svg>
)

/* ── Stat card icons ── */
const ShieldIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const CalendarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
)
const ListCheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
  </svg>
)
const WrenchSmallIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
  </svg>
)

/* ── Helpers ── */
const formatTimeAgo = (ts) => {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}
const readingTime = (text) => {
  if (!text) return '1 min'
  return `${Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200))} min read`
}

const ACCIDENT_TYPE_NAME = 'Accident (injury)'

const calculateDaysSince = (dateValue) => {
  if (!dateValue) return null
  return Math.floor((Date.now() - new Date(dateValue).getTime()) / 86400000)
}

export default function MainMenu() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [toolboxReminder, setToolboxReminder] = useState(null)
  const [showToolboxReminder, setShowToolboxReminder] = useState(false)
  const [stats, setStats] = useState({
    meetings: '—', daysSafe: '—', openActions: '—', completedActions: '—', workersAndSubsCount: '—', todayMeetings: 0,
  })
  const [extraStats, setExtraStats] = useState({
    overdueActions: 0, thisMonthMeetings: 0, recentIncidents: 0, disciplinaryActions: 0,
  })
  const [spotlightTopics, setSpotlightTopics] = useState([])
  const [recentActivity, setRecentActivity] = useState([])

  useEffect(() => {
        const initAuth = async () => {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return { isAdmin: false, userId: null }

          const { data } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single()

          const admin = data?.is_admin || false
          setIsAdmin(admin)
          return { isAdmin: admin, userId: user.id }
        }

    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0]
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

    const fetchStats = async () => {
      const [rpcResult, lastAccidentResult, completedActionsResult, workersAndSubsResult] = await Promise.all([
        supabase.rpc('get_dashboard_stats').maybeSingle(),
        supabase
          .from('incidents')
          .select('date')
          .is('deleted_at', null)
          .eq('type_name', ACCIDENT_TYPE_NAME)
          .order('date', { ascending: false })
          .limit(1),
        supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('involved_persons').select('id', { count: 'exact', head: true }).is('deleted_at', null),
      ])

      const { data, error } = rpcResult
      const lastAccidentDate = lastAccidentResult.data?.[0]?.date || null
      const daysSafe = calculateDaysSince(lastAccidentDate)
      const completedActions = completedActionsResult.count ?? '—'
      const workersAndSubsCount = workersAndSubsResult.count ?? '—'

      if (error || !data) {
        const [m, a, t] = await Promise.all([
          supabase.from('meetings').select('id', { count: 'exact', head: true }),
          supabase.from('corrective_actions').select('id', { count: 'exact', head: true }).eq('status', 'open'),
          supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('date', today),
        ])
        setStats({
          meetings: m.count ?? '—',
          daysSafe, openActions: a.count ?? '—', completedActions, workersAndSubsCount, todayMeetings: t.count ?? 0,
        })
      } else {
        setStats({
          ...data,
          daysSafe,
          completedActions,
          workersAndSubsCount,
        })
      }
    }

    const fetchExtraStats = async () => {
      const [overdue, monthMtgs, recentInc, disciplinary] = await Promise.all([
        supabase.from('corrective_actions')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'open').lt('due_date', today),
        supabase.from('meetings')
          .select('id', { count: 'exact', head: true }).gte('date', monthStart),
        supabase.from('incidents')
          .is('deleted_at', null)
          .select('id', { count: 'exact', head: true }).gte('date', thirtyDaysAgo),
        supabase.from('disciplinary_actions')
          .select('id', { count: 'exact', head: true }),
      ])
      setExtraStats({
        overdueActions: overdue.count ?? 0,
        thisMonthMeetings: monthMtgs.count ?? 0,
        recentIncidents: recentInc.count ?? 0,
        disciplinaryActions: disciplinary.count ?? 0,
      })
    }

    const fetchSpotlight = async () => {
      const { data } = await supabase
        .from('safety_topics')
        .select('id, name, category, description, image_url, risk_level')
        .limit(50)
      if (data?.length > 0) {
        setSpotlightTopics([...data].sort(() => Math.random() - 0.5).slice(0, 3))
      }
    }

    const fetchActivity = async () => {
      const [mtgs, incs, acts, disciplinary] = await Promise.all([
        supabase.from('meetings')
          .select('id, topic, leader_name, date')
          .order('date', { ascending: false }).limit(3),
        supabase.from('incidents')
          .is('deleted_at', null)
          .select('id, type_name, employee_name, date')
          .order('date', { ascending: false }).limit(3),
        supabase.from('corrective_actions')
          .select('id, description, status, declared_created_date, due_date')
          .order('declared_created_date', { ascending: false }).limit(3),
        supabase.from('disciplinary_actions')
          .select('id, action_type, action_date')
          .order('action_date', { ascending: false }).limit(3),
      ])
      const merged = [
        ...(mtgs.data || []).map(m => ({
          type: 'meeting',
          label: m.topic, sub: m.leader_name,
          ts: m.date, path: '/meetings',
        })),
        ...(incs.data || []).map(i => ({
          type: 'incident',
          label: i.type_name, sub: i.employee_name,
          ts: i.date, path: '/incidents',
        })),
        ...(acts.data || []).map(a => ({
          type: 'action',
          label: (a.description || '').slice(0, 55) + ((a.description || '').length > 55 ? '…' : ''),
          sub: a.due_date ? `Due ${formatDateOnly(a.due_date, { locale: 'en-US', fallback: a.due_date })}` : (a.status === 'completed' ? 'Completed' : 'Open'),
          ts: a.declared_created_date || a.due_date,
          path: '/corrective-actions',
        })),
        ...(disciplinary.data || []).map(a => ({
          type: 'disciplinary',
          label: a.action_type,
          sub: a.action_date ? `Action date ${formatDateOnly(a.action_date, { locale: 'en-US', fallback: a.action_date })}` : 'Disciplinary action',
          ts: a.action_date, path: '/disciplinary-actions',
        })),
      ].filter(item => item.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts)).slice(0, 5)
      setRecentActivity(merged)
    }

    const maybeShowToolboxReminder = async (userId) => {
      if (!userId) return

      const reminder = await getToolboxMeetingReminderForCurrentUser(userId)
      if (!reminder?.shouldRemind) return

      const dismissKey = `toolbox-reminder:${reminder.profileId}:${reminder.latestMeetingAt || 'none'}`
      if (window.sessionStorage.getItem(dismissKey)) return

      setToolboxReminder({ ...reminder, dismissKey })
      setShowToolboxReminder(true)
    }

    const init = async () => {
      const authContext = await initAuth()
      fetchStats()
      fetchExtraStats()
      fetchSpotlight()
      await maybeShowToolboxReminder(authContext.userId)
      if (authContext.isAdmin) await fetchActivity()
    }

    init()
  }, [])

  const menuItems = [
    { title: 'Projects',           subtitle: 'Active & archived jobs',     path: '/projects',           icon: <FolderIcon /> },
    { title: 'Meetings',           subtitle: 'Safety talks & sign-ins',    path: '/meetings',           icon: <ClipboardIcon />,
      badge: extraStats.thisMonthMeetings > 0 ? `${extraStats.thisMonthMeetings} this month` : null, badgeVariant: 'info' },
    { title: 'Safety Surveys',     subtitle: 'Field notes, hazards & photos', path: '/safety-surveys',   icon: <ChecklistIcon /> },
    { title: 'Safety Topics',      subtitle: 'Training material library',  path: '/safety-topics',      icon: <BookIcon /> },
    { title: 'Incidents',          subtitle: 'Reports & investigations',   path: '/incidents',          icon: <AlertIcon />,
      badge: extraStats.recentIncidents > 0 ? `${extraStats.recentIncidents} in 30d` : null, badgeVariant: 'danger' },
    { title: 'Corrective Actions', subtitle: 'Track & resolve open items', path: '/corrective-actions', icon: <WrenchIcon />,
      badge: extraStats.overdueActions > 0 ? `${extraStats.overdueActions} overdue` : (stats.openActions > 0 ? `${stats.openActions} open` : null),
      badgeVariant: extraStats.overdueActions > 0 ? 'warning' : 'muted' },
    { title: 'Disciplinary Actions', subtitle: 'Violations & consequences', path: '/disciplinary-actions', icon: <ShieldCheckIcon />,
      badge: extraStats.disciplinaryActions > 0 ? `${extraStats.disciplinaryActions} recorded` : null, badgeVariant: 'danger' },
    { title: 'Safety Checklists',  subtitle: 'Inspection & compliance',    path: '/checklists',         icon: <ChecklistIcon /> },
    { title: 'People',             subtitle: 'Worker & meeting performer profiles',   path: '/people',             icon: <PeopleIcon /> },
    { title: 'User Manual',        subtitle: 'Complete operating guide',   path: '/user-manual',        icon: <ManualIcon /> },
    { title: 'Admin Panel',        subtitle: 'Users & settings',           path: '/admin',              icon: <SettingsIcon /> },
    { title: 'Export',             subtitle: 'PDF reports & CSV files',    path: '/export',             icon: <ExportIcon /> },
  ]

  const noAccidentsRecorded = stats.daysSafe === null
  const hasAccidentHistory = typeof stats.daysSafe === 'number'
  const daysWithoutAccidentValue = noAccidentsRecorded ? 'Perfect' : stats.daysSafe
  const daysWithoutAccidentSublabel = noAccidentsRecorded
    ? 'Congratulations - no accidents have been recorded.'
    : hasAccidentHistory && stats.daysSafe < 7
      ? 'Recent accident on record'
      : 'Keep the streak going'
  const daysWithoutAccidentAccent = hasAccidentHistory && stats.daysSafe < 7 ? 'danger' : 'success'

  const statCards = [
    {
      key: 'daysSafe',
      value: daysWithoutAccidentValue,
      label: 'Days Without Accident',
      sublabel: daysWithoutAccidentSublabel,
      icon: <ShieldIcon />,
      accent: daysWithoutAccidentAccent,
      path: '/incidents',
    },
    {
      key: 'meetings',
      value: stats.meetings,
      label: 'Safety Meetings',
      sublabel: extraStats.thisMonthMeetings > 0 ? `+${extraStats.thisMonthMeetings} this month` : 'Total recorded',
      icon: <CalendarIcon />,
      accent: 'info',
      path: '/meetings',
    },
    {
      key: 'workersAndSubsCount',
      value: stats.workersAndSubsCount,
      label: 'Workers & Subs',
      sublabel: 'Active workers and subcontractors',
      icon: <PeopleIcon />,
      accent: 'info',
      path: '/people',
    },
    {
      key: 'completedActions',
      value: stats.completedActions,
      label: 'Completed Corrective Actions',
      sublabel: stats.completedActions > 0 ? 'Resolved items total' : 'No completed items yet',
      icon: <WrenchSmallIcon />,
      accent: stats.completedActions > 0 ? 'success' : 'info',
      path: '/corrective-actions',
    },
  ]

  const dismissToolboxReminder = () => {
    if (toolboxReminder?.dismissKey) {
      window.sessionStorage.setItem(toolboxReminder.dismissKey, '1')
    }
    setShowToolboxReminder(false)
  }

  return (
    <div className="main-menu">
      {showToolboxReminder && toolboxReminder && (
        <div className="toolbox-reminder-overlay" onClick={dismissToolboxReminder}>
          <div className="toolbox-reminder-card" onClick={(event) => event.stopPropagation()}>
            <div className="toolbox-reminder-head">
              <span className="toolbox-reminder-eyebrow">Toolbox Reminder</span>
              <button className="toolbox-reminder-close" onClick={dismissToolboxReminder} aria-label="Dismiss toolbox reminder">
                ×
              </button>
            </div>
            <h3 className="toolbox-reminder-title">A new meeting is due for {toolboxReminder.displayName}.</h3>
            <p className="toolbox-reminder-copy">
              {toolboxReminder.latestMeetingAt
                ? `The last non-deleted meeting linked to this user was ${formatElapsedSince(toolboxReminder.latestMeetingAt)} ago, on ${formatDateTimeInTimeZone(toolboxReminder.latestMeetingAt, { locale: 'en-US', options: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }, fallback: toolboxReminder.latestMeetingAt })}.`
                : 'No previous non-deleted meeting was found for this linked user.'}
            </p>
            <div className="toolbox-reminder-stats">
              <div className="toolbox-reminder-stat">
                <span className="toolbox-reminder-stat-label">Meetings linked</span>
                <strong>{toolboxReminder.meetingCount}</strong>
              </div>
              <div className="toolbox-reminder-stat">
                <span className="toolbox-reminder-stat-label">Elapsed</span>
                <strong>{toolboxReminder.latestMeetingAt ? `${formatElapsedSince(toolboxReminder.latestMeetingAt)} ago` : 'No record'}</strong>
              </div>
            </div>
            <div className="toolbox-reminder-actions">
              <button className="btn" onClick={dismissToolboxReminder}>Dismiss</button>
              <button className="btn btn-primary" onClick={() => {
                dismissToolboxReminder()
                navigate('/meetings/new')
              }}>
                Schedule Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI row ── */}
      <div className="stats-row">
        {statCards.map(s => (
          <button key={s.key} className={`stat-card stat-card--${s.accent}`} onClick={() => navigate(s.path)}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label-upper">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sublabel">{s.sublabel}</div>
          </button>
        ))}
      </div>

      {/* ── Today's Focus (action bar) ── */}
      <div className="today-focus">
        <span className="today-focus-label">Today</span>
        <div className="today-focus-items">
          <button
            className={`focus-pill focus-pill--${stats.todayMeetings > 0 ? 'info' : 'muted'}`}
            onClick={() => stats.todayMeetings > 0 ? navigate('/meetings') : navigate('/meetings/new')}
          >
            {stats.todayMeetings > 0
              ? `${stats.todayMeetings} meeting${stats.todayMeetings !== 1 ? 's' : ''} scheduled`
              : '+ Schedule a meeting'}
          </button>
          {stats.openActions > 0 && (
            <button className="focus-pill focus-pill--warning" onClick={() => navigate('/corrective-actions')}>
              {stats.openActions} open action{stats.openActions !== 1 ? 's' : ''}
              {extraStats.overdueActions > 0 && ` · ${extraStats.overdueActions} overdue`}
            </button>
          )}
          {hasAccidentHistory && stats.daysSafe < 14 && (
            <button className="focus-pill focus-pill--danger" onClick={() => navigate('/incidents')}>
              Last accident {stats.daysSafe}d ago
            </button>
          )}
          {noAccidentsRecorded && (
            <span className="focus-pill focus-pill--success">Congratulations - no accidents recorded</span>
          )}
          {hasAccidentHistory && stats.daysSafe >= 14 && stats.openActions === 0 && (
            <span className="focus-pill focus-pill--success">✓ All clear</span>
          )}
        </div>
      </div>

      {/* ── Safety Spotlight ── */}
      {spotlightTopics.length > 0 && (
        <div className="spotlight-section">
          <div className="spotlight-header">
            <div className="spotlight-title-group">
              <span className="spotlight-eyebrow">Safety Spotlight</span>
              <h3 className="spotlight-title">Learn something today</h3>
            </div>
            <button className="spotlight-all-link" onClick={() => navigate('/safety-topics')}>
              Browse all ›
            </button>
          </div>
          <div className="spotlight-grid">
            {spotlightTopics.map(topic => (
              <button key={topic.id} className="spotlight-card" onClick={() => navigate('/safety-topics', { state: { openTopicId: topic.id } })}>
                <div className="spotlight-card-image">
                  {topic.image_url
                    ? <img src={topic.image_url} alt={topic.name} />
                    : <div className="spotlight-card-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                  }
                  <div className="spotlight-card-overlay" />
                  {topic.risk_level && (
                    <span className={`spotlight-risk spotlight-risk--${topic.risk_level}`}>
                      {topic.risk_level}
                    </span>
                  )}
                  <span className="spotlight-reading-time">{readingTime(topic.description)}</span>
                </div>
                <div className="spotlight-card-body">
                  {topic.category && <span className="spotlight-category">{topic.category}</span>}
                  <h4 className="spotlight-name">{topic.name}</h4>
                  {topic.description && <p className="spotlight-desc">{topic.description}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Nav grid ── */}
      <div className="menu-grid">
        {menuItems.map((item) => (
          <button key={item.path} className="menu-item" onClick={() => navigate(item.path)}>
            <span className="menu-icon">{item.icon}</span>
            <span className="menu-label">{item.title}</span>
            <span className="menu-subtitle">{item.subtitle}</span>
            {item.badge && (
              <span className={`menu-badge menu-badge--${item.badgeVariant}`}>{item.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Recent Activity ── */}
      {isAdmin && recentActivity.length > 0 && (
        <div className="activity-section">
          <div className="activity-header">
            <span className="activity-title">Recent Activity</span>
          </div>
          <div className="activity-list">
            {recentActivity.map((item, idx) => (
              <button key={idx} className="activity-item" onClick={() => navigate(item.path)}>
                <div className="activity-text">
                  <span className="activity-label">{item.label}</span>
                  {item.sub && <span className="activity-sub">{item.sub}</span>}
                </div>
                <span className="activity-time">{formatTimeAgo(item.ts)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
