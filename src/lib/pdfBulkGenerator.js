/**
 * pdfBulkGenerator.js
 * Bulk / list PDF generators and ZIP bundler.
 * Uses shared utilities from pdfGenerator.js.
 */

import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import {
  renderHTMLtoPDFBuffer,
  buildMeetingHTMLForExport,
  BASE_CSS, baseHTML, exportSummary, footer, field, section,
  ACCENT, PRIMARY, GRAY, BORDER,
} from './pdfGenerator'
import { createPdfExportContext, generateClientUuid } from './compliance'
import { confirmEvidencePdfExport } from './exportAttestation.jsx'
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
 * @param {string} title - PDF title (e.g. "All Meetings & Safety Surveys")
 * @param {string} [subtitle] - optional subtitle / filter description
 */
export const generateMeetingListPDF = async (meetings, title = 'Meetings & Safety Surveys Report', subtitle = '') => {
  return buildMeetingListPDF(meetings, title, subtitle)
}

const buildMeetingListPDF = async (meetings, title = 'Meetings & Safety Surveys Report', subtitle = '', options = {}) => {
  const {
    confirmExport = true,
    fileNameSuffix = '',
    metadata = {},
  } = options

  if (confirmExport) {
    const confirmed = await confirmEvidencePdfExport({
      title: 'This export contains meeting and safety survey records.',
      details: `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`,
    })
    if (!confirmed) return null
  }

  const slug = title.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `meetings-${slug}${fileNameSuffix ? `-${fileNameSuffix}` : ''}-${dateStr}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.meetings_list',
    fileName: filename,
    metadata: {
      report_title: title,
      report_subtitle: subtitle || null,
      record_count: meetings.length,
      ...metadata,
    },
  })

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
          <div class="ml-meta-line">Worker performing the meeting: <strong>${esc(m.leader_name) || '—'}</strong>
            &nbsp;·&nbsp; ${attendeeNames.length} attendee${attendeeNames.length !== 1 ? 's' : ''}</div>
          ${attendeeNames.length > 0 ? `<div class="ml-attendees-line">${attendeeNames.join(', ')}</div>` : ''}
          ${checklistNames.length > 0 ? `<div class="ml-meta-line" style="margin-top:3px">Checklists: ${checklistNames.join(', ')}</div>` : ''}
        </div>
      </div>
    `
  }).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header">
      <div class="ml-header-eyebrow">Export — Meetings & Safety Surveys</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${subtitle ? esc(subtitle) + ' · ' : ''}Generated ${todayStr()}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="ml-body">
      <div class="ml-count-bar">${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No meetings found for the selected filters.</p>'}
    </div>
    ${footer(exportMeta)}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  return { buffer: buf, filename }
}

/** Same as generateMeetingListPDF but also saves the file immediately. */
export const downloadMeetingListPDF = async (meetings, title, subtitle) => {
  const result = await buildMeetingListPDF(meetings, title, subtitle)
  if (!result?.buffer || !result?.filename) return
  const { buffer, filename } = result
  saveAs(new Blob([buffer], { type: 'application/pdf' }), filename)
}

export const downloadChunkedMeetingListPDFZIP = async ({
  totalCount,
  chunkSize,
  getChunk,
  title = 'Meetings & Safety Surveys Report',
  subtitle = '',
  onProgress = () => {},
  shouldCancel = () => false,
}) => {
  const safeTotalCount = Math.max(0, Number(totalCount) || 0)
  const safeChunkSize = Math.max(1, Number(chunkSize) || 1)
  if (!safeTotalCount || typeof getChunk !== 'function') return

  const chunkCount = Math.ceil(safeTotalCount / safeChunkSize)
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains meeting and safety survey records split across multiple list PDFs.',
    details: `${safeTotalCount} meeting${safeTotalCount === 1 ? '' : 's'} · ${chunkCount} PDF part${chunkCount === 1 ? '' : 's'}`,
  })
  if (!confirmed) return

  const zip = new JSZip()
  const dateStr = new Date().toISOString().split('T')[0]

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    if (shouldCancel()) throw new Error('Cancelled')

    const offset = chunkIndex * safeChunkSize
    const limit = Math.min(safeChunkSize, safeTotalCount - offset)
    const recordStart = offset + 1
    const recordEnd = Math.min(offset + limit, safeTotalCount)

    onProgress({
      done: chunkIndex,
      total: chunkCount,
      label: `Fetching meetings ${recordStart}-${recordEnd} of ${safeTotalCount}…`,
    })

    const meetings = await getChunk({ offset, limit, chunkIndex, chunkCount })
    if (shouldCancel()) throw new Error('Cancelled')

    const chunkSubtitle = [
      subtitle,
      `Part ${chunkIndex + 1} of ${chunkCount}`,
      `${recordStart}-${recordEnd} of ${safeTotalCount}`,
    ].filter(Boolean).join(' · ')

    const result = await buildMeetingListPDF(meetings || [], title, chunkSubtitle, {
      confirmExport: false,
      fileNameSuffix: `part-${String(chunkIndex + 1).padStart(2, '0')}`,
      metadata: {
        chunk_index: chunkIndex + 1,
        chunk_total: chunkCount,
        chunk_start: recordStart,
        chunk_end: recordEnd,
        chunk_size: limit,
      },
    })

    if (result?.buffer && result?.filename) {
      zip.file(result.filename, result.buffer)
    }

    onProgress({
      done: chunkIndex + 1,
      total: chunkCount,
      label: `Built list PDF part ${chunkIndex + 1} of ${chunkCount}`,
    })
  }

  onProgress({
    done: chunkCount,
    total: chunkCount,
    label: 'Finalizing ZIP…',
  })

  const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } })
  saveAs(blob, `meetings-${slug}-chunked-${dateStr}.zip`)
}

// ─── Safety Topics Brochure PDF ───────────────────────────────────────────────

// ─── Brochure helper: render one HTML chunk, add pages to an existing jsPDF doc ──

const _renderChunkIntoDoc = async (html, doc, addPageBeforeFirstSlice) => {
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:absolute;top:0;left:-9999px;width:794px;background:#fff;z-index:-1'
  document.body.appendChild(wrap)
  wrap.innerHTML = html

  try {
    const A4W = 210, A4H = 297
    const PAGE_MARGIN_MM = { top: 10, right: 10, bottom: 12, left: 10 }
    const contentWmm = A4W - PAGE_MARGIN_MM.left - PAGE_MARGIN_MM.right
    const repeatedHeader = wrap.querySelector('.pdf-wrap > .pdf-header, .pdf-wrap > .ml-header')
    const repeatedFooter = wrap.querySelector('.pdf-wrap > .pdf-fixed-footer')

    let headerCanvas = null
    let headerHmm = 0
    let headerImgData = null
    let footerCanvas = null
    let footerHmm = 0
    let footerImgData = null

    if (repeatedHeader) {
      headerCanvas = await html2canvas(repeatedHeader, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      headerHmm = (headerCanvas.height / headerCanvas.width) * A4W
      headerImgData = headerCanvas.toDataURL('image/jpeg', 0.94)
      repeatedHeader.remove()
    }

    if (repeatedFooter) {
      footerCanvas = await html2canvas(repeatedFooter, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      footerHmm = (footerCanvas.height / footerCanvas.width) * A4W
      footerImgData = footerCanvas.toDataURL('image/jpeg', 0.94)
      repeatedFooter.remove()
    }

    const canvas = await html2canvas(wrap, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    if (!canvas.width || !canvas.height) return

    const bodyTopMm = headerCanvas ? headerHmm + 4 : PAGE_MARGIN_MM.top
    const bodyBottomMm = footerCanvas ? PAGE_MARGIN_MM.bottom + footerHmm + 4 : PAGE_MARGIN_MM.bottom
    const contentHmm = A4H - bodyTopMm - bodyBottomMm
    const pxW = canvas.width
    const pxH = canvas.height
    const pageHpx = Math.round((contentHmm / contentWmm) * pxW)

    let y = 0
    let needAddPage = addPageBeforeFirstSlice

    while (y < pxH) {
      const sliceH = Math.min(pageHpx, pxH - y)
      // Blit slice onto a temp canvas and place it inside real page margins.
      const tmp = document.createElement('canvas')
      tmp.width = pxW
      tmp.height = sliceH
      const ctx = tmp.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pxW, sliceH)
      ctx.drawImage(canvas, 0, y, pxW, sliceH, 0, 0, pxW, sliceH)

      if (needAddPage) doc.addPage()
      needAddPage = true   // always addPage for subsequent slices of the same chunk

      const imgHmm = Math.min((sliceH / pxW) * contentWmm, contentHmm)
      if (headerImgData) {
        doc.addImage(
          headerImgData,
          'JPEG',
          0,
          0,
          A4W,
          headerHmm,
        )
      }
      doc.addImage(
        tmp.toDataURL('image/jpeg', 0.92),
        'JPEG',
        PAGE_MARGIN_MM.left,
        bodyTopMm,
        contentWmm,
        imgHmm,
      )
      if (footerImgData) {
        doc.addImage(
          footerImgData,
          'JPEG',
          0,
          A4H - PAGE_MARGIN_MM.bottom - footerHmm,
          A4W,
          footerHmm,
        )
      }
      y += sliceH
    }
  } finally {
    document.body.removeChild(wrap)
  }
}

// ─── Safety Topics Brochure PDF ───────────────────────────────────────────────

/**
 * Generates a brochure PDF — page 1 is a TOC, then one block per topic.
 * Each topic is rendered independently (prevents canvas-size overflow → black pages).
 */
export const downloadSafetyTopicsBrochurePDF = async (topics, title = 'Safety Topics Brochure') => {
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `safety-topics-brochure-${dateStr}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.safety_topics_brochure',
    fileName: filename,
    metadata: {
      report_title: title,
      record_count: topics.length,
    },
  })

  const HEADER_BG = { low:'#15803d', medium:'#854d0e', high:'#9a3412', critical:'#991b1b' }
  const RISK_PILL_CLASS = { low:'risk-low', medium:'risk-medium', high:'risk-high', critical:'risk-critical' }

  // ── build TOC HTML ────────────────────────────────────────────────────────
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

  const tocHTML = bulkBaseHTML(`
    <div class="ml-header">
      <div class="ml-header-eyebrow">Export — Safety Topic Library</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${topics.length} topics · Generated ${todayStr()}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="toc-section">
      <div class="toc-title">Table of Contents</div>
      <div class="toc-subtitle">${topics.length} topics across ${[...new Set(topics.map(t => t.category).filter(Boolean))].length} categories</div>
      ${tocEntries || '<p style="color:#9ca3af">No topics found.</p>'}
    </div>
    ${footer(exportMeta)}
  `)

  // ── helper to build a single topic's HTML ────────────────────────────────
  const buildTopicHTML = (t, i) => {
    const bg = HEADER_BG[t.risk_level] || '#1e3a5f'
    const riskCls = RISK_PILL_CLASS[t.risk_level] || 'risk-medium'
    const tradesStr = (t.trades || []).join(' · ')
    return bulkBaseHTML(`
      <div style="padding:28px 36px">
        <div style="font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;
                    color:#9ca3af;margin-bottom:12px">Topic ${i + 1} of ${topics.length}</div>
        <div style="background:${bg};color:#fff;padding:22px 26px;border-radius:8px;margin-bottom:18px">
          <div style="font-size:12px;opacity:.8;margin-bottom:4px">${esc(t.category) || 'Safety Topic'}</div>
          <div style="font-size:22px;font-weight:800;margin-bottom:6px">${esc(t.name)}</div>
          ${t.osha_reference ? `<div style="font-size:12px;opacity:.75">OSHA ${esc(t.osha_reference)}</div>` : ''}
        </div>
        <div class="pdf-fields" style="margin-bottom:16px">
          ${t.risk_level ? `<div class="pdf-field"><div class="pdf-field-label">Risk Level</div><div class="pdf-field-value"><span class="risk-pill ${riskCls}">${(t.risk_level||'').toUpperCase()}</span></div></div>` : ''}
          ${t.osha_reference ? `<div class="pdf-field"><div class="pdf-field-label">OSHA Reference</div><div class="pdf-field-value">${esc(t.osha_reference)}</div></div>` : ''}
          ${t.category ? `<div class="pdf-field"><div class="pdf-field-label">Category</div><div class="pdf-field-value">${esc(t.category)}</div></div>` : ''}
          ${tradesStr ? `<div class="pdf-field"><div class="pdf-field-label">Trades</div><div class="pdf-field-value">${esc(tradesStr)}</div></div>` : ''}
        </div>
        ${t.description ? section('Description', `<div class="pdf-text">${esc(t.description)}</div>`) : ''}
      </div>
    `)
  }

  // ── render TOC + each topic into a single jsPDF doc ──────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  await _renderChunkIntoDoc(tocHTML, doc, false)   // TOC: no addPage (doc starts with page 1)

  for (let i = 0; i < topics.length; i++) {
    await _renderChunkIntoDoc(buildTopicHTML(topics[i], i), doc, true)  // each topic: new page
  }

  saveAs(new Blob([doc.output('arraybuffer')], { type: 'application/pdf' }), filename)
}

export const downloadIncidentListPDF = async (incidents, title = 'Incidents Report', subtitle = '') => {
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains incident records.',
    details: `${incidents.length} incident${incidents.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`,
  })
  if (!confirmed) return

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `incidents-report-${dateStr}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.incidents_list',
    fileName: filename,
    metadata: {
      report_title: title,
      report_subtitle: subtitle || null,
      record_count: incidents.length,
    },
  })

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
    ${exportSummary(exportMeta)}
    <div class="ml-body">
      <div class="ml-count-bar">${incidents.length} incident${incidents.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No incidents found.</p>'}
    </div>
    ${footer(exportMeta)}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  saveAs(new Blob([buf], { type: 'application/pdf' }), filename)
}

// ─── Corrective Actions List PDF ──────────────────────────────────────────────

export const downloadCorrectiveActionsListPDF = async (actions, persons = [], incidents = [], title = 'Corrective Actions Report', subtitle = '') => {
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains corrective action records.',
    details: `${actions.length} action${actions.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`,
  })
  if (!confirmed) return

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `corrective-actions-${dateStr}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.corrective_actions_list',
    fileName: filename,
    metadata: {
      report_title: title,
      report_subtitle: subtitle || null,
      record_count: actions.length,
    },
  })

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
          ${isComplete && (act.declared_completion_date || act.completion_date) ? ` · Completed: ${fmtDateShort(act.declared_completion_date || act.completion_date)}` : ''}
          ${isComplete && act.declared_completion_date && act.completion_date ? ` · Marked completed: ${fmtDateShort(act.completion_date)}` : ''}
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
    ${exportSummary(exportMeta)}
    <div class="ml-body">
      <div class="ml-count-bar">${actions.length} action${actions.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No corrective actions found.</p>'}
    </div>
    ${footer(exportMeta)}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  saveAs(new Blob([buf], { type: 'application/pdf' }), filename)
}

export const downloadDisciplinaryActionsListPDF = async (
  actions,
  persons = [],
  leaders = [],
  incidents = [],
  title = 'Disciplinary Actions Report',
  subtitle = ''
) => {
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains disciplinary action records.',
    details: `${actions.length} action${actions.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`,
  })
  if (!confirmed) return

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `disciplinary-actions-${dateStr}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.disciplinary_actions_list',
    fileName: filename,
    metadata: {
      report_title: title,
      report_subtitle: subtitle || null,
      record_count: actions.length,
    },
  })

  const personMap = Object.fromEntries(persons.map(person => [person.id, person.name]))
  const leaderMap = Object.fromEntries(leaders.map(leader => [leader.id, leader.name]))
  const incidentMap = Object.fromEntries(incidents.map(incident => [incident.id, incident]))

  const cardsHTML = actions.map(action => {
    const incident = action.incident_id ? incidentMap[action.incident_id] : null
    const recipient = action.recipient_person_id ? personMap[action.recipient_person_id] : null
    const leader = action.responsible_leader_id ? leaderMap[action.responsible_leader_id] : null
    return `
      <div class="act-card">
        <div class="act-desc">${esc(action.action_type)}</div>
        <div class="act-meta">
          ${incident?.safety_violation_type ? `Violation: <strong>${esc(incident.safety_violation_type)}</strong>` : 'Violation: —'}
          ${incident?.date ? ` · Incident: ${fmtDateShort(incident.date)}` : ''}
          ${action.action_date ? ` · Action date: ${fmtDateShort(action.action_date)}` : ''}
          ${action.action_time ? ` · Time: ${esc(String(action.action_time).slice(0, 5))}` : ''}
        </div>
        <div class="act-meta">
          ${recipient ? `Recipient: <strong>${esc(recipient)}</strong>` : 'Recipient: —'}
          ${leader ? ` · Worker performing the meeting: <strong>${esc(leader)}</strong>` : ''}
          ${incident?.employee_name ? ` · Employee: ${esc(incident.employee_name)}` : ''}
        </div>
        ${action.action_notes ? `<div class="inc-detail" style="margin-top:6px;font-style:italic">${esc(action.action_notes)}</div>` : ''}
      </div>
    `
  }).join('')

  const html = bulkBaseHTML(`
    <div class="ml-header" style="background:#7c2d12">
      <div class="ml-header-eyebrow">Export — Disciplinary Actions</div>
      <div class="ml-header-title">${esc(title)}</div>
      <div class="ml-header-sub">${subtitle ? esc(subtitle) + ' · ' : ''}Generated ${todayStr()}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="ml-body">
      <div class="ml-count-bar">${actions.length} action${actions.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No disciplinary actions found.</p>'}
    </div>
    ${footer(exportMeta)}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  saveAs(new Blob([buf], { type: 'application/pdf' }), filename)
}

// ─── Checklist History List PDF ───────────────────────────────────────────────

export const downloadChecklistHistoryPDF = async (completions, title = 'Checklist History Report', subtitle = '') => {
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains completed checklist records.',
    details: `${completions.length} completion${completions.length === 1 ? '' : 's'}${subtitle ? ` · ${subtitle}` : ''}`,
  })
  if (!confirmed) return

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `checklist-history-${dateStr}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.checklist_history_list',
    fileName: filename,
    metadata: {
      report_title: title,
      report_subtitle: subtitle || null,
      record_count: completions.length,
    },
  })

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
    ${exportSummary(exportMeta)}
    <div class="ml-body">
      <div class="ml-count-bar">${completions.length} completion${completions.length !== 1 ? 's' : ''}</div>
      ${cardsHTML || '<p style="color:#9ca3af;font-size:13px;text-align:center;padding:40px 0">No checklist completions found.</p>'}
    </div>
    ${footer(exportMeta)}
  `)

  const buf = await renderHTMLtoPDFBuffer(html)
  saveAs(new Blob([buf], { type: 'application/pdf' }), filename)
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
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains individual meeting and safety survey records in a ZIP archive.',
    details: `${meetings.length} meeting PDF${meetings.length === 1 ? '' : 's'}`,
  })
  if (!confirmed) return

  const zip = new JSZip()
  const total = meetings.length
  const zipBatchId = generateClientUuid()

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
      const topicSlug = (data.topic || 'meeting').replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
      const datePart = data.date ? data.date.replace(/-/g, '') : 'nodate'
      const filename = `${String(i + 1).padStart(3, '0')}_${datePart}_${topicSlug}.pdf`
      const exportMeta = await createPdfExportContext({
        eventType: 'pdf_export.meeting_zip_item',
        tableName: 'meetings',
        recordId: data.id,
        fileName: filename,
        metadata: {
          meeting_id: data.id,
          zip_batch_id: zipBatchId,
          zip_position: i + 1,
          zip_total: total,
        },
      })

      const meetingWithExtras = { ...data, topicDetails, checklistCompletions }
      const html = buildMeetingHTMLForExport(meetingWithExtras, exportMeta)
      const buf = await renderHTMLtoPDFBuffer(html)

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
