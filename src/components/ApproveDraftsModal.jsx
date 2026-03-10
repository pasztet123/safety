import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import SignaturePad from './SignaturePad'
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
  const [leaderId, setLeaderId] = useState('')
  const [leaderName, setLeaderName] = useState('Bo Mikuta')
  const [leaderDefaultSig, setLeaderDefaultSig] = useState(null)

  // Signature mode: 'default' | 'draw'
  const [sigMode, setSigMode] = useState('default')
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)

  // Per-meeting overrides: { [meetingId]: { leaderId, leaderName, sigMode, manualSigDataUrl } }
  const [overrides, setOverrides] = useState({})
  const [expandedOverride, setExpandedOverride] = useState(null)
  const overrideSigRefs = useRef({})

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadLeaders()
  }, [])

  const loadLeaders = async () => {
    const { data } = await supabase
      .from('leaders')
      .select('id, name, default_signature_url')
      .order('name')
    if (data) {
      setLeaders(data)
      // Pre-select the first leader alphabetically — admin must confirm/change
      const first = data[0]
      if (first) {
        setLeaderId(first.id)
        setLeaderName(first.name)
        setLeaderDefaultSig(first.default_signature_url || null)
        setSigMode(first.default_signature_url ? 'default' : 'draw')
      }
    }
  }

  const handleLeaderSelect = (id) => {
    const l = leaders.find(x => x.id === id)
    if (!l) return
    setLeaderId(l.id)
    setLeaderName(l.name)
    setLeaderDefaultSig(l.default_signature_url || null)
    setSigMode(l.default_signature_url ? 'default' : 'draw')
    setManualSigDataUrl(null)
    if (sigRef.current) sigRef.current.clear()
  }

  const setOverrideLeader = (meetingId, id) => {
    const l = leaders.find(x => x.id === id)
    if (!l) { clearOverride(meetingId); return }
    setOverrides(prev => ({
      ...prev,
      [meetingId]: {
        ...prev[meetingId],
        leaderId: l.id,
        leaderName: l.name,
        leaderDefaultSig: l.default_signature_url || null,
        sigMode: l.default_signature_url ? 'default' : 'draw',
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
    if (mode === 'default') {
      return override?.leaderDefaultSig ?? leaderDefaultSig
    }
    return override?.manualSigDataUrl ?? manualSigDataUrl
  }

  // ── Approve ──────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Upload global signature once (if not per-meeting)
      const globalSigInput = resolveSignatureInput(null)
      const globalSigUrl = await uploadSignature(globalSigInput)

      for (const draft of drafts) {
        const ovr = overrides[draft.id]
        const effectiveLeaderId   = ovr?.leaderId   ?? leaderId
        const effectiveLeaderName = ovr?.leaderName ?? leaderName
        const effectiveSigInput   = resolveSignatureInput(ovr)

        // Only re-upload if this meeting has its own override
        const sigUrl = ovr
          ? await uploadSignature(effectiveSigInput)
          : globalSigUrl

        const updateData = {
          is_draft: false,
          completed: true,
          updated_by: user?.id || null,
          ...(effectiveLeaderId ? { leader_id: effectiveLeaderId } : {}),
          leader_name: effectiveLeaderName,
          ...(sigUrl !== undefined ? { signature_url: sigUrl } : {}),
        }

        await supabase
          .from('meetings')
          .update(updateData)
          .eq('id', draft.id)
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
                        <label className="form-label" style={{ fontSize: 13 }}>Leader for this meeting</label>
                        <select
                          className="form-select"
                          style={{ fontSize: 13 }}
                          value={ovr?.leaderId ?? ''}
                          onChange={e => e.target.value ? setOverrideLeader(d.id, e.target.value) : clearOverride(d.id)}
                        >
                          <option value="">— Use global leader —</option>
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
            <h4 className="adm-section-label">Global Leader (applies to all meetings without override)</h4>

            <div className="form-group">
              <label className="form-label">Leader</label>
              <select className="form-select" value={leaderId} onChange={e => handleLeaderSelect(e.target.value)}>
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
