import { resolveMostRecentSignatureUrl } from './personProfiles'
import { buildResponsiblePersonOptions, resolveResponsiblePersonId } from './responsiblePeople'
import {
  buildSafetySurveySectionSearchText,
  normalizeSafetySurveySections,
} from './safetySurveySections'
import { fetchAllPages, supabase } from './supabase'
import { normalizeSafetySurveyPhotos } from './safetySurveyPhotos'

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '')

export const createEmptySafetySurveyForm = () => ({
  project_id: '',
  survey_date: '',
  survey_time: '',
  project_address: '',
  responsible_person_selection: '',
  responsible_person_id: '',
  responsible_person_name: '',
  survey_title: '',
  location: '',
  latitude: null,
  longitude: null,
  survey_notes: '',
  hazards_observed: '',
  recommendations: '',
  sections: [],
  compliance_documented: false,
  compliance_follow_up_required: false,
})

export const getResponsiblePersonDefaultSignature = ({ selectedValue, involvedPersons = [], leaders = [] }) => {
  if (!selectedValue) return null

  const option = String(selectedValue)
  const involvedPerson = involvedPersons.find(person => person.id === option)
  if (involvedPerson) {
    const linkedLeader = leaders.find(leader => leader.id === involvedPerson.leader_id)
    return resolveMostRecentSignatureUrl([involvedPerson, linkedLeader])
  }

  const leaderId = option.startsWith('leader:') ? option.slice('leader:'.length) : option
  const leader = leaders.find(person => person.id === leaderId)
  return resolveMostRecentSignatureUrl([leader])
}

export const fetchSafetySurveyLookups = async () => {
  const [projectsRes, involvedRes, leadersRes] = await Promise.all([
    supabase.from('projects').select('id, name, job_address').order('name'),
    supabase.from('involved_persons').select('id, name, leader_id, default_signature_url').order('name'),
    supabase.from('leaders').select('id, name, default_signature_url').order('name'),
  ])

  return {
    projects: projectsRes.data || [],
    involvedPersons: involvedRes.data || [],
    leaders: leadersRes.data || [],
    responsiblePersonOptions: buildResponsiblePersonOptions({
      involvedPersons: involvedRes.data || [],
      leaders: leadersRes.data || [],
    }),
  }
}

export const fetchSafetySurveyById = async (id) => {
  if (!id) return null

  const { data, error } = await supabase
    .from('safety_surveys')
    .select(`
      *,
      project:projects(id, name, job_address),
      safety_survey_photos(id, photo_url, display_order, survey_section_id),
      safety_survey_sections(id, category_key, category_label, category_source, notes, display_order)
    `)
    .is('deleted_at', null)
    .eq('id', id)
    .single()

  if (error) throw error

  return {
    ...data,
    photos: normalizeSafetySurveyPhotos(data),
    sections: normalizeSafetySurveySections(data),
  }
}

export const fetchSafetySurveyHistory = async (id) => {
  if (!id) return []

  const { data, error } = await supabase
    .from('safety_survey_history')
    .select('*')
    .eq('safety_survey_id', id)
    .order('changed_at', { ascending: false })

  if (error) return []
  return data || []
}

export const fetchSafetySurveyResponsiblePeople = async () => {
  const rows = await fetchAllPages(() => supabase
    .from('safety_surveys')
    .select('responsible_person_name')
    .is('deleted_at', null))

  return [...new Set(rows.map(row => normalizeText(row.responsible_person_name)).filter(Boolean))]
}

export const getSafetySurveySearchIndex = (survey) => [
  survey?.survey_title,
  survey?.project?.name,
  survey?.project_address,
  survey?.responsible_person_name,
  survey?.survey_notes,
  survey?.hazards_observed,
  survey?.recommendations,
  buildSafetySurveySectionSearchText(survey),
].map(normalizeText).filter(Boolean).join(' ')

export const resolveSafetySurveyResponsiblePerson = async ({
  selectedValue,
  involvedPersons,
  leaders,
}) => {
  const result = await resolveResponsiblePersonId({
    selectedValue,
    involvedPersons,
    leaders,
    supabase,
  })

  const label = involvedPersons.find(person => person.id === result.responsiblePersonId)?.name
    || leaders.find(person => `leader:${person.id}` === selectedValue)?.name
    || ''

  return {
    ...result,
    responsiblePersonName: label,
  }
}