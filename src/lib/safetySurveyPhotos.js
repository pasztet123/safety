export const MAX_SAFETY_SURVEY_PHOTOS = 25

export const normalizeSafetySurveyPhotos = (survey, options = {}) => {
  const { sectionId = null, includeSectionPhotos = false } = options
  const relatedPhotos = Array.isArray(survey?.safety_survey_photos)
    ? survey.safety_survey_photos
      .filter((photo) => {
        if (!photo?.photo_url) return false
        if (includeSectionPhotos) return true
        if (sectionId) return photo.survey_section_id === sectionId
        return !photo.survey_section_id
      })
      .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0))
    : []

  return relatedPhotos
}

export const getSafetySurveyPhotoCount = (survey, options = {}) => normalizeSafetySurveyPhotos(survey, options).length