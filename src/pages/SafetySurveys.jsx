import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { downloadSafetySurveyListPDF } from '../lib/pdfBulkGenerator'
import { formatDateOnly } from '../lib/dateTime'
import { generateSafetySurveyPDF } from '../lib/pdfGenerator'
import { fetchProjects, fetchSafetySurveysFull } from '../lib/exportHelpers'
import { getSafetySurveySearchIndex } from '../lib/safetySurveys'
import { supabase } from '../lib/supabase'
import './SafetySurveys.css'

export default function SafetySurveys() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [surveys, setSurveys] = useState([])
  const [projects, setProjects] = useState([])
  const [pdfLoading, setPdfLoading] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)

  const [searchText, setSearchText] = useState('')
  const [filterProject, setFilterProject] = useState('')
  const [filterResponsible, setFilterResponsible] = useState('')
  const [filterAddress, setFilterAddress] = useState('')
  const [filterCompliance, setFilterCompliance] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
        setIsAdmin(Boolean(data?.is_admin))
      }

      const [projectRows, surveyRows] = await Promise.all([
        fetchProjects(),
        fetchSafetySurveysFull({ sortBy: 'newest' }),
      ])

      setProjects(projectRows)
      setSurveys(surveyRows)
      setLoading(false)
    }

    init()
  }, [])

  const responsibleOptions = useMemo(() => {
    return [...new Set(surveys.map(survey => survey.responsible_person_name).filter(Boolean))].sort((left, right) => left.localeCompare(right))
  }, [surveys])

  const filteredSurveys = useMemo(() => {
    const search = searchText.trim().toLowerCase()
    return surveys.filter((survey) => {
      if (filterProject && survey.project_id !== filterProject) return false
      if (filterResponsible && survey.responsible_person_name !== filterResponsible) return false
      if (filterAddress && !String(survey.project_address || '').toLowerCase().includes(filterAddress.toLowerCase())) return false
      if (filterCompliance === 'documented' && !survey.compliance_documented) return false
      if (filterCompliance === 'follow-up' && !survey.compliance_follow_up_required) return false
      if (!search) return true

      return getSafetySurveySearchIndex(survey).toLowerCase().includes(search)
    })
  }, [surveys, searchText, filterProject, filterResponsible, filterAddress, filterCompliance])

  const handleDelete = async (surveyId) => {
    if (!confirm('Delete this safety survey?')) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('safety_surveys')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: user?.id || null,
        updated_by: user?.id || null,
      })
      .eq('id', surveyId)

    if (!error) {
      setSurveys(prev => prev.filter(survey => survey.id !== surveyId))
    }
  }

  const handleSinglePdf = async (survey) => {
    setPdfLoading(survey.id)
    try {
      await generateSafetySurveyPDF(survey)
    } finally {
      setPdfLoading(null)
    }
  }

  const handleListPdf = async () => {
    setExportLoading(true)
    try {
      await downloadSafetySurveyListPDF(filteredSurveys, 'Safety Surveys Report', `${filteredSurveys.length} surveys`)
    } finally {
      setExportLoading(false)
    }
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div className="safety-surveys-page">
      <div className="safety-surveys-toolbar">
        <h2 className="page-title" style={{ margin: 0 }}>Safety Surveys</h2>
        <div className="safety-surveys-toolbar-actions">
          {filteredSurveys.length > 0 && (
            <button className="btn btn-secondary" onClick={handleListPdf} disabled={exportLoading}>{exportLoading ? '…' : '↓ Export PDF'}</button>
          )}
          <Link className="btn btn-accent" to="/safety-surveys/new">+ New Safety Survey</Link>
        </div>
      </div>

      <div className="card">
        <div className="survey-filter-grid">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input className="form-input" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search title, address, notes, hazards..." />
          </div>
          <div className="form-group">
            <label className="form-label">Project</label>
            <select className="form-select survey-filter-select" value={filterProject} onChange={(event) => setFilterProject(event.target.value)}>
              <option value="">All projects</option>
              {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Responsible person</label>
            <select className="form-select survey-filter-select" value={filterResponsible} onChange={(event) => setFilterResponsible(event.target.value)}>
              <option value="">All responsible people</option>
              {responsibleOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={filterAddress} onChange={(event) => setFilterAddress(event.target.value)} placeholder="Address contains..." />
          </div>
          <div className="form-group">
            <label className="form-label">Compliance</label>
            <select className="form-select survey-filter-select" value={filterCompliance} onChange={(event) => setFilterCompliance(event.target.value)}>
              <option value="all">All records</option>
              <option value="documented">Survey complete</option>
              <option value="follow-up">Follow-up required</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Sort</label>
            <select className="form-select survey-filter-select" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="responsible-asc">Responsible A-Z</option>
              <option value="address-asc">Address A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {filteredSurveys.length === 0 ? (
        <div className="survey-empty-state">No safety surveys found for the selected filters.</div>
      ) : (
        <div className="survey-history-list">
          {[...filteredSurveys].sort((left, right) => {
            switch (sortBy) {
              case 'oldest':
                return String(left.survey_date || '').localeCompare(String(right.survey_date || ''))
              case 'responsible-asc':
                return String(left.responsible_person_name || '').localeCompare(String(right.responsible_person_name || ''))
              case 'address-asc':
                return String(left.project_address || '').localeCompare(String(right.project_address || ''))
              case 'newest':
              default:
                return String(right.survey_date || '').localeCompare(String(left.survey_date || ''))
            }
          }).map((survey) => (
            <div key={survey.id} className="card">
              <div className="safety-surveys-toolbar">
                <div>
                  <div className="survey-card-title">{survey.survey_title || survey.project_address || 'Safety Survey'}</div>
                  <p className="incident-meta">{formatDateOnly(survey.survey_date, { fallback: survey.survey_date })}{survey.survey_time ? ` at ${survey.survey_time}` : ''}</p>
                </div>
                <div className="safety-surveys-toolbar-actions">
                  <button className="btn btn-secondary" onClick={() => handleSinglePdf(survey)} disabled={pdfLoading === survey.id}>{pdfLoading === survey.id ? '…' : 'PDF'}</button>
                  <button className="btn btn-secondary" onClick={() => navigate(`/safety-surveys/${survey.id}`)}>Open</button>
                  {isAdmin && <Link className="btn btn-primary" to={`/safety-surveys/${survey.id}/edit`}>Edit</Link>}
                  {isAdmin && <button className="btn btn-danger" onClick={() => handleDelete(survey.id)}>Delete</button>}
                </div>
              </div>

              <div className="survey-card-meta">
                {survey.project?.name && <span className="survey-chip">{survey.project.name}</span>}
                {survey.project_address && <span className="survey-chip">{survey.project_address}</span>}
                {survey.responsible_person_name && <span className="survey-chip">Responsible: {survey.responsible_person_name}</span>}
                {survey.sections?.slice(0, 3).map((section) => <span key={section.id || section.client_id || section.category_label} className="survey-chip survey-chip--muted">{section.category_label}</span>)}
                {survey.sections?.length > 3 && <span className="survey-chip survey-chip--muted">+{survey.sections.length - 3} more</span>}
                {survey.compliance_documented && <span className="survey-chip survey-chip--success">Survey complete</span>}
                {survey.compliance_follow_up_required && <span className="survey-chip survey-chip--warning">Follow-up required</span>}
              </div>

              {survey.hazards_observed && (
                <div className="survey-card-copy">
                  <strong>Hazards:</strong> {survey.hazards_observed}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}