import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDateOnly } from '../lib/dateTime'
import { generateSafetySurveyPDF } from '../lib/pdfGenerator'
import { supabase } from '../lib/supabase'
import { fetchSafetySurveyById } from '../lib/safetySurveys'
import './IncidentForm.css'
import './SafetySurveys.css'

export default function SafetySurveyDetails() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [survey, setSurvey] = useState(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
        setIsAdmin(Boolean(data?.is_admin))
      }

      try {
        const data = await fetchSafetySurveyById(id)
        setSurvey(data)
      } catch (error) {
        console.error('Error loading safety survey:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this safety survey?')) return

    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('safety_surveys')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
        updated_by: user?.id || null,
      })
      .eq('id', id)

    if (!error) navigate('/safety-surveys')
  }

  const handlePdf = async () => {
    if (!survey) return
    setPdfLoading(true)
    try {
      await generateSafetySurveyPDF(survey)
    } finally {
      setPdfLoading(false)
    }
  }

  if (loading) return <div className="spinner"></div>

  if (!survey) {
    return (
      <div>
        <h2 className="page-title">Safety Survey Not Found</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/safety-surveys')}>Back to Safety Surveys</button>
      </div>
    )
  }

  return (
    <div className="incident-form safety-surveys-page">
      <div className="safety-surveys-toolbar">
        <h2 className="page-title" style={{ margin: 0 }}>Safety Survey Details</h2>
        <div className="safety-surveys-toolbar-actions">
          <button className="btn btn-secondary" onClick={handlePdf} disabled={pdfLoading}>{pdfLoading ? '…' : 'PDF'}</button>
          {isAdmin && <Link className="btn btn-primary" to={`/safety-surveys/${id}/edit`}>Edit</Link>}
          {isAdmin && <button className="btn btn-danger" onClick={handleDelete}>Delete</button>}
        </div>
      </div>

      <div className="card">
        <h3 className="section-title">Survey Information</h3>
        <div className="survey-detail-grid">
          <div>
            <label className="form-label">Project</label>
            <p className="detail-value">{survey.project?.name || '—'}</p>
          </div>
          <div>
            <label className="form-label">Address</label>
            <p className="detail-value">{survey.project_address || '—'}</p>
          </div>
          <div>
            <label className="form-label">Survey date</label>
            <p className="detail-value">{formatDateOnly(survey.survey_date, { fallback: survey.survey_date })}</p>
          </div>
          <div>
            <label className="form-label">Survey time</label>
            <p className="detail-value">{survey.survey_time || '—'}</p>
          </div>
          <div>
            <label className="form-label">Responsible person</label>
            <p className="detail-value">{survey.responsible_person_name || '—'}</p>
          </div>
          <div>
            <label className="form-label">Survey title</label>
            <p className="detail-value">{survey.survey_title || '—'}</p>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Survey area / detail</label>
            <p className="detail-value">{survey.location || '—'}</p>
          </div>
        </div>

        <div className="survey-card-meta">
          {survey.compliance_documented && <span className="survey-chip survey-chip--success">Survey complete</span>}
          {survey.compliance_follow_up_required && <span className="survey-chip survey-chip--warning">Follow-up required</span>}
        </div>
      </div>

      {survey.survey_notes && (
        <div className="card">
          <h3 className="section-title">Survey Notes</h3>
          <p className="detail-value survey-section-copy">{survey.survey_notes}</p>
        </div>
      )}

      {survey.hazards_observed && (
        <div className="card">
          <h3 className="section-title">Hazards Observed</h3>
          <p className="detail-value survey-section-copy">{survey.hazards_observed}</p>
        </div>
      )}

      {survey.recommendations && (
        <div className="card">
          <h3 className="section-title">Recommendations / Actions</h3>
          <p className="detail-value survey-section-copy">{survey.recommendations}</p>
        </div>
      )}

      {survey.sections?.length > 0 && (
        <div className="card">
          <h3 className="section-title">Categorized Findings</h3>
          <div className="survey-section-detail-list">
            {survey.sections.map((section) => (
              <div key={section.id || section.client_id} className="survey-section-detail-card">
                <div className="survey-card-meta" style={{ marginTop: 0 }}>
                  <span className="survey-chip">{section.category_label}</span>
                  <span className="survey-chip survey-chip--muted">{section.category_source === 'custom' ? 'Custom category' : 'Predefined category'}</span>
                </div>
                {section.notes ? (
                  <p className="detail-value survey-section-copy">{section.notes}</p>
                ) : (
                  <p className="detail-value">No category notes added.</p>
                )}

                {section.photos?.length > 0 && (
                  <div className="survey-photo-grid" style={{ marginTop: 14 }}>
                    {section.photos.map((photo, index) => (
                      <div key={photo.id || `${photo.photo_url}-${index}`} className="survey-photo-item">
                        <img src={photo.photo_url} alt={`${section.category_label} ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {survey.photos?.length > 0 && (
        <div className="card">
          <h3 className="section-title">General Photos</h3>
          <div className="survey-photo-grid">
            {survey.photos.map((photo, index) => (
              <div key={photo.id || `${photo.photo_url}-${index}`} className="survey-photo-item">
                <img src={photo.photo_url} alt={`Survey photo ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      )}

      {survey.signature_url && (
        <div className="card">
          <h3 className="section-title">Responsible Person Signature</h3>
          <img src={survey.signature_url} alt="Responsible person signature" className="survey-signature-preview" />
        </div>
      )}

      <div className="form-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/safety-surveys')}>Back to Safety Surveys</button>
      </div>
    </div>
  )
}