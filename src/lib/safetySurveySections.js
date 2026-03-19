const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

export const PREDEFINED_SAFETY_SURVEY_CATEGORIES = [
  { key: 'safety-railings', label: 'Safety railings' },
  { key: 'fall-protection', label: 'Fall protection' },
  { key: 'housekeeping', label: 'Housekeeping' },
  { key: 'ppe', label: 'PPE' },
  { key: 'ladders', label: 'Ladders' },
  { key: 'scaffolding', label: 'Scaffolding' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'access-egress', label: 'Access / egress' },
  { key: 'material-storage', label: 'Material storage' },
  { key: 'signage', label: 'Signage / traffic control' },
]

const buildClientId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const sortByDisplayOrder = (left, right) => {
  const displayOrderDelta = (left?.display_order ?? 0) - (right?.display_order ?? 0)
  if (displayOrderDelta !== 0) return displayOrderDelta
  return normalizeText(left?.category_label).localeCompare(normalizeText(right?.category_label))
}

export const createEmptySafetySurveySection = (overrides = {}) => ({
  id: overrides.id || null,
  client_id: overrides.client_id || buildClientId(),
  category_key: overrides.category_key || '',
  category_label: overrides.category_label || '',
  category_source: overrides.category_source || 'predefined',
  notes: overrides.notes || '',
  display_order: overrides.display_order ?? 0,
  photos: Array.isArray(overrides.photos) ? overrides.photos : [],
  pendingPhotos: Array.isArray(overrides.pendingPhotos) ? overrides.pendingPhotos : [],
})

export const getAvailableSafetySurveyCategoryOptions = (sections = [], currentSectionId = null) => {
  const selectedKeys = new Set(
    sections
      .filter(section => section.client_id !== currentSectionId)
      .map(section => normalizeText(section.category_key))
      .filter(Boolean),
  )

  return PREDEFINED_SAFETY_SURVEY_CATEGORIES.filter(category => !selectedKeys.has(category.key))
}

export const normalizeSafetySurveySections = (survey) => {
  const rawSections = Array.isArray(survey?.safety_survey_sections)
    ? [...survey.safety_survey_sections].sort(sortByDisplayOrder)
    : Array.isArray(survey?.sections)
      ? [...survey.sections].sort(sortByDisplayOrder)
      : []

  const allPhotos = Array.isArray(survey?.safety_survey_photos)
    ? survey.safety_survey_photos.filter(photo => photo?.photo_url)
    : []

  return rawSections.map((section, index) => createEmptySafetySurveySection({
    ...section,
    display_order: section?.display_order ?? index,
    photos: Array.isArray(section?.photos)
      ? section.photos.filter(photo => photo?.photo_url)
      : allPhotos
        .filter(photo => photo?.survey_section_id && photo.survey_section_id === section.id)
        .sort((left, right) => (left.display_order ?? 0) - (right.display_order ?? 0)),
  }))
}

export const buildSafetySurveySectionSearchText = (survey) => {
  const sections = normalizeSafetySurveySections(survey)
  return sections
    .flatMap(section => [section.category_label, section.notes])
    .map(normalizeText)
    .filter(Boolean)
    .join(' ')
}