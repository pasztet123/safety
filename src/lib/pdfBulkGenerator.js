/**
 * pdfBulkGenerator.js
 * Bulk / list PDF generators and ZIP bundler.
 * Uses shared utilities from pdfGenerator.js.
 */

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import {
  renderHTMLtoPDFBuffer,
  buildMeetingHTMLForExport,
  BASE_CSS, baseHTML, footer, field, section,
  ACCENT, PRIMARY, GRAY, BORDER,
} from './pdfGenerator'
import { supabase } from './supabase'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const esc = (s) => s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' }) : '—'

const fmtDateShort = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' }) : '—'

const todayStr = () =>
  new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })

const SEV_LABELS = {
  lost_time: 'Lost Time', first_aid: 'First Aid', near_miss: 'Near Miss',
  property_damage: 'Property Damage', medical_treatment: 'Medical Treatment',
  recordable: 'Recordable', fatality: 'Fatality',
}

// Risk / severity colour pill
const riskPill = (level) => {
  const cls = { low:'risk-low', medium:'risk-medium', high:'risk-high', critical:'risk-critical' }[level] || 'risk-medium'
  return `<span class="risk-pill ${cls}">${(level||'').toUpperCase()}</span>`
}

// ─── Shared bulk-list CSS (appended to BASE_CSS) ───────────────────────────

const BULK_CSS = `
  /* ── meeting cards ── */
  .ml-header{background:${PRIMARY};color:#fff;padding:28px 36px 22px;position:relative}
  .ml-header::after{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:${ACCENT}}
  .ml-header-eyebrow{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;
                     color:rgba(255,255,255,0.5);margin-bottom:6px}
  .ml-header-title{font-size:22px;font-weight:700;margin-bottom:4px}
  .ml-header-sub{font-size:12px;color:rgba(255,255,255,0.6)}

  .ml-body{padding:22px 36px}
  .ml-count-bar{font-size:12px;color:${GRAY};margin-bottom:16px;font-weight:600;letter-spacing:.3px}

  .ml-card{display:flex;gap:16px;padding:14px 0;border-bottom:1px solid ${BORDER}}
  .ml-card:last-child{border-bottom:none}
  .ml-date-col{flex-shrink:0;width:62px;text-align:center;
               background:#f8f8f8;border-radius:6px;padding:8px 6px}
  .ml-date-day{font-size:20px;font-weight:800;color:${PRIMARY};line-height:1}
  .ml-date-mon{font-size:9px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:${GRAY};margin-top:3px}
  .ml-content{flex:1;min-width:0}
  .ml-topic{font-size:14px;font-weight:700;color:${PRIMARY};margin-bottom:5px}
  .ml-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px}
  .ml-pill{font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;
           background:#f3f4f6;color:#374151;letter-spacing:.2px}
  .ml-pill--accent{background:#fef2f2;color:${ACCENT}}
  .ml-meta-line{font-size:11px;color:${GRAY};margin-bottom:3px}
  .ml-attendees-line{font-size:11px;color:${PRIMARY};margin-top:4px}

  /* ── incident / action cards ── */
  .inc-card{padding:14px 0;border-bottom:1px solid ${BORDER}}
  .inc-card:last-child{border-bottom:none}
  .inc-top{display:flex;align-items:flex-start;gap:10px;margin-bottom:6px}
  .inc-type{font-size:13px;font-weight:700;color:${PRIMARY};flex:1}
  .inc-date{font-size:11px;color:${GRAY};white-space:nowrap}
  .inc-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:4px}
  .inc-pill{font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px;
            background:#f3f4f6;color:#374151}
  .inc-detail{font-size:11px;color:${GRAY};margin-top:3px}

  /* ── action cards ── */
  .act-card{padding:12px 0;border-bottom:1px solid ${BORDER}}
  .act-card:last-child{border-bottom:none}
  .act-desc{font-size:13px;font-weight:600;color:${PRIMARY};margin-bottom:5px}
  .act-status-open{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;
                   font-weight:700;background:#fef2f2;color:${ACCENT}}
  .act-status-completed{display:inline-block;padding:2px 8px;border-radius:10px;font-size:10px;
                        font-weight:700;background:#dcfce7;color:#15803d}
  .act-meta{font-size:11px;color:${GRAY};margin-top:4px}

  /* ── checklist cards ── */
  .cl-card{padding:12px 0;border-bottom:1px solid ${BORDER}}
  .cl-card:last-child{border-bottom:none}
  .cl-name{font-size:13px;font-weight:700;color:${PRIMARY};margin-bottom:4px}
  .cl-meta{font-size:11px;color:${GRAY}}

  /* ── Safety Topics brochure ── */
  .toc-section{padding:28px 36px}
  .toc-title{font-size:20px;font-weight:800;color:${PRIMARY};margin-bottom:6px}
  .toc-subtitle{font-size:12px;color:${GRAY};margin-bottom:24px}
  .toc-entry{display:flex;align-items:center;gap:12px;padding:9px 10px;
             border-bottom:1px solid ${BORDER}}
  .toc-entry:last-child{border-bottom:none}
  .toc-num{font-size:11px;font-weight:700;color:${GRAY};min-width:22px}
  .toc-name{font-size:13px;font-weight:600;color:${PRIMARY};flex:1}
  .toc-cat{font-size:11px;color:${GRAY};margin-right:auto}
  .toc-risk{font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;flex-shrink:0}

  /* big topic page separator */
  .topic-page{margin-top:60px;padding-top:30px;border-top:3px solid ${ACCENT}}
  .topic-page:first-child{margin-top:20px;padding-top:0;border-top:none}
  .topic-header{padding:22px 26px;border-radius:8px;margin-bottom:18px;color:#fff;position:relative}
  .topic-name{font-size:20px;font-weight:800;margin-bottom:4px}
  .topic-osha{font-size:12px;opacity:.85}
  .topic-img{width:100%;max-height:200px;object-fit:cover;border-radius:8px;
             margin-bottom:16px;display:block}
  .topic-body{padding:0 2px}
`

const bulkBaseHTML = (content) => `
  <style>${BASE_CSS}${BULK_CSS}</style>
  <div class="pdf-wrap">${content}</div>
`

// ─── Meeting List PDF ─────────────────────────────────────────────────────────

/**
 * Generates a single PDF listing all provided meetings as compact cards.
 * @param {Array} meetings - basic meeting objects (attendees, project, trade, topic, date, time, leader_name, checklists)
 * @param {string} title - PDF title (e.g. "All Toolbox Meetings")
 * @param {string} [subtitle] - optional subtitle / filter description
 */
export const generateMeetingListPDF = async (meetings, title = 'Toolbox Meetings Report', subtitle = '') => {
  const cardsHTML = meetings.map(m => {
    const d = m.date ? new Date(m.date) : null
    const day = d ? d.getDate().toString().padStart(2,'0') : '??'
    const mon = d ? d.toLocaleDateString('en-US',{month:'short',year:'2-digit'}).toUpperCase() : ''
    const attendeeNames = (m.attendees || []).map(a => esc(a.name)).filter(Boolean)
    const checklistNames = (m.checklists || []).map(c => esc(c.name)).filter(Boolean)

    return `
      <div class="ml-card">
        <div class="ml-date-col">
          <div class="ml-date-day">${day}</div>
          <div class="ml-date-mon">${mon}</div>
        </div>
        <div class="ml-content">
          <div class="ml-topic">${esc(m.topic) || 'Safety Meeting'}</div>
          <div class="ml-pills">
            ${m.project?.name ? `<span class="ml-pill">${esc(m.project.name)}</span>` : ''}
            ${m.trade ? `<span class="ml-pill ml-pill--accent">${esc(m.trade)}</span>` : ''}
            ${m.time ? `<span class="ml-pill">${m.time.substring(0,5)}</span>` : ''}
          </div>
          <div class="ml-meta-line">Leader: <strong>${esc(m.leader_name) || '—'}</strong>
            &nbsp;·&nbsp; ${attendeeNames.length} attendee${attendeeNames.length !== 1 ? 's' : ''}</div>
          ${attendeeNames.length > 0 ? `<div class="ml-attendees-line">${attendeeNames.join(', ')}</div>` : ''}
          ${checklistNames.length > 0 ? `<div class="ml-meta-line" style="margin-top:3px">Checklists: ${checklistNames.join(', ')}</div>` : ''}
        </div>
      </div>
    `
  }).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header">
      <div class="ml-header-eyebrow">Export — Toolbox Safety Meetings</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${subtitle ? esc(subtitle) + ' · ' : ''}Generated ${todayStr()}</div>
    </div>
    <div class="ml-body">
      <div class="ml-count-bar">${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No meetings found for the selected filters.</p>'}
    </div>
    ${footer()}
  `)

  const slug = title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
  const dateStr = new Date().toISOString().split('T')[0]
  const buf = await renderHTMLtoPDFBuffer(html)
  return { buffer: buf, filename: `meetings-${slug}-${dateStr}.pdf` }
}

/** Same as generateMeetingListPDF but also saves the file immediately. */
export const downloadMeetingListPDF = async (meetings, title, subtitle) => {
  const { buffer, filename } = await generateMeetingListPDF(meetings, title, subtitle)
  saveAs(new Blob([buffer], { type: 'application/pdf' }), filename)
}

// ─── Safety Topics Brochure PDF ───────────────────────────────────────────────

/**
 * Generates a brochure PDF — page 1 is a TOC, then one full topic block per page.
 */
export const downloadSafetyTopicsBrochurePDF = async (topics, title = 'Safety Topics Brochure') => {
  const HEADER_BG = { low:'#15803d', medium:'#854d0e', high:'#9a3412', critical:'#991b1b' }
  const RISK_PILL_CLASS = { low:'risk-low', medium:'risk-medium', high:'risk-high', critical:'risk-critical' }

  // Table of contents
  const tocEntries = topics.map((t, i) => {
    const riskCls = RISK_PILL_CLASS[t.risk_level] || 'risk-medium'
    return `
      <div class="toc-entry">
        <div class="toc-num">${i + 1}</div>
        <div class="toc-name">${esc(t.name)}</div>
        <div class="toc-cat">${esc(t.category) || ''}</div>
        ${t.risk_level ? `<div class="toc-risk ${riskCls}">${(t.risk_level||'').toUpperCase()}</div>` : ''}
      </div>
    `
  }).join('')

  // Topic pages
  const topicPages = topics.map((t, i) => {
    const bg = HEADER_BG[t.risk_level] || PRIMARY
    const riskCls = RISK_PILL_CLASS[t.risk_level] || 'risk-medium'
    const tradesStr = (t.trades || []).join(' · ')
    return `
      <div class="topic-page">
        <div class="topic-header" style="background:${bg}">
          <div class="topic-osha" style="margin-bottom:6px">Topic ${i+1} of ${topics.length} · ${esc(t.category) || 'Safety Topic'}</div>
          <div class="topic-name">${esc(t.name)}</div>
          ${t.osha_reference ? `<div class="topic-osha">OSHA ${esc(t.osha_reference)}</div>` : ''}
        </div>
        <div class="topic-body">
          <div class="pdf-fields" style="margin-bottom:16px">
            ${t.risk_level ? `<div class="pdf-field"><div class="pdf-field-label">Risk Level</div><div class="pdf-field-value"><span class="risk-pill ${riskCls}">${(t.risk_level||'').toUpperCase()}</span></div></div>` : ''}
            ${t.osha_reference ? `<div class="pdf-field"><div class="pdf-field-label">OSHA Reference</div><div class="pdf-field-value">${esc(t.osha_reference)}</div></div>` : ''}
            ${t.category ? `<div class="pdf-field"><div class="pdf-field-label">Category</div><div class="pdf-field-value">${esc(t.category)}</div></div>` : ''}
            ${tradesStr ? `<div class="pdf-field"><div class="pdf-field-label">Trades</div><div class="pdf-field-value">${esc(tradesStr)}</div></div>` : ''}
          </div>
          ${t.description ? `${section('Description', `<div class="pdf-text">${esc(t.description)}</div>`)}` : ''}
        </div>
      </div>
    `
  }).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header">
      <div class="ml-header-eyebrow">Export — Safety Topic Library</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${topics.length} topics · Generated ${todayStr()}</div>
    </div>

    <div class="toc-section">
      <div class="toc-title">Table of Contents</div>
      <div class="toc-subtitle">${topics.length} topics across ${[...new Set(topics.map(t => t.category).filter(Boolean))].length} categories</div>
      ${tocEntries || '<p style="color:#9ca3af">No topics found.</p>'}
    </div>

    ${topicPages}

    ${footer()}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(new Blob([buf], { type: 'application/pdf' }), `safety-topics-brochure-${dateStr}.pdf`)
}

// ─── Incident List PDF ────────────────────────────────────────────────────────

export const downloadIncidentListPDF = async (incidents, title = 'Incidents Report', subtitle = '') => {
  const SEV_PILL = (sev) => {
    const cls = { lost_time:'sev-high', first_aid:'sev-low', near_miss:'sev-medium',
      property_damage:'sev-medium', medical_treatment:'sev-medium', recordable:'sev-high', fatality:'sev-critical' }[sev] || 'sev-medium'
    const label = SEV_LABELS[sev] || (sev||'').replace(/_/g,' ')
    return `<span class="sev-pill ${cls}">${label}</span>`
  }

  const cardsHTML = incidents.map(inc => `
    <div class="inc-card">
      <div class="inc-top">
        <div class="inc-type">${esc(inc.type_name) || 'Incident'}</div>
        <div class="inc-date">${fmtDateShort(inc.date)}</div>
      </div>
      <div class="inc-pills">
        ${inc.severity ? SEV_PILL(inc.severity) : ''}
        ${inc.osha_recordable ? '<span class="osha-pill">OSHA Recordable</span>' : ''}
        ${inc.project?.name ? `<span class="inc-pill">${esc(inc.project.name)}</span>` : ''}
      </div>
      ${inc.employee_name ? `<div class="inc-detail">Employee: <strong>${esc(inc.employee_name)}</strong>${inc.reporter_name ? ' · Reporter: ' + esc(inc.reporter_name) : ''}</div>` : ''}
      ${inc.location ? `<div class="inc-detail">Location: ${esc(inc.location)}</div>` : ''}
      ${inc.details ? `<div class="inc-detail" style="margin-top:4px;font-style:italic">${esc(inc.details.substring(0,160))}${inc.details.length>160?'…':''}</div>` : ''}
    </div>
  `).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header" style="background:#991b1b">
      <div class="ml-header-eyebrow">Export — Incident Reports</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${subtitle ? esc(subtitle) + ' · ' : ''}Generated ${todayStr()}</div>
    </div>
    <div class="ml-body">
      <div class="ml-count-bar">${incidents.length} incident${incidents.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No incidents found.</p>'}
    </div>
    ${footer()}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(new Blob([buf], { type: 'application/pdf' }), `incidents-report-${dateStr}.pdf`)
}

// ─── Corrective Actions List PDF ──────────────────────────────────────────────

export const downloadCorrectiveActionsListPDF = async (actions, persons = [], incidents = [], title = 'Corrective Actions Report', subtitle = '') => {
  const personMap = Object.fromEntries(persons.map(p => [p.id, p.name]))
  const incidentMap = Object.fromEntries(incidents.map(i => [i.id, i]))

  const cardsHTML = actions.map(act => {
    const inc = act.incident_id ? incidentMap[act.incident_id] : null
    const person = act.responsible_person_id ? personMap[act.responsible_person_id] : null
    const isComplete = act.status === 'completed'
    return `
      <div class="act-card">
        <div class="act-desc">${esc(act.description)}</div>
        <div style="margin-bottom:4px">
          <span class="${isComplete ? 'act-status-completed' : 'act-status-open'}">${isComplete ? 'Completed' : 'Open'}</span>
        </div>
        <div class="act-meta">
          ${person ? `Assigned to: <strong>${esc(person)}</strong> · ` : ''}
          ${act.due_date ? `Due: ${fmtDateShort(act.due_date)}` : ''}
          ${isComplete && act.completion_date ? ` · Completed: ${fmtDateShort(act.completion_date)}` : ''}
          ${inc ? ` · Incident: ${esc(inc.type_name||(inc.id||''))} (${fmtDateShort(inc.date)})` : ''}
        </div>
      </div>
    `
  }).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header" style="background:#374151">
      <div class="ml-header-eyebrow">Export — Corrective Actions</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${subtitle ? esc(subtitle) + ' · ' : ''}Generated ${todayStr()}</div>
    </div>
    <div class="ml-body">
      <div class="ml-count-bar">${actions.length} action${actions.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No corrective actions found.</p>'}
    </div>
    ${footer()}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(new Blob([buf], { type: 'application/pdf' }), `corrective-actions-${dateStr}.pdf`)
}

// ─── Checklist History List PDF ───────────────────────────────────────────────

export const downloadChecklistHistoryPDF = async (completions, title = 'Checklist History Report', subtitle = '') => {
  const cardsHTML = completions.map(c => {
    const dt = c.completion_datetime ? new Date(c.completion_datetime).toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}) : '—'
    return `
      <div class="cl-card">
        <div class="cl-name">${esc(c.checklist?.name || c.checklist_name || 'Checklist')}</div>
        <div class="cl-meta">
          ${dt}
          ${c.project?.name ? ` · Project: ${esc(c.project.name)}` : ''}
          ${c.user?.name ? ` · By: ${esc(c.user.name)}` : (c.user?.email ? ` · By: ${esc(c.user.email)}` : '')}
          ${c.notes ? ` · Notes: ${esc(c.notes.substring(0,80))}${c.notes.length>80?'…':''}` : ''}
        </div>
      </div>
    `
  }).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header" style="background:#14532d">
      <div class="ml-header-eyebrow">Export — Checklist History</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${subtitle ? esc(subtitle) + ' · ' : ''}Generated ${todayStr()}</div>
    </div>
    <div class="ml-body">
      <div class="ml-count-bar">${completions.length} completion${completions.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No checklist completions found.</p>'}
    </div>
    ${footer()}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  const dateStr = new Date().toISOString().split('T')[0]
  saveAs(new Blob([buf], { type: 'application/pdf' }), `checklist-history-${dateStr}.pdf`)
}

// ─── ZIP of Individual Meeting PDFs ──────────────────────────────────────────

/**
 * For each meeting in the list, fetches full data (attendees + photos + checklists),
 * renders an individual PDF (same format as the single "PDF" button on Meetings page),
 * packs all PDFs into a ZIP, and triggers download.
 *
 * @param {Array} meetings - basic meeting list (needs at least .id, .topic, .date)
 * @param {function} onProgress - callback (done, total)
 */
export const downloadMeetingsAsZIP = async (meetings, onProgress = () => {}) => {
  const zip = new JSZip()
  const total = meetings.length

  for (let i = 0; i < total; i++) {
    const m = meetings[i]
    onProgress(i, total)

    try {
      // Fetch full meeting data
      const { data } = await supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name),
          attendees:meeting_attendees(name, signature_url, signed_with_checkbox),
          photos:meeting_photos(photo_url)
        `)
        .eq('id', m.id)
        .single()

      if (!data) continue

      // Fetch checklists
      const { data: mcRows } = await supabase
        .from('meeting_checklists')
        .select('checklist_id')
        .eq('meeting_id', data.id)

      let checklists = []
      if (mcRows && mcRows.length > 0) {
        const ids = mcRows.map(r => r.checklist_id)
        const [{ data: clData }, { data: itemsData }] = await Promise.all([
          supabase.from('checklists').select('id, name, category').in('id', ids),
          supabase.from('checklist_items').select('id,checklist_id,title,description,display_order,is_section_header').in('checklist_id', ids),
        ])
        checklists = (clData || []).map(cl => ({
          ...cl,
          items: (itemsData || []).filter(it => it.checklist_id === cl.id),
        }))
      }
      data.checklists = checklists

      // Fetch topic details
      let topicDetails = null
      if (data.topic) {
        const { data: td } = await supabase
          .from('safety_topics')
          .select('name, description, osha_reference, risk_level, category')
          .eq('name', data.topic)
          .single()
        topicDetails = td || null
      }

      // Fetch checklist completions
      const { data: completions } = await supabase
        .from('checklist_completions')
        .select('id, checklist_id, notes')
        .eq('meeting_id', data.id)

      let checklistCompletions = []
      if (completions && completions.length > 0) {
        const cIds = completions.map(c => c.id)
        const { data: ciData } = await supabase
          .from('checklist_completion_items')
          .select('completion_id, checklist_item_id, is_checked, notes')
          .in('completion_id', cIds)
        checklistCompletions = completions.map(c => ({
          ...c,
          items: (ciData || [])
            .filter(ci => ci.completion_id === c.id)
            .map(ci => ({ ...ci, item_id: ci.checklist_item_id })),
        }))
      }

      // Build the full meeting HTML using the shared builder
      const meetingWithExtras = { ...data, topicDetails, checklistCompletions }
      const html = buildMeetingHTMLForExport(meetingWithExtras)
      const buf = await renderHTMLtoPDFBuffer(html)

      // File name inside ZIP
      const topicSlug = (data.topic || 'meeting').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
      const datePart = data.date ? data.date.replace(/-/g, '') : 'nodate'
      const filename = `${String(i + 1).padStart(3, '0')}_${datePart}_${topicSlug}.pdf`

      zip.file(filename, buf)
    } catch (err) {
      console.error(`Error generating PDF for meeting ${m.id}:`, err)
    }
  }

  onProgress(total, total)

  const dateStr = new Date().toISOString().split('T')[0]
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
  saveAs(blob, `export_${dateStr}.zip`)
}
