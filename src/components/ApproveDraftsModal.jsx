import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { JurisdictionWarningNotice, LegalClauseNotice } from './LegalNotice'
import SignaturePad from './SignaturePad'
import { JURISDICTION_WARNING_MESSAGE, describeSystemDateTimeMismatch, getSystemDateTimeMismatchDetails } from '../lib/legal'
import { normalizeMeetingPersonName, resolveMeetingLeader } from '../lib/meetingLeader'
import './ApproveDraftsModal.css'

/**
 * ApproveDraftsModal
 *
 * Props:
 *   drafts        — array of draft meeting objects to approve
 *   onClose()     — close without saving
 *   onApproved()  — called after successful approval
 */
export default function ApproveDraftsModal({ drafts, onClose, onApproved }) {
  const sigRef = useRef()

  const [leaders, setLeaders] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [signatureByName, setSignatureByName] = useState({})
  const [leaderId, setLeaderId] = useState('')
  const [leaderName, setLeaderName] = useState('')
  const [leaderDefaultSig, setLeaderDefaultSig] = useState(null)

  // Signature mode: 'default' | 'draw'
  const [sigMode, setSigMode] = useState('default')
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)

  // Per-meeting overrides: { [meetingId]: { leaderId, leaderName, sigMode, manualSigDataUrl } }
  const [overrides, setOverrides] = useState({})
  const [expandedOverride, setExpandedOverride] = useState(null)
  const overrideSigRefs = useRef({})

  const [saving, setSaving] = useState(false)

  const draftsWithDateTimeMismatch = drafts.filter((draft) => (
    getSystemDateTimeMismatchDetails({ date: draft.date, time: draft.time }).length > 0
  ))

  useEffect(() => {
    loadReferenceData()
  }, [])

  const loadReferenceData = async () => {
    const [leadersRes, involvedRes, usersRes] = await Promise.all([
      supabase
        .from('leaders')
        .select('id, name, default_signature_url')
        .order('name'),
      supabase
        .from('involved_persons')
        .select('id, name, leader_id, default_signature_url')
        .order('name'),
      supabase
        .from('users')
        .select('name, default_signature_url')
        .order('name'),
    ])

    if (leadersRes.data) {
      setLeaders(leadersRes.data)
    }

    if (involvedRes.data) {
      setInvolvedPersons(involvedRes.data)
    }

    const nextSignatureByName = {}
    ;(leadersRes.data || []).forEach((leader) => {
      if (leader.default_signature_url) {
        nextSignatureByName[leader.name] = leader.default_signature_url
        nextSignatureByName[normalizeMeetingPersonName(leader.name)] = leader.default_signature_url
      }
    })
    ;(involvedRes.data || []).forEach((person) => {
      if (person.default_signature_url) {
        nextSignatureByName[person.name] = person.default_signature_url
        nextSignatureByName[normalizeMeetingPersonName(person.name)] = person.default_signature_url
      }
    })
    ;(usersRes.data || []).forEach((user) => {
      if (user.default_signature_url) {
        nextSignatureByName[user.name] = user.default_signature_url
        nextSignatureByName[normalizeMeetingPersonName(user.name)] = user.default_signature_url
      }
    })

    setSignatureByName(nextSignatureByName)
  }

  const getDefaultSignatureForName = (name) => {
    if (!name) return null
    return signatureByName[name] || signatureByName[normalizeMeetingPersonName(name)] || null
  }

  const handleLeaderSelect = (id) => {
    if (!id) {
      setLeaderId('')
      setLeaderName('')
      setLeaderDefaultSig(null)
      setSigMode('draw')
      setManualSigDataUrl(null)
      if (sigRef.current) sigRef.current.clear()
      return
    }

    const l = leaders.find(x => x.id === id)
    if (!l) return
    const preferredLeaderSignature = l.default_signature_url || getDefaultSignatureForName(l.name)
    setLeaderId(l.id)
    setLeaderName(l.name)
    setLeaderDefaultSig(preferredLeaderSignature || null)
    setSigMode(preferredLeaderSignature ? 'default' : 'draw')
    setManualSigDataUrl(null)
    if (sigRef.current) sigRef.current.clear()
  }

  const setOverrideLeader = (meetingId, id) => {
    const l = leaders.find(x => x.id === id)
    if (!l) { clearOverride(meetingId); return }
    const preferredLeaderSignature = l.default_signature_url || getDefaultSignatureForName(l.name)
    setOverrides(prev => ({
      ...prev,
      [meetingId]: {
        ...prev[meetingId],
        leaderId: l.id,
        leaderName: l.name,
        leaderDefaultSig: preferredLeaderSignature || null,
        sigMode: preferredLeaderSignature ? 'default' : 'draw',
        manualSigDataUrl: null,
      }
    }))
  }

  const clearOverride = (meetingId) => {
    setOverrides(prev => { const n = { ...prev }; delete n[meetingId]; return n })
  }

  // ── Upload a signature (data URL or URL string) and return public URL ───
  const uploadSignature = async (sigDataUrl) => {
    if (!sigDataUrl) return null
    // If it's already a remote URL (from default sig), return it directly
    if (sigDataUrl.startsWith('http')) return sigDataUrl

    const blob = await new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        canvas.getContext('2d').drawImage(img, 0, 0)
        canvas.toBlob(resolve, 'image/png')
      }
      img.src = sigDataUrl
    })
    if (!blob) return null

    const fileName = `leader-sig-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
    const { error } = await supabase.storage
      .from('safety-photos')
      .upload(fileName, blob, { contentType: 'image/png' })
    if (error) { console.error('Sig upload error:', error); return null }
    const { data } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
    return data.publicUrl
  }

  // Resolve the effective sig data URL for a given meeting
  const resolveSignatureInput = (override) => {
    const mode = override?.sigMode ?? sigMode
    const effectiveLeaderId = override?.leaderId || leaderId
    const fallbackLeader = effectiveLeaderId ? leaders.find(l => l.id === effectiveLeaderId) : null
    const fallbackDefaultSig = fallbackLeader?.default_signature_url || null
    if (mode === 'default') {
      return override?.leaderDefaultSig ?? leaderDefaultSig ?? fallbackDefaultSig
    }
    return override?.manualSigDataUrl ?? manualSigDataUrl
  }

  const buildSelfTrainingAttendeeUpdate = ({ draft, meetingAttendees, effectiveSigUrl }) => {
    const effectiveIsSelfTraining = (draft.is_self_training || meetingAttendees.length === 1) && meetingAttendees.length === 1
    if (!effectiveIsSelfTraining || meetingAttendees.length !== 1) {
      return null
    }

    const attendee = meetingAttendees[0]
    const attendeeSignatureUrl = attendee.signature_url
      || getDefaultSignatureForName(attendee.name)
      || effectiveSigUrl

    if (!attendeeSignatureUrl) {
      return null
    }

    return {
      attendeeId: attendee.id,
      signatureUrl: attendeeSignatureUrl,
    }
  }

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (draftsWithDateTimeMismatch.length > 0) {
      const confirmed = confirm(
        `${draftsWithDateTimeMismatch.length} draft meeting${draftsWithDateTimeMismatch.length === 1 ? '' : 's'} use a date or time different from the current system values. ${JURISDICTION_WARNING_MESSAGE}`
      )
      if (!confirmed) return
    }

    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: attendeeRows, error: attendeeError } = await supabase
        .from('meeting_attendees')
        .select('id, meeting_id, name, signature_url, signed_with_checkbox')
        .in('meeting_id', drafts.map(draft => draft.id))

      if (attendeeError) {
        throw attendeeError
      }

      const attendeesByMeetingId = {}
      ;(attendeeRows || []).forEach((attendee) => {
        if (!attendeesByMeetingId[attendee.meeting_id]) {
          attendeesByMeetingId[attendee.meeting_id] = []
        }
        attendeesByMeetingId[attendee.meeting_id].push(attendee)
      })

      // Upload global signature once (if not per-meeting)
      const globalSigInput = leaderId ? resolveSignatureInput(null) : undefined
      const globalSigUrl = leaderId ? await uploadSignature(globalSigInput) : undefined

      for (const draft of drafts) {
        const ovr = overrides[draft.id]
        const meetingAttendees = attendeesByMeetingId[draft.id] || []
        const resolution = resolveMeetingLeader({
          attendees: meetingAttendees,
          leaders,
          involvedPersons,
          signatureByName,
          isSelfTraining: draft.is_self_training || meetingAttendees.length === 1,
        })
        const isSelfTrainingMeeting = resolution.isSelfTraining && meetingAttendees.length === 1
        const effectiveLeaderId = isSelfTrainingMeeting
          ? (resolution.leaderId || draft.leader_id || '')
          : (ovr?.leaderId || leaderId || draft.leader_id || resolution.leaderId || '')
        const effectiveLeaderName = isSelfTrainingMeeting
          ? (resolution.leaderName || draft.leader_name || '')
          : (ovr?.leaderName || leaderName || draft.leader_name || resolution.leaderName || '')
        const effectiveLeaderDefaultSig = isSelfTrainingMeeting
          ? (resolution.signatureDefaultUrl || getDefaultSignatureForName(effectiveLeaderName) || null)
          : (ovr?.leaderDefaultSig
            || leaders.find(l => l.id === effectiveLeaderId)?.default_signature_url
            || resolution.signatureDefaultUrl
            || resolution.leaderDefaultSignature
            || getDefaultSignatureForName(effectiveLeaderName)
            || null)
        const effectiveSigInput = isSelfTrainingMeeting
          ? (((ovr?.sigMode ?? sigMode) === 'draw')
            ? resolveSignatureInput(ovr)
            : effectiveLeaderDefaultSig)
          : (ovr
            ? resolveSignatureInput(ovr)
            : (leaderId ? resolveSignatureInput(null) : effectiveLeaderDefaultSig))

        if (!effectiveLeaderName) {
          throw new Error(`Meeting ${draft.date} ${draft.topic ? `(${draft.topic})` : ''} has no resolved worker performing the meeting.`)
        }

        // Only re-upload if this meeting has its own override
        const sigUrl = ovr
          ? await uploadSignature(effectiveSigInput)
          : (globalSigUrl !== undefined ? globalSigUrl : await uploadSignature(effectiveSigInput))

        const updateData = {
          is_draft: false,
          completed: true,
          is_self_training: resolution.isSelfTraining,
          updated_by: user?.id || null,
          ...(effectiveLeaderId ? { leader_id: effectiveLeaderId } : {}),
          leader_name: effectiveLeaderName,
          ...(sigUrl !== undefined ? { signature_url: sigUrl } : {}),
        }

        const { error: meetingUpdateError } = await supabase
          .from('meetings')
          .update(updateData)
          .eq('id', draft.id)

        if (meetingUpdateError) {
          throw meetingUpdateError
        }

        const attendeeUpdate = buildSelfTrainingAttendeeUpdate({
          draft,
          meetingAttendees,
          effectiveSigUrl: sigUrl,
        })

        if (attendeeUpdate) {
          const { error: attendeeUpdateError } = await supabase
            .from('meeting_attendees')
            .update({
              signature_url: attendeeUpdate.signatureUrl,
              signed_with_checkbox: false,
            })
            .eq('id', attendeeUpdate.attendeeId)

          if (attendeeUpdateError) {
            throw attendeeUpdateError
          }
        }
      }

      onApproved()
    } catch (err) {
      console.error('Approval error:', err)
      alert('Error approving meetings: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const hasDefaultSig = leaderDefaultSig != null

  return (
    <div className="adm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="adm-modal">
        <div className="adm-header">
          <h3 className="adm-title">Approve {drafts.length} Draft Meeting{drafts.length !== 1 ? 's' : ''}</h3>
          <button className="adm-close" onClick={onClose}>✕</button>
        </div>

        <div className="adm-body">
          {/* ── Meeting list summary ── */}
          <div className="adm-meetings-list">
            {drafts.map(d => {
              const ovr = overrides[d.id]
              const isExpanded = expandedOverride === d.id
              return (
                <div key={d.id} className={`adm-meeting-row ${ovr ? 'adm-meeting-row--has-ovr' : ''}`}>
                  <div className="adm-meeting-info">
                    <span className="adm-meeting-date">{d.date}</span>
                    <span className="adm-meeting-topic">{d.topic}</span>
                    {d.project?.name && <span className="adm-meeting-proj">{d.project.name}</span>}
                    {ovr && <span className="adm-ovr-badge">override: {ovr.leaderName}</span>}
                    {(() => {
                      const mismatch = getSystemDateTimeMismatchDetails({ date: d.date, time: d.time })
                      return mismatch.length > 0 ? (
                        <span className="adm-jurisdiction-badge">{describeSystemDateTimeMismatch(mismatch)}</span>
                      ) : null
                    })()}
                  </div>
                  <button
                    type="button"
                    className="adm-ovr-btn"
                    onClick={() => setExpandedOverride(isExpanded ? null : d.id)}
                  >
                    {isExpanded ? 'Close' : 'Override'}
                  </button>

                  {isExpanded && (
                    <div className="adm-ovr-panel">
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: 13 }}>Worker performing the meeting for this meeting</label>
                        <select
                          className="form-select"
                          style={{ fontSize: 13 }}
                          value={ovr?.leaderId ?? ''}
                          onChange={e => e.target.value ? setOverrideLeader(d.id, e.target.value) : clearOverride(d.id)}
                        >
                          <option value="">— Use global worker performing the meeting —</option>
                          {leaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      {ovr && (
                        <div className="form-group">
                          <label className="form-label" style={{ fontSize: 13 }}>Signature for this meeting</label>
                          {ovr.leaderDefaultSig && (
                            <div className="adm-sig-opts">
                              <label className="adm-radio">
                                <input
                                  type="radio"
                                  checked={ovr.sigMode === 'default'}
                                  onChange={() => setOverrides(p => ({ ...p, [d.id]: { ...p[d.id], sigMode: 'default' } }))}
                                />
                                Use default signature
                              </label>
                              <label className="adm-radio">
                                <input
                                  type="radio"
                                  checked={ovr.sigMode === 'draw'}
                                  onChange={() => setOverrides(p => ({ ...p, [d.id]: { ...p[d.id], sigMode: 'draw' } }))}
                                />
                                Draw signature
                              </label>
                            </div>
                          )}
                          {ovr.sigMode === 'default' && ovr.leaderDefaultSig && (
                            <img src={ovr.leaderDefaultSig} alt="default sig" className="adm-sig-preview" />
                          )}
                          {ovr.sigMode === 'draw' && (
                            <div className="adm-sig-canvas-wrap">
                              <SignaturePad
                                ref={el => { overrideSigRefs.current[d.id] = el }}
                                height={120}
                                onEnd={() => {
                                  const url = overrideSigRefs.current[d.id]?.toDataURL()
                                  setOverrides(p => ({ ...p, [d.id]: { ...p[d.id], manualSigDataUrl: url } }))
                                }}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                style={{ marginTop: 6 }}
                                onClick={() => {
                                  overrideSigRefs.current[d.id]?.clear()
                                  setOverrides(p => ({ ...p, [d.id]: { ...p[d.id], manualSigDataUrl: null } }))
                                }}
                              >
                                Clear
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Global leader ── */}
          <div className="adm-global-section">
            <h4 className="adm-section-label">Global worker performing the meeting (applies to all meetings without override)</h4>

            {draftsWithDateTimeMismatch.length > 0 && (
              <JurisdictionWarningNotice className="adm-legal-note">
                {draftsWithDateTimeMismatch.length} draft meeting{draftsWithDateTimeMismatch.length === 1 ? '' : 's'} use a date or time different from the current system values. {JURISDICTION_WARNING_MESSAGE}
              </JurisdictionWarningNotice>
            )}

            <LegalClauseNotice className="adm-legal-note" />

            <div className="form-group">
              <label className="form-label">Worker performing the meeting</label>
              <select className="form-select" value={leaderId} onChange={e => handleLeaderSelect(e.target.value)}>
                <option value="">Use each draft's current worker performing the meeting</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>

            {/* Signature */}
            <div className="form-group">
              <label className="form-label">Signature</label>
              {hasDefaultSig && (
                <div className="adm-sig-opts">
                  <label className="adm-radio">
                    <input
                      type="radio"
                      checked={sigMode === 'default'}
                      onChange={() => { setSigMode('default'); setManualSigDataUrl(null); if (sigRef.current) sigRef.current.clear() }}
                    />
                    Use default signature
                  </label>
                  <label className="adm-radio">
                    <input
                      type="radio"
                      checked={sigMode === 'draw'}
                      onChange={() => setSigMode('draw')}
                    />
                    Draw manually
                  </label>
                </div>
              )}

              {sigMode === 'default' && leaderDefaultSig && (
                <div className="adm-sig-preview-wrap">
                  <img src={leaderDefaultSig} alt="default signature" className="adm-sig-preview" />
                </div>
              )}

              {sigMode === 'draw' && (
                <div className="adm-sig-canvas-wrap">
                  <SignaturePad
                    ref={sigRef}
                    height={140}
                    onEnd={() => {
                      const url = sigRef.current?.toDataURL()
                      setManualSigDataUrl(url || null)
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => { sigRef.current?.clear(); setManualSigDataUrl(null) }}
                  >
                    Clear signature
                  </button>
                </div>
              )}
            </div>

            <p className="adm-note">
              <strong>completed = true</strong> will be set for all approved meetings.
            </p>
          </div>
        </div>

        <div className="adm-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApprove}
            disabled={saving}
          >
            {saving ? 'Approving…' : `Confirm — Approve ${drafts.length} Meeting${drafts.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
