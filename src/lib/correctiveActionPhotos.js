export const MAX_CORRECTIVE_ACTION_PHOTOS = 25

export const normalizeCorrectiveActionPhotos = (action) => {
  const relatedPhotos = Array.isArray(action?.corrective_action_photos)
    ? action.corrective_action_photos
      .filter(photo => photo?.photo_url)
      .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
    : []

  if (relatedPhotos.length > 0) {
    return relatedPhotos
  }

  return []
}

export const getCorrectiveActionPhotoCount = (action) => normalizeCorrectiveActionPhotos(action).length