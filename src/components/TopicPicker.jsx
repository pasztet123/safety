import React, { useState, useEffect, useRef } from 'react'
import { SAFETY_CATEGORIES } from '../lib/categories'
import './TopicPicker.css'

const RISK_COLORS = {
  low: '#16a34a',
  medium: '#ca8a04',
  high: '#ea580c',
  critical: '#dc2626',
}

/**
 * TopicPicker — replaces the native <select>+<optgroup> for topic selection.
 *
 * Props:
 *   topics             — array of safety_topics rows from Supabase
 *   selectedTrade      — string trade name (from formData.trade); boosts matching topics
 *   featuredCategories — ordered string[] of categories to pin to top (from admin settings)
 *   featuredTopics      — ordered topic objects to show as quick-pick chips at the very top
 *   value              — current topic name string, or '' / 'custom'
 *   onChange(name)     — called with a topic name or 'custom'
 */
export default function TopicPicker({ topics = [], selectedTrade = '', featuredCategories = [], featuredTopics = [], value = '', onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState(null)
  const containerRef = useRef()
  const searchRef = useRef()

  // ── Close on outside click ──────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Close on Escape ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // ── Auto-expand best category when trade / topics / featured change ─
  useEffect(() => {
    if (!topics.length) return
    const allCatNames = [...new Set(topics.map(t => t.category || 'Other'))]
    const fSet = new Set(featuredCategories)
    const nonFeatured = allCatNames.filter(c => !fSet.has(c))

    if (selectedTrade) {
      // Score every non-featured category by trade-match count
      const scored = nonFeatured.map(cat => ({
        cat,
        score: topics.filter(t => (t.category || 'Other') === cat && Array.isArray(t.trades) && t.trades.includes(selectedTrade)).length,
        canonicalIdx: SAFETY_CATEGORIES.indexOf(cat) === -1 ? SAFETY_CATEGORIES.length : SAFETY_CATEGORIES.indexOf(cat),
      })).sort((a, b) => b.score - a.score || a.canonicalIdx - b.canonicalIdx)
      const best = scored[0]
      setExpandedCategory(best && best.score > 0 ? best.cat : (featuredCategories[0] || nonFeatured[0] || null))
    } else {
      // No trade: open first featured, fall back to first canonical
      setExpandedCategory(featuredCategories[0] || SAFETY_CATEGORIES.find(c => allCatNames.includes(c)) || null)
    }
  }, [selectedTrade, topics, featuredCategories])

  // ── Reset search + expandedCategory when trade changes (so picker opens fresh) ─
  useEffect(() => {
    setSearch('')
  }, [selectedTrade])

  // ── Focus search when panel opens ───────────────────────
  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 0)
    }
  }, [open])

  // ── Derived data ─────────────────────────────────────────
  const allCategoryNames = [...new Set(topics.map(t => t.category || 'Other'))]
  const featuredSet = new Set(featuredCategories)
  const nonFeaturedCats = allCategoryNames.filter(c => !featuredSet.has(c))

  // When a trade is selected: sort non-featured categories by # of trade-matched topics (desc).
  // Ties fall back to canonical SAFETY_CATEGORIES order, then alpha for unknowns.
  const catTradeScore = (cat) => {
    if (!selectedTrade) return 0
    return topics.filter(t => (t.category || 'Other') === cat && Array.isArray(t.trades) && t.trades.includes(selectedTrade)).length
  }
  const canonicalIndex = (cat) => {
    const i = SAFETY_CATEGORIES.indexOf(cat)
    return i === -1 ? SAFETY_CATEGORIES.length : i
  }
  const sortedNonFeatured = [...nonFeaturedCats].sort((a, b) => {
    if (selectedTrade) {
      const diff = catTradeScore(b) - catTradeScore(a)
      if (diff !== 0) return diff
    }
    return canonicalIndex(a) - canonicalIndex(b) || a.localeCompare(b)
  })

  const categories = [
    ...featuredCategories.filter(c => allCategoryNames.includes(c)),
    ...sortedNonFeatured,
  ]

  // Per-category sorted topics: trade-matched first, then alpha
  const topicsByCategory = {}
  categories.forEach(cat => {
    const catTopics = topics.filter(t => (t.category || 'Other') === cat)
    topicsByCategory[cat] = catTopics.sort((a, b) => {
      const aMatch = selectedTrade && Array.isArray(a.trades) && a.trades.includes(selectedTrade)
      const bMatch = selectedTrade && Array.isArray(b.trades) && b.trades.includes(selectedTrade)
      if (aMatch && !bMatch) return -1
      if (!aMatch && bMatch) return 1
      return a.name.localeCompare(b.name)
    })
  })

  // Flat search results
  const searchResults = search.trim()
    ? topics
        .filter(t => {
          const s = search.toLowerCase()
          return (
            t.name.toLowerCase().includes(s) ||
            (t.description && t.description.toLowerCase().includes(s)) ||
            (t.category && t.category.toLowerCase().includes(s)) ||
            (t.osha_reference && t.osha_reference.toLowerCase().includes(s))
          )
        })
        .sort((a, b) => {
          const aMatch = selectedTrade && Array.isArray(a.trades) && a.trades.includes(selectedTrade)
          const bMatch = selectedTrade && Array.isArray(b.trades) && b.trades.includes(selectedTrade)
          if (aMatch && !bMatch) return -1
          if (!aMatch && bMatch) return 1
          return a.name.localeCompare(b.name)
        })
    : null

  // Trigger label
  const selectedLabel =
    value === 'custom'
      ? '+ Custom Topic'
      : value
      ? topics.find(t => t.name === value)?.name || value
      : 'Select a topic…'

  const isPlaceholder = !value

  const handleSelect = (topicName) => {
    onChange(topicName)
    setOpen(false)
    setSearch('')
  }

  const TopicRow = ({ t, showCategory = false }) => {
    const tradeMatch = selectedTrade && Array.isArray(t.trades) && t.trades.includes(selectedTrade)
    return (
      <li>
        <button
          type="button"
          className={[
            'tp-topic-row',
            value === t.name ? 'is-selected' : '',
            tradeMatch ? 'is-trade-match' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => handleSelect(t.name)}
        >
          <div className="tp-topic-name">
            {t.name}
            {tradeMatch && <span className="tp-badge tp-badge--trade">Your trade</span>}
          </div>
          <div className="tp-topic-meta">
            {showCategory && t.category && (
              <span className="tp-cat-pill">{t.category}</span>
            )}
            {t.risk_level && t.risk_level !== 'medium' && (
              <span className="tp-risk" style={{ color: RISK_COLORS[t.risk_level] }}>
                {t.risk_level.toUpperCase()}
              </span>
            )}
          </div>
        </button>
      </li>
    )
  }

  return (
    <div className="tp-container" ref={containerRef}>
      {/* ── Trigger ── */}
      <button
        type="button"
        className={['tp-trigger', open ? 'is-open' : '', isPlaceholder ? 'is-placeholder' : '']
          .filter(Boolean)
          .join(' ')}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {isPlaceholder ? (
          <span className="tp-trigger-placeholder">Select a topic…</span>
        ) : (
          <span className="tp-trigger-text">
            {value === 'custom' ? (
              <em style={{ color: '#6b7280', fontStyle: 'normal' }}>+ Custom Topic</em>
            ) : (
              selectedLabel
            )}
          </span>
        )}
        <svg className="tp-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className="tp-panel" role="listbox">
          {/* Search */}
          <div className="tp-search-wrap">
            <svg className="tp-search-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11zM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="tp-search"
              placeholder="Search topics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="tp-search-clear"
                onClick={() => setSearch('')}
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          {/* Body */}
          <div className="tp-body">
            {searchResults ? (
              /* ── SEARCH MODE: flat list ── */
              searchResults.length > 0 ? (
                <ul className="tp-list">
                  {searchResults.map(t => (
                    <TopicRow key={t.id} t={t} showCategory />
                  ))}
                </ul>
              ) : (
                <div className="tp-empty">No topics match "{search}"</div>
              )
            ) : (
              <>
              {/* ── QUICK PICKS section ── */}
              {featuredTopics.length > 0 && (
                <div className="tp-quickpicks">
                  <div className="tp-quickpicks-label">Quick Picks</div>
                  <div className="tp-quickpicks-grid">
                    {featuredTopics.map(t => {
                      const tradeMatch = selectedTrade && Array.isArray(t.trades) && t.trades.includes(selectedTrade)
                      const isSelected = value === t.name
                      return (
                        <button
                          key={t.id}
                          type="button"
                          className={[
                            'tp-qp-chip',
                            isSelected ? 'is-selected' : '',
                            tradeMatch ? 'is-trade-match' : '',
                          ].filter(Boolean).join(' ')}
                          onClick={() => handleSelect(t.name)}
                        >
                          <span className="tp-qp-name">{t.name}</span>
                          <div className="tp-qp-meta">
                            {t.category && <span className="tp-qp-cat">{t.category}</span>}
                            {t.risk_level && t.risk_level !== 'medium' && (
                              <span className="tp-qp-risk" style={{ color: RISK_COLORS[t.risk_level] }}>
                                {t.risk_level.toUpperCase()}
                              </span>
                            )}
                            {tradeMatch && <span className="tp-badge tp-badge--trade tp-qp-trade">Your trade</span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* ── BROWSE MODE: accordion ── */}
              <ul className="tp-categories">
                {categories.map((cat, idx) => {
                  const catTopics = topicsByCategory[cat]
                  const matchCount = selectedTrade
                    ? catTopics.filter(t => Array.isArray(t.trades) && t.trades.includes(selectedTrade)).length
                    : 0
                  const isFeatured = featuredSet.has(cat)
                  const isExpanded = expandedCategory === cat
                  // Insert a divider between the last featured and first non-featured category
                  const prevCat = categories[idx - 1]
                  const showDivider = featuredCategories.length > 0 && prevCat && featuredSet.has(prevCat) && !isFeatured

                  return (
                    <React.Fragment key={cat}>
                      {showDivider && <li className="tp-divider-row" role="separator" />}
                      <li className="tp-category">
                        <button
                          type="button"
                          className={['tp-category-head', isExpanded ? 'is-open' : '', isFeatured ? 'is-featured' : ''].filter(Boolean).join(' ')}
                          onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                        >
                        <span className="tp-category-name">
                          {isFeatured && <span className="tp-featured-dot" aria-hidden="true" />}
                          {cat}
                        </span>
                        <div className="tp-category-meta">
                          {matchCount > 0 && (
                            <span className="tp-badge tp-badge--trade">
                              {matchCount} match{matchCount > 1 ? 'es' : ''}
                            </span>
                          )}
                          <span className="tp-category-count">{catTopics.length}</span>
                          <svg
                            className={['tp-cat-chevron', isExpanded ? 'is-open' : ''].filter(Boolean).join(' ')}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </button>

                      {isExpanded && (
                        <ul className="tp-list tp-list--indent">
                          {catTopics.map(t => (
                            <TopicRow key={t.id} t={t} />
                          ))}
                        </ul>
                      )}
                      </li>
                    </React.Fragment>
                  )
                })}
              </ul>
              </>
            )}
          </div>

          {/* Footer — custom topic */}
          <div className="tp-footer">
            <button
              type="button"
              className={['tp-custom-btn', value === 'custom' ? 'is-selected' : ''].filter(Boolean).join(' ')}
              onClick={() => handleSelect('custom')}
            >
              <span>+ Custom Topic</span>
              <span className="tp-custom-hint">Type your own</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
