import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import './Projects.css'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    job_address: '',
    client_name: '',
    status: 'active'
  })

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setProjects(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const { data: { user } } = await supabase.auth.getUser()
    
    const { error } = await supabase
      .from('projects')
      .insert([{ ...formData, user_id: user.id }])

    if (!error) {
      setShowForm(false)
      setFormData({
        name: '',
        description: '',
        job_address: '',
        client_name: '',
        status: 'active'
      })
      fetchProjects()
    }
  }

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Projects</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          + New Project
        </button>
      </div>

      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="card">
            <h3 className="project-name">{project.name}</h3>
            {project.client_name && (
              <p className="project-detail">Client: {project.client_name}</p>
            )}
            {project.job_address && (
              <p className="project-detail">Address: {project.job_address}</p>
            )}
            {project.description && (
              <p className="project-description">{project.description}</p>
            )}
            <span className={`project-status status-${project.status}`}>
              {project.status}
            </span>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">New Project</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Project Name *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Client Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Job Address</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.job_address}
                  onChange={(e) => setFormData({ ...formData, job_address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Status</label>
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
