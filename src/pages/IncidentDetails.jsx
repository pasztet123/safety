import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LocationMap from '../components/LocationMap'
import { generateIncidentPDF } from '../lib/pdfGenerator'
import { NEW_TAB_LINK_PROPS } from '../lib/navigation'
import './IncidentForm.css'

export default function IncidentDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [incident, setIncident] = useState(null)
  const [correctiveActions, setCorrectiveActions] = useState([])
  const [disciplinaryActions, setDisciplinaryActions] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [leaders, setLeaders] = useState([])
  const [pdfLoading, setPdfLoading] = useState(false)

  useEffect(() => {
    checkAdminAndLoadData()
  }, [id])

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      setIsAdmin(data?.is_admin || false)
    }
    if (id) {
      await Promise.all([fetchIncident(), fetchInvolvedPersons(), fetchLeaders()])
    }
  }

  const fetchIncident = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('incidents')
      .select(`*, project:projects(name)`)
      .is('deleted_at', null)
      .eq('id', id)
      .single()

    if (!error && data) {
      setIncident(data)

      const { data: actions } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('incident_id', id)
        .order('declared_created_date', { ascending: true })
        .order('due_date', { ascending: true })

      setCorrectiveActions(actions || [])

      const { data: disciplinary } = await supabase
        .from('disciplinary_actions')
        .select('*')
        .eq('incident_id', id)
        .order('action_date', { ascending: false })
        .order('action_time', { ascending: false })

      setDisciplinaryActions(disciplinary || [])
    }
    setLoading(false)
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name')
      .order('name')
    if (data) setInvolvedPersons(data)
  }

  const fetchLeaders = async () => {
    const { data } = await supabase
      .from('leaders')
      .select('id, name')
      .order('name')
    if (data) setLeaders(data)
  }

  const handleToggleActionStatus = async (actionId, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'completed' : 'open'
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('corrective_actions')
      .update({
        status: newStatus,
        completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null,
        updated_by: user?.id || null,
      })
      .eq('id', actionId)
    if (!error) await fetchIncident()
  }

  const handleGeneratePDF = async () => {
    setPdfLoading(true)
    try {
      await generateIncidentPDF(incident)
    } finally {
      setPdfLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete this incident? This action cannot be undone.`)) return
    await supabase.from('corrective_actions').delete().eq('incident_id', id)
    const { error } = await supabase.from('incidents').delete().eq('id', id)
    if (!error) navigate('/incidents')
  }

  if (loading) return <div className="spinner"></div>

  if (!incident) {
    return (
      <div>
        <h2 className="page-title">Incident Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/incidents')}>
          Back to Incidents
        </button>
      </div>
    )
  }

  return (
    <div className="incident-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="page-title">Incident Details</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          {isAdmin && (
            <>
              <Link className="btn btn-primary" to={`/incidents/${id}/edit`}>
                Edit
              </Link>
              <Link className="btn btn-secondary" to={`/incidents/${id}/edit`} {...NEW_TAB_LINK_PROPS}>
                Edit in New Tab
              </Link>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </>
          )}
          <button
            className="btn btn-secondary"
            onClick={handleGeneratePDF}
            disabled={pdfLoading}
            style={{ minWidth: '70px' }}
          >
            {pdfLoading ? '…' : 'PDF'}
          </button>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <div className="card">
        <h3 className="section-title">Incident Information</h3>

        <div className="if-row-2">
          <div className="form-group">
            <label className="form-label">Type</label>
            <p className="detail-value">
              <span className="incident-type-badge">{incident.type_name}</span>
              {incident.incident_subtype && (
                <span className="incident-subtype-badge" style={{ marginLeft: '8px' }}>
                  {incident.incident_subtype.replace(/_/g, ' ')}
                </span>
              )}
              {incident.safety_violation_type && (
                <span className="incident-subtype-badge" style={{ marginLeft: '8px' }}>
                  {incident.safety_violation_type}
                </span>
              )}
            </p>
          </div>
          {incident.severity && (
            <div className="form-group">
              <label className="form-label">Severity</label>
              <p className="detail-value">{incident.severity}</p>
            </div>
          )}
        </div>

        <div className="if-row-2">
          <div className="form-group">
            <label className="form-label">Date</label>
            <p className="detail-value">{new Date(incident.date).toLocaleDateString()}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Time</label>
            <p className="detail-value">{incident.time}</p>
          </div>
        </div>

        {incident.project && (
          <div className="form-group">
            <label className="form-label">Project</label>
            <p className="detail-value">{incident.project.name}</p>
          </div>
        )}

        {incident.location && (
          <div className="form-group">
            <label className="form-label">Location</label>
            <p className="detail-value">{incident.location}</p>
            <LocationMap latitude={incident.latitude} longitude={incident.longitude} />
          </div>
        )}

        {incident.osha_recordable && (
          <div className="form-group">
            <span className="if-osha-flag">OSHA Recordable</span>
          </div>
        )}
      </div>

      {/* ── People ── */}
      <div className="card">
        <h3 className="section-title">People Involved</h3>

        <div className="if-row-2">
          <div className="form-group">
            <label className="form-label">Employee</label>
            <p className="detail-value">{incident.employee_name}</p>
          </div>
          {incident.phone && (
            <div className="form-group">
              <label className="form-label">Phone</label>
              <p className="detail-value">{incident.phone}</p>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Reporter</label>
          <p className="detail-value">{incident.reporter_name}</p>
        </div>

        {incident.safety_violation_type && (
          <div className="form-group">
            <label className="form-label">Safety Violation</label>
            <p className="detail-value">{incident.safety_violation_type}</p>
          </div>
        )}
      </div>

      {/* ── Description ── */}
      <div className="card">
        <h3 className="section-title">Description</h3>

        <div className="form-group">
          <label className="form-label">Details</label>
          <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{incident.details}</p>
        </div>

        {incident.immediate_cause && (
          <div className="form-group">
            <label className="form-label">Immediate Cause</label>
            <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{incident.immediate_cause}</p>
          </div>
        )}

        {incident.contributing_factors && (
          <div className="form-group">
            <label className="form-label">Contributing Factors</label>
            <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{incident.contributing_factors}</p>
          </div>
        )}

        {incident.root_cause && (
          <div className="form-group">
            <label className="form-label">Root Cause</label>
            <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{incident.root_cause}</p>
          </div>
        )}

        {incident.notes && (
          <div className="form-group">
            <label className="form-label">Notes</label>
            <p className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>{incident.notes}</p>
          </div>
        )}
      </div>

      {/* ── Injury / Property ── */}
      {(incident.anyone_injured || incident.body_part || incident.medical_treatment || incident.hospitalized || incident.days_away_from_work || incident.estimated_property_cost || incident.equipment_involved) && (
        <div className="card">
          <h3 className="section-title">Injury &amp; Property Details</h3>

          {incident.anyone_injured && (
            <div className="form-group">
              <label className="form-label">Injury</label>
              <p className="detail-value">Yes</p>
            </div>
          )}
          {incident.body_part && (
            <div className="form-group">
              <label className="form-label">Body Part</label>
              <p className="detail-value">{incident.body_part}</p>
            </div>
          )}
          {incident.medical_treatment && (
            <div className="form-group">
              <label className="form-label">Medical Treatment</label>
              <p className="detail-value">{incident.medical_treatment.replace(/_/g, ' ')}</p>
            </div>
          )}
          {incident.hospitalized && (
            <div className="form-group">
              <label className="form-label">Hospitalized</label>
              <p className="detail-value">Yes</p>
            </div>
          )}
          {incident.days_away_from_work && (
            <div className="form-group">
              <label className="form-label">Days Away from Work</label>
              <p className="detail-value">{incident.days_away_from_work}</p>
            </div>
          )}
          {incident.estimated_property_cost && (
            <div className="form-group">
              <label className="form-label">Estimated Property Cost</label>
              <p className="detail-value">${incident.estimated_property_cost}</p>
            </div>
          )}
          {incident.equipment_involved && (
            <div className="form-group">
              <label className="form-label">Equipment Involved</label>
              <p className="detail-value">{incident.equipment_involved}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Photo ── */}
      {incident.photo_url && (
        <div className="card">
          <h3 className="section-title">Photo</h3>
          <img
            src={incident.photo_url}
            alt="Incident photo"
            style={{
              width: '100%',
              maxHeight: '400px',
              objectFit: 'contain',
              borderRadius: '8px',
              border: '1px solid var(--color-border)'
            }}
          />
        </div>
      )}

      {/* ── Reporter signature ── */}
      {incident.signature_url && (
        <div className="card">
          <h3 className="section-title">Reporter Signature</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              {incident.reporter_name}
            </p>
            <img
              src={incident.signature_url}
              alt={`Signature of ${incident.reporter_name}`}
              style={{
                maxWidth: '320px',
                maxHeight: '120px',
                objectFit: 'contain',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                padding: '8px',
                backgroundColor: '#fff'
              }}
            />
          </div>
        </div>
      )}

      {/* ── Corrective Actions ── */}
      {correctiveActions.length > 0 && (
        <div className="card">
          <h3 className="section-title">
            Corrective Actions
            <span className="ica-count" style={{ marginLeft: '8px' }}>{correctiveActions.length}</span>
          </h3>
          <div className="ica-list">
            {correctiveActions.map(action => (
              <div key={action.id} className={`ica-row ${action.status}`}>
                <input
                  type="checkbox"
                  className="ica-checkbox"
                  checked={action.status === 'completed'}
                  onChange={() => handleToggleActionStatus(action.id, action.status)}
                  disabled={!isAdmin}
                />
                <div className="ica-body">
                  <p className="ica-desc">{action.description}</p>
                  <div className="ica-meta">
                    {action.responsible_person_id && (
                      <span className="ica-tag">
                        {involvedPersons.find(p => p.id === action.responsible_person_id)?.name || 'Unknown'}
                      </span>
                    )}
                    {action.due_date && (
                      <span className="ica-tag ica-tag--date">Due {new Date(action.due_date).toLocaleDateString()}</span>
                    )}
                    {action.completion_date && (
                      <span className="ica-tag ica-tag--done">Completed {new Date(action.completion_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {incident.type_name === 'Safety violation' && (
        <div className="card">
          <div className="if-actions-header" style={{ marginBottom: '18px' }}>
            <h3 className="section-title" style={{ margin: 0 }}>
              Disciplinary Actions
              <span className="ica-count" style={{ marginLeft: '8px' }}>{disciplinaryActions.length}</span>
            </h3>
            <Link className="btn btn-primary" to={`/disciplinary-actions?incidentId=${id}`}>
              Add Disciplinary Action
            </Link>
            <Link className="btn btn-secondary" to={`/disciplinary-actions?incidentId=${id}`} {...NEW_TAB_LINK_PROPS}>
              New Tab
            </Link>
          </div>
          {disciplinaryActions.length === 0 ? (
            <p className="detail-value">No disciplinary actions linked to this safety violation yet.</p>
          ) : (
            <div className="if-action-list">
              {disciplinaryActions.map(action => (
                <div key={action.id} className="if-action-card if-action-card--disciplinary">
                  <div className="if-action-main">
                    <p className="if-action-desc">{action.action_type}</p>
                    <div className="if-action-meta">
                      <span>Recipient: {involvedPersons.find(person => person.id === action.recipient_person_id)?.name || 'Unknown'}</span>
                      <span>Worker performing the meeting: {leaders.find(leader => leader.id === action.responsible_leader_id)?.name || 'Unknown'}</span>
                      <span>Date: {new Date(action.action_date).toLocaleDateString()}</span>
                      <span>Time: {(action.action_time || '').slice(0, 5)}</span>
                    </div>
                    {action.action_notes && (
                      <p className="detail-value" style={{ marginTop: '10px', whiteSpace: 'pre-wrap' }}>{action.action_notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/incidents')}>
          Back to Incidents
        </button>
      </div>
    </div>
  )
}
