import React from 'react'
import './ExportProgress.css'

/**
 * Progress overlay shown during long-running exports (e.g. ZIP with 300 PDFs).
 *
 * Props:
 *   visible   {boolean}
 *   done      {number}   - items processed
 *   total     {number}   - total items
 *   label     {string}   - e.g. "Generating PDF"
 *   onCancel  {function} - optional cancel handler (shows Cancel button if provided)
 */
export default function ExportProgress({ visible, done = 0, total = 0, label = 'Generating…', onCancel }) {
  if (!visible) return null

  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isFinishing = pct >= 100

  return (
    <div className="exp-overlay">
      <div className="exp-modal">
        <div className="exp-icon">
          {isFinishing ? '✓' : (
            <svg className="exp-spinner" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="90 120" strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="exp-label">{isFinishing ? 'Finalizing ZIP…' : label}</div>

        {total > 0 && (
          <div className="exp-count">
            {done} / {total}
          </div>
        )}

        <div className="exp-bar-track">
          <div
            className={`exp-bar-fill${isFinishing ? ' exp-bar-fill--done' : ''}`}
            style={{ width: `${total > 0 ? pct : 30}%` }}
          />
        </div>

        {total > 0 && (
          <div className="exp-pct">{pct}%</div>
        )}

        {onCancel && !isFinishing && (
          <button className="exp-cancel" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
