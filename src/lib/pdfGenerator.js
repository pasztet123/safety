import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

// ─── Brand ───────────────────────────────────────────────────────────────────
const ACCENT   = '#E53935'
const PRIMARY  = '#171717'
const GRAY     = '#6b7280'
const BORDER   = '#e5e5e5'

// ─── Core renderer ───────────────────────────────────────────────────────────

const renderHTMLtoPDF = async (html, filename) => {
  // Mount hidden container
  const wrap = document.createElement('div')
  wrap.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:794px;background:#fff;z-index:-1'
  wrap.innerHTML = html
  document.body.appendChild(wrap)

  try {
    const canvas = await html2canvas(wrap, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    const imgData = canvas.toDataURL('image/jpeg', 0.92)
    const pxW = canvas.width
    const pxH = canvas.height
    const A4W = 210
    const A4H = 297
    const pxPerMm = pxW / A4W
    const mmH = pxH / pxPerMm

    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

    // Slice into A4 pages
    let sliceTop = 0
    let page = 0
    while (sliceTop < mmH) {
      if (page > 0) doc.addPage()
      doc.addImage(imgData, 'JPEG', 0, -sliceTop, A4W, mmH)
      sliceTop += A4H
      page++
    }

    doc.save(filename)
  } finally {
    document.body.removeChild(wrap)
  }
}

// ─── Shared CSS injected into every HTML template ────────────────────────────

const BASE_CSS = `
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
  .pdf-sig-line{border-bottom:1.5px solid #d1d5db;height:40px;margin-bottom:6px}
  .pdf-sig-caption{font-size:10px;color:${GRAY}}

  /* footer */
  .pdf-footer{padding:12px 36px;border-top:1px solid ${BORDER};display:flex;
              justify-content:space-between;align-items:center;
              background:#f9fafb;font-size:10px;color:${GRAY}}
  .pdf-footer-logo{font-weight:800;font-size:11px;color:${PRIMARY};letter-spacing:-0.3px}
  .pdf-footer-logo span{color:${ACCENT}}

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

const baseHTML = (content) => `
  <style>${BASE_CSS}</style>
  <div class="pdf-wrap">${content}</div>
`

const footer = () => `
  <div class="pdf-footer">
    <div class="pdf-footer-logo">Roof<span>Chimp</span> Safety</div>
    <div>Generated ${new Date().toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'})}</div>
  </div>
`

const field = (label, value) => {
  if (!value) return ''
  const v = String(value).replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return `<div class="pdf-field"><div class="pdf-field-label">${label}</div><div class="pdf-field-value">${v}</div></div>`
}

const section = (title, content) =>
  `<div class="pdf-section"><div class="pdf-section-title">${title}</div>${content}</div>`

// ─── loadImage (for cross-origin images in html2canvas) ─────────────────────

const toDataURL = (url) => new Promise((resolve) => {
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

export const generateMeetingPDF = async (meeting) => {
  const dateStr = meeting.date ? new Date(meeting.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : ''
  const timeStr = meeting.time ? meeting.time.substring(0, 5) : ''

  // Pre-load signature images as data URLs
  const attImages = {}
  if (meeting.attendees) {
    for (const att of meeting.attendees) {
      if (att.signature_url) attImages[att.signature_url] = await toDataURL(att.signature_url)
    }
  }
  const leaderSigData = meeting.signature_url ? await toDataURL(meeting.signature_url) : null
  const photoDataURLs = []
  if (meeting.photos) {
    for (const p of meeting.photos) {
      const d = await toDataURL(p.photo_url)
      if (d) photoDataURLs.push(d)
    }
  }

  const attendeesHTML = meeting.attendees && meeting.attendees.length > 0 ? `
    ${meeting.attendees.map((att, i) => `
      <div class="pdf-attendee">
        <div class="pdf-attendee-num">${i + 1}</div>
        <div style="flex:1">
          <div class="pdf-attendee-name">${att.name || ''}</div>
          ${att.signed_with_checkbox ? '<span class="pdf-attendee-badge badge-confirmed">✓ Confirmed attendance</span>' : ''}
          ${att.signature_url && attImages[att.signature_url] ? `<div><span class="pdf-attendee-badge badge-signed" style="margin-top:4px">Signed</span><br><img class="pdf-sig-img" src="${attImages[att.signature_url]}" /></div>` : ''}
        </div>
      </div>
    `).join('')}
  ` : '<p style="color:#9ca3af;font-size:13px">No attendees recorded</p>'

  const photosHTML = photoDataURLs.length > 0 ? `
    ${photoDataURLs.map(d => `<div style="margin-bottom:12px"><img src="${d}" style="width:100%;border-radius:6px;display:block" /></div>`).join('')}
  ` : ''

  const leaderSigHTML = leaderSigData ? `
    <div style="margin-top:8px">
      <img src="${leaderSigData}" style="max-height:60px;max-width:200px;object-fit:contain;border:1px solid ${BORDER};border-radius:6px;padding:4px;background:#fff" />
    </div>
  ` : `<div class="pdf-sig-block"><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Leader signature</div></div><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Date</div></div></div>`

  const html = baseHTML(`
    <div class="pdf-header">
      <div class="pdf-header-type">Toolbox Safety Meeting</div>
      <div class="pdf-header-title">${meeting.topic || 'Safety Meeting'}</div>
      <div class="pdf-header-sub">${dateStr}${timeStr ? ' · ' + timeStr : ''}${meeting.project ? ' · ' + meeting.project.name : ''}</div>
    </div>
    <div class="pdf-body">
      ${section('Meeting Info', `
        <div class="pdf-fields">
          ${field('Leader', meeting.leader_name)}
          ${field('Location', meeting.location)}
          ${field('Project', meeting.project ? meeting.project.name : '')}
          ${field('Date', dateStr + (timeStr ? ' at ' + timeStr : ''))}
        </div>
      `)}
      ${meeting.notes ? section('Notes', `<div class="pdf-text">${meeting.notes}</div>`) : ''}
      ${section('Attendees (' + (meeting.attendees ? meeting.attendees.length : 0) + ')', attendeesHTML)}
      ${photoDataURLs.length > 0 ? section('Photos', photosHTML) : ''}
      ${section('Leader Signature', leaderSigHTML)}
    </div>
    ${footer()}
  `)

  const slug = (meeting.topic || 'meeting').replace(/\s+/g, '-')
  const datePart = meeting.date ? new Date(meeting.date).toISOString().split('T')[0] : 'nodate'
  await renderHTMLtoPDF(html, 'meeting-' + slug + '-' + datePart + '.pdf')
}

// ─── Incident PDF ─────────────────────────────────────────────────────────────

export const generateIncidentPDF = async (incident) => {
  const dateStr = incident.date ? new Date(incident.date).toLocaleDateString('en-US', {year:'numeric',month:'long',day:'numeric'}) : ''
  const sev = incident.severity || ''
  const sevClass = 'sev-' + (sev.toLowerCase() || 'medium')

  const sigData = incident.signature_url ? await toDataURL(incident.signature_url) : null
  const photoData = incident.photo_url ? await toDataURL(incident.photo_url) : null

  const sigHTML = sigData
    ? `<div style="margin-top:8px"><img src="${sigData}" style="max-height:60px;max-width:200px;object-fit:contain;border:1px solid ${BORDER};border-radius:6px;padding:4px;background:#fff" /></div>`
    : `<div class="pdf-sig-block"><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Reporter signature</div></div><div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Date</div></div></div>`

  const html = baseHTML(`
    <div class="pdf-header" style="background:#991b1b">
      <div class="pdf-header-type">Incident Report</div>
      <div class="pdf-header-title">${incident.type_name || 'Incident'}</div>
      <div class="pdf-header-sub">${dateStr}${incident.time ? ' · ' + incident.time : ''}${sev ? ' · ' + sev.toUpperCase() : ''}</div>
    </div>
    <div class="pdf-body">
      ${section('Classification', `
        <div class="pdf-fields">
          ${field('Type', incident.type_name)}
          ${field('Subtype', incident.incident_subtype ? incident.incident_subtype.replace(/_/g,' ') : '')}
          <div class="pdf-field"><div class="pdf-field-label">Severity</div><div class="pdf-field-value">${sev ? '<span class="sev-pill ' + sevClass + '">' + sev + '</span>' : '—'}</div></div>
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
      ${photoData ? section('Photo', `<img src="${photoData}" style="width:100%;border-radius:6px;display:block" />`) : ''}
      ${section('Signature', sigHTML)}
    </div>
    ${footer()}
  `)

  const slug = (incident.type_name || 'incident').replace(/\s+/g, '-')
  const datePart = incident.date ? new Date(incident.date).toISOString().split('T')[0] : 'nodate'
  await renderHTMLtoPDF(html, 'incident-' + slug + '-' + datePart + '.pdf')
}

// ─── Safety Topic PDF ─────────────────────────────────────────────────────────

export const generateSafetyTopicPDF = async (topic) => {
  const riskClass = {
    low: 'risk-low', medium: 'risk-medium', high: 'risk-high', critical: 'risk-critical'
  }[topic.risk_level] || 'risk-medium'

  const headerBg = {
    low: '#15803d', medium: '#854d0e', high: '#9a3412', critical: '#991b1b'
  }[topic.risk_level] || '#171717'

  const imgData = topic.image_url ? await toDataURL(topic.image_url) : null

  const html = baseHTML(`
    <div class="pdf-header" style="background:${headerBg}">
      <div class="pdf-header-type">Safety Topic · ${topic.category || ''}</div>
      <div class="pdf-header-title">${topic.name}</div>
      <div class="pdf-header-sub">${topic.osha_reference ? 'OSHA ' + topic.osha_reference : ''}</div>
    </div>
    ${imgData ? `<img src="${imgData}" style="width:100%;max-height:220px;object-fit:cover;display:block" />` : ''}
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
    ${footer()}
  `)

  const slug = topic.name.replace(/\s+/g, '-').toLowerCase()
  await renderHTMLtoPDF(html, 'safety-topic-' + slug + '.pdf')
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

  const html = baseHTML(`
    <div class="pdf-header" style="background:#14532d">
      <div class="pdf-header-type">Safety Checklist · ${checklist.category || ''}</div>
      <div class="pdf-header-title">${checklist.name}</div>
      <div class="pdf-header-sub">${checklist.trades && checklist.trades.length > 0 ? checklist.trades.join(' · ') : ''}</div>
    </div>
    <div class="pdf-body">
      ${checklist.description || (checklist.trades && checklist.trades.length > 0) ? section('Info', `
        <div class="pdf-fields">
          ${field('Description', checklist.description)}
          ${field('Trades', checklist.trades && checklist.trades.length > 0 ? checklist.trades.join(', ') : '')}
        </div>
      `) : ''}
      ${section('Checklist Items (' + sorted.length + ')', itemsHTML)}
      ${section('Sign-off', `
        <div class="pdf-sig-block">
          <div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Completed by (signature)</div></div>
          <div><div class="pdf-sig-line"></div><div class="pdf-sig-caption">Date</div></div>
        </div>
      `)}
    </div>
    ${footer()}
  `)

  const slug = checklist.name.replace(/\s+/g, '-').toLowerCase()
  await renderHTMLtoPDF(html, 'checklist-' + slug + '.pdf')
}
