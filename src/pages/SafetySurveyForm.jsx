import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import SignaturePad from '../components/SignaturePad'
import { JurisdictionWarningNotice, LegalClauseNotice } from '../components/LegalNotice'
import { getCurrentDateInputValue, getCurrentTimeInputValue } from '../lib/dateTime'
import { SAFETY_SURVEY_JURISDICTION_WARNING_MESSAGE, describeSystemDateTimeMismatch, getSystemDateTimeMismatchDetails } from '../lib/legal'
import {
  createEmptySafetySurveySection,
  getAvailableSafetySurveyCategoryOptions,
  PREDEFINED_SAFETY_SURVEY_CATEGORIES,
} from '../lib/safetySurveySections'
import { supabase } from '../lib/supabase'
import {
  createEmptySafetySurveyForm,
  fetchSafetySurveyById,
  fetchSafetySurveyLookups,
  getResponsiblePersonDefaultSignature,
  resolveSafetySurveyResponsiblePerson,
} from '../lib/safetySurveys'
import { MAX_SAFETY_SURVEY_PHOTOS } from '../lib/safetySurveyPhotos'
import './IncidentForm.css'
import './SafetySurveys.css'

const CUSTOM_CATEGORY_VALUE = '__custom__'

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

const buildUploadFileName = (prefix, index, fileName = '') => {
  const extension = normalizeText(fileName.split('.').pop()) || 'jpg'
  return `${prefix}-${Date.now()}-${index}.${extension}`
}

const getSectionCategoryErrorKey = (clientId) => `section-category-${clientId}`
const getSectionLabelErrorKey = (clientId) => `section-label-${clientId}`

export default function SafetySurveyForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef(null)

  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [leaders, setLeaders] = useState([])
  const [responsiblePersonOptions, setResponsiblePersonOptions] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])
  const [photos, setPhotos] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
  const [showSignaturePanel, setShowSignaturePanel] = useState(false)
  const [chosenDefaultSigUrl, setChosenDefaultSigUrl] = useState(null)
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)
  const [existingSignatureUrl, setExistingSignatureUrl] = useState(null)
  const [removeExistingSig, setRemoveExistingSig] = useState(false)
  const [formData, setFormData] = useState(() => ({
    ...createEmptySafetySurveyForm(),
    survey_date: getCurrentDateInputValue(),
    survey_time: getCurrentTimeInputValue(),
  }))

  const selectedProject = useMemo(
    () => projects.find(project => project.id === formData.project_id) || null,
    [projects, formData.project_id],
  )

  const totalPhotoCount = useMemo(() => {
    const sectionPhotoCount = (formData.sections || []).reduce(
      (sum, section) => sum + (section.photos?.length || 0) + (section.pendingPhotos?.length || 0),
      0,
    )

    return existingPhotos.length + photos.length + sectionPhotoCount
  }, [existingPhotos.length, formData.sections, photos.length])

  const surveyDateTimeMismatchDetails = getSystemDateTimeMismatchDetails({
    date: formData.survey_date,
    time: formData.survey_time,
  })
  const showJurisdictionWarning = surveyDateTimeMismatchDetails.length > 0

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
          setIsAdmin(Boolean(data?.is_admin))
        }

        const lookups = await fetchSafetySurveyLookups()
        setProjects(lookups.projects)
        setInvolvedPersons(lookups.involvedPersons)
        setLeaders(lookups.leaders)
        setResponsiblePersonOptions(lookups.responsiblePersonOptions)

        if (id) {
          const survey = await fetchSafetySurveyById(id)
          if (survey) {
            setFormData({
              project_id: survey.project_id || '',
              survey_date: survey.survey_date || getCurrentDateInputValue(),
              survey_time: survey.survey_time || getCurrentTimeInputValue(),
              project_address: survey.project_address || survey.project?.job_address || '',
              responsible_person_selection: survey.responsible_person_id || '',
              responsible_person_id: survey.responsible_person_id || '',
              responsible_person_name: survey.responsible_person_name || '',
              survey_title: survey.survey_title || '',
              location: survey.location || '',
              latitude: survey.latitude ?? null,
              longitude: survey.longitude ?? null,
              survey_notes: survey.survey_notes || '',
              hazards_observed: survey.hazards_observed || '',
              recommendations: survey.recommendations || '',
              sections: survey.sections || [],
              compliance_documented: Boolean(survey.compliance_documented),
              compliance_follow_up_required: Boolean(survey.compliance_follow_up_required),
            })
            setExistingPhotos(survey.photos || [])
            setExistingSignatureUrl(survey.signature_url || null)
            setShowSignaturePanel(Boolean(survey.signature_url))
          }
        }
      } catch (error) {
        console.error('Error loading safety survey form:', error)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [id])

  const setSections = (updater) => {
    setFormData(prev => ({
      ...prev,
      sections: typeof updater === 'function' ? updater(prev.sections || []) : updater,
    }))
  }

  const clearValidationError = (field) => {
    setValidationErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  const getDefaultSignature = (selectedValue) => getResponsiblePersonDefaultSignature({
    selectedValue,
    involvedPersons,
    leaders,
  })

  const handleProjectChange = (projectId) => {
    clearValidationError('project_id')
    const project = projects.find(item => item.id === projectId)
    setFormData(prev => ({
      ...prev,
      project_id: projectId,
      project_address: project?.job_address || '',
      location: prev.location || project?.job_address || '',
    }))
  }

  const handleResponsiblePersonChange = (selectedValue) => {
    clearValidationError('responsible_person_selection')
    clearValidationError('signature')
    const nextSignature = getDefaultSignature(selectedValue)

    setFormData(prev => ({
      ...prev,
      responsible_person_selection: selectedValue,
      responsible_person_name: responsiblePersonOptions.find(option => option.value === selectedValue)?.label || '',
    }))

    if (!manualSigDataUrl && !existingSignatureUrl) {
      setChosenDefaultSigUrl(nextSignature || null)
    }
  }

  const handlePhotoSelection = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const remainingSlots = MAX_SAFETY_SURVEY_PHOTOS - totalPhotoCount

    if (remainingSlots <= 0) {
      event.target.value = ''
      return
    }

    const nextPhotos = selectedFiles.slice(0, remainingSlots).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    setPhotos(prev => [...prev, ...nextPhotos])
    event.target.value = ''
  }

  const handleAddSection = () => {
    const availableCategories = getAvailableSafetySurveyCategoryOptions(formData.sections || [])
    const nextCategory = availableCategories[0] || null

    setSections(prev => ([
      ...prev,
      createEmptySafetySurveySection({
        category_key: nextCategory?.key || '',
        category_label: nextCategory?.label || '',
        category_source: nextCategory ? 'predefined' : 'custom',
        display_order: prev.length,
      }),
    ]))
  }

  const updateSection = (clientId, updater) => {
    setSections(prev => prev.map((section, index) => {
      if (section.client_id !== clientId) {
        return { ...section, display_order: index }
      }

      const nextSection = typeof updater === 'function' ? updater(section, index) : updater
      return { ...nextSection, display_order: index }
    }))
  }

  const handleSectionCategoryChange = (clientId, nextValue) => {
    clearValidationError(getSectionCategoryErrorKey(clientId))
    clearValidationError(getSectionLabelErrorKey(clientId))

    updateSection(clientId, (section) => {
      if (nextValue === CUSTOM_CATEGORY_VALUE) {
        return {
          ...section,
          category_source: 'custom',
          category_key: '',
          category_label: section.category_source === 'custom' ? section.category_label : '',
        }
      }

      const matchedCategory = PREDEFINED_SAFETY_SURVEY_CATEGORIES.find(category => category.key === nextValue)
      return {
        ...section,
        category_source: 'predefined',
        category_key: nextValue,
        category_label: matchedCategory?.label || '',
      }
    })
  }

  const handleSectionCustomLabelChange = (clientId, value) => {
    clearValidationError(getSectionLabelErrorKey(clientId))
    updateSection(clientId, section => ({ ...section, category_label: value }))
  }

  const handleSectionNotesChange = (clientId, value) => {
    updateSection(clientId, section => ({ ...section, notes: value }))
  }

  const handleRemoveSection = (clientId) => {
    clearValidationError(getSectionCategoryErrorKey(clientId))
    clearValidationError(getSectionLabelErrorKey(clientId))
    setSections(prev => prev.filter(section => section.client_id !== clientId).map((section, index) => ({ ...section, display_order: index })))
  }

  const handleSectionPhotoSelection = (clientId, event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const remainingSlots = MAX_SAFETY_SURVEY_PHOTOS - totalPhotoCount

    if (remainingSlots <= 0) {
      event.target.value = ''
      return
    }

    const nextPhotos = selectedFiles.slice(0, remainingSlots).map(file => ({
      file,
      preview: URL.createObjectURL(file),
    }))

    updateSection(clientId, section => ({
      ...section,
      pendingPhotos: [...(section.pendingPhotos || []), ...nextPhotos],
    }))
    event.target.value = ''
  }

  const handleRemoveSectionExistingPhoto = (clientId, indexToRemove) => {
    updateSection(clientId, section => ({
      ...section,
      photos: (section.photos || []).filter((_, index) => index !== indexToRemove),
    }))
  }

  const handleRemoveSectionPendingPhoto = (clientId, indexToRemove) => {
    updateSection(clientId, section => ({
      ...section,
      pendingPhotos: (section.pendingPhotos || []).filter((_, index) => index !== indexToRemove),
    }))
  }

  const validate = () => {
    const errors = {}
    const today = getCurrentDateInputValue()
    const seenPredefinedKeys = new Set()

    if (!formData.project_id) errors.project_id = 'Project is required.'
    if (!formData.survey_date) errors.survey_date = 'Survey date is required.'
    if (!isAdmin && !id && formData.survey_date && formData.survey_date !== today) {
      errors.survey_date = 'New safety surveys must use the current system date.'
    }
    if (!formData.responsible_person_selection) errors.responsible_person_selection = 'Responsible person is required.'

    for (const section of formData.sections || []) {
      if (section.category_source === 'custom') {
        if (!normalizeText(section.category_label)) {
          errors[getSectionLabelErrorKey(section.client_id)] = 'Custom category name is required.'
        }
        continue
      }

      if (!normalizeText(section.category_key)) {
        errors[getSectionCategoryErrorKey(section.client_id)] = 'Select a category.'
        continue
      }

      if (seenPredefinedKeys.has(section.category_key)) {
        errors[getSectionCategoryErrorKey(section.client_id)] = 'This predefined category has already been added.'
        continue
      }

      seenPredefinedKeys.add(section.category_key)
    }

    const hasSignature = Boolean(
      chosenDefaultSigUrl ||
      manualSigDataUrl ||
      (id && existingSignatureUrl && !removeExistingSig),
    )

    if (showSignaturePanel && !hasSignature) {
      errors.signature = 'Add the responsible person signature or turn off digital signature.'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const uploadPendingPhotos = async (pendingPhotos, prefix) => {
    const uploadedRows = []

    for (const [index, photo] of pendingPhotos.entries()) {
      const fileName = buildUploadFileName(prefix, index, photo.file?.name)
      const { error: uploadError } = await supabase.storage.from('safety-photos').upload(fileName, photo.file)
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
      uploadedRows.push({ photo_url: data.publicUrl })
    }

    return uploadedRows
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!validate()) return

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      if (showJurisdictionWarning) {
        const confirmed = confirm(`The selected safety survey ${describeSystemDateTimeMismatch(surveyDateTimeMismatchDetails)} from the current system values. ${SAFETY_SURVEY_JURISDICTION_WARNING_MESSAGE}`)
        if (!confirmed) {
          setLoading(false)
          return
        }
      }

      const { responsiblePersonId, syncedPerson, responsiblePersonName } = await resolveSafetySurveyResponsiblePerson({
        selectedValue: formData.responsible_person_selection,
        involvedPersons,
        leaders,
      })

      if (syncedPerson) {
        setInvolvedPersons(prev => ([...prev.filter(item => item.id !== syncedPerson.id), syncedPerson].sort((left, right) => left.name.localeCompare(right.name))))
      }

      const uploadedPhotoRows = await uploadPendingPhotos(photos, 'safety-survey')
      const uploadedSectionPhotoMap = new Map()
      for (const section of formData.sections || []) {
        const uploadedSectionPhotos = await uploadPendingPhotos(section.pendingPhotos || [], `safety-survey-section-${section.client_id}`)
        uploadedSectionPhotoMap.set(section.client_id, uploadedSectionPhotos)
      }

      let signatureUrl = id ? undefined : null
      if (removeExistingSig) {
        signatureUrl = null
      } else if (chosenDefaultSigUrl) {
        signatureUrl = chosenDefaultSigUrl
      } else if (manualSigDataUrl) {
        const blob = await fetch(manualSigDataUrl).then(response => response.blob())
        const sigName = `safety-survey-signature-${Date.now()}.png`
        const { error: uploadError } = await supabase.storage.from('safety-photos').upload(sigName, blob)
        if (!uploadError) {
          const { data } = supabase.storage.from('safety-photos').getPublicUrl(sigName)
          signatureUrl = data.publicUrl
        }
      }

      const payload = {
        project_id: formData.project_id,
        survey_date: formData.survey_date,
        survey_time: formData.survey_time || null,
        project_address: formData.project_address || selectedProject?.job_address || null,
        responsible_person_id: responsiblePersonId || null,
        responsible_person_name: responsiblePersonName || formData.responsible_person_name || null,
        survey_title: formData.survey_title || null,
        location: formData.location || null,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        survey_notes: formData.survey_notes || null,
        hazards_observed: formData.hazards_observed || null,
        recommendations: formData.recommendations || null,
        compliance_documented: Boolean(formData.compliance_documented),
        compliance_follow_up_required: Boolean(formData.compliance_follow_up_required),
        ...(signatureUrl !== undefined ? { signature_url: signatureUrl } : {}),
      }

      let surveyId = id
      if (id) {
        const { error } = await supabase
          .from('safety_surveys')
          .update({ ...payload, updated_by: user.id })
          .eq('id', id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('safety_surveys')
          .insert([{ ...payload, created_by: user.id, updated_by: user.id }])
          .select()
          .single()

        if (error) throw error
        surveyId = data.id
      }

      const { error: deletePhotoError } = await supabase
        .from('safety_survey_photos')
        .delete()
        .eq('survey_id', surveyId)

      if (deletePhotoError) throw deletePhotoError

      const { error: deleteSectionsError } = await supabase
        .from('safety_survey_sections')
        .delete()
        .eq('survey_id', surveyId)

      if (deleteSectionsError) throw deleteSectionsError

      const sectionIdByClientId = new Map()
      for (const [index, section] of (formData.sections || []).entries()) {
        const matchedCategory = PREDEFINED_SAFETY_SURVEY_CATEGORIES.find(category => category.key === section.category_key)
        const categorySource = section.category_source === 'custom' ? 'custom' : 'predefined'
        const categoryLabel = categorySource === 'custom'
          ? normalizeText(section.category_label)
          : matchedCategory?.label || section.category_label || ''

        const { data, error } = await supabase
          .from('safety_survey_sections')
          .insert([{
            survey_id: surveyId,
            category_key: categorySource === 'predefined' ? section.category_key || null : null,
            category_label: categoryLabel,
            category_source: categorySource,
            notes: normalizeText(section.notes) || null,
            display_order: index,
            created_by: user.id,
            updated_by: user.id,
          }])
          .select('id')
          .single()

        if (error) throw error
        sectionIdByClientId.set(section.client_id, data.id)
      }

      const generalPhotoRows = [
        ...existingPhotos.map(photo => ({ photo_url: photo.photo_url })),
        ...uploadedPhotoRows,
      ].map((photo, index) => ({
        survey_id: surveyId,
        survey_section_id: null,
        photo_url: photo.photo_url,
        display_order: index,
      }))

      const sectionPhotoRows = (formData.sections || []).flatMap((section) => {
        const sectionId = sectionIdByClientId.get(section.client_id)
        if (!sectionId) return []

        const allSectionPhotos = [
          ...(section.photos || []).map(photo => ({ photo_url: photo.photo_url })),
          ...(uploadedSectionPhotoMap.get(section.client_id) || []),
        ]

        return allSectionPhotos.map((photo, index) => ({
          survey_id: surveyId,
          survey_section_id: sectionId,
          photo_url: photo.photo_url,
          display_order: index,
        }))
      })

      const allPhotoRows = [...generalPhotoRows, ...sectionPhotoRows]
      if (allPhotoRows.length > 0) {
        const { error: insertPhotoError } = await supabase
          .from('safety_survey_photos')
          .insert(allPhotoRows)

        if (insertPhotoError) throw insertPhotoError
      }

      navigate(`/safety-surveys/${surveyId}`)
    } catch (error) {
      console.error('Error saving safety survey:', error)
      alert(`Unable to save safety survey: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (loading && id) return <div className="spinner"></div>

  const defaultSignatureUrl = getDefaultSignature(formData.responsible_person_selection)

  return (
    <div className="incident-form safety-surveys-page">
      <div className="if-mode-bar">
        <h2 className="page-title" style={{ margin: 0 }}>{id ? 'Edit Safety Survey' : 'New Safety Survey'}</h2>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h3 className="section-title">Survey Information</h3>

          <div className="if-row-2">
            <div className="form-group">
              <label className="form-label">Project *</label>
              <select className="form-select survey-filter-select" value={formData.project_id} onChange={(event) => handleProjectChange(event.target.value)}>
                <option value="">Select project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
              {validationErrors.project_id && <p className="mf-field-error">{validationErrors.project_id}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input survey-address-input" readOnly value={formData.project_address} placeholder="Address from project" />
            </div>
          </div>

          <div className="if-row-2">
            <div className="form-group">
              <label className="form-label">Survey date *</label>
              <input className={`form-input${!isAdmin && !id ? ' form-input--locked' : ''}`} type="date" value={formData.survey_date} onChange={(event) => {
                clearValidationError('survey_date')
                setFormData(prev => ({ ...prev, survey_date: event.target.value }))
              }} readOnly={!isAdmin && !id} />
              {validationErrors.survey_date && <p className="mf-field-error">{validationErrors.survey_date}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Survey time</label>
              <input className={`form-input${!isAdmin && !id ? ' form-input--locked' : ''}`} type="time" value={formData.survey_time || ''} onChange={(event) => setFormData(prev => ({ ...prev, survey_time: event.target.value }))} readOnly={!isAdmin && !id} />
            </div>
          </div>

          <div className="if-row-2">
            <div className="form-group">
              <label className="form-label">Responsible person *</label>
              <select className="form-select survey-filter-select" value={formData.responsible_person_selection} onChange={(event) => handleResponsiblePersonChange(event.target.value)}>
                <option value="">Select responsible person</option>
                {responsiblePersonOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {validationErrors.responsible_person_selection && <p className="mf-field-error">{validationErrors.responsible_person_selection}</p>}
            </div>

            <div className="form-group">
              <label className="form-label">Survey title</label>
              <input className="form-input" value={formData.survey_title} onChange={(event) => setFormData(prev => ({ ...prev, survey_title: event.target.value }))} placeholder="Optional short summary" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Survey area / address detail</label>
            <input className="form-input" value={formData.location} onChange={(event) => setFormData(prev => ({ ...prev, location: event.target.value }))} placeholder="Specific area within the project address" />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Observations</h3>

          <div className="form-group">
            <label className="form-label">Survey notes</label>
            <textarea className="form-input" rows="5" value={formData.survey_notes} onChange={(event) => setFormData(prev => ({ ...prev, survey_notes: event.target.value }))} placeholder="General notes from the survey" />
          </div>

          <div className="form-group">
            <label className="form-label">Hazards observed</label>
            <textarea className="form-input" rows="5" value={formData.hazards_observed} onChange={(event) => setFormData(prev => ({ ...prev, hazards_observed: event.target.value }))} placeholder="Describe hazards, unsafe conditions, or concerns" />
          </div>

          <div className="form-group">
            <label className="form-label">Recommendations / actions</label>
            <textarea className="form-input" rows="5" value={formData.recommendations} onChange={(event) => setFormData(prev => ({ ...prev, recommendations: event.target.value }))} placeholder="Describe recommendations or required follow-up" />
          </div>
        </div>

        <div className="card">
          <div className="survey-sections-header">
            <div>
              <h3 className="section-title">Categorized Findings</h3>
              <p className="survey-sections-subtitle">Add focused notes and photos under specific safety categories to make hazards easier to review later.</p>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddSection}>+ Add category</button>
          </div>

          {formData.sections.length === 0 ? (
            <div className="survey-sections-empty">No categorized findings added yet.</div>
          ) : (
            <div className="survey-sections-list">
              {formData.sections.map((section) => {
                const categoryError = validationErrors[getSectionCategoryErrorKey(section.client_id)]
                const labelError = validationErrors[getSectionLabelErrorKey(section.client_id)]
                const currentPredefined = PREDEFINED_SAFETY_SURVEY_CATEGORIES.find(category => category.key === section.category_key)
                const availableCategories = getAvailableSafetySurveyCategoryOptions(formData.sections, section.client_id)
                const categoryOptions = currentPredefined
                  ? [currentPredefined, ...availableCategories.filter(category => category.key !== currentPredefined.key)]
                  : availableCategories

                return (
                  <div key={section.client_id} className="survey-section-card">
                    <div className="survey-section-card-header">
                      <div>
                        <div className="survey-section-card-title">{normalizeText(section.category_label) || currentPredefined?.label || 'New category'}</div>
                        <div className="survey-section-card-meta">{section.category_source === 'custom' ? 'Custom category' : 'Predefined category'}</div>
                      </div>
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleRemoveSection(section.client_id)}>Remove</button>
                    </div>

                    <div className="survey-section-grid">
                      <div className="form-group">
                        <label className="form-label">Category</label>
                        <select
                          className="form-select survey-filter-select"
                          value={section.category_source === 'custom' ? CUSTOM_CATEGORY_VALUE : section.category_key}
                          onChange={(event) => handleSectionCategoryChange(section.client_id, event.target.value)}
                        >
                          <option value="">Select category</option>
                          {categoryOptions.map(category => (
                            <option key={category.key} value={category.key}>{category.label}</option>
                          ))}
                          <option value={CUSTOM_CATEGORY_VALUE}>Custom category</option>
                        </select>
                        {categoryError && <p className="mf-field-error">{categoryError}</p>}
                      </div>

                      {section.category_source === 'custom' && (
                        <div className="form-group">
                          <label className="form-label">Custom category name</label>
                          <input className="form-input" value={section.category_label} onChange={(event) => handleSectionCustomLabelChange(section.client_id, event.target.value)} placeholder="Example: Safety railings" />
                          {labelError && <p className="mf-field-error">{labelError}</p>}
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <label className="form-label">Category notes</label>
                      <textarea className="form-input" rows="4" value={section.notes || ''} onChange={(event) => handleSectionNotesChange(section.client_id, event.target.value)} placeholder="Document observations, hazards, and context for this category" />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Category photos</label>
                      <input className="form-input" type="file" accept="image/*" multiple onChange={(event) => handleSectionPhotoSelection(section.client_id, event)} />
                    </div>

                    {(section.photos?.length > 0 || section.pendingPhotos?.length > 0) && (
                      <div className="survey-photo-grid">
                        {(section.photos || []).map((photo, index) => (
                          <div key={photo.id || `${photo.photo_url}-${index}`} className="survey-photo-item">
                            <img src={photo.photo_url} alt={`${section.category_label || 'Category'} photo ${index + 1}`} />
                            <button type="button" className="btn btn-danger btn-sm survey-photo-remove" onClick={() => handleRemoveSectionExistingPhoto(section.client_id, index)}>×</button>
                          </div>
                        ))}
                        {(section.pendingPhotos || []).map((photo, index) => (
                          <div key={photo.preview || index} className="survey-photo-item">
                            <img src={photo.preview} alt={`${section.category_label || 'Category'} upload ${index + 1}`} />
                            <button type="button" className="btn btn-danger btn-sm survey-photo-remove" onClick={() => handleRemoveSectionPendingPhoto(section.client_id, index)}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">General Photos</h3>

          <div className="form-group">
            <label className="form-label">Add general photos ({totalPhotoCount}/{MAX_SAFETY_SURVEY_PHOTOS})</label>
            <input className="form-input" type="file" accept="image/*" multiple onChange={handlePhotoSelection} />
          </div>

          {(existingPhotos.length > 0 || photos.length > 0) && (
            <div className="survey-photo-grid">
              {existingPhotos.map((photo, index) => (
                <div key={photo.id || photo.photo_url} className="survey-photo-item">
                  <img src={photo.photo_url} alt={`Existing survey photo ${index + 1}`} />
                  <button type="button" className="btn btn-danger btn-sm survey-photo-remove" onClick={() => setExistingPhotos(prev => prev.filter((_, photoIndex) => photoIndex !== index))}>×</button>
                </div>
              ))}
              {photos.map((photo, index) => (
                <div key={photo.preview || index} className="survey-photo-item">
                  <img src={photo.preview} alt={`Survey photo ${index + 1}`} />
                  <button type="button" className="btn btn-danger btn-sm survey-photo-remove" onClick={() => setPhotos(prev => prev.filter((_, photoIndex) => photoIndex !== index))}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={`mf-verification${validationErrors.signature ? ' mf-field--invalid' : ''}`}>
          <h4 className="mf-verify-title">Compliance & Sign-off</h4>
          {showJurisdictionWarning && (
            <JurisdictionWarningNotice className="mf-legal-note">
              The selected safety survey {describeSystemDateTimeMismatch(surveyDateTimeMismatchDetails)} from the current system values. {SAFETY_SURVEY_JURISDICTION_WARNING_MESSAGE}
            </JurisdictionWarningNotice>
          )}
          <LegalClauseNotice className="mf-legal-note" />
          <label className="mf-verify-item">
            <input type="checkbox" checked={formData.compliance_documented} onChange={(event) => setFormData(prev => ({ ...prev, compliance_documented: event.target.checked }))} />
            <span>Responsible person confirms this safety survey is complete</span>
          </label>
          <label className="mf-verify-item">
            <input type="checkbox" checked={formData.compliance_follow_up_required} onChange={(event) => setFormData(prev => ({ ...prev, compliance_follow_up_required: event.target.checked }))} />
            <span>Hazards requiring follow-up have been documented</span>
          </label>
          <label className="mf-verify-item">
            <input type="checkbox" checked={showSignaturePanel} onChange={(event) => {
              clearValidationError('signature')
              setShowSignaturePanel(event.target.checked)
              if (!event.target.checked) {
                setChosenDefaultSigUrl(null)
                setManualSigDataUrl(null)
                setRemoveExistingSig(false)
              } else if (defaultSignatureUrl && !manualSigDataUrl && !existingSignatureUrl) {
                setChosenDefaultSigUrl(defaultSignatureUrl)
              }
            }} />
            <span>Add responsible person signature</span>
          </label>
          {validationErrors.signature && <p className="mf-field-error">{validationErrors.signature}</p>}

          {showSignaturePanel && (
            <div className="mf-attendee-sig">
              {id && existingSignatureUrl && !removeExistingSig && !chosenDefaultSigUrl && !manualSigDataUrl && (
                <>
                  <img src={existingSignatureUrl} alt="Existing signature" className="mf-sig-img survey-signature-preview" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                    clearValidationError('signature')
                    setRemoveExistingSig(true)
                    if (defaultSignatureUrl) setChosenDefaultSigUrl(defaultSignatureUrl)
                  }}>Remove existing signature</button>
                </>
              )}

              {defaultSignatureUrl && (
                <label className="mf-inline-check" style={{ marginBottom: 8 }}>
                  <input type="checkbox" checked={Boolean(chosenDefaultSigUrl)} onChange={(event) => {
                    clearValidationError('signature')
                    if (event.target.checked) {
                      setChosenDefaultSigUrl(defaultSignatureUrl)
                      setManualSigDataUrl(null)
                      setRemoveExistingSig(false)
                    } else {
                      setChosenDefaultSigUrl(null)
                    }
                  }} />
                  Use default signature
                </label>
              )}

              {chosenDefaultSigUrl ? (
                <img src={chosenDefaultSigUrl} alt="Default signature" className="mf-sig-img survey-signature-preview" />
              ) : (
                <>
                  <SignaturePad
                    ref={signatureRef}
                    className="signature-canvas"
                    height={160}
                    onEnd={() => {
                      clearValidationError('signature')
                      if (signatureRef.current) {
                        setManualSigDataUrl(signatureRef.current.toDataURL())
                        setRemoveExistingSig(false)
                      }
                    }}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => {
                    signatureRef.current?.clear()
                    setManualSigDataUrl(null)
                  }}>Clear</button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(id ? `/safety-surveys/${id}` : '/safety-surveys')}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving…' : (id ? 'Save changes' : 'Create survey')}</button>
        </div>
      </form>
    </div>
  )
}