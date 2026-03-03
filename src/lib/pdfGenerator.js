import { jsPDF } from 'jspdf'

// ─── helpers ────────────────────────────────────────────────────────────────

const loadImage = (url) => new Promise((resolve, reject) => {
  const img = new Image()
  img.crossOrigin = 'Anonymous'
  img.onload = () => resolve(img)
  img.onerror = reject
  img.src = url
})

const PAGE_H = 280
const MARGIN = 20
const WIDTH = 170

const checkPage = (doc, y, needed = 10) => {
  if (y + needed > PAGE_H) { doc.addPage(); return MARGIN }
  return y
}

const sectionTitle = (doc, y, text, color = [229, 57, 53]) => {
  y = checkPage(doc, y, 14)
  doc.setFontSize(12)
  doc.setTextColor(...color)
  doc.setFont(undefined, 'bold')
  doc.text(text, MARGIN, y)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(23, 23, 23)
  return y + 8
}

const fieldRow = (doc, y, label, value) => {
  if (!value) return y
  y = checkPage(doc, y, 12)
  if (label) {
    doc.setFontSize(9)
    doc.setTextColor(110, 110, 110)
    doc.text(label.toUpperCase(), MARGIN, y)
    y += 4
  }
  doc.setFontSize(11)
  doc.setTextColor(23, 23, 23)
  const lines = doc.splitTextToSize(String(value), WIDTH)
  lines.forEach(line => { y = checkPage(doc, y, 6); doc.text(line, MARGIN, y); y += 6 })
  return y + 3
}

const pageHeader = (doc, title, subtitle, bgColor = [33, 97, 140]) => {
  doc.setFillColor(...bgColor)
  doc.rect(0, 0, 210, 30, 'F')
  doc.setFontSize(17)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(title, MARGIN, 13)
  doc.setFont(undefined, 'normal')
  if (subtitle) {
    doc.setFontSize(10)
    doc.text(subtitle, MARGIN, 22)
  }
  return 38
}

// ─── Meeting PDF ─────────────────────────────────────────────────────────────

export const generateMeetingPDF = async (meeting) => {
  const doc = new jsPDF()
  let y = pageHeader(
    doc,
    'Toolbox Safety Meeting',
    `${new Date(meeting.date).toLocaleDateString()} · ${meeting.time?.substring(0,5) || ''}`
  )

  y = sectionTitle(doc, y, 'Meeting Info', [33, 97, 140])
  y = fieldRow(doc, y, 'Topic', meeting.topic)
  y = fieldRow(doc, y, 'Leader', meeting.leader_name)
  y = fieldRow(doc, y, 'Project', meeting.project?.name)
  y = fieldRow(doc, y, 'Location', meeting.location)

  if (meeting.notes) {
    y = sectionTitle(doc, y, 'Notes', [33, 97, 140])
    y = fieldRow(doc, y, '', meeting.notes)
  }

  if (meeting.attendees && meeting.attendees.length > 0) {
    y = sectionTitle(doc, y, `Attendees (${meeting.attendees.length})`, [33, 97, 140])
    for (let i = 0; i < meeting.attendees.length; i++) {
      const att = meeting.attendees[i]
      y = checkPage(doc, y, 10)
      doc.setFontSize(11); doc.setTextColor(23, 23, 23)
      doc.text(`${i + 1}.  ${att.name}`, MARGIN + 2, y); y += 6
      if (att.signed_with_checkbox) {
        doc.setFontSize(9); doc.setTextColor(22, 163, 74)
        doc.text('    Confirmed attendance', MARGIN + 4, y)
        doc.setTextColor(23, 23, 23); y += 5
      }
      if (att.signature_url) {
        try {
          y = checkPage(doc, y, 32)
          const img = await loadImage(att.signature_url)
          doc.setFontSize(8); doc.setTextColor(110, 110, 110)
          doc.text('    Signature:', MARGIN + 4, y); y += 3
          doc.addImage(img, 'PNG', MARGIN + 4, y, 52, 22); y += 26
        } catch {}
      }
      y += 2
    }
  }

  if (meeting.photos && meeting.photos.length > 0) {
    doc.addPage(); y = MARGIN
    y = sectionTitle(doc, y, 'Photos', [33, 97, 140])
    for (const photo of meeting.photos) {
      try {
        const img = await loadImage(photo.photo_url)
        const h = Math.min((img.height * WIDTH) / img.width, 140)
        y = checkPage(doc, y, h + 8)
        doc.addImage(img, 'JPEG', MARGIN, y, WIDTH, h); y += h + 8
      } catch {}
    }
  }

  if (meeting.signature_url) {
    try {
      y = checkPage(doc, y, 46)
      y = sectionTitle(doc, y, 'Leader Signature', [33, 97, 140])
      const img = await loadImage(meeting.signature_url)
      doc.addImage(img, 'PNG', MARGIN, y, 78, 34)
    } catch {}
  }

  doc.save(`meeting-${(meeting.topic || 'report').replace(/\s+/g, '-')}-${new Date(meeting.date).toISOString().split('T')[0]}.pdf`)
}

// ─── Incident PDF ─────────────────────────────────────────────────────────────

export const generateIncidentPDF = async (incident) => {
  const doc = new jsPDF()
  const sev = incident.severity ? ` · ${incident.severity.toUpperCase()}` : ''
  let y = pageHeader(
    doc,
    'Incident Report',
    `${new Date(incident.date).toLocaleDateString()} · ${incident.time || ''}${sev}`,
    [180, 30, 30]
  )

  y = sectionTitle(doc, y, 'Classification', [180, 30, 30])
  y = fieldRow(doc, y, 'Type', incident.type_name)
  if (incident.incident_subtype) y = fieldRow(doc, y, 'Subtype', incident.incident_subtype.replace(/_/g, ' '))
  y = fieldRow(doc, y, 'Severity', incident.severity)
  if (incident.osha_recordable) {
    doc.setFontSize(10); doc.setTextColor(124, 58, 237)
    y = checkPage(doc, y, 8)
    doc.text('OSHA Recordable', MARGIN, y); y += 7
    doc.setTextColor(23, 23, 23)
  }

  y = sectionTitle(doc, y, 'When & Where', [180, 30, 30])
  y = fieldRow(doc, y, 'Date', new Date(incident.date).toLocaleDateString())
  y = fieldRow(doc, y, 'Time', incident.time)
  y = fieldRow(doc, y, 'Project', incident.project?.name)
  y = fieldRow(doc, y, 'Location', incident.location)

  y = sectionTitle(doc, y, 'People Involved', [180, 30, 30])
  y = fieldRow(doc, y, 'Employee', incident.employee_name)
  y = fieldRow(doc, y, 'Phone', incident.phone)
  y = fieldRow(doc, y, 'Reporter', incident.reporter_name)

  y = sectionTitle(doc, y, 'What Happened', [180, 30, 30])
  y = fieldRow(doc, y, 'Details', incident.details)
  y = fieldRow(doc, y, 'Immediate Cause', incident.immediate_cause)
  y = fieldRow(doc, y, 'Contributing Factors', incident.contributing_factors)
  y = fieldRow(doc, y, 'Root Cause', incident.root_cause)

  if (incident.anyone_injured) {
    y = sectionTitle(doc, y, 'Injury Details', [180, 30, 30])
    y = fieldRow(doc, y, 'Body Part', incident.body_part)
    y = fieldRow(doc, y, 'Medical Treatment', incident.medical_treatment?.replace(/_/g, ' '))
    if (incident.hospitalized) { y = checkPage(doc, y, 8); doc.setFontSize(10); doc.text('Hospitalized: Yes', MARGIN, y); y += 7 }
    y = fieldRow(doc, y, 'Days Away from Work', incident.days_away_from_work)
  }

  if (incident.notes) {
    y = sectionTitle(doc, y, 'Additional Notes', [180, 30, 30])
    y = fieldRow(doc, y, '', incident.notes)
  }

  if (incident.photo_url) {
    try {
      doc.addPage(); y = MARGIN
      y = sectionTitle(doc, y, 'Photo', [180, 30, 30])
      const img = await loadImage(incident.photo_url)
      const h = Math.min((img.height * WIDTH) / img.width, 160)
      doc.addImage(img, 'JPEG', MARGIN, y, WIDTH, h)
    } catch {}
  }

  if (incident.signature_url) {
    try {
      y = checkPage(doc, y, 46)
      y = sectionTitle(doc, y, 'Signature', [180, 30, 30])
      const img = await loadImage(incident.signature_url)
      doc.addImage(img, 'PNG', MARGIN, y, 78, 34)
    } catch {}
  }

  doc.save(`incident-${(incident.type_name || 'report').replace(/\s+/g, '-')}-${new Date(incident.date).toISOString().split('T')[0]}.pdf`)
}

// ─── Safety Topic PDF ─────────────────────────────────────────────────────────

export const generateSafetyTopicPDF = (topic) => {
  const doc = new jsPDF()
  const riskColors = {
    low: [22, 163, 74],
    medium: [202, 138, 4],
    high: [234, 88, 12],
    critical: [220, 38, 38],
  }
  const bg = riskColors[topic.risk_level] || [80, 80, 80]

  let y = pageHeader(doc, 'Safety Topic', topic.category || '', bg)

  doc.setFontSize(16)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(23, 23, 23)
  y = checkPage(doc, y, 14)
  const nameLines = doc.splitTextToSize(topic.name, WIDTH)
  nameLines.forEach(l => { doc.text(l, MARGIN, y); y += 8 })
  doc.setFont(undefined, 'normal')
  y += 2

  if (topic.osha_reference) y = fieldRow(doc, y, 'OSHA Reference', topic.osha_reference)
  y = fieldRow(doc, y, 'Risk Level', topic.risk_level ? topic.risk_level.charAt(0).toUpperCase() + topic.risk_level.slice(1) : '')

  if (topic.description) {
    y = sectionTitle(doc, y, 'Description', bg)
    const lines = doc.splitTextToSize(topic.description, WIDTH)
    doc.setFontSize(11); doc.setTextColor(23, 23, 23)
    lines.forEach(line => { y = checkPage(doc, y, 6); doc.text(line, MARGIN, y); y += 6 })
  }

  doc.save(`safety-topic-${topic.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}

// ─── Checklist PDF ─────────────────────────────────────────────────────────────

export const generateChecklistPDF = (checklist, items = []) => {
  const doc = new jsPDF()
  let y = pageHeader(doc, 'Safety Checklist', checklist.category || '', [30, 120, 80])

  doc.setFontSize(15)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(23, 23, 23)
  y = checkPage(doc, y, 12)
  const nameLines = doc.splitTextToSize(checklist.name, WIDTH)
  nameLines.forEach(l => { doc.text(l, MARGIN, y); y += 7 })
  doc.setFont(undefined, 'normal')
  y += 2

  if (checklist.trades && checklist.trades.length > 0)
    y = fieldRow(doc, y, 'Trades', checklist.trades.join(', '))
  if (checklist.description)
    y = fieldRow(doc, y, 'Description', checklist.description)

  if (items.length > 0) {
    y = sectionTitle(doc, y, `Checklist Items (${items.length})`, [30, 120, 80])
    const sorted = [...items].sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
    let itemNum = 0
    for (const item of sorted) {
      y = checkPage(doc, y, 10)
      if (item.is_section_header) {
        doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 120, 80)
        doc.text(item.text || item.title || item.item_text || '', MARGIN, y)
        doc.setFont(undefined, 'normal'); doc.setTextColor(23, 23, 23)
        y += 7
      } else {
        itemNum++
        // Checkbox square
        doc.setDrawColor(150, 150, 150)
        doc.rect(MARGIN, y - 4, 4, 4)
        doc.setFontSize(10); doc.setTextColor(23, 23, 23)
        const text = item.text || item.title || item.item_text || ''
        const lines = doc.splitTextToSize(`${itemNum}.  ${text}`, WIDTH - 8)
        lines.forEach((l, li) => {
          y = checkPage(doc, y, 6)
          doc.text(l, MARGIN + 7, y)
          y += 6
        })
        y += 1
      }
    }
  }

  // Signature block at the bottom
  y = checkPage(doc, y, 40)
  y += 6
  doc.setDrawColor(180, 180, 180)
  doc.line(MARGIN, y, MARGIN + 80, y)
  doc.setFontSize(9); doc.setTextColor(110, 110, 110)
  doc.text('Completed by (signature)', MARGIN, y + 5)
  doc.line(MARGIN + 110, y, MARGIN + 150, y)
  doc.text('Date', MARGIN + 110, y + 5)

  doc.save(`checklist-${checklist.name.replace(/\s+/g, '-').toLowerCase()}.pdf`)
}
