export const MAX_INCIDENT_PHOTOS = 25

export const normalizeIncidentPhotos = (incident) => {
  const relatedPhotos = Array.isArray(incident?.incident_photos)
    ? incident.incident_photos
      .filter(photo => photo?.photo_url)
      .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
    : []

  if (relatedPhotos.length > 0) {
    return relatedPhotos
  }

  return incident?.photo_url
    ? [{ id: `legacy-${incident.id || 'incident'}`, photo_url: incident.photo_url, display_order: 0 }]
    : []
}

export const getIncidentPhotoCount = (incident) => normalizeIncidentPhotos(incident).length