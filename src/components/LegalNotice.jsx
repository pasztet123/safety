import React from 'react'
import { LEGAL_CONFIRMATION_CLAUSE, getMeetingTopicAttestationClause } from '../lib/legal'
import './LegalNotice.css'

export default function LegalNotice({ title, children, tone = 'neutral', className = '' }) {
  const classes = ['legal-notice', `legal-notice--${tone}`, className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {title && <div className="legal-notice__title">{title}</div>}
      <div className="legal-notice__body">{children}</div>
    </div>
  )
}

export function LegalClauseNotice({ className = '' }) {
  return (
    <LegalNotice title="Legal Attestation" className={className}>
      {LEGAL_CONFIRMATION_CLAUSE}
    </LegalNotice>
  )
}

export function MeetingTopicAttestationNotice({ className = '', plural = false }) {
  return (
    <LegalNotice title="Topic Alignment Attestation" className={className}>
      {getMeetingTopicAttestationClause({ plural })}
    </LegalNotice>
  )
}

export function JurisdictionWarningNotice({ children, className = '' }) {
  return (
    <LegalNotice title="Jurisdiction Notice" tone="warning" className={className}>
      {children}
    </LegalNotice>
  )
}