import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import './People.css'

export default function People() {
  const navigate = useNavigate()
  const [persons, setPersons] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPersons()
  }, [])

  const fetchPersons = async () => {
    setLoading(true)

    const [workersRes, leadersRes] = await Promise.all([
      supabase
        .from('involved_persons')
        .select('id, name, email, phone, company:companies(name)')
        .order('name'),
      supabase
        .from('leaders')
        .select('id, name, email, phone')
        .order('name'),
    ])

    const workers = (workersRes.data || []).map((p) => ({
      ...p,
      _type: 'worker',
      _companyName: p.company?.name || null,
    }))

    const leaders = (leadersRes.data || []).map((p) => ({
      ...p,
      _type: 'leader',
      _companyName: null,
    }))

    // Merge and sort by name
    const merged = [...workers, ...leaders].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', 'pl', { sensitivity: 'base' })
    )

    setPersons(merged)
    setLoading(false)
  }

  const filtered = search.trim()
    ? persons.filter((p) =>
        (p.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : persons

  if (loading) return <div className="spinner"></div>

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">People</h2>
      </div>

      <div className="people-controls">
        <input
          className="people-search"
          type="text"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="people-empty">
          {search ? 'No people found matching your search.' : 'No people found.'}
        </div>
      ) : (
        <div className="people-grid">
          {filtered.map((person) => (
            <button
              key={`${person._type}-${person.id}`}
              className="person-card"
              onClick={() => navigate(`/people/${person._type}/${person.id}`)}
            >
              <div className="person-card-top">
                <div className="person-avatar">
                  {(person.name || '?').charAt(0).toUpperCase()}
                </div>
                <div className="person-card-info">
                  <div className="person-name">{person.name}</div>
                  {person._companyName && (
                    <div className="person-company">{person._companyName}</div>
                  )}
                </div>
                <span className={`person-badge person-badge--${person._type}`}>
                  {person._type === 'worker' ? 'Worker' : 'Leader'}
                </span>
              </div>

              {(person.email || person.phone) && (
                <div className="person-card-contact">
                  {person.email && (
                    <span className="person-contact-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                      {person.email}
                    </span>
                  )}
                  {person.phone && (
                    <span className="person-contact-item">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.39 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      {person.phone}
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="people-footer-count">
        {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
        {search ? ` found for "${search}"` : ' total'}
      </div>
    </div>
  )
}
