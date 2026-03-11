import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BASE_CSS,
  baseHTML,
  renderHTMLtoPDF,
} from '../lib/pdfGenerator'
import './UserManual.css'

const GLOBAL_DISCLAIMER = [
  'All records entered into the application are submitted at the user\'s own responsibility.',
  'Users must not enter false, misleading, incomplete, retaliatory, or bad-faith information.',
  'This software supports documentation and traceability, but it does not replace company policy, legal reporting duties, supervision, or professional judgment.',
]

const ACCESS_VARIANTS = {
  all: { label: 'All users', className: 'is-all' },
  admin: { label: 'Admin only', className: 'is-admin' },
  mixed: { label: 'Mixed access', className: 'is-mixed' },
  restricted: { label: 'Restricted', className: 'is-restricted' },
}

const guideSections = [
  {
    id: 'toolbox-meetings',
    title: 'Toolbox Meetings',
    shortDescription: 'Run safety talks, collect attendance, attach evidence, and keep the meeting history audit-ready.',
    route: '/meetings',
    access: 'mixed',
    purpose:
      'Use Toolbox Meetings to document daily or recurring safety talks, prove attendance, connect the talk with a project and trade, and store the evidence needed for supervision, compliance, and internal review.',
    outcomes: [
      'Create a traceable history of safety communication on the job.',
      'Show who attended, who led the talk, what topic was covered, and when it happened.',
      'Attach signatures, attendance confirmations, photos, map location, and checklist completions to a single meeting record.',
    ],
    accessRules: [
      'All users can create and review meetings.',
      'Admins can edit existing meetings, manage drafts, bulk-approve imports, and run broader export workflows.',
    ],
    capabilities: [
      'Search by topic, leader, project, or attendee name.',
      'Filter by trade and attendee, then sort by newest, oldest, topic name, or attendee count.',
      'Open a detailed record showing signatures, photos, location, and linked checklists.',
      'Generate a single meeting PDF or export filtered meeting reports and ZIP bundles.',
    ],
    procedures: [
      {
        title: 'Method A: Create a meeting manually',
        steps: [
          'Open Toolbox Meetings and choose the action to create a new meeting.',
          'Select the project, date, time, and location. The form can prefill location using device GPS, and you can adjust it manually.',
          'Choose the leader, trade, and safety topic. If needed, use the topic content panel to guide the discussion live during the meeting.',
          'Add attendees from the worker list or type names manually when a person is not yet in the directory.',
          'Optionally attach checklists that match the trade or topic and complete them before saving the meeting.',
          'Add discussion notes and upload photos if visual evidence is required.',
          'Capture the leader signature using either a stored default signature or a handwritten signature.',
          'For each attendee, use either the attendance checkbox or an individual signature when a stronger proof of attendance is required.',
          'Save the meeting. For new manual meetings, the application also tags the source as manual and preserves all linked evidence in the final record.',
        ],
      },
      {
        title: 'Method B: Import attendance to drafts, then approve',
        steps: [
          'Open Bulk Import as an admin and select the active project that should receive the imported records.',
          'Upload a BusyBusy CSV export. The system parses time-entry rows and groups them into draft meetings by date and related attendance data.',
          'Review the generated draft list before saving. At this stage you can spot duplicate dates, skip selected dates, refresh suggested topics, change trade values, and fine-tune draft fields.',
          'Confirm the import. The system saves each draft with an import batch id, marks the source as BusyBusy CSV, and can create missing people in the worker directory when needed.',
          'Go back to Toolbox Meetings and open the draft area. Use filters, pagination, batch selection, and batch editing to prepare the drafts for approval.',
          'Launch the draft approval flow. In the approval modal, confirm or correct the leader, verify the meeting contents, and provide the leader signature or signature mode required for finalization.',
          'Approve the draft. The meeting is converted from draft to finalized record and becomes part of the normal meeting history, exports, and project view.',
        ],
      },
    ],
    imageSlots: [
      {
        title: 'Meetings list overview',
        caption: 'Recommended screenshot: the meetings page with filters, actions, and draft section visible.',
      },
      {
        title: 'Manual meeting form',
        caption: 'Recommended screenshot: the meeting form with topic, attendees, signature panel, and checklists.',
      },
      {
        title: 'Bulk import and draft approval',
        caption: 'Recommended screenshot: CSV preview or draft approval modal showing the admin workflow.',
      },
    ],
    disclaimers: [
      'Meeting attendance, signatures, and topic records must reflect the real event that took place.',
      'Users must not sign on behalf of another person or create attendance evidence in bad faith.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Toolbox Meetings guide',
  },
  {
    id: 'safety-topics',
    title: 'Safety Topics',
    shortDescription: 'Use the safety topic library as the content backbone for toolbox talks and training refreshers.',
    route: '/safety-topics',
    access: 'mixed',
    purpose:
      'Use Safety Topics to maintain a structured library of talk content, filter it by category or trade, and connect safety guidance to the meeting workflow.',
    outcomes: [
      'Standardize what is discussed during toolbox talks.',
      'Make topic selection easier by category, risk level, and trade.',
      'Prepare printable topic content for field use or review.',
    ],
    accessRules: [
      'All users can browse, search, and open topic content.',
      'Admins can create, edit, delete, and feature topics for dashboard and workflow use.',
    ],
    capabilities: [
      'Search by topic name, description, or OSHA reference.',
      'Filter by category, risk level, and trade.',
      'Generate single-topic PDF output and brochure-style exports from the topic module.',
      'Use topic-to-checklist relationships maintained by admins.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Topics library grid',
        caption: 'Recommended screenshot: filters, risk tags, and visible topic cards.',
      },
      {
        title: 'Topic detail modal or panel',
        caption: 'Recommended screenshot: topic content, image, risk level, and checklist references.',
      },
    ],
    disclaimers: [
      'Topic content supports safety communication but does not replace legal, contractual, or supervisory obligations.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Safety Topics guide',
  },
  {
    id: 'checklists',
    title: 'Checklists',
    shortDescription: 'Run inspections and compliance tasks with item tracking, notes, photos, and signatures.',
    route: '/checklists',
    access: 'mixed',
    purpose:
      'Use Checklists to perform structured inspections, verify completion of required items, and preserve evidence such as notes, photos, signer identity, and signature capture.',
    outcomes: [
      'Convert recurring inspection routines into repeatable, auditable workflows.',
      'Show progress, item-level completion, and completion history.',
      'Produce completion evidence for internal review, management, or compliance follow-up.',
    ],
    accessRules: [
      'All users can browse checklists and complete them.',
      'Admins can edit history records, delete records, and run broader history exports.',
    ],
    capabilities: [
      'Filter checklist templates by category and trade.',
      'Complete checklist items with notes, item photos, and overall completion photos.',
      'Assign the completion to a project and capture signer identity as leader or worker.',
      'Store signature evidence using a saved default signature or a new handwritten signature.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Checklist library',
        caption: 'Recommended screenshot: checklist cards with category or trade filters visible.',
      },
      {
        title: 'Checklist completion flow',
        caption: 'Recommended screenshot: item checklist, progress bar, notes, photos, and signer panel.',
      },
      {
        title: 'Checklist history view',
        caption: 'Recommended screenshot: completion details with signature and export actions.',
      },
    ],
    disclaimers: [
      'A completed checklist does not by itself prove site conditions were safe if the information entered is false or incomplete.',
      'The person completing or signing the checklist is responsible for truthful documentation.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Checklists guide',
  },
  {
    id: 'incidents',
    title: 'Incidents',
    shortDescription: 'Report incidents, near misses, unsafe conditions, and safety violations with evidence and follow-up actions.',
    route: '/incidents',
    access: 'mixed',
    purpose:
      'Use Incidents to capture what happened, who was involved, where it happened, and what corrective or disciplinary follow-up must be recorded afterward.',
    outcomes: [
      'Preserve a complete incident timeline with witnesses, location, narrative, photos, and signatures.',
      'Support quick reporting for fast capture and full investigation for detailed follow-up.',
      'Generate incident evidence for exports, project review, and management response.',
    ],
    accessRules: [
      'All users can create incident reports.',
      'Admins can edit, delete, and export incident summaries and maintain linked actions more broadly.',
    ],
    capabilities: [
      'Choose Quick Report or Full Investigation mode depending on the situation.',
      'Capture incident type, subtype, severity, injuries, treatment, OSHA flags, witnesses, map location, and photo evidence.',
      'Collect reporter signatures using default or handwritten signatures.',
      'Create corrective actions and, for safety violations, disciplinary actions directly from the incident workflow.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Incident log',
        caption: 'Recommended screenshot: incident list with filters and action buttons.',
      },
      {
        title: 'Incident report form',
        caption: 'Recommended screenshot: the main form with type selection, witnesses, map, and signature panel.',
      },
      {
        title: 'Incident detail and follow-up',
        caption: 'Recommended screenshot: detail page with corrective and disciplinary actions.',
      },
    ],
    disclaimers: [
      'Users must not use incident reporting to harass, retaliate against, or falsely accuse another person.',
      'Incident data must be entered promptly, accurately, and in good faith.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Incidents guide',
  },
  {
    id: 'corrective-actions',
    title: 'Corrective Actions',
    shortDescription: 'Track open items, assign responsibility, and close the loop after incidents or findings.',
    route: '/corrective-actions',
    access: 'mixed',
    purpose:
      'Use Corrective Actions to convert findings into assigned follow-up work with status, due dates, completion dates, and incident linkage.',
    outcomes: [
      'Track whether issues remain open, overdue, or completed.',
      'Assign responsibility to the right worker or person in the system.',
      'Show follow-up status in the incident, project, and action-log views.',
    ],
    accessRules: [
      'The log is visible across the application.',
      'Admins handle creation, editing, status changes, and export workflows where admin-only controls are exposed.',
    ],
    capabilities: [
      'Search by description and filter by open or completed status.',
      'Create actions from scratch or start from predefined action suggestions.',
      'Link to incidents and assign responsibility to a person in the directory.',
      'Export filtered action lists as a PDF report.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Corrective action timeline',
        caption: 'Recommended screenshot: timeline cards with status, due dates, and filters.',
      },
      {
        title: 'Create or edit action',
        caption: 'Recommended screenshot: add form or inline edit state with predefined action picker.',
      },
    ],
    disclaimers: [
      'Changing an action to completed should happen only when the corrective work has actually been finished or verified.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Corrective Actions guide',
  },
  {
    id: 'disciplinary-actions',
    title: 'Disciplinary Actions',
    shortDescription: 'Document violation-linked actions, recipients, responsible leaders, and timing of formal response.',
    route: '/disciplinary-actions',
    access: 'mixed',
    purpose:
      'Use Disciplinary Actions to document formal responses connected to safety violations, the worker involved, and the responsible leader overseeing the response.',
    outcomes: [
      'Keep disciplinary follow-up tied to the underlying incident.',
      'Record the type of action taken, who received it, who managed it, and when it happened.',
      'Provide a consistent history visible in incident records and person profiles.',
    ],
    accessRules: [
      'The module is visible in the app for review and workflow continuity.',
      'Creation and maintenance of records are intended for authorized supervisory or admin users.',
    ],
    capabilities: [
      'Search and filter by action type, violation type, and leader.',
      'Launch the form directly from a safety-violation incident or from the main disciplinary log.',
      'Export filtered disciplinary records as a PDF report.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Disciplinary action log',
        caption: 'Recommended screenshot: list view with filters for action type and leader.',
      },
      {
        title: 'Violation-linked action form',
        caption: 'Recommended screenshot: the form showing incident, recipient, leader, notes, and action timing.',
      },
    ],
    disclaimers: [
      'Disciplinary records must be based on real supervisory action and must not be created in bad faith or for retaliation.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Disciplinary Actions guide',
  },
  {
    id: 'projects',
    title: 'Projects',
    shortDescription: 'Organize work by job, client, address, status, trades, and linked records.',
    route: '/projects',
    access: 'all',
    purpose:
      'Use Projects as the operational container for meetings and incidents so that records stay tied to the correct job and can be reviewed in context.',
    outcomes: [
      'Keep meetings and incidents grouped by real jobsite.',
      'Review job-specific activity from a single detail page.',
      'Start project-specific meeting entry with fewer manual selections.',
    ],
    accessRules: [
      'Projects are part of the normal workflow for all users.',
    ],
    capabilities: [
      'Search by name, client, address, or trade.',
      'Sort by newest, oldest, name, or status.',
      'Review meetings and incidents from the project detail tabs.',
      'Generate PDFs for individual meetings and incidents inside the project context.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Project list and filters',
        caption: 'Recommended screenshot: project cards with trades, status, and search controls.',
      },
      {
        title: 'Project detail tabs',
        caption: 'Recommended screenshot: project detail view with meetings and incidents tabs.',
      },
    ],
    disclaimers: [
      'Users should attach records to the correct project to avoid misleading reporting and incomplete project histories.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Projects guide',
  },
  {
    id: 'people',
    title: 'People',
    shortDescription: 'Use the people directory to find workers, leaders, contact data, and their related activity.',
    route: '/people',
    access: 'all',
    purpose:
      'Use People as the central directory for workers, subcontractors, and leaders when assigning attendance, responsibility, witnesses, or reviewing historical involvement.',
    outcomes: [
      'Find the correct person before assigning actions or witnesses.',
      'Review a person\'s meetings, incidents, projects, and actions in one place.',
      'Support more consistent naming and better traceability across the app.',
    ],
    accessRules: [
      'The directory is visible to all users for operational reference.',
      'Admin Panel is used to maintain the underlying people master data.',
    ],
    capabilities: [
      'Search by name.',
      'See role badges for worker, leader, or both.',
      'Open profile tabs for meetings, projects, incidents, corrective actions, and disciplinary actions.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'People directory cards',
        caption: 'Recommended screenshot: people cards with meeting counts and role badges.',
      },
      {
        title: 'Person detail profile',
        caption: 'Recommended screenshot: the tabbed activity view for one person.',
      },
    ],
    disclaimers: [
      'Users should select the correct person identity before assigning attendance, actions, or witness involvement.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export People guide',
  },
  {
    id: 'export-center',
    title: 'Export Center',
    shortDescription: 'Generate PDF reports and CSV packages for the operational parts of the app.',
    route: '/export',
    access: 'admin',
    purpose:
      'Use the Export Center to generate printable or portable evidence sets across meetings, incidents, safety topics, corrective actions, checklist history, and structured CSV datasets.',
    outcomes: [
      'Build management-ready or compliance-ready PDF packages from filtered data.',
      'Export CSV files for downstream review, backup, or analytics.',
      'Use consistent filter-based exports rather than manual screenshot collection.',
    ],
    accessRules: [
      'The Export Center is admin-only.',
      'Users can still generate some single-record PDFs from detail pages elsewhere in the app.',
    ],
    capabilities: [
      'Generate meeting list PDFs and ZIP bundles of individual meeting PDFs.',
      'Generate incident, corrective-action, safety-topic, and checklist-history reports.',
      'Build CSV ZIP packages for selected datasets.',
      'Track long-running exports through progress UI.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Export Center overview',
        caption: 'Recommended screenshot: the export page with section filters and export buttons.',
      },
      {
        title: 'Progress modal',
        caption: 'Recommended screenshot: export progress dialog during ZIP or large report generation.',
      },
    ],
    disclaimers: [
      'Exported documents are only as accurate as the data entered into the system.',
      'Users must not circulate exported records in a misleading or bad-faith context.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Export Center guide',
  },
  {
    id: 'admin-panel',
    title: 'Admin Panel',
    shortDescription: 'Manage users, leaders, workers, companies, settings, featured content, and analytics.',
    route: '/admin',
    access: 'admin',
    purpose:
      'Use the Admin Panel to maintain the people and settings backbone of the application and to run maintenance actions that ordinary field users should not handle directly.',
    outcomes: [
      'Create and maintain users, leaders, workers, and companies.',
      'Store default signatures used elsewhere in meetings, incidents, and checklists.',
      'Control featured content and topic-checklist relationships.',
    ],
    accessRules: [
      'Admin Panel is restricted to admins.',
      'Some functions inside it, such as audit-oriented maintenance or featured settings, are especially sensitive and should be limited to trusted administrators.',
    ],
    capabilities: [
      'Create users, reset passwords, edit admin rights, and delete accounts.',
      'Maintain leaders and workers, including default signatures.',
      'Manage companies and topic-to-checklist suggestions.',
      'Adjust featured categories, topics, and trades that affect user-facing screens.',
      'Run the draft-leader repair utility and view analytics.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'Admin tabs overview',
        caption: 'Recommended screenshot: tab bar showing users, leaders, workers, settings, and analytics.',
      },
      {
        title: 'User or leader form',
        caption: 'Recommended screenshot: one admin form showing default signature management.',
      },
    ],
    disclaimers: [
      'Administrative permissions must be used only by authorized personnel and in good faith.',
      'Deleting or changing records in the admin area can affect downstream reporting and evidence quality.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Admin Panel guide',
  },
  {
    id: 'system-records',
    title: 'System Records',
    shortDescription: 'Review audit events and record-history snapshots for restricted investigation and evidence workflows.',
    route: '/system-records',
    access: 'restricted',
    purpose:
      'Use System Records only for restricted audit review, system-level evidence inspection, and record-history analysis by authorized audit superadmins.',
    outcomes: [
      'Review audit events across tracked entities.',
      'Inspect before-and-after snapshots for versioned history tables.',
      'Generate narrow, filtered evidence exports for authorized review.',
    ],
    accessRules: [
      'This screen is restricted to audit superadmin accounts only.',
      'It should not be treated as a normal operational workflow for standard users or regular admins.',
    ],
    capabilities: [
      'Filter and search audit events and record-history entries.',
      'Inspect JSON metadata and snapshot content.',
      'Export filtered evidence PDF output.',
    ],
    procedures: [],
    imageSlots: [
      {
        title: 'System Records view',
        caption: 'Recommended screenshot: audit event or record-history card layout for restricted users.',
      },
    ],
    disclaimers: [
      'Restricted audit information must be handled only by properly authorized personnel.',
    ],
    includeInHandbook: false,
    pdfExportLabel: 'Export System Records guide',
  },
]

const manualPdfStyles = `
  ${BASE_CSS}
  .manual-wrap{padding:0;background:#fff}
  .manual-cover{padding:28px 36px 18px;background:linear-gradient(135deg,#171717 0%,#252525 100%);color:#fff;position:relative;overflow:hidden}
  .manual-cover::after{content:'';position:absolute;left:0;top:0;bottom:0;width:6px;background:#E53935}
  .manual-kicker{font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:6px}
  .manual-title{font-size:26px;font-weight:800;line-height:1.15;margin-bottom:8px}
  .manual-sub{font-size:13px;line-height:1.6;color:rgba(255,255,255,.75);max-width:620px}
  .manual-intro{padding:18px 36px 4px}
  .manual-callout{border:1px solid #fecaca;background:#fef2f2;border-radius:10px;padding:14px 16px;margin-top:14px}
  .manual-callout-title{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#b91c1c;margin-bottom:6px}
  .manual-callout li{margin-left:18px;color:#7f1d1d;font-size:12px;line-height:1.6}
  .manual-toc{padding:18px 36px 10px}
  .manual-toc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 18px}
  .manual-toc-item{border-bottom:1px solid #e5e5e5;padding:8px 0}
  .manual-toc-label{font-size:9px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6b7280;margin-bottom:4px}
  .manual-toc-title{font-size:13px;font-weight:700;color:#171717}
  .manual-chunk{padding:0 36px 20px;page-break-inside:avoid}
  .manual-section-card{border:1px solid #e5e5e5;border-radius:12px;padding:18px 18px 2px;margin-bottom:18px;background:#fff}
  .manual-badge{display:inline-block;padding:4px 9px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:10px}
  .manual-badge.is-all{background:#dcfce7;color:#166534}
  .manual-badge.is-admin{background:#ffedd5;color:#9a3412}
  .manual-badge.is-mixed{background:#e0f2fe;color:#075985}
  .manual-badge.is-restricted{background:#ede9fe;color:#6d28d9}
  .manual-section-title{font-size:22px;font-weight:800;color:#171717;margin-bottom:8px}
  .manual-section-text{font-size:13px;line-height:1.7;color:#374151}
  .manual-two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
  .manual-panel{border:1px solid #e5e5e5;border-radius:10px;padding:14px;background:#fafafa}
  .manual-panel-title{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#E53935;margin-bottom:8px}
  .manual-panel ul,.manual-steps ol{padding-left:18px}
  .manual-panel li,.manual-steps li{font-size:12px;color:#374151;line-height:1.65;margin-bottom:6px}
  .manual-steps{margin-top:14px;border:1px solid #e5e5e5;border-radius:10px;padding:14px;background:#fffaf9}
  .manual-shot-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px}
  .manual-shot{border:1px dashed #9ca3af;border-radius:12px;background:#f9fafb;padding:14px;min-height:150px}
  .manual-shot-label{font-size:11px;font-weight:800;color:#171717;margin-bottom:8px}
  .manual-shot-box{height:82px;border:1px dashed #d1d5db;border-radius:8px;background:repeating-linear-gradient(135deg,#ffffff,#ffffff 10px,#f3f4f6 10px,#f3f4f6 20px);display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:.08em}
  .manual-shot-caption{font-size:11px;line-height:1.55;color:#6b7280;margin-top:8px}
  .manual-disclaimer{margin-top:14px;border-top:1px solid #e5e5e5;padding-top:12px}
  .manual-disclaimer-title{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#991b1b;margin-bottom:6px}
  .manual-disclaimer li{font-size:11px;color:#7f1d1d;line-height:1.6;margin-left:18px;margin-bottom:4px}
`

const escapeHtml = (value) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const fileSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const getAccessMeta = (access) => ACCESS_VARIANTS[access] || ACCESS_VARIANTS.mixed

const GuideIcon = ({ sectionId }) => {
  const common = {
    width: 22,
    height: 22,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '1.8',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (sectionId) {
    case 'toolbox-meetings':
      return <svg {...common}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>
    case 'safety-topics':
      return <svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
    case 'checklists':
      return <svg {...common}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    case 'incidents':
      return <svg {...common}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
    case 'corrective-actions':
      return <svg {...common}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
    case 'disciplinary-actions':
      return <svg {...common}><path d="M12 2l7 4v6c0 5-3.5 8.74-7 10-3.5-1.26-7-5-7-10V6l7-4z"/><path d="M9.5 11.5l1.8 1.8 3.2-3.8"/></svg>
    case 'projects':
      return <svg {...common}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    case 'people':
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    case 'export-center':
      return <svg {...common}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    case 'admin-panel':
      return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    default:
      return <svg {...common}><path d="M9 3h6"/><path d="M12 3v6"/><path d="M12 9a7 7 0 1 0 7 7"/><path d="M12 13v4l3 2"/></svg>
  }
}

const buildSectionHtml = (sectionData) => {
  const accessMeta = getAccessMeta(sectionData.access)
  const outcomesHtml = sectionData.outcomes.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const accessHtml = sectionData.accessRules.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const capabilitiesHtml = sectionData.capabilities.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const disclaimerHtml = sectionData.disclaimers.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const proceduresHtml = sectionData.procedures.length > 0
    ? sectionData.procedures.map((procedure) => `
        <div class="manual-steps">
          <div class="manual-panel-title">${escapeHtml(procedure.title)}</div>
          <ol>${procedure.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join('')}</ol>
        </div>
      `).join('')
    : ''
  const screenshotsHtml = sectionData.imageSlots.length > 0
    ? `<div class="manual-shot-grid">${sectionData.imageSlots.map((slot) => `
        <div class="manual-shot">
          <div class="manual-shot-label">${escapeHtml(slot.title)}</div>
          <div class="manual-shot-box">Screenshot Placeholder</div>
          <div class="manual-shot-caption">${escapeHtml(slot.caption)}</div>
        </div>
      `).join('')}</div>`
    : ''

  return `
    <div class="manual-section-card">
      <span class="manual-badge ${accessMeta.className}">${escapeHtml(accessMeta.label)}</span>
      <div class="manual-section-title">${escapeHtml(sectionData.title)}</div>
      <div class="manual-section-text">${escapeHtml(sectionData.purpose)}</div>
      <div class="manual-two-col">
        <div class="manual-panel">
          <div class="manual-panel-title">What You Can Achieve</div>
          <ul>${outcomesHtml}</ul>
        </div>
        <div class="manual-panel">
          <div class="manual-panel-title">Who Has Access</div>
          <ul>${accessHtml}</ul>
        </div>
      </div>
      <div class="manual-steps">
        <div class="manual-panel-title">Key Capabilities</div>
        <ul>${capabilitiesHtml}</ul>
      </div>
      ${proceduresHtml}
      ${screenshotsHtml}
      <div class="manual-disclaimer">
        <div class="manual-disclaimer-title">Section Disclaimer</div>
        <ul>${disclaimerHtml}</ul>
      </div>
    </div>
  `
}

const buildGuidePdfHtml = ({ title, subtitle, sections }) => {
  const tocHtml = sections.map((sectionData) => {
    const accessMeta = getAccessMeta(sectionData.access)
    return `
      <div class="manual-toc-item">
        <div class="manual-toc-label">${escapeHtml(accessMeta.label)}</div>
        <div class="manual-toc-title">${escapeHtml(sectionData.title)}</div>
      </div>
    `
  }).join('')
  const globalDisclaimerHtml = GLOBAL_DISCLAIMER.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  const sectionsHtml = sections.map((sectionData) => buildSectionHtml(sectionData)).join('')

  return baseHTML(`
    <style>${manualPdfStyles}</style>
    <div class="manual-wrap">
      <div class="manual-cover">
        <div class="manual-kicker">Operating Guide</div>
        <div class="manual-title">${escapeHtml(title)}</div>
        <div class="manual-sub">${escapeHtml(subtitle)}</div>
      </div>
      <div class="manual-intro">
        <div class="manual-callout">
          <div class="manual-callout-title">Important Disclaimer</div>
          <ul>${globalDisclaimerHtml}</ul>
        </div>
      </div>
      <div class="manual-toc">
        <div class="manual-panel-title">Included Sections</div>
        <div class="manual-toc-grid">${tocHtml}</div>
      </div>
      <div class="manual-chunk">${sectionsHtml}</div>
    </div>
  `)
}

export default function UserManual() {
  const [activeSectionId, setActiveSectionId] = useState(guideSections[0].id)
  const [exportingMode, setExportingMode] = useState('')

  const activeSection = useMemo(
    () => guideSections.find((sectionData) => sectionData.id === activeSectionId) || guideSections[0],
    [activeSectionId]
  )

  const handbookSections = useMemo(
    () => guideSections.filter((sectionData) => sectionData.includeInHandbook),
    []
  )

  const exportSectionPdf = async (sectionData) => {
    setExportingMode(sectionData.id)
    try {
      const datePart = new Date().toISOString().slice(0, 10)
      const fileName = `operating-guide-${fileSlug(sectionData.title)}-${datePart}.pdf`

      const html = buildGuidePdfHtml({
        title: `${sectionData.title} Operating Guide`,
        subtitle: sectionData.shortDescription,
        sections: [sectionData],
      })

      await renderHTMLtoPDF(html, fileName)
    } finally {
      setExportingMode('')
    }
  }

  const exportHandbookPdf = async () => {
    setExportingMode('handbook')
    try {
      const datePart = new Date().toISOString().slice(0, 10)
      const fileName = `operating-guide-handbook-${datePart}.pdf`

      const html = buildGuidePdfHtml({
        title: 'Safety Program Operating Handbook',
        subtitle: 'Section-based guide for standard users and admins. Restricted superadmin-only audit content is excluded from this handbook export.',
        sections: handbookSections,
      })

      await renderHTMLtoPDF(html, fileName)
    } finally {
      setExportingMode('')
    }
  }

  const activeAccess = getAccessMeta(activeSection.access)

  return (
    <div className="user-guide-page">
      <section className="user-guide-hero card">
        <div className="user-guide-hero-copy">
          <span className="user-guide-eyebrow">Operating Guide</span>
          <h1>Section-Based Safety App Handbook</h1>
          <p>
            This guide is organized around the real sections of the application. Select a section card to learn why the feature exists,
            what can be achieved with it, who has access, and what responsibilities apply when entering or exporting data.
          </p>
          <div className="user-guide-hero-actions">
            <button className="btn btn-primary" onClick={exportHandbookPdf} disabled={!!exportingMode}>
              {exportingMode === 'handbook' ? 'Preparing PDF...' : 'Export Full Handbook PDF'}
            </button>
            <Link className="btn btn-secondary" to={activeSection.route}>
              Open Selected Module
            </Link>
          </div>
        </div>

        <div className="user-guide-hero-side">
          <div className="user-guide-callout user-guide-callout--warning">
            <div className="user-guide-callout-title">Important Disclaimer</div>
            <ul>
              {GLOBAL_DISCLAIMER.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="user-guide-callout user-guide-callout--info">
            <div className="user-guide-callout-title">PDF Scope</div>
            <p>
              The full handbook PDF includes guidance for both ordinary users and admins, but it excludes the restricted
              superadmin-only System Records section.
            </p>
          </div>
        </div>
      </section>

      <section className="user-guide-card-grid">
        {guideSections.map((sectionData) => {
          const accessMeta = getAccessMeta(sectionData.access)
          const isActive = sectionData.id === activeSectionId
          return (
            <button
              key={sectionData.id}
              type="button"
              className={`user-guide-card${isActive ? ' is-active' : ''}`}
              onClick={() => setActiveSectionId(sectionData.id)}
            >
              <div className="user-guide-card-top">
                <div className="user-guide-card-icon">
                  <GuideIcon sectionId={sectionData.id} />
                </div>
                <span className={`user-guide-access-badge ${accessMeta.className}`}>{accessMeta.label}</span>
              </div>
              <h2>{sectionData.title}</h2>
              <p>{sectionData.shortDescription}</p>
              <span className="user-guide-card-link">View guide section</span>
            </button>
          )
        })}
      </section>

      <section className="user-guide-detail card">
        <div className="user-guide-detail-header">
          <div>
            <span className={`user-guide-access-badge ${activeAccess.className}`}>{activeAccess.label}</span>
            <h2>{activeSection.title}</h2>
            <p>{activeSection.shortDescription}</p>
          </div>
          <div className="user-guide-detail-actions">
            <button className="btn btn-secondary" onClick={() => exportSectionPdf(activeSection)} disabled={!!exportingMode}>
              {exportingMode === activeSection.id ? 'Preparing PDF...' : activeSection.pdfExportLabel}
            </button>
            <Link className="btn btn-secondary" to={activeSection.route}>
              Open Module
            </Link>
          </div>
        </div>

        <div className="user-guide-purpose card-lite">
          <span className="user-guide-section-label">Purpose</span>
          <p>{activeSection.purpose}</p>
        </div>

        <div className="user-guide-detail-grid">
          <article className="user-guide-panel">
            <h3>What You Can Achieve</h3>
            <ul>
              {activeSection.outcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>

          <article className="user-guide-panel">
            <h3>Who Has Access</h3>
            <ul>
              {activeSection.accessRules.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>

        <article className="user-guide-panel user-guide-panel--full">
          <h3>Key Capabilities</h3>
          <ul>
            {activeSection.capabilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        {activeSection.procedures.length > 0 && (
          <section className="user-guide-procedures">
            <div className="user-guide-section-head">
              <span className="user-guide-section-label">Step by step</span>
              <h3>How To Use This Section</h3>
            </div>
            <div className="user-guide-procedure-grid">
              {activeSection.procedures.map((procedure) => (
                <article key={procedure.title} className="user-guide-procedure-card">
                  <h4>{procedure.title}</h4>
                  <ol>
                    {procedure.steps.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="user-guide-screenshots">
          <div className="user-guide-section-head">
            <span className="user-guide-section-label">Screenshot placeholders</span>
            <h3>Drop-In Visual References</h3>
          </div>
          <div className="user-guide-shot-grid">
            {activeSection.imageSlots.map((slot) => (
              <article key={slot.title} className="user-guide-shot-card">
                <div className="user-guide-shot-label">{slot.title}</div>
                <div className="user-guide-shot-box">Screenshot Placeholder</div>
                <p>{slot.caption}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="user-guide-disclaimers">
          <div className="user-guide-section-head">
            <span className="user-guide-section-label">Responsibility and good faith</span>
            <h3>Section Disclaimers</h3>
          </div>
          <div className="user-guide-disclaimer-grid">
            <article className="user-guide-callout user-guide-callout--warning">
              <div className="user-guide-callout-title">Global Rules</div>
              <ul>
                {GLOBAL_DISCLAIMER.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="user-guide-callout user-guide-callout--danger">
              <div className="user-guide-callout-title">{activeSection.title} Specific</div>
              <ul>
                {activeSection.disclaimers.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </section>
    </div>
  )
}