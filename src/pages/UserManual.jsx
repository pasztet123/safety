import React, { useEffect, useMemo, useState } from 'react'
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
    id: 'access-and-navigation',
    title: 'Access, Login & Dashboard',
    shortDescription: 'Sign in, understand the main menu, and use the dashboard cards as the starting point for daily work.',
    route: '/',
    access: 'all',
    purpose:
      'Use the entry flow and dashboard to access the system safely, confirm your role-based access, and jump quickly into the module that matches the day\'s safety work.',
    outcomes: [
      'Sign in with the account managed by your administrator.',
      'Understand which modules are available to regular users, admins, and restricted audit accounts.',
      'Use dashboard reminders, counters, and shortcuts to move into the right workflow faster.',
    ],
    accessRules: [
      'All authenticated users can reach the dashboard and the standard navigation items that match their role.',
      'Admin-only and restricted modules appear only when the logged-in account is allowed to use them.',
    ],
    capabilities: [
      'Email and password sign-in with password visibility toggle.',
      'Main dashboard cards for meetings, days safe, checklist activity, corrective actions, reminders, and recent activity.',
      'Persistent left-side navigation for operational modules and role-gated admin areas.',
    ],
    procedures: [
      {
        title: 'Sign in and verify access',
        steps: [
          'Open the application and sign in with the email address and password issued by the system administrator.',
          'If needed, use the password visibility control before submitting the form.',
          'After sign-in, verify that the menu items shown on the left match your expected role. Admin Panel, Export Center, Bulk Import, and System Records do not appear for everyone.',
          'If a module you expect is missing, stop and contact an administrator instead of attempting work under another account.',
        ],
      },
      {
        title: 'Use the dashboard as a starting point',
        steps: [
          'Open the main dashboard after login to review current counts, reminders, and recent safety activity.',
          'Use the meeting and checklist counters to identify where new records may be needed.',
          'Review overdue corrective actions and disciplinary items before starting a new report if follow-up is already open.',
          'Use the navigation drawer to move into the exact module where the new record should be created.',
        ],
      },
    ],
    disclaimers: [
      'Never share accounts or enter records under another user\'s identity.',
      'Role restrictions are part of the audit trail and should not be bypassed informally.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Access, Login & Dashboard guide',
  },
  {
    id: 'toolbox-meetings',
    title: 'Meetings & Safety Surveys',
    shortDescription: 'Run safety talks and surveys, collect attendance, attach evidence, and keep the history audit-ready.',
    route: '/meetings',
    access: 'mixed',
    purpose:
      'Use Meetings & Safety Surveys to document daily or recurring safety talks and surveys, prove attendance, connect the record with a project and trade, and store the evidence needed for supervision, compliance, and internal review.',
    outcomes: [
      'Create a traceable history of safety communication on the job.',
      'Show who attended, who led the talk, what topic was covered, and when it happened.',
      'Attach signatures, attendance confirmations, photos, map location, and checklist completions to a single meeting record.',
    ],
    accessRules: [
      'All users can create and review meetings.',
      'Admins can edit existing meetings, manage drafts, bulk-import attendance, and approve imported drafts.',
    ],
    capabilities: [
      'Search by topic, worker performing the meeting, project, location, attendee, trade, and time range.',
      'Use smart topic selection, self-training handling, map-based location picking, and inline checklist completion.',
      'Export one meeting, filtered meeting lists, chunked list ZIP packages, or ZIP archives of individual PDFs.',
      'Maintain a separate admin draft queue with filters, pagination, bulk editing, and approval tools.',
    ],
    procedures: [
      {
        title: 'Create a meeting manually',
        steps: [
          'Open Meetings & Safety Surveys and start a new meeting.',
          'Select the project, date, time, and location. GPS and map tools can prefill the location, but you can edit it manually.',
          'Choose the worker performing the meeting, trade, and safety topic. Use the topic description while conducting the talk if you need a live reference.',
          'Add attendees from existing people records or type a new attendee name when the person has not been created yet.',
          'Attach matching checklists if you want the meeting and inspection evidence stored together.',
          'Add notes, upload photos, and review any date or time warnings before continuing.',
          'Use the stored default signature or draw a fresh signature for the meeting leader, then capture attendee confirmations or attendee signatures as needed.',
          'Save the meeting and use the details page or list actions to open the final record or generate its PDF.',
        ],
      },
      {
        title: 'Import BusyBusy attendance and approve drafts',
        steps: [
          'Open Bulk Import as an admin, choose the target project, and upload a BusyBusy CSV file.',
          'Review the parsed draft groups. You can detect duplicates, skip selected dates, adjust trades, and choose the correct safety topic for each draft.',
          'Save the import so the application creates draft meetings, related attendees, and any missing people records that must exist for later use.',
          'Return to Meetings & Safety Surveys and switch to the draft area, where you can search, filter, paginate, and batch-select drafts.',
          'Use bulk edit if you need to fix leader, trade, topic, or additional attendees before approval.',
          'Open the approval workflow, verify the worker performing the meeting, confirm self-training cases when applicable, choose a default or handwritten signature, and approve the drafts.',
          'Once approved, the drafts become normal meeting records and appear in history, project views, exports, and person activity.',
        ],
      },
      {
        title: 'Work with history and exports',
        steps: [
          'Use filters on the meetings list to narrow records by people, project, topic, trade, self-training flag, date range, location, or time-of-day bucket.',
          'Open a detail page when you need to inspect signatures, photos, location, checklist data, or reading-time information for the topic.',
          'Use single-record PDF for one meeting, list PDF for smaller filtered sets, chunked ZIP for large list exports, or individual PDF ZIP for smaller batches of complete meeting packets.',
          'If a large export is needed, monitor the progress dialog and keep the browser tab open until the ZIP has been prepared.',
        ],
      },
    ],
    disclaimers: [
      'Meeting attendance, signatures, topics, and training statements must reflect the real event that took place.',
      'Never sign for another person or create false proof of training attendance.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Meetings & Safety Surveys guide',
  },
  {
    id: 'safety-topics',
    title: 'Safety Topics',
    shortDescription: 'Use the safety topic library as the content backbone for toolbox talks and training refreshers.',
    route: '/safety-topics',
    access: 'mixed',
    purpose:
      'Use Safety Topics to maintain a structured library of talk content, filter it by category or trade, and connect safety guidance to meeting and checklist workflows.',
    outcomes: [
      'Standardize what is discussed during toolbox talks.',
      'Make topic selection easier by category, risk level, trade, and OSHA reference.',
      'Prepare single-topic or brochure-style PDF material for field use or review.',
    ],
    accessRules: [
      'All users can browse, search, and open topic content.',
      'Admins can create, edit, delete, and feature topics for dashboard and workflow use.',
    ],
    capabilities: [
      'Search by topic name, description, or OSHA reference.',
      'Filter by category, risk level, and trade.',
      'Open topic details with risk information, image, and suggested checklist relationships.',
      'Generate single-topic PDFs and brochure exports for all currently visible topics.',
    ],
    procedures: [
      {
        title: 'Find the right talk topic',
        steps: [
          'Open Safety Topics and start with search, category, risk, or trade filters.',
          'Narrow the list until the visible cards match the work area or hazard you need to address.',
          'Open a topic card to review the full description, OSHA reference, trade relevance, and any image attached to the topic.',
          'Use the topic immediately in the meeting workflow or return to the topic list if you need a better match.',
        ],
      },
      {
        title: 'Use topic exports and checklist suggestions',
        steps: [
          'On the topic details view, review the suggested checklist list to see which inspections fit the same trade or category.',
          'Generate a single-topic PDF when you need one printable handout or discussion aid.',
          'Use the brochure export when you want one PDF containing every topic currently visible under your filters.',
          'Admins can keep this library current by editing descriptions, risk levels, trades, OSHA references, and featured topics.',
        ],
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
      'All users can browse checklist templates and complete them.',
      'Admins can create templates, edit completion history, delete records, and export broader completion datasets.',
    ],
    capabilities: [
      'Assign category and trade tags so checklists sort better in meeting and topic workflows.',
      'Add checklist items, section headers, and reordered steps inside one template.',
      'Complete checklists with per-item notes, per-item photos, overall photos, project assignment, and signature capture.',
      'Review completion history, open completion detail pages, and edit history when you have admin access.',
    ],
    procedures: [
      {
        title: 'Create or update a checklist template',
        steps: [
          'Open Checklists and start a new template or open an existing one for editing.',
          'Enter the checklist name, description, category, and trade tags. Trade tags improve smart matching elsewhere in the app.',
          'Add checklist items one by one, using the section header option when you need a visual divider instead of a checkable step.',
          'Reorder the items into the inspection sequence you want the field team to follow.',
          'If a similar checklist already exists, clone it and then make only the necessary changes.',
          'Save the template and review the completion history panel if you want to see how often it has been used.',
        ],
      },
      {
        title: 'Complete a checklist in the field',
        steps: [
          'Open the desired checklist and start the completion workflow.',
          'Choose the project when the inspection belongs to a specific job, and set the completion date and time if the default value is not correct.',
          'Work through the items, checking completed steps and adding notes where context is needed.',
          'Attach photos to specific steps when the evidence belongs to one item, and use overall completion photos for broader site proof.',
          'Choose the signing person, then use either that person\'s stored default signature or a new handwritten signature.',
          'Save the completion and use history screens to review, export, or edit the record later if your role permits it.',
        ],
      },
    ],
    disclaimers: [
      'A completed checklist does not prove safe conditions if the information entered is false, incomplete, or backfilled inaccurately.',
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
      'Admins can edit, delete, export, and manage linked follow-up records more broadly.',
    ],
    capabilities: [
      'Choose Quick Report or Full Investigation mode depending on the urgency and available information.',
      'Capture severity, witnesses, location, incident classification, injuries, treatment details, and safety violation type.',
      'Upload photos, use the map picker with reverse geocoding, and collect a reporter signature.',
      'Create corrective actions and disciplinary actions directly from an incident context.',
    ],
    procedures: [
      {
        title: 'File a new incident report',
        steps: [
          'Open Incidents and start a new report.',
          'Choose Quick Report when speed matters and you only have the essential facts, or Full Investigation when you are ready to complete the broader form.',
          'Enter the date, time, location, project, incident type, severity, and detailed narrative of what happened.',
          'Identify the employee or person involved, the reporter, and any witnesses. Witnesses can be selected from existing people or typed manually.',
          'Add photos and map data if the location or physical evidence matters for follow-up.',
          'Capture the reporter signature using a stored default signature or a handwritten signature, then save the incident.',
        ],
      },
      {
        title: 'Use incident follow-up actions',
        steps: [
          'From the incident list or detail page, open the incident and review the recorded facts, witnesses, and uploaded evidence.',
          'If corrective work is required, launch a corrective action from the incident so the follow-up keeps the source incident attached.',
          'If the incident is a safety violation, launch a disciplinary action from the same context so the violation and formal response stay connected.',
          'Use incident filters and PDF exports to review open cases, prepare management packets, or support investigation meetings.',
        ],
      },
    ],
    disclaimers: [
      'Incident reporting must never be used to harass, retaliate against, or falsely accuse another person.',
      'Incident data should be entered promptly, accurately, and in good faith.',
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
      'Use Corrective Actions to convert findings into assigned follow-up work with status, due dates, declared completion dates, and incident linkage.',
    outcomes: [
      'Track whether issues remain open, overdue, in progress, or completed.',
      'Assign responsibility to the correct worker or person in the system.',
      'Show follow-up status from the action log and from related incident records.',
    ],
    accessRules: [
      'The action log is visible across the application for operational awareness.',
      'Admins handle creation, edits, status changes, person assignment, and export workflows where those controls are restricted.',
    ],
    capabilities: [
      'Search by description and filter by open, in-progress, closed, or overdue status.',
      'Create actions from incidents or add them directly from the corrective action module.',
      'Assign a responsible person, set due dates, record declared completion dates, and upload supporting photos.',
      'Export filtered corrective action logs as PDF reports.',
    ],
    procedures: [
      {
        title: 'Create and assign a corrective action',
        steps: [
          'Open Corrective Actions or launch the action from a specific incident.',
          'Write a clear description of the required corrective work and confirm the linked incident when one applies.',
          'Choose the responsible person from the people directory and set the due date.',
          'Add notes or photos if the responsible person needs visual context to complete the work correctly.',
          'Save the action so it appears in the timeline, incident record, and exports.',
        ],
      },
      {
        title: 'Track progress and close the action',
        steps: [
          'Use the status and search filters to focus on open, overdue, or completed items.',
          'Open or edit the action record when progress changes, then update the status to match the real state of work.',
          'When the work is finished, record the declared completion date if the actual field completion date matters separately from the system close date.',
          'Only mark the record completed after the corrective work has truly been performed or verified.',
          'Use the PDF export when you need a status packet for management or follow-up review.',
        ],
      },
    ],
    disclaimers: [
      'Do not mark an action complete unless the corrective work has actually been finished or verified.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Corrective Actions guide',
  },
  {
    id: 'disciplinary-actions',
    title: 'Disciplinary Actions',
    shortDescription: 'Document violation-linked actions, recipients, responsible workers performing the meetings, and timing of formal response.',
    route: '/disciplinary-actions',
    access: 'mixed',
    purpose:
      'Use Disciplinary Actions to document formal responses connected to safety violations, the worker involved, and the responsible worker performing the meeting who oversaw the response.',
    outcomes: [
      'Keep disciplinary follow-up tied to the underlying incident.',
      'Record what action was taken, who received it, who managed it, and when it happened.',
      'Provide a consistent history visible in incident records and person profiles.',
    ],
    accessRules: [
      'The log is visible in the application for continuity and review.',
      'Creation, editing, and deletion are intended for authorized supervisory or admin users.',
    ],
    capabilities: [
      'Search and filter by action type, violation type, leader, and recipient.',
      'Create the record directly from a safety-violation incident or from the disciplinary log.',
      'Store notes, timing, recipient identity, and the responsible leader in one record.',
      'Export filtered disciplinary records as a PDF report.',
    ],
    procedures: [
      {
        title: 'Create a disciplinary action from a violation',
        steps: [
          'Open the source incident or go directly to Disciplinary Actions and start a new record.',
          'Confirm the linked incident, recipient, violation type, action type, and the worker performing the meeting who handled the response.',
          'Enter the action date and time, then add notes that describe what formal response was delivered.',
          'Save the record so it becomes visible both in the disciplinary log and in the related incident and person history.',
        ],
      },
      {
        title: 'Review and export disciplinary history',
        steps: [
          'Use filters to narrow the list by action type, violation type, or responsible leader.',
          'Open related incidents or people records when you need the full context behind the disciplinary action.',
          'Use the module export to produce a filtered PDF when a supervisor or manager needs a formal summary.',
        ],
      },
    ],
    disclaimers: [
      'Disciplinary records must be based on real supervisory action and must never be created in bad faith or for retaliation.',
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
      'Use Projects as the operational container for meetings, incidents, and related safety records so that each item stays tied to the correct jobsite.',
    outcomes: [
      'Keep meetings and incidents grouped by the real jobsite.',
      'Review job-specific activity from one detail page.',
      'Reduce re-entry by selecting the correct project early in each workflow.',
    ],
    accessRules: [
      'Projects are part of the normal workflow for all users.',
      'Editing the project master data is typically handled by users with broader operational responsibility.',
    ],
    capabilities: [
      'Search by project name, client, address, or trade.',
      'Sort by newest, oldest, alphabetical order, or status.',
      'Store client, address, description, status, and trade tags on the project record.',
      'Review linked meetings and incidents from project details.',
    ],
    procedures: [
      {
        title: 'Create or update a project',
        steps: [
          'Open Projects and start a new project or edit an existing one.',
          'Enter the project name, client, address, status, description, and any relevant trade tags.',
          'Save the project before creating linked meetings or incidents whenever possible.',
          'Use the status field consistently so archived or completed jobs do not clutter active work.',
        ],
      },
      {
        title: 'Review project activity',
        steps: [
          'Use search and filters on the project list to find the correct job.',
          'Open the project detail page to inspect linked meetings and incidents in context.',
          'Use project-linked PDFs from related records when you need job-specific documentation.',
        ],
      },
    ],
    disclaimers: [
      'Attach records to the correct project to avoid misleading reporting and incomplete project history.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Projects guide',
  },
  {
    id: 'people',
    title: 'People',
    shortDescription: 'Use the people directory to find workers, workers performing the meetings, contact data, and their related activity.',
    route: '/people',
    access: 'all',
    purpose:
      'Use People as the central directory for workers, subcontractors, and workers performing the meetings when assigning attendance, responsibility, witnesses, or reviewing historical involvement.',
    outcomes: [
      'Find the correct person before assigning actions, attendance, or witness involvement.',
      'Review a person\'s meetings, incidents, projects, corrective actions, and disciplinary actions in one place.',
      'Support more consistent naming and traceability across the application.',
    ],
    accessRules: [
      'The directory is visible to all users for operational reference.',
      'Admin Panel is used to maintain the underlying people master data, signatures, and links between workers and meeting leaders.',
    ],
    capabilities: [
      'Search by person name and review role badges for worker, performs the meetings, or both.',
      'Open tabbed profile pages with meetings, projects, incidents, corrective actions, and disciplinary actions.',
      'See company affiliation, linked leader information, and recent activity context.',
    ],
    procedures: [
      {
        title: 'Find the correct person before recording work',
        steps: [
          'Open People and search by name before creating a meeting, incident, or follow-up action.',
          'Check the role badges so you know whether the record should treat the person as a worker, a worker performing the meetings, or both.',
          'Open the detail profile if you need to verify company, linked leader, or historical involvement before assigning responsibility.',
        ],
      },
      {
        title: 'Review a person\'s full activity history',
        steps: [
          'Open a person profile from the directory.',
          'Use the tabs to review meetings, projects, incidents, corrective actions, and disciplinary actions related to that person.',
          'Use this profile view when you need to confirm that a witness, attendee, recipient, or responsible person selection is consistent with existing records.',
        ],
      },
    ],
    disclaimers: [
      'Always select the correct person identity before assigning attendance, actions, or witness involvement.',
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
      'Use consistent filter-based exports instead of manual copying or screenshots.',
    ],
    accessRules: [
      'The Export Center is admin-only.',
      'Regular users can still generate selected single-record PDFs from detail pages in other modules.',
    ],
    capabilities: [
      'Generate meeting list PDFs, chunked list ZIP files, and ZIP bundles of individual meeting PDFs.',
      'Generate incident, corrective action, checklist completion, and safety topic PDF reports.',
      'Create CSV ZIP packages for meetings, incidents, corrective actions, statistics, and attendance.',
      'Track long-running exports through the progress dialog and cancel supported ZIP jobs.',
    ],
    procedures: [
      {
        title: 'Export filtered PDF reports',
        steps: [
          'Open Export Center and choose the data area you want to export.',
          'Set the filters carefully before generating the file. Most sections support date ranges, projects, and module-specific filters.',
          'For meetings, choose between a single list PDF, chunked list ZIP, or ZIP of individual meeting PDFs depending on batch size and purpose.',
          'Wait for the progress dialog to finish before closing the tab, especially for chunked or ZIP-based exports.',
        ],
      },
      {
        title: 'Export CSV spreadsheets',
        steps: [
          'Go to the spreadsheet export section inside Export Center.',
          'Choose the date range, project, and the CSV files you want included in the ZIP package.',
          'Generate the export and open the resulting ZIP in Excel, Google Sheets, or another spreadsheet tool for downstream analysis.',
        ],
      },
    ],
    disclaimers: [
      'Exported documents are only as accurate as the data entered into the system.',
      'Do not circulate exports in a misleading, retaliatory, or bad-faith context.',
    ],
    includeInHandbook: true,
    pdfExportLabel: 'Export Export Center guide',
  },
  {
    id: 'admin-panel',
    title: 'Admin Panel',
    shortDescription: 'Manage users, workers performing the meetings, workers, companies, settings, featured content, and analytics.',
    route: '/admin',
    access: 'admin',
    purpose:
      'Use the Admin Panel to maintain the people and settings backbone of the application and to run maintenance actions that ordinary field users should not handle directly.',
    outcomes: [
      'Create and maintain users, workers performing the meetings, workers, and companies.',
      'Store default signatures used elsewhere in meetings, incidents, and checklists.',
      'Control topic-checklist mappings, featured content, timezone settings, and analytics visibility.',
    ],
    accessRules: [
      'Admin Panel is restricted to admins.',
      'Because its changes affect downstream data quality, it should be used only by trusted administrators.',
    ],
    capabilities: [
      'Manage meetings, incidents, users, workers performing the meetings, workers and subs, companies, topic-checklist relationships, settings, and analytics.',
      'Capture or update default signatures for users, leaders, and involved persons.',
      'Set the global app timezone and featured categories, topics, and trades.',
      'Run draft meeting repair utilities and review admin analytics.',
    ],
    procedures: [
      {
        title: 'Maintain people, access, and signatures',
        steps: [
          'Open the Users, Workers Performing the Meetings, Workers & Subs, or Companies tab depending on the master data that needs maintenance.',
          'Create, edit, or deactivate records carefully because these identities are reused throughout meetings, incidents, checklists, and follow-up actions.',
          'When appropriate, save a default signature for the user, leader, or involved person so that later workflows can reuse it instead of drawing a fresh signature every time.',
        ],
      },
      {
        title: 'Use admin settings and maintenance tools',
        steps: [
          'Open Topic Checklists to maintain which checklists should be suggested for each safety topic.',
          'Open Settings to manage featured categories, featured topics, featured trades, and the global app timezone. Timezone changes affect how date and time data are interpreted across the app.',
          'Use the meetings-related admin tools for draft maintenance, approval support, and repair utilities only when normal operational workflows cannot resolve the issue.',
          'Review Analytics when you need dashboard-style summaries for meeting frequency, safety activity, or completion trends.',
        ],
      },
    ],
    disclaimers: [
      'Administrative permissions must be used only by authorized personnel and in good faith.',
      'Deleting or changing records in the admin area can affect downstream reporting, signatures, and evidence quality.',
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
      'It is not a standard operational workflow for ordinary users or regular admins.',
    ],
    capabilities: [
      'Filter and search audit events and record-history entries.',
      'Inspect JSON metadata, actor data, and snapshot content for tracked changes.',
      'Export filtered evidence PDF output for restricted investigation use.',
    ],
    procedures: [
      {
        title: 'Review audit evidence safely',
        steps: [
          'Open System Records only when the review is authorized and requires audit-level inspection.',
          'Use entity filters, date filters, and search to narrow the result set to the specific workflow or record under review.',
          'Open the matching audit or history entry and inspect metadata, actor identity, and before-and-after snapshots carefully.',
          'Generate a filtered evidence PDF only when you need a formal audit package.',
        ],
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

function GuideSectionDetails({ sectionData, exportingMode, onExportSectionPdf, onClose }) {
  const accessMeta = getAccessMeta(sectionData.access)

  return (
    <>
      <div className="user-guide-detail-header">
        <div>
          <span className={`user-guide-access-badge ${accessMeta.className}`}>{accessMeta.label}</span>
          <h2>{sectionData.title}</h2>
          <p>{sectionData.shortDescription}</p>
        </div>
        <div className="user-guide-detail-actions">
          <button className="btn btn-secondary" onClick={() => onExportSectionPdf(sectionData)} disabled={!!exportingMode}>
            {exportingMode === sectionData.id ? 'Preparing PDF...' : sectionData.pdfExportLabel}
          </button>
          <Link className="btn btn-secondary" to={sectionData.route}>
            Open Module
          </Link>
          {onClose && (
            <button type="button" className="btn btn-secondary user-guide-close-btn" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>

      <div className="user-guide-purpose card-lite">
        <span className="user-guide-section-label">Purpose</span>
        <p>{sectionData.purpose}</p>
      </div>

      <div className="user-guide-detail-grid">
        <article className="user-guide-panel">
          <h3>What You Can Achieve</h3>
          <ul>
            {sectionData.outcomes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="user-guide-panel">
          <h3>Who Has Access</h3>
          <ul>
            {sectionData.accessRules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </div>

      <article className="user-guide-panel user-guide-panel--full">
        <h3>Key Capabilities</h3>
        <ul>
          {sectionData.capabilities.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </article>

      {sectionData.procedures.length > 0 && (
        <section className="user-guide-procedures">
          <div className="user-guide-section-head">
            <span className="user-guide-section-label">Step by step</span>
            <h3>How To Use This Section</h3>
          </div>
          <div className="user-guide-procedure-grid">
            {sectionData.procedures.map((procedure) => (
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
            <div className="user-guide-callout-title">{sectionData.title} Specific</div>
            <ul>
              {sectionData.disclaimers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </>
  )
}

export default function UserManual() {
  const [activeSectionId, setActiveSectionId] = useState(guideSections[0].id)
  const [modalSectionId, setModalSectionId] = useState('')
  const [exportingMode, setExportingMode] = useState('')

  const activeSection = useMemo(
    () => guideSections.find((sectionData) => sectionData.id === activeSectionId) || guideSections[0],
    [activeSectionId]
  )

  const handbookSections = useMemo(
    () => guideSections.filter((sectionData) => sectionData.includeInHandbook),
    []
  )

  const modalSection = useMemo(
    () => guideSections.find((sectionData) => sectionData.id === modalSectionId) || null,
    [modalSectionId]
  )

  useEffect(() => {
    if (!modalSection) return undefined

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setModalSectionId('')
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modalSection])

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

  return (
    <div className="user-guide-page">
      <section className="user-guide-hero card">
        <div className="user-guide-hero-copy">
          <span className="user-guide-eyebrow">Operating Guide</span>
          <h1>Section-Based Safety App Handbook</h1>
          <p>
            This guide is organized around the real sections and workflows of the application. Select a section card for the inline view,
            or use View guide section to open the full instructions in a popup.
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
            <article
              key={sectionData.id}
              className={`user-guide-card${isActive ? ' is-active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                setActiveSectionId(sectionData.id)
                setModalSectionId(sectionData.id)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setActiveSectionId(sectionData.id)
                  setModalSectionId(sectionData.id)
                }
              }}
            >
              <div className="user-guide-card-top">
                <div className="user-guide-card-icon">
                  <GuideIcon sectionId={sectionData.id} />
                </div>
                <span className={`user-guide-access-badge ${accessMeta.className}`}>{accessMeta.label}</span>
              </div>
              <h2>{sectionData.title}</h2>
              <p>{sectionData.shortDescription}</p>
              <button
                type="button"
                className="user-guide-card-link"
                onClick={(event) => {
                  event.stopPropagation()
                  setActiveSectionId(sectionData.id)
                  setModalSectionId(sectionData.id)
                }}
              >
                View guide section
              </button>
            </article>
          )
        })}
      </section>

      <section className="user-guide-detail card">
        <GuideSectionDetails sectionData={activeSection} exportingMode={exportingMode} onExportSectionPdf={exportSectionPdf} />
      </section>

      {modalSection && (
        <div className="user-guide-modal-overlay" onClick={() => setModalSectionId('')}>
          <div className="user-guide-modal" onClick={(event) => event.stopPropagation()}>
            <GuideSectionDetails
              sectionData={modalSection}
              exportingMode={exportingMode}
              onExportSectionPdf={exportSectionPdf}
              onClose={() => setModalSectionId('')}
            />
          </div>
        </div>
      )}
    </div>
  )
}