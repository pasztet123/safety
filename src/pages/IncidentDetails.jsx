import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import LocationMap from '../components/LocationMap'
import { generateIncidentPDF } from '../lib/pdfGenerator'
import './IncidentForm.css'

export default function IncidentDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [incident, setIncident] = useState(null)
  const [correctiveActions, setCorrectiveActions] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
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
      await Promise.all([fetchIncident(), fetchInvolvedPersons()])
    }
  }

  const fetchIncident = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('incidents')
      .select(`*, project:projects(name)`)
      .eq('id', id)
      .single()

    if (!error && data) {
      setIncident(data)

      const { data: actions } = await supabase
        .from('corrective_actions')
        .select('*')
        .eq('incident_id', id)
        .order('created_at', { ascending: true })

      setCorrectiveActions(actions || [])
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

  const handleToggleActionStatus = async (actionId, currentStatus) => {
    const newStatus = currentStatus === 'open' ? 'completed' : 'open'
    const { error } = await supabase
      .from('corrective_actions')
      .update({
        status: newStatus,
        completion_date: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
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
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/incidents/${id}/edit`)}
            >
              Edit
            </button>
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

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/incidents')}>
          Back to Incidents
        </button>
      </div>
    </div>
  )
}
