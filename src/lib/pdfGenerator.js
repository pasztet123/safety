import { jsPDF } from 'jspdf'

export const generateMeetingPDF = async (meeting) => {
  const doc = new jsPDF()
  let yPos = 20

  // Title
  doc.setFontSize(20)
  doc.setTextColor(23, 23, 23)
  doc.text('Safety Meeting Report', 20, yPos)
  yPos += 15

  // Date and Time
  doc.setFontSize(12)
  doc.setTextColor(102, 102, 102)
  doc.text(`Date: ${new Date(meeting.date).toLocaleDateString()}`, 20, yPos)
  yPos += 7
  doc.text(`Time: ${meeting.time}`, 20, yPos)
  yPos += 10

  // Topic
  doc.setFontSize(14)
  doc.setTextColor(23, 23, 23)
  doc.text('Topic:', 20, yPos)
  yPos += 7
  doc.setFontSize(12)
  doc.text(meeting.topic, 20, yPos)
  yPos += 10

  // Leader
  doc.setFontSize(14)
  doc.setTextColor(23, 23, 23)
  doc.text('Leader:', 20, yPos)
  yPos += 7
  doc.setFontSize(12)
  doc.text(meeting.leader_name, 20, yPos)
  yPos += 10

  // Location
  if (meeting.location) {
    doc.setFontSize(14)
    doc.setTextColor(23, 23, 23)
    doc.text('Location:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    const locationLines = doc.splitTextToSize(meeting.location, 170)
    doc.text(locationLines, 20, yPos)
    yPos += (locationLines.length * 7) + 5
  }

  // Project
  if (meeting.project) {
    doc.setFontSize(14)
    doc.setTextColor(23, 23, 23)
    doc.text('Project:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    doc.text(meeting.project.name, 20, yPos)
    yPos += 10
  }

  // Attendees with signatures
  if (meeting.attendees && meeting.attendees.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(23, 23, 23)
    doc.text('Attendees:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    
    for (let index = 0; index < meeting.attendees.length; index++) {
      const attendee = meeting.attendees[index]
      
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      
      // Attendee name
      doc.text(`${index + 1}. ${attendee.name}`, 25, yPos)
      yPos += 7
      
      // Attendee signature if available
      if (attendee.signature_url) {
        try {
          if (yPos > 240) {
            doc.addPage()
            yPos = 20
          }
          
          const img = await loadImage(attendee.signature_url)
          doc.setFontSize(10)
          doc.setTextColor(102, 102, 102)
          doc.text('Signature:', 30, yPos)
          yPos += 5
          doc.addImage(img, 'PNG', 30, yPos, 60, 30)
          yPos += 35
        } catch (error) {
          console.error(`Error loading signature for ${attendee.name}:`, error)
        }
      }
    }
    yPos += 5
  }

  // Notes
  if (meeting.notes) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    doc.setFontSize(14)
    doc.setTextColor(23, 23, 23)
    doc.text('Notes:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    const notesLines = doc.splitTextToSize(meeting.notes, 170)
    notesLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.text(line, 20, yPos)
      yPos += 7
    })
  }

  // Photos
  if (meeting.photos && meeting.photos.length > 0) {
    doc.addPage()
    yPos = 20
    doc.setFontSize(14)
    doc.setTextColor(23, 23, 23)
    doc.text('Photos:', 20, yPos)
    yPos += 10

    for (const photo of meeting.photos) {
      try {
        const img = await loadImage(photo.photo_url)
        const imgWidth = 170
        const imgHeight = (img.height * imgWidth) / img.width
        
        if (yPos + imgHeight > 270) {
          doc.addPage()
          yPos = 20
        }
        
        doc.addImage(img, 'JPEG', 20, yPos, imgWidth, imgHeight)
        yPos += imgHeight + 10
      } catch (error) {
        console.error('Error loading photo:', error)
      }
    }
  }

  // Signature
  if (meeting.signature_url) {
    if (yPos > 220) {
      doc.addPage()
      yPos = 20
    }
    try {
      const img = await loadImage(meeting.signature_url)
      doc.setFontSize(14)
      doc.setTextColor(23, 23, 23)
      doc.text('Signature:', 20, yPos)
      yPos += 10
      doc.addImage(img, 'PNG', 20, yPos, 80, 40)
    } catch (error) {
      console.error('Error loading signature:', error)
    }
  }

  // Save
  doc.save(`meeting-${meeting.topic.replace(/\s+/g, '-')}-${new Date(meeting.date).toISOString().split('T')[0]}.pdf`)
}

export const generateIncidentPDF = async (incident) => {
  const doc = new jsPDF()
  let yPos = 20

  // Title
  doc.setFontSize(20)
  doc.setTextColor(238, 46, 47)
  doc.text('Incident Report', 20, yPos)
  yPos += 15

  // Date and Time
  doc.setFontSize(12)
  doc.setTextColor(102, 102, 102)
  doc.text(`Date: ${new Date(incident.date).toLocaleDateString()}`, 20, yPos)
  yPos += 7
  doc.text(`Time: ${incident.time}`, 20, yPos)
  yPos += 10

  // Type
  doc.setFontSize(14)
  doc.setTextColor(23, 23, 23)
  doc.text('Incident Type:', 20, yPos)
  yPos += 7
  doc.setFontSize(12)
  doc.setTextColor(238, 46, 47)
  doc.text(incident.type_name, 20, yPos)
  doc.setTextColor(23, 23, 23)
  yPos += 10

  // Employee
  doc.setFontSize(14)
  doc.text('Employee:', 20, yPos)
  yPos += 7
  doc.setFontSize(12)
  doc.text(incident.employee_name, 20, yPos)
  yPos += 10

  // Phone
  if (incident.phone) {
    doc.setFontSize(14)
    doc.text('Phone:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    doc.text(incident.phone, 20, yPos)
    yPos += 10
  }

  // Reporter
  doc.setFontSize(14)
  doc.text('Reporter:', 20, yPos)
  yPos += 7
  doc.setFontSize(12)
  doc.text(incident.reporter_name, 20, yPos)
  yPos += 10

  // Location
  if (incident.location) {
    doc.setFontSize(14)
    doc.text('Location:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    const locationLines = doc.splitTextToSize(incident.location, 170)
    doc.text(locationLines, 20, yPos)
    yPos += (locationLines.length * 7) + 5
  }

  // Project
  if (incident.project) {
    doc.setFontSize(14)
    doc.text('Project:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    doc.text(incident.project.name, 20, yPos)
    yPos += 10
  }

  // Details
  if (yPos > 200) {
    doc.addPage()
    yPos = 20
  }
  doc.setFontSize(14)
  doc.text('Details:', 20, yPos)
  yPos += 7
  doc.setFontSize(12)
  const detailsLines = doc.splitTextToSize(incident.details, 170)
  detailsLines.forEach(line => {
    if (yPos > 270) {
      doc.addPage()
      yPos = 20
    }
    doc.text(line, 20, yPos)
    yPos += 7
  })
  yPos += 5

  // Notes
  if (incident.notes) {
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    doc.setFontSize(14)
    doc.text('Additional Notes:', 20, yPos)
    yPos += 7
    doc.setFontSize(12)
    const notesLines = doc.splitTextToSize(incident.notes, 170)
    notesLines.forEach(line => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.text(line, 20, yPos)
      yPos += 7
    })
    yPos += 5
  }

  // Photo
  if (incident.photo_url) {
    if (yPos > 150) {
      doc.addPage()
      yPos = 20
    }
    try {
      const img = await loadImage(incident.photo_url)
      doc.setFontSize(14)
      doc.text('Photo:', 20, yPos)
      yPos += 10
      
      const imgWidth = 170
      const imgHeight = (img.height * imgWidth) / img.width
      doc.addImage(img, 'JPEG', 20, yPos, imgWidth, imgHeight)
      yPos += imgHeight + 10
    } catch (error) {
      console.error('Error loading photo:', error)
    }
  }

  // Signature
  if (incident.signature_url) {
    if (yPos > 220) {
      doc.addPage()
      yPos = 20
    }
    try {
      const img = await loadImage(incident.signature_url)
      doc.setFontSize(14)
      doc.text('Signature:', 20, yPos)
      yPos += 10
      doc.addImage(img, 'PNG', 20, yPos, 80, 40)
    } catch (error) {
      console.error('Error loading signature:', error)
    }
  }

  // Save
  doc.save(`incident-${incident.type_name.replace(/\s+/g, '-')}-${new Date(incident.date).toISOString().split('T')[0]}.pdf`)
}

// Helper function to load images
const loadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}
