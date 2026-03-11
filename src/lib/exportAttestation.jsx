import React, { useEffect, useId, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './exportAttestation.css'

const ATTESTATION_TEXT = 'I confirm that I am authorized to export this document and that, to the best of my knowledge, the information contained in it accurately reflects the safety records maintained by my organization. I understand that my organization is solely responsible for the accuracy, completeness, and use of this document.'

function EvidenceExportAttestationModal({ title, details, onCancel, onConfirm }) {
  const [checked, setChecked] = useState(false)
  const checkboxId = useId()

  useEffect(() => {
    const { body } = document
    const previousOverflow = body.style.overflow
    body.style.overflow = 'hidden'
    return () => {
      body.style.overflow = previousOverflow
    }
  }, [])

  return (
    <div className="export-attestation-overlay" onClick={(event) => {
      if (event.target === event.currentTarget) onCancel()
    }}>
      <div className="export-attestation-modal" role="dialog" aria-modal="true" aria-labelledby="export-attestation-title">
        <div className="export-attestation-header">
          <h3 id="export-attestation-title">Export Confirmation</h3>
          <p>{title}</p>
        </div>

        <div className="export-attestation-body">
          {details ? (
            <div className="export-attestation-docmeta">
              <strong>Document scope</strong>
              <span>{details}</span>
            </div>
          ) : null}

          <div className="export-attestation-check">
            <input
              id={checkboxId}
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <label htmlFor={checkboxId}>{ATTESTATION_TEXT}</label>
          </div>

          <div className="export-attestation-note">
            This confirmation is required only for PDF exports that document jobsite events, records, or audit evidence.
          </div>
        </div>

        <div className="export-attestation-footer">
          <button type="button" className="export-attestation-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="export-attestation-btn primary" disabled={!checked} onClick={onConfirm}>
            Continue Export
          </button>
        </div>
      </div>
    </div>
  )
}

export const confirmEvidencePdfExport = ({ title, details } = {}) => {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = (result) => {
      root.unmount()
      container.remove()
      resolve(result)
    }

    root.render(
      <EvidenceExportAttestationModal
        title={title || 'This PDF may be used as a formal safety record outside the application.'}
        details={details || ''}
        onCancel={() => cleanup(false)}
        onConfirm={() => cleanup(true)}
      />
    )
  })
}