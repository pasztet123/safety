import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generateChecklistPDF } from '../lib/pdfGenerator'
import { NEW_TAB_LINK_PROPS, followAppPath } from '../lib/navigation'

export default function Checklists() {
  const checklistsPerPage = 18
  const navigate = useNavigate()
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTrade, setSelectedTrade] = useState('All')
  const [trades, setTrades] = useState([])
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    checkAdmin()
    fetchChecklists()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedTrade])

  const fetchAllRows = async (table, columns) => {
    const pageSize = 1000
    const rows = []
    let from = 0

    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .range(from, from + pageSize - 1)

      if (error) {
        throw error
      }

      if (!data || data.length === 0) {
        break
      }

      rows.push(...data)

      if (data.length < pageSize) {
        break
      }

      from += pageSize
    }

    return rows
  }

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
    }
  }

  const fetchChecklists = async () => {
    setLoading(true)

    try {
      const [checklistsResult, itemsData, completionsData] = await Promise.all([
        supabase
          .from('checklists')
          .select('*')
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        fetchAllRows('checklist_items', 'checklist_id'),
        fetchAllRows('checklist_completions', 'checklist_id')
      ])

      const { data: checklistsData, error: checklistsError } = checklistsResult

      if (checklistsError) {
        console.error('Error fetching checklists:', checklistsError)
        setLoading(false)
        return
      }

      const itemsByChecklistId = itemsData.reduce((acc, item) => {
        acc[item.checklist_id] = (acc[item.checklist_id] || 0) + 1
        return acc
      }, {})

      const completionsByChecklistId = completionsData.reduce((acc, completion) => {
        acc[completion.checklist_id] = (acc[completion.checklist_id] || 0) + 1
        return acc
      }, {})

      const checklists = checklistsData.map(checklist => ({
        ...checklist,
        items: Array.from({ length: itemsByChecklistId[checklist.id] || 0 }),
        completions: Array.from({ length: completionsByChecklistId[checklist.id] || 0 })
      }))

      setChecklists(checklists)

      const uniqueCategories = [...new Set(checklists.map(c => c.category).filter(Boolean))]
      setCategories(['All', ...uniqueCategories.sort()])

      const allTrades = checklists.flatMap(c => c.trades || [])
      const uniqueTrades = [...new Set(allTrades)]
      setTrades(['All', ...uniqueTrades.sort()])
    } catch (error) {
      console.error('Error fetching checklist stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (checklistId, name) => {
    if (!confirm(`Are you sure you want to delete the checklist "${name}"? This action cannot be undone.`)) {
      return
    }

    const { error } = await supabase
      .from('checklists')
      .delete()
      .eq('id', checklistId)

    if (error) {
      alert('Error deleting checklist: ' + error.message)
    } else {
      fetchChecklists()
    }
  }

  const handlePDF = async (checklist) => {
    setPdfLoading(checklist.id)
    try {
      const { data: items } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .order('display_order')
      generateChecklistPDF(checklist, items || [])
    } catch (e) {
      alert('Error generating PDF')
    } finally {
      setPdfLoading(null)
    }
  }

  const openChecklistCompletion = (checklistId, event) => {
    followAppPath(navigate, `/checklists/${checklistId}/complete`, { event })
  }

  if (loading) return <div className="spinner"></div>

  const filteredChecklists = checklists.filter(checklist => {
    // Filter by category
    if (selectedCategory !== 'All' && checklist.category !== selectedCategory) {
      return false
    }
    
    // Filter by trade
    if (selectedTrade !== 'All') {
      if (!checklist.trades || !checklist.trades.includes(selectedTrade)) {
        return false
      }
    }
    
    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const nameMatch = checklist.name.toLowerCase().includes(search)
      const descMatch = checklist.description?.toLowerCase().includes(search)
      const categoryMatch = checklist.category?.toLowerCase().includes(search)
      const tradesMatch = checklist.trades?.some(t => t.toLowerCase().includes(search))
      
      if (!nameMatch && !descMatch && !categoryMatch && !tradesMatch) {
        return false
      }
    }
    
    return true
  })

  const totalPages = Math.max(1, Math.ceil(filteredChecklists.length / checklistsPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const startIndex = (safeCurrentPage - 1) * checklistsPerPage
  const paginatedChecklists = filteredChecklists.slice(startIndex, startIndex + checklistsPerPage)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Safety Checklists</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link className="btn btn-secondary" to="/checklist-history">
            View History
          </Link>
          <Link className="btn btn-primary" to="/checklists/new">
            + New Checklist
          </Link>
        </div>
      </div>

      <div className="filters-section" style={{ marginBottom: '24px' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Search Safety Checklists:</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name, description, category, or trade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ maxWidth: '600px' }}
          />
        </div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {/* Category Filter */}
          {categories.length > 1 && (
            <div style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
              <label className="form-label">Category:</label>
              <select 
                className="form-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {/* Trade Filter */}
          {trades.length > 1 && (
            <div style={{ flex: '1', minWidth: '200px', maxWidth: '300px' }}>
              <label className="form-label">Trade:</label>
              <select 
                className="form-select"
                value={selectedTrade}
                onChange={(e) => setSelectedTrade(e.target.value)}
              >
                {trades.map(trade => (
                  <option key={trade} value={trade}>{trade}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {(searchTerm || selectedCategory !== 'All' || selectedTrade !== 'All') && (
        <div style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Showing {filteredChecklists.length} of {checklists.length} safety checklists
        </div>
      )}

      {filteredChecklists.length > 0 && (
        <div style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
          Page {safeCurrentPage} of {totalPages}
        </div>
      )}

      <div className="checklists-grid">
        {filteredChecklists.length === 0 ? (
          <div className="empty-state">
            <p>No safety checklists found{searchTerm ? ' matching your search' : selectedCategory !== 'All' || selectedTrade !== 'All' ? ' with selected filters' : ''}.</p>
          </div>
        ) : (
          paginatedChecklists.map((checklist) => (
            <div
              key={checklist.id}
              className="card card-clickable"
              onClick={(event) => openChecklistCompletion(checklist.id, event)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  openChecklistCompletion(checklist.id)
                }
              }}
            >
              {checklist.category && (
                <div className="checklist-category" style={{ 
                  fontSize: '12px', 
                  color: '#666', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  {checklist.category}
                </div>
              )}
              <h3 className="checklist-name">{checklist.name}</h3>
              {checklist.description && (
                <p className="checklist-description">{checklist.description}</p>
              )}
              
              {checklist.trades && checklist.trades.length > 0 && (
                <div className="trades-tags" style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  flexWrap: 'wrap',
                  marginTop: '8px',
                  marginBottom: '12px'
                }}>
                  {checklist.trades.map(trade => (
                    <span key={trade} className="trade-tag" style={{
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {trade}
                    </span>
                  ))}
                </div>
              )}
              
              <div className="checklist-stats">
                <div className="stat-item">
                  <span className="stat-label">Items:</span>
                  <span className="stat-value">{checklist.items?.length || 0}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Completions:</span>
                  <span className="stat-value">{checklist.completions?.length || 0}</span>
                </div>
              </div>

              <div className="checklist-actions">
                <Link
                  className="btn btn-primary"
                  to={`/checklists/${checklist.id}/complete`}
                  onClick={(e) => e.stopPropagation()}
                >
                  Complete Checklist
                </Link>
                <Link
                  className="btn btn-secondary"
                  to={`/checklists/${checklist.id}`}
                  onClick={(e) => e.stopPropagation()}
                >
                  View/Edit
                </Link>
                <Link
                  className="btn btn-secondary"
                  to={`/checklists/${checklist.id}/complete`}
                  onClick={(e) => e.stopPropagation()}
                  {...NEW_TAB_LINK_PROPS}
                >
                  New Tab
                </Link>
                <button
                  className="btn btn-secondary"
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePDF(checklist)
                  }}
                  disabled={pdfLoading === checklist.id}
                  style={{ minWidth: '70px' }}
                >
                  {pdfLoading === checklist.id ? '…' : 'PDF'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {filteredChecklists.length > checklistsPerPage && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          marginTop: '24px'
        }}>
          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={safeCurrentPage === 1}
          >
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
            <button
              key={page}
              className={page === safeCurrentPage ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}

          <button
            className="btn btn-secondary"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={safeCurrentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
