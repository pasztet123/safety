import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Checklists() {
  const navigate = useNavigate()
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [categories, setCategories] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTrade, setSelectedTrade] = useState('All')
  const [trades, setTrades] = useState([])

  useEffect(() => {
    checkAdmin()
    fetchChecklists()
  }, [])

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
    
    // Pobierz checklisty
    const { data: checklistsData, error: checklistsError } = await supabase
      .from('checklists')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (checklistsError) {
      console.error('Error fetching checklists:', checklistsError)
      setLoading(false)
      return
    }

    // Pobierz liczbę items dla każdej checklisty
    const { data: itemsData } = await supabase
      .from('checklist_items')
      .select('checklist_id')

    // Pobierz liczbę completions dla każdej checklisty
    const { data: completionsData } = await supabase
      .from('checklist_completions')
      .select('checklist_id, completed_at')

    // Połącz dane
    const checklists = checklistsData.map(checklist => ({
      ...checklist,
      items: itemsData?.filter(item => item.checklist_id === checklist.id) || [],
      completions: completionsData?.filter(comp => comp.checklist_id === checklist.id) || []
    }))

    setChecklists(checklists)
    
    // Extract unique categories
    const uniqueCategories = [...new Set(checklists.map(c => c.category).filter(Boolean))]
    setCategories(['All', ...uniqueCategories.sort()])
    
    // Extract unique trades
    const allTrades = checklists.flatMap(c => c.trades || [])
    const uniqueTrades = [...new Set(allTrades)]
    setTrades(['All', ...uniqueTrades.sort()])
    
    setLoading(false)
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

  if (loading) return <div className="spinner"></div>

  const filteredChecklists = checklists.filter(checklist => {
    // Hide empty checklists (without items)
    if (!checklist.items || checklist.items.length === 0) {
      return false
    }
    
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

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Checklists</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/checklist-history')}>
            View History
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/checklists/new')}>
            + New Checklist
          </button>
        </div>
      </div>

      <div className="filters-section" style={{ marginBottom: '24px' }}>
        {/* Search Bar */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Search Checklists:</label>
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
          Showing {filteredChecklists.length} of {checklists.length} checklists
        </div>
      )}

      <div className="checklists-grid">
        {filteredChecklists.length === 0 ? (
          <div className="empty-state">
            <p>No checklists found{searchTerm ? ' matching your search' : selectedCategory !== 'All' || selectedTrade !== 'All' ? ' with selected filters' : ''}.</p>
          </div>
        ) : (
          filteredChecklists.map((checklist) => (
            <div key={checklist.id} className="card card-clickable">
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
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/checklists/${checklist.id}/complete`)}
                >
                  Complete Checklist
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate(`/checklists/${checklist.id}`)}
                >
                  View/Edit
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
