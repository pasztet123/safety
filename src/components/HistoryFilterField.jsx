import React from 'react'

export default function HistoryFilterField({ label, children }) {
  return (
    <div className="history-filter-field">
      <span className="history-filter-field-label">{label}</span>
      {children}
    </div>
  )
}