import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import { createPdfExportContext } from './compliance'
import { confirmEvidencePdfExport } from './exportAttestation.jsx'
import { LEGAL_CONFIRMATION_CLAUSE } from './legal'

// ─── Brand ───────────────────────────────────────────────────────────────────
export const ACCENT   = '#E53935'
export const PRIMARY  = '#171717'
export const GRAY     = '#6b7280'
export const BORDER   = '#e5e5e5'

const PAGE_MARGIN_MM = { top: 10, right: 10, bottom: 12, left: 10 }
const REPEATED_HEADER_GAP_MM = 4
const REPEATED_FOOTER_GAP_MM = 4
const REPEATED_HEADER_SELECTOR = '.pdf-wrap > .pdf-header, .pdf-wrap > .ml-header'
const REPEATED_FOOTER_SELECTOR = '.pdf-wrap > .pdf-fixed-footer'

// ─── Core renderer ───────────────────────────────────────────────────────────

/** Builds a jsPDF document from an HTML string; returns the doc (does NOT save). */
const _buildPDFDoc = async (html) => {
  // Mount hidden container
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:absolute;top:0;left:-9999px;width:794px;background:#fff;z-index:-1'
  document.body.appendChild(wrap)
  wrap.innerHTML = html

  try {
    const A4W_MM = 210
    const A4H_MM = 297
    const repeatedHeader = wrap.querySelector(REPEATED_HEADER_SELECTOR)
    const repeatedFooter = wrap.querySelector(REPEATED_FOOTER_SELECTOR)

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
      headerHmm = (headerCanvas.height / headerCanvas.width) * A4W_MM
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
      footerHmm = (footerCanvas.height / footerCanvas.width) * A4W_MM
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

    const pxW = canvas.width   // 794 * 2 = 1588 canvas px
    const pxH = canvas.height
    const contentWmm = A4W_MM - PAGE_MARGIN_MM.left - PAGE_MARGIN_MM.right
    const bodyTopMm = headerCanvas ? headerHmm + REPEATED_HEADER_GAP_MM : PAGE_MARGIN_MM.top
    const bodyBottomMm = footerCanvas ? PAGE_MARGIN_MM.bottom + footerHmm + REPEATED_FOOTER_GAP_MM : PAGE_MARGIN_MM.bottom
    const contentHmm = A4H_MM - bodyTopMm - bodyBottomMm
    const pxPerMM = pxW / contentWmm
    const pageHpx = Math.round(contentHmm * pxPerMM)

    // Read the entire canvas once into a flat RGBA array — avoids per-row getImageData calls
    const ctx = canvas.getContext('2d')
    const allPixels = ctx.getImageData(0, 0, pxW, pxH).data // Uint8ClampedArray

    /**
     * Finds the best page cut point near `nominalRow`.
     * Strategy: find the WIDEST contiguous band of fully-white rows
     * within the scan window, then cut in the middle of it.
     * Wider white bands = space between sections (18px CSS / 36px canvas).
     * Narrower bands = padding inside items (8px CSS / 16px canvas).
     * This avoids cutting through list items.
     */
    const findSafeCutRow = (nominalRow) => {
      const scanPx   = 700
      const scanStart = Math.max(0, nominalRow - scanPx)

      // 1. Build a boolean array: isWhite[y] = true if row y has NO dark pixels
      //    "dark" = any pixel whose brightness < 230 (catches text, borders, icons)
      const isWhite = new Uint8Array(nominalRow - scanStart + 1)
      for (let y = scanStart; y <= nominalRow; y++) {
        const offset = y * pxW * 4
        let pure = true
        for (let x = 0; x < pxW; x++) {
          const i = offset + x * 4
          const bright = (allPixels[i] + allPixels[i + 1] + allPixels[i + 2]) / 3
          if (bright < 230) { pure = false; break }
        }
        isWhite[y - scanStart] = pure ? 1 : 0
      }

      // 2. Find all contiguous white runs, keep track of (start, length)
      let bestMidRow  = nominalRow
      let bestRunLen  = 0
      let runStart    = -1

      const evaluateRun = (runEnd) => {
        const len = runEnd - runStart
        if (len > bestRunLen) {
          bestRunLen = len
          bestMidRow = runStart + Math.floor(len / 2) + scanStart
        }
      }

      for (let j = 0; j <= (nominalRow - scanStart); j++) {
        if (isWhite[j]) {
          if (runStart === -1) runStart = j
        } else {
          if (runStart !== -1) { evaluateRun(j); runStart = -1 }
        }
      }
      if (runStart !== -1) evaluateRun(nominalRow - scanStart + 1)

      return bestMidRow
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    let cutTop    = 0
    let pageIndex = 0

    while (cutTop < pxH) {
      const nominalBottom = cutTop + pageHpx
      const cutBottom     = nominalBottom >= pxH ? pxH : findSafeCutRow(nominalBottom)
      const sliceH        = cutBottom - cutTop
      if (sliceH <= 0) break

      // Render the page slice at the printable width and place it inside real page margins.
      const pageCanvas  = document.createElement('canvas')
      pageCanvas.width  = pxW
      pageCanvas.height = sliceH
      const pctx = pageCanvas.getContext('2d')
      pctx.fillStyle = '#ffffff'
      pctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      pctx.drawImage(canvas, 0, cutTop, pxW, sliceH, 0, 0, pxW, sliceH)

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92)

      // Image height in mm, proportional to the printable width.
      const imgHmm = Math.min((sliceH / pxW) * contentWmm, contentHmm)

      if (pageIndex > 0) doc.addPage()
      if (headerImgData) {
        doc.addImage(
          headerImgData,
          'JPEG',
          0,
          0,
          A4W_MM,
          headerHmm,
        )
      }
      doc.addImage(
        imgData,
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
          A4H_MM - PAGE_MARGIN_MM.bottom - footerHmm,
          A4W_MM,
          footerHmm,
        )
      }

      cutTop = cutBottom
      pageIndex++
    }

    return doc
  } finally {
    document.body.removeChild(wrap)
  }
}

/** Renders HTML to a PDF and saves it as a file download. */
export const renderHTMLtoPDF = async (html, filename) => {
  const doc = await _buildPDFDoc(html)
  doc.save(filename)
}

/** Renders HTML to a PDF and returns the raw ArrayBuffer (for ZIP bundling). */
export const renderHTMLtoPDFBuffer = async (html) => {
  const doc = await _buildPDFDoc(html)
  return doc.output('arraybuffer')
}

// ─── Shared CSS injected into every HTML template ────────────────────────────

export const BASE_CSS = `
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;
       color:${PRIMARY};background:#fff;font-size:14px;line-height:1.5}
  .pdf-wrap{width:794px;background:#fff;padding:0}

  /* header bar */
  .pdf-header{background:${PRIMARY};color:#fff;padding:28px 36px 24px;position:relative;overflow:hidden}
  .pdf-header::after{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:${ACCENT}}
  .pdf-header-type{font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;
                   color:rgba(255,255,255,0.55);margin-bottom:6px}
  .pdf-header-title{font-size:24px;font-weight:700;line-height:1.2;margin-bottom:8px}
  .pdf-header-sub{font-size:13px;color:rgba(255,255,255,0.65)}

  /* body */
  .pdf-body{padding:28px 36px}

  /* section */
  .pdf-section{margin-bottom:24px}
  .pdf-section-title{font-size:10px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;
                     color:${ACCENT};border-bottom:1.5px solid ${ACCENT};padding-bottom:5px;
                     margin-bottom:12px}

  /* field grid */
  .pdf-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px 24px}
  .pdf-fields.full{grid-template-columns:1fr}
  .pdf-field{background:#f8f8f8;border-radius:6px;padding:9px 12px}
  .pdf-field-label{font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;
                   color:${GRAY};margin-bottom:3px}
  .pdf-field-value{font-size:13px;color:${PRIMARY};word-break:break-word}

  /* attendees */
  .pdf-attendee{display:flex;align-items:flex-start;gap:12px;padding:10px 12px;
                background:#f8f8f8;border-radius:6px;margin-bottom:8px}
  .pdf-attendee-num{font-size:12px;font-weight:700;color:#9ca3af;min-width:22px;margin-top:1px}
  .pdf-attendee-name{font-size:13px;font-weight:600;color:${PRIMARY}}
  .pdf-attendee-badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:10px;
                      margin-top:3px;font-weight:600}
  .badge-confirmed{background:#dcfce7;color:#15803d}
  .badge-signed{background:#e0f2fe;color:#0369a1}
  .pdf-sig-img{margin-top:6px;max-height:44px;max-width:140px;object-fit:contain}

  /* risk badge */
  .risk-low{background:#dcfce7;color:#15803d}
  .risk-medium{background:#fef9c3;color:#854d0e}
  .risk-high{background:#ffedd5;color:#9a3412}
  .risk-critical{background:#fee2e2;color:#991b1b}
  .risk-pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;
             font-weight:700;text-transform:capitalize}

  /* notes / description */
  .pdf-text{font-size:13px;color:${PRIMARY};line-height:1.7;white-space:pre-wrap;
            background:#f8f8f8;border-radius:6px;padding:12px 14px}

  /* checklist items */
  .pdf-item{display:flex;align-items:flex-start;gap:10px;padding:8px 12px;
            border-bottom:1px solid ${BORDER}}
  .pdf-item:last-child{border-bottom:none}
  .pdf-item-box{width:14px;height:14px;border:1.5px solid #9ca3af;border-radius:3px;
                flex-shrink:0;margin-top:2px}
  .pdf-item-text{font-size:13px;color:${PRIMARY};flex:1}
  .pdf-item-header{font-size:11px;font-weight:700;text-transform:uppercase;
                   letter-spacing:0.8px;color:${ACCENT};padding:10px 12px 4px;
                   background:#fff8f8;border-radius:4px;margin-top:8px;margin-bottom:2px}

  /* sig block */
  .pdf-sig-block{display:grid;grid-template-columns:1fr 1fr;gap:0 32px;margin-top:28px;
                 border-top:1px solid ${BORDER};padding-top:18px}
  .pdf-legal-clause{font-size:11px;line-height:1.6;color:${GRAY};background:#fafafa;border:1px solid ${BORDER};border-radius:8px;padding:10px 12px;margin-bottom:12px}
  .pdf-sig-line{border-bottom:1.5px solid #d1d5db;height:40px;margin-bottom:6px}
  .pdf-sig-caption{font-size:10px;color:${GRAY}}

  /* footer */
  .pdf-fixed-footer{background:#f9fafb}
  .pdf-footer{padding:12px 36px 6px;border-top:1px solid ${BORDER};display:flex;
              justify-content:space-between;align-items:center;
              background:#f9fafb;font-size:10px;color:${GRAY}}
  .pdf-footer-logo{font-weight:800;font-size:11px;color:${PRIMARY};letter-spacing:-0.3px}
  .pdf-footer-logo span{color:${ACCENT}}
  .pdf-disclaimer{padding:6px 36px 10px;background:#f9fafb;
                  font-size:8.5px;color:#9ca3af;text-align:center;line-height:1.5;
                  border-top:1px solid #f0f0f0}

  /* severity badge for incidents */
  .sev-low{background:#dcfce7;color:#15803d}
  .sev-medium{background:#fef9c3;color:#854d0e}
  .sev-high{background:#ffedd5;color:#9a3412}
  .sev-critical, .sev-fatal{background:#fee2e2;color:#991b1b}
  .sev-pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;
            font-weight:700;text-transform:capitalize}
  .osha-pill{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;
             font-weight:700;background:#ede9fe;color:#6d28d9}
`

export const baseHTML = (content) => `
  <style>${BASE_CSS}</style>
  <div class="pdf-wrap">${content}</div>
`

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')

export const exportSummary = (exportMeta) => {
  if (!exportMeta) return ''

  return `
    <div style="padding:14px 36px 0;background:#fff">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;border:1px solid ${BORDER};border-radius:8px;padding:12px 14px;background:#fafafa">
        <div>
          <div style="font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${GRAY};margin-bottom:3px">Generated By</div>
          <div style="font-size:12px;font-weight:600;color:${PRIMARY}">${escapeHtml(exportMeta.generatedByLabel)}</div>
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:${GRAY};margin-bottom:3px">Data Retrieved</div>
          <div style="font-size:12px;font-weight:600;color:${PRIMARY}">${escapeHtml(exportMeta.generatedAtLabel)}</div>
        </div>
      </div>
    </div>
  `
}

export const footer = (exportMeta) => {
  const exportedAtLabel = exportMeta?.generatedAtLabel || `${new Date().toISOString()} UTC`
  const exportId = exportMeta?.exportId || 'Unavailable'
  return `
    <div class="pdf-fixed-footer">
      <div class="pdf-footer">
        <div></div>
        <div>Exported ${escapeHtml(exportedAtLabel)}</div>
      </div>
      <div class="pdf-disclaimer">
        ${escapeHtml(LEGAL_CONFIRMATION_CLAUSE)}
        <div style="font-size:4px;line-height:1.2;margin-top:4px;color:#9ca3af">Print UUID: ${escapeHtml(exportId)}</div>
      </div>
    </div>
  `
}

export const pdfLegalClause = () => `<div class="pdf-legal-clause">${escapeHtml(LEGAL_CONFIRMATION_CLAUSE)}</div>`

export const field = (label, value) => {
  if (!value) return ''
  const v = String(value).replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return `<div class="pdf-field"><div class="pdf-field-label">${label}</div><div class="pdf-field-value">${v}</div></div>`
}

export const section = (title, content) =>
  `<div class="pdf-section"><div class="pdf-section-title">${title}</div>${content}</div>`

// ─── loadImage (for cross-origin images in html2canvas) ─────────────────────

export const toDataURL = (url) => new Promise((resolve) => {
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = () => {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth; c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    resolve(c.toDataURL('image/jpeg', 0.85))
  }
  img.onerror = () => resolve(null)
  img.src = url
})

// ─── Meeting PDF ──────────────────────────────────────────────────────────────

/** Builds the full HTML string for a meeting PDF (used by both single-PDF and ZIP export). */
export const buildMeetingHTMLForExport = (meeting, exportMeta = null) => {
  const dateStr = meeting.date ? new Date(meeting.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : ''
  const timeStr = meeting.time ? meeting.time.substring(0, 5) : ''

  const attendeesHTML = meeting.attendees && meeting.attendees.length > 0 ? `
    ${meeting.attendees.map((att, i) => `
      <div class="pdf-attendee">
        <div class="pdf-attendee-num">${i + 1}</div>
        <div style="flex:1">
          <div class="pdf-attendee-name">${att.name || ''}</div>
          ${att.signed_with_checkbox ? '<span class="pdf-attendee-badge badge-confirmed">✓ Confirmed attendance</span>' : ''}
          ${att.signature_url ? `<div><span class="pdf-attendee-badge badge-signed" style="margin-top:4px">Signed</span><br><img class="pdf-sig-img" src="${att.signature_url}" crossorigin="anonymous" /></div>` : ''}
        </div>
      </div>
    `).join('')}
  ` : '<p style="color:#9ca3af;font-size:13px">No attendees recorded</p>'

  const photosHTML = meeting.photos && meeting.photos.length > 0 ? `
    ${meeting.photos.map(p => `<div style="margin-bottom:12px"><img src="${p.photo_url}" crossorigin="anonymous" style="width:100%;border-radius:6px;display:block" /></div>`).join('')}
  ` : ''

  const leaderSigHTML = meeting.signature_url
    ? `${pdfLegalClause()}<div style="margin-top:8px"><img src="${meeting.signature_url}" crossorigin="anonymous" style="max-height:60px;max-width:200px;object-fit:contain;border:1px solid ${BORDER};border-radius:6px;padding:4px;background:#fff" /></div>`
    : `${pdfLegalClause()}<div class="pdf-sig-block"><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Leader signature</div></div><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Date</div></div></div>`

  const td = meeting.topicDetails
  const topicSectionHTML = td ? section('Topic Guidelines', `
    ${td.description ? `
      <div class="pdf-field" style="margin-bottom:10px">
        <div class="pdf-field-label">Description</div>
        <div class="pdf-field-value" style="white-space:pre-wrap;line-height:1.7">${td.description.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      </div>
    ` : ''}
    <div class="pdf-fields" style="margin-top:${td.description ? '4px' : '0'}">
      ${td.osha_reference ? `<div class="pdf-field"><div class="pdf-field-label">OSHA Reference</div><div class="pdf-field-value"><span class="osha-pill">${td.osha_reference}</span></div></div>` : ''}
      ${td.risk_level ? `<div class="pdf-field"><div class="pdf-field-label">Risk Level</div><div class="pdf-field-value"><span class="risk-pill risk-${td.risk_level}">${td.risk_level.toUpperCase()}</span></div></div>` : ''}
    </div>
  `) : ''

  const meetingChecklists = (meeting.checklists || []).filter(Boolean)
  const checklistCompletions = meeting.checklistCompletions || []

  const checklistsHTML = meetingChecklists.length > 0 ? section(
    'Checklists (' + meetingChecklists.length + ')',
    meetingChecklists.map(cl => {
      const completion = checklistCompletions.find(c => c.checklist_id === cl.id)
      const itemMap = {}
      completion?.items?.forEach(it => { itemMap[it.item_id] = it })
      const sorted = [...(cl.items || [])].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

      return `
        <div class="checklist-pdf-block" style="margin-bottom:18px;border:1px solid ${BORDER};border-radius:8px;overflow:hidden">
          <div style="background:#f3f4f6;padding:10px 14px;border-bottom:1px solid ${BORDER}">
            <div style="font-size:13px;font-weight:700;color:${PRIMARY}">${cl.name}</div>
            ${cl.category ? `<div style="font-size:11px;color:${GRAY};margin-top:2px">${cl.category}</div>` : ''}
            ${completion ? '<div style="font-size:11px;color:#15803d;font-weight:600;margin-top:3px">✓ Completed</div>' : ''}
          </div>
          ${sorted.map(item => {
            if (item.is_section_header) {
              return `<div class="pdf-item-header">${item.title || ''}</div>`
            }
            const ci = itemMap[item.id]
            const checked = ci?.is_checked ?? false
            return `<div class="pdf-item">
              <div class="pdf-item-box" style="${checked ? 'background:#16a34a;border-color:#16a34a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700' : ''}">${checked ? '✓' : ''}</div>
              <div class="pdf-item-text" style="${checked ? 'color:#15803d' : ''}">
                ${(item.title || '').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
                ${ci?.notes ? `<div style="font-size:11px;color:${GRAY};margin-top:2px;font-style:italic">${ci.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
              </div>
            </div>`
          }).join('')}
          ${completion?.notes ? `<div style="padding:10px 14px;border-top:1px solid ${BORDER};font-size:12px;color:${GRAY}"><strong>Notes:</strong> ${completion.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
        </div>
      `
    }).join('')
  ) : ''

  return baseHTML(`
    <div class="pdf-header">
      <div class="pdf-header-type">Toolbox Safety Meeting</div>
      <div class="pdf-header-title">${meeting.topic || 'Safety Meeting'}</div>
      <div class="pdf-header-sub">${dateStr}${timeStr ? ' · ' + timeStr : ''}${meeting.project ? ' · ' + meeting.project.name : ''}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="pdf-body">
      ${section('Meeting Info', `
        <div class="pdf-fields">
          ${field('Leader', meeting.leader_name)}
          ${field('Location', meeting.location || '—')}
          ${field('Project', meeting.project ? meeting.project.name : '')}
          ${field('Date', dateStr + (timeStr ? ' at ' + timeStr : ''))}
        </div>
      `)}
      ${topicSectionHTML}
      ${meeting.notes ? section('Notes', `<div class="pdf-text">${meeting.notes}</div>`) : ''}
      ${checklistsHTML}
      ${section('Attendees (' + (meeting.attendees ? meeting.attendees.length : 0) + ')', attendeesHTML)}
      ${meeting.photos && meeting.photos.length > 0 ? section('Photos', photosHTML) : ''}
      ${section('Leader Signature', leaderSigHTML)}
    </div>
    ${footer(exportMeta)}
  `)
}

export const generateMeetingPDF = async (meeting) => {
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains a toolbox meeting record.',
    details: `${meeting.topic || 'Safety meeting'}${meeting.date ? ` · ${new Date(meeting.date).toLocaleDateString('en-US')}` : ''}`,
  })
  if (!confirmed) return

  const slug = (meeting.topic || 'meeting').replace(/\s+/g, '-')
  const datePart = meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : 'nodate'
  const fileName = 'meeting-' + slug + '-' + datePart + '.pdf'
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.meeting',
    tableName: 'meetings',
    recordId: meeting.id || null,
    fileName,
    metadata: {
      meeting_id: meeting.id || null,
      topic: meeting.topic || null,
    },
  })
  const html = buildMeetingHTMLForExport(meeting, exportMeta)
  await renderHTMLtoPDF(html, fileName)
}

// ─── Incident PDF ─────────────────────────────────────────────────────────────

export const generateIncidentPDF = async (incident) => {
  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains an incident record.',
    details: `${incident.type_name || 'Incident'}${incident.employee_name ? ` · ${incident.employee_name}` : ''}`,
  })
  if (!confirmed) return

  const dateStr = incident.date ? new Date(incident.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : ''
  const sev = incident.severity || ''
  const sevClass = 'sev-' + (sev.toLowerCase() || 'medium')
  const SEV_LABELS = {
    lost_time: 'Lost Time Injury',
    first_aid: 'First Aid Only',
    near_miss: 'Near Miss',
    property_damage: 'Property Damage',
    medical_treatment: 'Medical Treatment',
    recordable: 'Recordable Injury',
    fatality: 'Fatality',
  }
  const sevLabel = sev ? (SEV_LABELS[sev.toLowerCase()] || sev.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())) : ''

  const sigHTML = incident.signature_url
    ? `${pdfLegalClause()}<div style="margin-top:8px"><img src="${incident.signature_url}" crossorigin="anonymous" style="max-height:60px;max-width:200px;object-fit:contain;border:1px solid ${BORDER};border-radius:6px;padding:4px;background:#fff" /></div>`
    : `${pdfLegalClause()}<div class="pdf-sig-block"><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Reporter signature</div></div><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Date</div></div></div>`

  const photoHTML = incident.photo_url
    ? `<img src="${incident.photo_url}" crossorigin="anonymous" style="width:100%;border-radius:6px;display:block" />`
    : ''

  const slug = (incident.type_name || 'incident').replace(/\s+/g, '-')
  const datePart = incident.date ? new Date(incident.date).toISOString().split('T')[0] : 'nodate'
  const fileName = 'incident-' + slug + '-' + datePart + '.pdf'
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.incident',
    tableName: 'incidents',
    recordId: incident.id || null,
    fileName,
    metadata: {
      incident_id: incident.id || null,
      incident_type: incident.type_name || null,
    },
  })

  const html = baseHTML(`
    <div class="pdf-header" style="background:#991b1b">
      <div class="pdf-header-type">Incident Report</div>
      <div class="pdf-header-title">${incident.type_name || 'Incident'}</div>
      <div class="pdf-header-sub">${dateStr}${incident.time ? ' · ' + incident.time : ''}${sevLabel ? ' · ' + sevLabel : ''}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="pdf-body">
      ${section('Classification', `
        <div class="pdf-fields">
          ${field('Type', incident.type_name)}
          ${field('Subtype', incident.incident_subtype ? incident.incident_subtype.replace(/_/g,' ') : '')}
          <div class="pdf-field"><div class="pdf-field-label">Severity</div><div class="pdf-field-value">${sev ? '<span class="sev-pill ' + sevClass + '">' + sevLabel + '</span>' : '—'}</div></div>
          <div class="pdf-field"><div class="pdf-field-label">OSHA</div><div class="pdf-field-value">${incident.osha_recordable ? '<span class="osha-pill">OSHA Recordable</span>' : '—'}</div></div>
        </div>
      `)}
      ${section('When & Where', `
        <div class="pdf-fields">
          ${field('Date', dateStr)}
          ${field('Time', incident.time)}
          ${field('Project', incident.project ? incident.project.name : '')}
          ${field('Location', incident.location)}
        </div>
      `)}
      ${section('People Involved', `
        <div class="pdf-fields">
          ${field('Employee', incident.employee_name)}
          ${field('Phone', incident.phone)}
          ${field('Reporter', incident.reporter_name)}
        </div>
      `)}
      ${section('What Happened', `
        <div class="pdf-fields full">
          ${field('Details', incident.details)}
          ${field('Immediate Cause', incident.immediate_cause)}
          ${field('Contributing Factors', incident.contributing_factors)}
          ${field('Root Cause', incident.root_cause)}
        </div>
      `)}
      ${incident.anyone_injured ? section('Injury Details', `
        <div class="pdf-fields">
          ${field('Body Part', incident.body_part)}
          ${field('Medical Treatment', incident.medical_treatment ? incident.medical_treatment.replace(/_/g,' ') : '')}
          ${field('Hospitalized', incident.hospitalized ? 'Yes' : '')}
          ${field('Days Away from Work', incident.days_away_from_work)}
        </div>
      `) : ''}
      ${incident.notes ? section('Additional Notes', `<div class="pdf-text">${incident.notes}</div>`) : ''}
      ${incident.photo_url ? section('Photo', photoHTML) : ''}
      ${section('Signature', sigHTML)}
    </div>
    ${footer(exportMeta)}
  `)

  await renderHTMLtoPDF(html, fileName)
}

// ─── Safety Topic PDF ─────────────────────────────────────────────────────────

export const generateSafetyTopicPDF = async (topic) => {
  const riskClass = {
    low: 'risk-low', medium: 'risk-medium', high: 'risk-high', critical: 'risk-critical'
  }[topic.risk_level] || 'risk-medium'

  const headerBg = {
    low: '#15803d', medium: '#854d0e', high: '#9a3412', critical: '#991b1b'
  }[topic.risk_level] || '#171717'

  const slug = topic.name.replace(/\s+/g, '-').toLowerCase()
  const fileName = 'safety-topic-' + slug + '.pdf'
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.safety_topic',
    tableName: 'safety_topics',
    recordId: topic.id || null,
    fileName,
    metadata: {
      topic_id: topic.id || null,
      topic_name: topic.name || null,
    },
  })

  const html = baseHTML(`
    <div class="pdf-header" style="background:${headerBg}">
      <div class="pdf-header-type">Safety Topic · ${topic.category || ''}</div>
      <div class="pdf-header-title">${topic.name}</div>
      <div class="pdf-header-sub">${topic.osha_reference ? 'OSHA ' + topic.osha_reference : ''}</div>
    </div>
    ${exportSummary(exportMeta)}
    ${topic.image_url ? `<img src="${topic.image_url}" crossorigin="anonymous" style="width:100%;max-height:220px;object-fit:cover;display:block" />` : ''}
    <div class="pdf-body">
      ${section('Details', `
        <div class="pdf-fields">
          <div class="pdf-field"><div class="pdf-field-label">Risk Level</div><div class="pdf-field-value"><span class="risk-pill ${riskClass}">${topic.risk_level || '—'}</span></div></div>
          ${field('OSHA Reference', topic.osha_reference)}
          ${field('Category', topic.category)}
        </div>
      `)}
      ${topic.description ? section('Description', `<div class="pdf-text">${topic.description}</div>`) : ''}
    </div>
    ${footer(exportMeta)}
  `)

  await renderHTMLtoPDF(html, fileName)
}

// ─── Checklist PDF ────────────────────────────────────────────────────────────

export const generateChecklistPDF = async (checklist, items) => {
  const checklistItems = items || []
  const sorted = [...checklistItems].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))

  const itemsHTML = sorted.length > 0 ? `
    <div style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden">
      ${sorted.map(item => {
        const text = item.text || item.title || item.item_text || ''
        if (item.is_section_header) {
          return `<div class="pdf-item-header">${text}</div>`
        }
        return `<div class="pdf-item"><div class="pdf-item-box"></div><div class="pdf-item-text">${text}</div></div>`
      }).join('')}
    </div>
  ` : '<p style="color:#9ca3af;font-size:13px">No items</p>'

  const slug = checklist.name.replace(/\s+/g, '-').toLowerCase()
  const fileName = 'checklist-' + slug + '.pdf'
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.checklist',
    tableName: 'checklists',
    recordId: checklist.id || null,
    fileName,
    metadata: {
      checklist_id: checklist.id || null,
      checklist_name: checklist.name || null,
    },
  })

  const html = baseHTML(`
    <div class="pdf-header" style="background:#14532d">
      <div class="pdf-header-type">Safety Checklist · ${checklist.category || ''}</div>
      <div class="pdf-header-title">${checklist.name}</div>
      <div class="pdf-header-sub">${checklist.trades && checklist.trades.length > 0 ? checklist.trades.join(' · ') : ''}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="pdf-body">
      ${checklist.description || (checklist.trades && checklist.trades.length > 0) ? section('Info', `
        <div class="pdf-fields">
          ${field('Description', checklist.description)}
          ${field('Trades', checklist.trades && checklist.trades.length > 0 ? checklist.trades.join(', ') : '')}
        </div>
      `) : ''}
      ${section('Checklist Items (' + sorted.length + ')', itemsHTML)}
      ${section('Sign-off', `
        ${pdfLegalClause()}
        <div class="pdf-sig-block">
          <div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Completed by (signature)</div></div>
          <div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Date</div></div>
        </div>
      `)}
    </div>
    ${footer(exportMeta)}
  `)

  await renderHTMLtoPDF(html, fileName)
}

// ─── Checklist Completion PDF ─────────────────────────────────────────────────

/**
 * Generates a PDF for a single completed checklist.
 *
 * Expected shape of `data`:
 *   {
 *     checklist:  { name, description, category },
 *     completion: { completion_datetime, notes },
 *     project:    { name } | null,
 *     user:       { name, email } | null,
 *     items:      [{ checklist_item: { title, is_section_header, display_order }, is_checked, notes, photos: [{photo_url}] }],
 *     photos:     [{ photo_url, completion_item_id }]  // all photos (global + per-item)
 *   }
 */
export const generateChecklistCompletionPDF = async (data) => {
  const { checklist, completion, project, user, items = [], photos = [] } = data

  const confirmed = await confirmEvidencePdfExport({
    title: 'This export contains a completed checklist record.',
    details: `${checklist?.name || 'Checklist completion'}${project?.name ? ` · ${project.name}` : ''}`,
  })
  if (!confirmed) return

  const dateStr = completion?.completion_datetime
    ? new Date(completion.completion_datetime).toLocaleString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      })
    : ''

  const sorted = [...items].sort((a, b) =>
    (a.checklist_item?.display_order || 0) - (b.checklist_item?.display_order || 0)
  )

  const checkedCount = sorted.filter(i => i.is_checked && !i.checklist_item?.is_section_header).length

  const itemsHTML = sorted.map(row => {
    const item = row.checklist_item || {}
    const title = (item.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    if (item.is_section_header) {
      return `<div class="pdf-item-header">${title}</div>`
    }
    const checked = row.is_checked
    const itemPhotos = photos.filter(p => p.completion_item_id === row.id)
    const itemPhotoHTML = itemPhotos.length > 0
      ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">
          ${itemPhotos.map(p => `<img src="${p.photo_url}" crossorigin="anonymous"
            style="width:80px;height:80px;object-fit:cover;border-radius:4px;border:1px solid ${BORDER}" />`).join('')}
        </div>`
      : ''
    return `
      <div class="pdf-item">
        <div class="pdf-item-box" style="${checked
          ? `background:#16a34a;border-color:#16a34a;color:#fff;display:flex;align-items:center;
             justify-content:center;font-size:10px;font-weight:700`
          : ''}">
          ${checked ? '&#10003;' : ''}
        </div>
        <div class="pdf-item-text" style="${checked ? 'color:#15803d' : ''}">
          ${title}
          ${row.notes ? `<div style="font-size:11px;color:${GRAY};margin-top:2px;font-style:italic">
            ${row.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>` : ''}
          ${itemPhotoHTML}
        </div>
      </div>`
  }).join('')

  const globalPhotos = photos.filter(p => p.completion_item_id === null)
  const globalPhotosHTML = globalPhotos.length > 0
    ? section('Photos', `
        <div style="display:flex;flex-wrap:wrap;gap:10px">
          ${globalPhotos.map(p => `<img src="${p.photo_url}" crossorigin="anonymous"
            style="width:180px;height:130px;object-fit:cover;border-radius:6px;border:1px solid ${BORDER}" />`).join('')}
        </div>`)
    : ''

  const signerName = data.completion?.signer_name
  const signerType = data.completion?.signer_type
  const signatureUrl = data.completion?.signature_url
  const signatureHTML = (signerName || signatureUrl)
    ? section('Signature', `
        ${pdfLegalClause()}
        <div class="pdf-fields">
          ${signerName ? field('Signed by', `${signerName}${signerType ? ` <span style="font-size:11px;color:#0369a1;background:#e0f2fe;border-radius:10px;padding:2px 8px;font-weight:600;text-transform:capitalize">${signerType}</span>` : ''}`) : ''}
        </div>
        ${signatureUrl ? `<div style="margin-top:8px"><img src="${signatureUrl}" crossorigin="anonymous"
          style="max-height:80px;max-width:260px;object-fit:contain;border:1px solid ${BORDER};border-radius:6px;padding:6px;background:#fff" /></div>`
          : `<div style="margin-top:12px;display:flex;gap:32px">
               <div><div style="width:200px;border-bottom:1.5px solid #374151;margin-bottom:4px"></div>
               <div style="font-size:11px;color:#6b7280">Signature</div></div>
               <div><div style="width:120px;border-bottom:1.5px solid #374151;margin-bottom:4px"></div>
               <div style="font-size:11px;color:#6b7280">Date</div></div></div>`}`)
    : ''

  const slug = (checklist?.name || 'checklist').replace(/\s+/g, '-').toLowerCase()
  const datePart = completion?.completion_datetime
    ? new Date(completion.completion_datetime).toISOString().split('T')[0]
    : 'nodate'
  const fileName = `checklist-completion-${slug}-${datePart}.pdf`
  const exportMeta = await createPdfExportContext({
    eventType: 'pdf_export.checklist_completion',
    tableName: 'checklist_completions',
    recordId: completion?.id || null,
    fileName,
    metadata: {
      checklist_completion_id: completion?.id || null,
      checklist_id: checklist?.id || null,
      checklist_name: checklist?.name || null,
    },
  })

  const html = baseHTML(`
    <div class="pdf-header" style="background:#14532d">
      <div class="pdf-header-type">Completed Checklist</div>
      <div class="pdf-header-title">${(checklist?.name || 'Checklist').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
      <div class="pdf-header-sub">${dateStr}${project ? ' · ' + project.name : ''}</div>
    </div>
    ${exportSummary(exportMeta)}
    <div class="pdf-body">
      ${section('Completion Details', `
        <div class="pdf-fields">
          ${field('Completed by', user?.name || user?.email || '')}
          ${field('Date & Time', dateStr)}
          ${field('Project', project?.name || '')}
          ${field('Progress', checkedCount + ' / ' + sorted.filter(i => !i.checklist_item?.is_section_header).length + ' items checked')}
        </div>
        ${completion?.notes ? `<div style="margin-top:10px"><div class="pdf-text">${completion.notes.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div></div>` : ''}
      `)}
      ${section(`Checklist Items (${checkedCount}/${sorted.filter(i => !i.checklist_item?.is_section_header).length})`,
        `<div style="border:1px solid ${BORDER};border-radius:8px;overflow:hidden">${itemsHTML}</div>`
      )}
      ${globalPhotosHTML}
      ${signatureHTML}
    </div>
    ${footer(exportMeta)}
  `)

  await renderHTMLtoPDF(html, fileName)
}
