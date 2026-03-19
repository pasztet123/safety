import React, { useEffect, useState } from 'react'
import {
  acknowledgeAttendanceRiskAlert,
  ATTENDANCE_RISK_STATUSES,
  fetchAttendanceRiskAlerts,
  formatAttendanceRiskRunHourLabel,
  runAttendanceRiskEvaluation,
} from '../lib/attendanceRisk'
import { logAuditEvent } from '../lib/compliance'
import { formatDateOnly, formatDateTimeInTimeZone, getCurrentDateInputValue } from '../lib/dateTime'
import { formatElapsedSince } from '../lib/personProfiles'
import './AttendanceRiskAlertsPanel.css'

const STATUS_LABELS = {
  open: 'Open',
  acked: 'Acknowledged',
  resolved: 'Resolved',
}

const shiftDateOnly = (value, dayOffset) => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value

  const nextDate = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0))
  nextDate.setUTCDate(nextDate.getUTCDate() + dayOffset)

  const year = nextDate.getUTCFullYear()
  const month = String(nextDate.getUTCMonth() + 1).padStart(2, '0')
  const day = String(nextDate.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function AttendanceRiskAlertsPanel({ appSettings }) {
  const [alertDate, setAlertDate] = useState(() => getCurrentDateInputValue())
  const [statusFilter, setStatusFilter] = useState('open')
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [runState, setRunState] = useState({ busy: false, summary: null })
  const [ackState, setAckState] = useState({ busyId: '', notes: {} })

  const loadAlerts = async (selectedDate) => {
    const rows = await fetchAttendanceRiskAlerts({
      alertDate: selectedDate,
      status: 'all',
      limit: 300,
    })
    setAlerts(rows)
    return rows
  }

  useEffect(() => {
    let cancelled = false

    const autoRefreshForDate = async () => {
      setLoading(true)
      setError('')

      try {
        const summary = await runAttendanceRiskEvaluation({
          sendEmails: false,
          sendNotifications: false,
          forceRun: true,
          alertDate,
          retries: 2,
          retryDelayMs: 500,
        })

        if (cancelled) return

        setRunState((prev) => ({
          ...prev,
          summary,
        }))

        await loadAlerts(alertDate)
      } catch (nextError) {
        if (!cancelled) {
          try {
            await loadAlerts(alertDate)
          } catch {
            // Ignore fallback read failures and preserve the original auto-refresh error.
          }
          setError(nextError.message || 'Unable to refresh attendance risk alerts for the selected day.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    autoRefreshForDate()

    return () => {
      cancelled = true
    }
  }, [alertDate])

  const filteredAlerts = statusFilter === 'all'
    ? alerts
    : alerts.filter((alert) => alert.status === statusFilter)

  const counts = ATTENDANCE_RISK_STATUSES.reduce((acc, status) => {
    acc[status] = alerts.filter((alert) => alert.status === status).length
    return acc
  }, { open: 0, acked: 0, resolved: 0 })
  const todayDate = getCurrentDateInputValue()
  const canGoForward = alertDate < todayDate

  const handleRunNow = async () => {
    setRunState({ busy: true, summary: null })
    setError('')
    setLoading(true)

    try {
      const summary = await runAttendanceRiskEvaluation({
        sendEmails: Boolean(appSettings?.attendance_risk_notifications_enabled && appSettings?.attendance_risk_email_enabled),
        sendNotifications: true,
        forceRun: true,
        alertDate,
      })

      setRunState({ busy: false, summary })
      await loadAlerts(alertDate)
    } catch (nextError) {
      setRunState({ busy: false, summary: null })
      setError(nextError.message || 'Unable to run attendance risk evaluation.')
    } finally {
      setLoading(false)
    }
  }

  const handleAckChange = (alertId, value) => {
    setAckState((prev) => ({
      ...prev,
      notes: {
        ...prev.notes,
        [alertId]: value,
      },
    }))
  }

  const handleAcknowledge = async (alertId) => {
    setAckState((prev) => ({ ...prev, busyId: alertId }))
    setError('')

    try {
      await acknowledgeAttendanceRiskAlert({
        alertId,
        note: ackState.notes[alertId] || '',
      })
      await logAuditEvent({
        eventType: 'meeting_attendance_risk.alert_acked',
        tableName: 'meeting_attendance_risk_alerts',
        recordId: alertId,
        metadata: {
          alert_date: alertDate,
        },
      })
      await loadAlerts(alertDate)
    } catch (nextError) {
      setError(nextError.message || 'Unable to acknowledge attendance risk alert.')
    } finally {
      setAckState((prev) => ({ ...prev, busyId: '' }))
    }
  }

  const handleShiftAlertDate = (dayOffset) => {
    setAlertDate((currentValue) => {
      const shiftedValue = shiftDateOnly(currentValue, dayOffset)
      return dayOffset > 0 && shiftedValue > todayDate ? todayDate : shiftedValue
    })
  }

  return (
    <div className="attendance-risk-panel">
      <div className="attendance-risk-hero">
        <div>
          <h3 className="section-title">Attendance Risk Alerts</h3>
          <p className="attendance-risk-copy">
            Alerts are created for people who participated in a toolbox meeting within the last 7 calendar days but do not appear today.
            Weekend notification runs are skipped by design.
          </p>
        </div>

        <div className="attendance-risk-hero-actions">
          <div className="attendance-risk-setting-pill">
            <span>Feature</span>
            <strong>{appSettings?.attendance_risk_notifications_enabled ? 'Enabled' : 'Disabled'}</strong>
          </div>
          <div className="attendance-risk-setting-pill">
            <span>Run Time</span>
            <strong>{formatAttendanceRiskRunHourLabel(appSettings?.attendance_risk_run_hour)}</strong>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRunNow}
            disabled={runState.busy}
          >
            {runState.busy ? 'Running…' : 'Run Evaluation Now'}
          </button>
        </div>
      </div>

      {runState.summary && (
        <>
          <div className="attendance-risk-summary-banner">
            <strong>Last run:</strong>{' '}
            {runState.summary.alertDate || alertDate}
            {runState.summary.skipped
              ? ` · skipped (${runState.summary.reason || 'unknown reason'})`
              : ` · ${runState.summary.openCount || 0} open · ${runState.summary.createdCount || 0} created · ${runState.summary.updatedCount || 0} updated · ${runState.summary.resolvedCount || 0} resolved · ${runState.summary.emailDeliveryCount || 0} email deliveries${runState.summary.usedRawFallback ? ' · raw-name fallback' : ''}`}
          </div>

          {runState.summary.debug && (
            <details className="attendance-risk-summary-banner" style={{ marginTop: '12px', whiteSpace: 'pre-wrap' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Run diagnostics</summary>
              <pre style={{ margin: '12px 0 0 0', fontSize: '12px', lineHeight: 1.5, overflowX: 'auto' }}>
                {JSON.stringify(runState.summary.debug, null, 2)}
              </pre>
            </details>
          )}
        </>
      )}

      {error && <div className="attendance-risk-error">{error}</div>}

      <div className="attendance-risk-toolbar">
        <div className="attendance-risk-toolbar-field">
          <label htmlFor="attendance-risk-date">Alert date</label>
          <div className="attendance-risk-date-nav">
            <button
              type="button"
              className="attendance-risk-date-arrow"
              onClick={() => handleShiftAlertDate(-1)}
              aria-label="Show previous day"
            >
              ←
            </button>
            <input
              id="attendance-risk-date"
              type="date"
              value={alertDate}
              max={todayDate}
              onChange={(event) => setAlertDate(event.target.value)}
            />
            <button
              type="button"
              className="attendance-risk-date-arrow"
              onClick={() => handleShiftAlertDate(1)}
              disabled={!canGoForward}
              aria-label="Show next day"
            >
              →
            </button>
          </div>
        </div>

        <div className="attendance-risk-status-row" role="tablist" aria-label="Attendance risk status filter">
          <button
            type="button"
            className={`attendance-risk-status-pill ${statusFilter === 'open' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('open')}
          >
            Open <strong>{counts.open}</strong>
          </button>
          <button
            type="button"
            className={`attendance-risk-status-pill ${statusFilter === 'acked' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('acked')}
          >
            Acked <strong>{counts.acked}</strong>
          </button>
          <button
            type="button"
            className={`attendance-risk-status-pill ${statusFilter === 'resolved' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved <strong>{counts.resolved}</strong>
          </button>
          <button
            type="button"
            className={`attendance-risk-status-pill ${statusFilter === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All <strong>{alerts.length}</strong>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : filteredAlerts.length === 0 ? (
        <div className="attendance-risk-empty-state">
          No {statusFilter === 'all' ? '' : `${STATUS_LABELS[statusFilter].toLowerCase()} `}attendance risk alerts were found for {formatDateOnly(alertDate, { fallback: alertDate })}.
        </div>
      ) : (
        <div className="attendance-risk-table-wrap">
          <table className="attendance-risk-table">
            <thead>
              <tr>
                <th>Worker / Sub</th>
                <th>Days Without Meeting</th>
                <th>Last Meeting</th>
                <th>Status</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlerts.map((alert) => {
                const ackedByLabel = alert.acknowledged_by_user?.name || alert.acknowledged_by_user?.email || 'Unknown admin'

                return (
                  <tr key={alert.id}>
                    <td>
                      <div className="attendance-risk-person-cell">
                        <strong>{alert.display_name}</strong>
                        <span>{alert.person_profile_id ? 'Linked profile' : 'Name-based fallback'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="attendance-risk-metric-cell">
                        <strong>{alert.days_without_meeting}</strong>
                        <span>day{alert.days_without_meeting === 1 ? '' : 's'}</span>
                      </div>
                    </td>
                    <td>
                      {alert.latest_meeting_at ? (
                        <div className="attendance-risk-last-seen">
                          <strong>
                            {formatDateTimeInTimeZone(alert.latest_meeting_at, {
                              locale: 'en-US',
                              options: {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              },
                              fallback: alert.latest_meeting_at,
                            })}
                          </strong>
                          <span>{formatElapsedSince(alert.latest_meeting_at)} ago</span>
                        </div>
                      ) : (
                        'No meeting history'
                      )}
                    </td>
                    <td>
                      <span className={`attendance-risk-status-badge status-${alert.status}`}>
                        {STATUS_LABELS[alert.status] || alert.status}
                      </span>
                      {alert.status === 'acked' && alert.acknowledged_at && (
                        <div className="attendance-risk-status-meta">
                          Acked by {ackedByLabel} on{' '}
                          {formatDateTimeInTimeZone(alert.acknowledged_at, {
                            locale: 'en-US',
                            options: { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' },
                            fallback: alert.acknowledged_at,
                          })}
                        </div>
                      )}
                      {alert.status === 'resolved' && alert.resolved_reason && (
                        <div className="attendance-risk-status-meta">
                          {alert.resolved_reason.replace(/_/g, ' ')}
                        </div>
                      )}
                    </td>
                    <td>
                      {alert.status === 'open' ? (
                        <textarea
                          className="attendance-risk-note-input"
                          value={ackState.notes[alert.id] || ''}
                          onChange={(event) => handleAckChange(alert.id, event.target.value)}
                          placeholder="Optional acknowledgement note"
                          rows={2}
                        />
                      ) : (
                        <div className="attendance-risk-note-text">
                          {alert.ack_note || '—'}
                        </div>
                      )}
                    </td>
                    <td>
                      {alert.status === 'open' ? (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => handleAcknowledge(alert.id)}
                          disabled={ackState.busyId === alert.id}
                        >
                          {ackState.busyId === alert.id ? 'Saving…' : 'Acknowledge'}
                        </button>
                      ) : (
                        <span className="attendance-risk-action-placeholder">No action</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}