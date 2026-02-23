import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateIncidentPDF } from '../lib/pdfGenerator'

export default function Incidents() {
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchIncidents()
  }, [])

  const fetchIncidents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('incidents')
      .select(`
        *,
        project:projects(name)
      `)
      .order('date', { ascending: false })
      .order('time', { ascending: false })

    if (!error && data) {
      setIncidents(data)
    }
    setLoading(false)
  }

  const handleGeneratePDF = async (incident) => {
    await generateIncidentPDF(incident)
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Incidents</h2>
        <button className="btn btn-accent" onClick={() => navigate('/incidents/new')}>
          + Report Incident
        </button>
      </div>

      <div className="incidents-list">
        {incidents.length === 0 ? (
          <div className="empty-state">
            <p>No incidents reported. Stay safe!</p>
          </div>
        ) : (
          incidents.map((incident) => (
            <div key={incident.id} className="card incident-card">
              <div className="incident-header">
                <div>
                  <span className="incident-type-badge">{incident.type_name}</span>
                  <p className="incident-meta">
                    {new Date(incident.date).toLocaleDateString()} at{' '}
                    {incident.time}
                  </p>
                  {incident.project && (
                    <p className="incident-project">Project: {incident.project.name}</p>
                  )}
                </div>
                <button 
                  className="btn btn-accent"
                  onClick={() => handleGeneratePDF(incident)}
                >
                  📄 PDF
                </button>
              </div>

              <div className="incident-details">
                <div className="incident-detail-item">
                  <strong>Employee:</strong> {incident.employee_name}
                </div>
                {incident.phone && (
                  <div className="incident-detail-item">
                    <strong>Phone:</strong> {incident.phone}
                  </div>
                )}
                <div className="incident-detail-item">
                  <strong>Reporter:</strong> {incident.reporter_name}
                </div>
                {incident.location && (
                  <div className="incident-detail-item">
                    <strong>Location:</strong> {incident.location}
                  </div>
                )}
                <div className="incident-detail-item">
                  <strong>Details:</strong>
                  <p>{incident.details}</p>
                </div>
                {incident.notes && (
                  <div className="incident-detail-item">
                    <strong>Notes:</strong>
                    <p>{incident.notes}</p>
                  </div>
                )}
                {incident.photo_url && (
                  <div className="incident-detail-item">
                    <strong>Photo:</strong> Attached
                  </div>
                )}
              </div>

              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/incidents/${incident.id}`)}
              >
                View Details
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
