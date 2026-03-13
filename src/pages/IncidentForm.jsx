import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { LegalClauseNotice } from '../components/LegalNotice'
import SignaturePad from '../components/SignaturePad'
import MapPicker from '../components/MapPicker'
import { SAFETY_VIOLATION_OPTIONS, DISCIPLINARY_ACTION_TYPES, createEmptyDisciplinaryAction } from '../lib/disciplinary'
import { MAX_CORRECTIVE_ACTION_PHOTOS, normalizeCorrectiveActionPhotos } from '../lib/correctiveActionPhotos'
import { buildCompletionStatusFields, getDeclaredCompletionDate, getTodayDateString } from '../lib/correctiveActionDates'
import { MAX_INCIDENT_PHOTOS, normalizeIncidentPhotos } from '../lib/incidentPhotos'
import { buildResponsiblePersonOptions, mergeResponsiblePerson, resolveResponsiblePersonId } from '../lib/responsiblePeople'
import './IncidentForm.css'

const SEVERITY_OPTIONS = [
  { value: 'low',        label: 'Low',        color: '#16a34a', bg: '#dcfce7', border: '#86efac' },
  { value: 'recordable', label: 'Recordable',  color: '#ca8a04', bg: '#fef9c3', border: '#fde047' },
  { value: 'lost_time',  label: 'Lost Time',   color: '#d97706', bg: '#ffedd5', border: '#fdba74' },
  { value: 'critical',   label: 'Critical',    color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' },
]

const INCIDENT_TYPE_OPTIONS = [
  'Accident (injury)', 'Near miss', 'Unsafe condition', 'Property damage', 'Safety violation',
]

const INCIDENT_SUBTYPES = {
  'Accident (injury)': [
    { value: 'laceration', label: 'Laceration (cut)' },
    { value: 'fracture', label: 'Fracture (broken bone)' },
    { value: 'sprain', label: 'Sprain' },
    { value: 'strain', label: 'Strain' },
    { value: 'burn', label: 'Burn' },
    { value: 'contusion', label: 'Contusion (bruise)' },
    { value: 'puncture', label: 'Puncture' },
    { value: 'electrical_injury', label: 'Electrical injury' },
    { value: 'eye_injury', label: 'Eye injury' },
    { value: 'head_injury', label: 'Head injury' },
    { value: 'back_injury', label: 'Back injury' },
    { value: 'amputation', label: 'Amputation' },
    { value: 'other', label: 'Other' },
  ],
  'Near miss': [
    // Fall/slip related
    { value: 'slip', label: 'Slip', category: 'Fall/Slip Related' },
    { value: 'trip', label: 'Trip', category: 'Fall/Slip Related' },
    { value: 'fall_same_level', label: 'Fall (same level)', category: 'Fall/Slip Related' },
    { value: 'fall_from_height', label: 'Fall from height', category: 'Fall/Slip Related' },
    // Struck by object
    { value: 'falling_object', label: 'Falling object', category: 'Struck by Object' },
    { value: 'flying_object', label: 'Flying object', category: 'Struck by Object' },
    { value: 'moving_equipment', label: 'Moving equipment', category: 'Struck by Object' },
    // Tool related
    { value: 'hand_tool', label: 'Hand tool', category: 'Tool Related' },
    { value: 'power_tool', label: 'Power tool', category: 'Tool Related' },
    { value: 'machinery', label: 'Machinery', category: 'Tool Related' },
    // Electrical
    { value: 'electric_shock', label: 'Electric shock', category: 'Electrical' },
    { value: 'exposed_wire', label: 'Exposed wire', category: 'Electrical' },
    // Structural/environment
    { value: 'sharp_edge', label: 'Sharp edge', category: 'Structural/Environment' },
    { value: 'unprotected_edge', label: 'Unprotected edge', category: 'Structural/Environment' },
    { value: 'unstable_surface', label: 'Unstable surface', category: 'Structural/Environment' },
    // PPE related
    { value: 'missing_ppe', label: 'Missing PPE', category: 'PPE Related' },
    { value: 'improper_ppe', label: 'Improper PPE', category: 'PPE Related' },
  ],
  'Unsafe condition': [
    // Same as near miss
    { value: 'slip', label: 'Slip', category: 'Fall/Slip Related' },
    { value: 'trip', label: 'Trip', category: 'Fall/Slip Related' },
    { value: 'fall_same_level', label: 'Fall (same level)', category: 'Fall/Slip Related' },
    { value: 'fall_from_height', label: 'Fall from height', category: 'Fall/Slip Related' },
    { value: 'falling_object', label: 'Falling object', category: 'Struck by Object' },
    { value: 'flying_object', label: 'Flying object', category: 'Struck by Object' },
    { value: 'moving_equipment', label: 'Moving equipment', category: 'Struck by Object' },
    { value: 'hand_tool', label: 'Hand tool', category: 'Tool Related' },
    { value: 'power_tool', label: 'Power tool', category: 'Tool Related' },
    { value: 'machinery', label: 'Machinery', category: 'Tool Related' },
    { value: 'electric_shock', label: 'Electric shock', category: 'Electrical' },
    { value: 'exposed_wire', label: 'Exposed wire', category: 'Electrical' },
    { value: 'sharp_edge', label: 'Sharp edge', category: 'Structural/Environment' },
    { value: 'unprotected_edge', label: 'Unprotected edge', category: 'Structural/Environment' },
    { value: 'unstable_surface', label: 'Unstable surface', category: 'Structural/Environment' },
    { value: 'missing_ppe', label: 'Missing PPE', category: 'PPE Related' },
    { value: 'improper_ppe', label: 'Improper PPE', category: 'PPE Related' },
  ],
}

const BODY_PARTS = [
  'Head','Face','Eye(s)','Ear(s)','Neck','Shoulder','Arm','Elbow',
  'Wrist','Hand','Finger(s)','Back','Chest','Abdomen','Hip',
  'Knee','Leg','Ankle','Foot','Toe(s)','Multiple','Other',
]

const MEDICAL_TREATMENT = [
  { value: 'none', label: 'No treatment needed' },
  { value: 'first_aid', label: 'First aid only' },
  { value: 'medical', label: 'Medical treatment (doctor)' },
  { value: 'emergency', label: 'Emergency / hospitalization' },
]

const createEmptyCorrectiveAction = () => ({
  description: '',
  responsible_person_id: '',
  declared_created_date: getTodayDateString(),
  declared_completion_date: '',
  due_date: '',
  status: 'open',
  completion_date: null,
  photos: [],
})

const normalizeCorrectiveActionForState = (action) => ({
  ...action,
  photos: normalizeCorrectiveActionPhotos(action),
})

export default function IncidentForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef()

  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState([])
  const [incidentTypes, setIncidentTypes] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [leaders, setLeaders] = useState([])
  const [predefinedActions, setPredefinedActions] = useState([])
  const [reporterDefaultSignature, setReporterDefaultSignature] = useState(null)
  const [chosenDefaultSigUrl, setChosenDefaultSigUrl] = useState(null)
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)
  const [existingSignatureUrl, setExistingSignatureUrl] = useState(null)
  const [removeExistingSig, setRemoveExistingSig] = useState(false)

  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    latitude: null,
    longitude: null,
    type_name: '',
    incident_type_id: '',
    incident_subtype: '',
    safety_violation_type: '',
    severity: '',
    employee_name: '',
    phone: '',
    reporter_name: '',
    details: '',
    immediate_cause: '',
    contributing_factors: '',
    notes: '',
    anyone_injured: false,
    body_part: '',
    medical_treatment: '',
    hospitalized: false,
    days_away_from_work: '',
    estimated_property_cost: '',
    equipment_involved: '',
    osha_recordable: false,
    root_cause: '',
    report_mode: 'full',
  })

  const [reportMode, setReportMode] = useState('full')
  const [showAddAction, setShowAddAction] = useState(false)
  const [confirmedAccurate, setConfirmedAccurate] = useState(false)
  const [confirmedHazards, setConfirmedHazards] = useState(false)
  const [showSignaturePanel, setShowSignaturePanel] = useState(false)
  const [showPropertyDamage, setShowPropertyDamage] = useState(false)

  const [photos, setPhotos] = useState([])
  const [existingPhotos, setExistingPhotos] = useState([])

  const [witnesses, setWitnesses] = useState([])
  const [witnessSearch, setWitnessSearch] = useState('')
  const [witnessDropdownOpen, setWitnessDropdownOpen] = useState(false)

  const [correctiveActions, setCorrectiveActions] = useState([])
  const [newAction, setNewAction] = useState(createEmptyCorrectiveAction())
  const [deletedActionIds, setDeletedActionIds] = useState([])
  const [disciplinaryActions, setDisciplinaryActions] = useState([])
  const [newDisciplinaryAction, setNewDisciplinaryAction] = useState(createEmptyDisciplinaryAction())
  const [showAddDisciplinaryAction, setShowAddDisciplinaryAction] = useState(false)
  const responsiblePersonOptions = buildResponsiblePersonOptions({ involvedPersons, leaders })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
        setIsAdmin(data?.is_admin || false)
      }
      fetchProjects()
      fetchIncidentTypes()
      fetchInvolvedPersons()
      fetchLeaders()
      fetchPredefinedActions()
      if (id) fetchIncident()
      else autoGps()
    }
    init()
  }, [id])

  const autoGps = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
        const d = await r.json()
        setFormData(prev => ({ ...prev, location: d.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}` }))
      } catch {}
    })
  }

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name').eq('status', 'active').order('name')
    if (data) setProjects(data)
  }

  const fetchIncidentTypes = async () => {
    const { data } = await supabase.from('incident_types').select('*').order('name')
    if (data) setIncidentTypes(data)
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase.from('involved_persons').select('id, name, default_signature_url, leader_id').order('name')
    if (data) setInvolvedPersons(data)
  }

  const getResponsiblePersonLabel = (value) => {
    if (!value) return ''

    return involvedPersons.find(person => person.id === value)?.name
      || responsiblePersonOptions.find(option => option.value === value)?.label
      || ''
  }

  const fetchLeaders = async () => {
    const { data } = await supabase.from('leaders').select('id, name, default_signature_url').order('name')
    if (data) setLeaders(data)
  }

  const getReporterDefaultSignature = (name) => {
    if (!name) return null

    const allPeople = [
      ...leaders.map(l => ({ name: l.name, default_signature_url: l.default_signature_url })),
      ...involvedPersons.map(p => ({ name: p.name, default_signature_url: p.default_signature_url })),
    ]

    return allPeople.find(person => person.name === name)?.default_signature_url || null
  }

  const handleReporterSelect = (name) => {
    setFormData(prev => ({ ...prev, reporter_name: name }))
    setReporterDefaultSignature(getReporterDefaultSignature(name))
    setChosenDefaultSigUrl(null)
    setManualSigDataUrl(null)
  }

  const fetchPredefinedActions = async () => {
    const { data } = await supabase.from('predefined_corrective_actions').select('*').order('category').order('description')
    if (data) setPredefinedActions(data)
  }

  const fetchIncident = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('incidents')
      .select('*, incident_photos(id, photo_url, display_order)')
      .is('deleted_at', null)
      .eq('id', id)
      .single()
    if (!error && data) {
      setFormData({
        project_id: data.project_id || '',
        date: data.date?.split('T')[0] || '',
        time: data.time || '',
        location: data.location || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        type_name: data.type_name || '',
        incident_type_id: data.incident_type_id || '',
        incident_subtype: data.incident_subtype || '',
        safety_violation_type: data.safety_violation_type || '',
        severity: data.severity || '',
        employee_name: data.employee_name || '',
        phone: data.phone || '',
        reporter_name: data.reporter_name || '',
        details: data.details || '',
        immediate_cause: data.immediate_cause || '',
        contributing_factors: data.contributing_factors || '',
        notes: data.notes || '',
        anyone_injured: data.anyone_injured || false,
        body_part: data.body_part || '',
        medical_treatment: data.medical_treatment || '',
        hospitalized: data.hospitalized || false,
        days_away_from_work: data.days_away_from_work || '',
        estimated_property_cost: data.estimated_property_cost || '',
        equipment_involved: data.equipment_involved || '',
        osha_recordable: data.osha_recordable || false,
        root_cause: data.root_cause || '',
        report_mode: data.report_mode || 'full',
      })
      setReportMode(data.report_mode || 'full')
      setExistingPhotos(normalizeIncidentPhotos(data))
      setPhotos([])
      if (data.signature_url) {
        setExistingSignatureUrl(data.signature_url)
        setShowSignaturePanel(true)
      }
      const { data: acts } = await supabase
        .from('corrective_actions')
        .select('*, corrective_action_photos(id, photo_url, display_order)')
        .eq('incident_id', id)
      if (acts) setCorrectiveActions(acts.map(normalizeCorrectiveActionForState))
      const { data: disciplinary } = await supabase
        .from('disciplinary_actions')
        .select('*')
        .eq('incident_id', id)
        .order('action_date', { ascending: false })
        .order('action_time', { ascending: false })
      if (disciplinary) setDisciplinaryActions(disciplinary)
      setDeletedActionIds([])
      const { data: wits } = await supabase.from('incident_witnesses').select('*').eq('incident_id', id)
      if (wits) setWitnesses(wits.map(w => ({ id: w.id, person_id: w.person_id, name: w.name })))
    }
    setLoading(false)
  }

  // Keep the reporter's default signature in sync regardless of whether the
  // incident record or the people lists finish loading first.
  useEffect(() => {
    setReporterDefaultSignature(getReporterDefaultSignature(formData.reporter_name))
  }, [formData.reporter_name, leaders, involvedPersons])

  const handleTypeSelect = (typeName) => {
    const dbType = incidentTypes.find(t => t.name === typeName)
    const injured = typeName === 'Accident (injury)'
    setFormData(prev => ({
      ...prev,
      type_name: typeName,
      incident_type_id: dbType?.id || '',
      incident_subtype: '',
      safety_violation_type: typeName === 'Safety violation' ? prev.safety_violation_type : '',
      anyone_injured: injured,
    }))
    if (typeName !== 'Safety violation') {
      setDisciplinaryActions([])
      setShowAddDisciplinaryAction(false)
      setNewDisciplinaryAction(createEmptyDisciplinaryAction())
    }
  }

  const handleGps = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
        const d = await r.json()
        setFormData(prev => ({ ...prev, location: d.display_name || `${pos.coords.latitude}, ${pos.coords.longitude}` }))
      } catch {}
    })
  }

  const handlePhotoAdd = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    const remainingSlots = MAX_INCIDENT_PHOTOS - existingPhotos.length - photos.length

    if (remainingSlots <= 0) {
      alert(`You can attach up to ${MAX_INCIDENT_PHOTOS} photos to one incident.`)
      e.target.value = ''
      return
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    if (filesToAdd.length < selectedFiles.length) {
      alert(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added. The limit is ${MAX_INCIDENT_PHOTOS}.`)
    }

    filesToAdd.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => setPhotos(prev => [...prev, { file, preview: reader.result }])
      reader.readAsDataURL(file)
    })

    e.target.value = ''
  }

  const filteredWitnessOptions = involvedPersons.filter(p =>
    !witnesses.some(w => w.person_id === p.id) &&
    p.name.toLowerCase().includes(witnessSearch.toLowerCase())
  )

  const addWitness = (person) => {
    if (witnesses.some(w => w.person_id === person.id)) return
    setWitnesses(prev => [...prev, { person_id: person.id, name: person.name }])
    setWitnessSearch('')
    setWitnessDropdownOpen(false)
  }

  const addWitnessCustom = () => {
    const name = witnessSearch.trim()
    if (!name) return
    setWitnesses(prev => [...prev, { person_id: null, name }])
    setWitnessSearch('')
    setWitnessDropdownOpen(false)
  }

  const removeWitness = (idx) => setWitnesses(prev => prev.filter((_, i) => i !== idx))

  const addAction = () => {
    if (!newAction.description.trim()) return
    setCorrectiveActions(prev => [...prev, { ...newAction, isNew: true }])
    setNewAction(createEmptyCorrectiveAction())
    setShowAddAction(false)
  }

  const updateAction = (idx, field, val) => {
    setCorrectiveActions(prev => prev.map((action, actionIndex) => {
      if (actionIndex !== idx) return action

      if (field !== 'status') {
        return { ...action, [field]: val }
      }

      if (val === 'completed') {
        return {
          ...action,
          status: val,
          declared_completion_date: action.declared_completion_date || getDeclaredCompletionDate(action) || getTodayDateString(),
        }
      }

      return {
        ...action,
        status: val,
        declared_completion_date: '',
        completion_date: null,
      }
    }))
  }

  const handleCorrectiveActionPhotoAdd = (target, event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const currentPhotos = target === 'new'
      ? newAction.photos || []
      : correctiveActions[target]?.photos || []
    const remainingSlots = MAX_CORRECTIVE_ACTION_PHOTOS - currentPhotos.length

    if (remainingSlots <= 0) {
      alert(`You can attach up to ${MAX_CORRECTIVE_ACTION_PHOTOS} photos to one corrective action.`)
      event.target.value = ''
      return
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots)
    if (filesToAdd.length < selectedFiles.length) {
      alert(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} can be added. The limit is ${MAX_CORRECTIVE_ACTION_PHOTOS}.`)
    }

    filesToAdd.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photo = { file, preview: reader.result }
        if (target === 'new') {
          setNewAction(prev => ({ ...prev, photos: [...(prev.photos || []), photo] }))
          return
        }

        setCorrectiveActions(prev => prev.map((action, index) => (
          index === target
            ? { ...action, photos: [...(action.photos || []), photo] }
            : action
        )))
      }
      reader.readAsDataURL(file)
    })

    event.target.value = ''
  }

  const removeCorrectiveActionPhoto = (target, photoIndex) => {
    if (target === 'new') {
      setNewAction(prev => ({
        ...prev,
        photos: (prev.photos || []).filter((_, index) => index !== photoIndex),
      }))
      return
    }

    setCorrectiveActions(prev => prev.map((action, index) => (
      index === target
        ? { ...action, photos: (action.photos || []).filter((_, currentPhotoIndex) => currentPhotoIndex !== photoIndex) }
        : action
    )))
  }

  const removeAction = (idx) => setCorrectiveActions(prev => {
    const actionToRemove = prev[idx]
    if (actionToRemove?.id) {
      setDeletedActionIds(current => [...current, actionToRemove.id])
    }
    return prev.filter((_, i) => i !== idx)
  })

  const addDisciplinaryAction = () => {
    if (
      !newDisciplinaryAction.recipient_person_id ||
      !newDisciplinaryAction.responsible_leader_id ||
      !newDisciplinaryAction.action_type ||
      !newDisciplinaryAction.action_date ||
      !newDisciplinaryAction.action_time
    ) {
      alert('Please complete all required disciplinary action fields')
      return
    }
    setDisciplinaryActions(prev => [...prev, { ...newDisciplinaryAction }])
    setNewDisciplinaryAction(createEmptyDisciplinaryAction())
    setShowAddDisciplinaryAction(false)
  }

  const updateDisciplinaryAction = (idx, field, val) => {
    setDisciplinaryActions(prev => prev.map((action, actionIndex) => (
      actionIndex === idx ? { ...action, [field]: val } : action
    )))
  }

  const removeDisciplinaryAction = (idx) => {
    setDisciplinaryActions(prev => prev.filter((_, actionIndex) => actionIndex !== idx))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (formData.type_name === 'Safety violation' && !formData.safety_violation_type) {
      alert('Please select a safety violation type')
      return
    }
    if (formData.type_name === 'Safety violation') {
      const hasInvalidDisciplinaryAction = disciplinaryActions.some(action => (
        !action.recipient_person_id ||
        !action.responsible_leader_id ||
        !action.action_type ||
        !action.action_date ||
        !action.action_time
      ))
      if (hasInvalidDisciplinaryAction) {
        alert('Please complete all required disciplinary action fields before saving the incident')
        return
      }
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const uploadedPhotoRows = []
    for (const [index, photo] of photos.entries()) {
      const ext = photo.file.name.split('.').pop()
      const fname = `incident-${Date.now()}-${index}.${ext}`
      const { error: upErr } = await supabase.storage.from('safety-photos').upload(fname, photo.file)

      if (upErr) {
        console.error(upErr)
        alert('Unable to upload one of the incident photos. Please try again.')
        setLoading(false)
        return
      }

      const { data: ud } = supabase.storage.from('safety-photos').getPublicUrl(fname)
      uploadedPhotoRows.push({ photo_url: ud.publicUrl })
    }

    const incidentPhotoRows = [
      ...existingPhotos.map(photo => ({ photo_url: photo.photo_url })),
      ...uploadedPhotoRows,
    ]
    const photoUrl = incidentPhotoRows[0]?.photo_url || null
    let signatureUrl = id ? undefined : null
    if (removeExistingSig) {
      signatureUrl = null
    } else if (chosenDefaultSigUrl) {
      signatureUrl = chosenDefaultSigUrl
    } else if (manualSigDataUrl) {
      const blob = await fetch(manualSigDataUrl).then(r => r.blob())
      const sigName = `signature-${Date.now()}.png`
      const { error: sigErr } = await supabase.storage.from('safety-photos').upload(sigName, blob)
      if (!sigErr) {
        const { data: sd } = supabase.storage.from('safety-photos').getPublicUrl(sigName)
        signatureUrl = sd.publicUrl
      }
    }
    const incidentData = {
      project_id: formData.project_id || null,
      date: formData.date,
      time: formData.time,
      location: formData.location || null,
      latitude: formData.latitude ?? null,
      longitude: formData.longitude ?? null,
      type_name: formData.type_name,
      incident_type_id: formData.incident_type_id || null,
      incident_subtype: formData.incident_subtype || null,
      safety_violation_type: formData.type_name === 'Safety violation' ? (formData.safety_violation_type || null) : null,
      severity: formData.severity || null,
      employee_name: formData.employee_name,
      phone: formData.phone || null,
      reporter_name: formData.reporter_name,
      details: formData.details,
      immediate_cause: formData.immediate_cause || null,
      contributing_factors: formData.contributing_factors || null,
      notes: formData.notes || null,
      anyone_injured: formData.anyone_injured,
      body_part: formData.anyone_injured ? (formData.body_part || null) : null,
      medical_treatment: formData.anyone_injured ? (formData.medical_treatment || null) : null,
      hospitalized: formData.anyone_injured ? formData.hospitalized : false,
      days_away_from_work: (formData.anyone_injured && formData.days_away_from_work) ? parseInt(formData.days_away_from_work) : null,
      estimated_property_cost: (showPropertyDamage && formData.estimated_property_cost) ? parseFloat(formData.estimated_property_cost) : null,
      equipment_involved: showPropertyDamage ? (formData.equipment_involved || null) : null,
      osha_recordable: formData.osha_recordable,
      root_cause: formData.root_cause || null,
      report_mode: reportMode,
      photo_url: photoUrl,
      ...(signatureUrl !== undefined ? { signature_url: signatureUrl } : {}),
    }
    let incidentId = id
    if (id) {
      const { error } = await supabase.from('incidents').update({
        ...incidentData,
        updated_by: user.id,
      }).eq('id', id)
      if (error) { console.error(error); setLoading(false); return }
    } else {
      const { data: newInc, error } = await supabase.from('incidents').insert([{
        ...incidentData,
        created_by: user.id,
        updated_by: user.id,
      }]).select().single()
      if (error) { console.error(error); setLoading(false); return }
      incidentId = newInc.id
    }
    if (incidentId) {
      if (deletedActionIds.length > 0) {
        await supabase.from('corrective_actions').delete().in('id', deletedActionIds)
      }

      let availableResponsiblePersons = involvedPersons
      const normalizedCorrectiveActions = []

      for (const action of correctiveActions) {
        try {
          const { responsiblePersonId, syncedPerson } = await resolveResponsiblePersonId({
            selectedValue: action.responsible_person_id,
            involvedPersons: availableResponsiblePersons,
            leaders,
            supabase,
          })

          if (syncedPerson) {
            availableResponsiblePersons = mergeResponsiblePerson(availableResponsiblePersons, syncedPerson)
          }

          normalizedCorrectiveActions.push({
            ...action,
            responsible_person_id: responsiblePersonId || '',
          })
        } catch (resolveError) {
          console.error(resolveError)
          alert('Unable to assign one of the selected responsible people')
          setLoading(false)
          return
        }
      }

      if (availableResponsiblePersons !== involvedPersons) {
        setInvolvedPersons(availableResponsiblePersons)
      }

      const existingActions = normalizedCorrectiveActions.filter(action => action.id)
      const newActions = normalizedCorrectiveActions.filter(action => !action.id)
      const syncedActions = []

      if (existingActions.length > 0) {
        const updateResults = await Promise.all(existingActions.map(action => (
          supabase
            .from('corrective_actions')
            .update({
              description: action.description,
              responsible_person_id: action.responsible_person_id || null,
              declared_created_date: action.declared_created_date || null,
              due_date: action.due_date || null,
              status: action.status || 'open',
              ...buildCompletionStatusFields({
                currentStatus: action.status,
                nextStatus: action.status || 'open',
                currentCompletionDate: action.completion_date,
                currentDeclaredCompletionDate: action.declared_completion_date,
                declaredCompletionDate: action.declared_completion_date || null,
              }),
              updated_by: user.id,
            })
            .eq('id', action.id)
        )))

        const updateError = updateResults.find(result => result.error)?.error
        if (updateError) {
          console.error(updateError)
          setLoading(false)
          return
        }

        syncedActions.push(...existingActions)
      }

      if (newActions.length > 0) {
        for (const action of newActions) {
          const { data: insertedAction, error: insertActionsError } = await supabase
            .from('corrective_actions')
            .insert({
              incident_id: incidentId,
              description: action.description,
              responsible_person_id: action.responsible_person_id || null,
              declared_created_date: action.declared_created_date || null,
              due_date: action.due_date || null,
              status: action.status || 'open',
              ...buildCompletionStatusFields({
                currentStatus: 'open',
                nextStatus: action.status || 'open',
                currentCompletionDate: null,
                currentDeclaredCompletionDate: null,
                declaredCompletionDate: action.declared_completion_date || null,
              }),
              created_by: user.id,
              updated_by: user.id,
            })
            .select('*')
            .single()

          if (insertActionsError) {
            console.error(insertActionsError)
            setLoading(false)
            return
          }

          syncedActions.push({
            ...insertedAction,
            photos: action.photos || [],
          })
        }
      }

      for (const action of syncedActions) {
        const { error: deleteActionPhotosError } = await supabase
          .from('corrective_action_photos')
          .delete()
          .eq('corrective_action_id', action.id)

        if (deleteActionPhotosError) {
          console.error(deleteActionPhotosError)
          setLoading(false)
          return
        }

        const actionPhotoRows = []
        for (const [photoIndex, photo] of (action.photos || []).entries()) {
          if (photo.photo_url) {
            actionPhotoRows.push({ photo_url: photo.photo_url, display_order: photoIndex })
            continue
          }

          if (!photo.file) continue

          const ext = photo.file.name.split('.').pop()
          const fileName = `corrective-action-${action.id}-${Date.now()}-${photoIndex}.${ext}`
          const { error: uploadActionPhotoError } = await supabase.storage.from('safety-photos').upload(fileName, photo.file)

          if (uploadActionPhotoError) {
            console.error(uploadActionPhotoError)
            alert('Unable to upload one of the corrective action photos. Please try again.')
            setLoading(false)
            return
          }

          const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
          actionPhotoRows.push({ photo_url: urlData.publicUrl, display_order: photoIndex })
        }

        if (actionPhotoRows.length > 0) {
          const { error: insertActionPhotosError } = await supabase.from('corrective_action_photos').insert(
            actionPhotoRows.map(photo => ({
              corrective_action_id: action.id,
              photo_url: photo.photo_url,
              display_order: photo.display_order,
            }))
          )

          if (insertActionPhotosError) {
            console.error(insertActionPhotosError)
            setLoading(false)
            return
          }
        }
      }

      await supabase.from('disciplinary_actions').delete().eq('incident_id', incidentId)
      if (formData.type_name === 'Safety violation' && disciplinaryActions.length > 0) {
        const { error: insertDisciplinaryError } = await supabase.from('disciplinary_actions').insert(
          disciplinaryActions.map(action => ({
            incident_id: incidentId,
            recipient_person_id: action.recipient_person_id,
            responsible_leader_id: action.responsible_leader_id,
            action_type: action.action_type,
            action_notes: action.action_notes?.trim() || null,
            action_date: action.action_date,
            action_time: action.action_time,
            created_by: user.id,
            updated_by: user.id,
          }))
        )

        if (insertDisciplinaryError) {
          console.error(insertDisciplinaryError)
          setLoading(false)
          return
        }
      }
      if (id) await supabase.from('incident_witnesses').delete().eq('incident_id', id)
      if (witnesses.length > 0) {
        await supabase.from('incident_witnesses').insert(witnesses.map(w => ({
          incident_id: incidentId,
          person_id: w.person_id || null,
          name: w.name,
        })))
      }

      const { error: deletePhotosError } = await supabase
        .from('incident_photos')
        .delete()
        .eq('incident_id', incidentId)

      if (deletePhotosError) {
        console.error(deletePhotosError)
        setLoading(false)
        return
      }

      if (incidentPhotoRows.length > 0) {
        const { error: insertPhotosError } = await supabase.from('incident_photos').insert(
          incidentPhotoRows.map((photo, index) => ({
            incident_id: incidentId,
            photo_url: photo.photo_url,
            display_order: index,
          }))
        )

        if (insertPhotosError) {
          console.error(insertPhotosError)
          setLoading(false)
          return
        }
      }
    }
    setLoading(false)
    navigate('/incidents')
  }

  if (loading && id) return <div className="spinner"></div>

  const isInjury = formData.type_name === 'Accident (injury)' || formData.anyone_injured
  const isSafetyViolation = formData.type_name === 'Safety violation'
  const hasSubtypes = formData.type_name && INCIDENT_SUBTYPES[formData.type_name]
  const currentSeverity = SEVERITY_OPTIONS.find(s => s.value === formData.severity)
  const predefinedGroups = predefinedActions.reduce((acc, a) => {
    if (!acc[a.category]) acc[a.category] = []
    acc[a.category].push(a)
    return acc
  }, {})

  return (
    <div className="incident-form">
      {currentSeverity && (
        <div className="if-severity-banner" style={{ background: currentSeverity.bg, borderColor: currentSeverity.border, color: currentSeverity.color }}>
          <span className="if-severity-dot" style={{ background: currentSeverity.color }} />
          Severity: <strong>{currentSeverity.label}</strong>
          {formData.osha_recordable && <span className="if-osha-flag">OSHA Recordable</span>}
        </div>
      )}

      <div className="if-mode-bar">
        <h2 className="page-title" style={{ margin: 0 }}>{id ? 'Edit Incident' : 'Report Incident'}</h2>
        <div className="if-mode-pills">
          <button type="button" className={`if-mode-pill ${reportMode === 'quick' ? 'is-active' : ''}`} onClick={() => setReportMode('quick')}>Quick Report</button>
          <button type="button" className={`if-mode-pill ${reportMode === 'full' ? 'is-active' : ''}`} onClick={() => setReportMode('full')}>Full Investigation</button>
        </div>
      </div>

      <form id="incident-form-el" onSubmit={handleSubmit}>

        {/* Section 1 — Classification */}
        <div className="if-section if-section--classification">
          <div className="if-section-label">
            <span className="if-section-num">1</span>
            What happened?
          </div>
          <div className="form-group">
            <label className="form-label">Incident Type *</label>
            <div className="if-type-pills">
              {INCIDENT_TYPE_OPTIONS.map(t => (
                <button key={t} type="button" className={`if-type-pill ${formData.type_name === t ? 'is-active' : ''}`} onClick={() => handleTypeSelect(t)}>{t}</button>
              ))}
            </div>
          </div>
          {hasSubtypes && (
            <div className="form-group">
              <label className="form-label">Subtype {formData.type_name === 'Accident (injury)' ? '*' : <span className="if-optional">optional</span>}</label>
              <select className="form-select" value={formData.incident_subtype} onChange={e => setFormData(prev => ({ ...prev, incident_subtype: e.target.value }))} required={formData.type_name === 'Accident (injury)'}>
                <option value="">Select subtype</option>
                {INCIDENT_SUBTYPES[formData.type_name].map((s, i) => {
                  const showCat = s.category && (i === 0 || INCIDENT_SUBTYPES[formData.type_name][i - 1].category !== s.category)
                  return (
                    <React.Fragment key={s.value}>
                      {showCat && <option disabled>─── {s.category} ───</option>}
                      <option value={s.value}>{s.label}</option>
                    </React.Fragment>
                  )
                })}
              </select>
            </div>
          )}
          {isSafetyViolation && (
            <div className="form-group">
              <label className="form-label">Safety violation *</label>
              <select
                className="form-select"
                value={formData.safety_violation_type}
                onChange={e => setFormData(prev => ({ ...prev, safety_violation_type: e.target.value }))}
                required
              >
                <option value="">Select safety violation</option>
                {SAFETY_VIOLATION_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Severity</label>
            <div className="if-severity-pills">
              {SEVERITY_OPTIONS.map(s => (
                <button key={s.value} type="button"
                  className={`if-severity-pill ${formData.severity === s.value ? 'is-active' : ''}`}
                  style={formData.severity === s.value ? { background: s.bg, borderColor: s.border, color: s.color } : {}}
                  onClick={() => setFormData(prev => ({ ...prev, severity: s.value }))}
                >{s.label}</button>
              ))}
            </div>
          </div>
          <div className="if-toggle-row">
            <label className="if-toggle-label">
              <span className="if-toggle-text">Was anyone injured?</span>
              <button type="button" className={`if-toggle-btn ${formData.anyone_injured ? 'is-yes' : 'is-no'}`} onClick={() => setFormData(prev => ({ ...prev, anyone_injured: !prev.anyone_injured }))}>{formData.anyone_injured ? 'Yes' : 'No'}</button>
            </label>
          </div>
          {reportMode === 'full' && (
            <label className="if-check-row" style={{ marginTop: 16 }}>
              <input type="checkbox" checked={formData.osha_recordable} onChange={e => setFormData(prev => ({ ...prev, osha_recordable: e.target.checked }))} />
              <span>OSHA Recordable incident</span>
            </label>
          )}
        </div>

        {/* Section 2 — When & Where */}
        <div className="if-section if-section--where">
          <div className="if-section-label">
            <span className="if-section-num">2</span>
            When &amp; Where
          </div>
          <div className="if-row-3">
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="date" className={`form-input${!isAdmin && !id ? ' form-input--locked' : ''}`} value={formData.date} onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))} required readOnly={!isAdmin && !id} />
            </div>
            <div className="form-group">
              <label className="form-label">Time *</label>
              <input type="time" className={`form-input${!isAdmin && !id ? ' form-input--locked' : ''}`} value={formData.time} onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))} step="60" required readOnly={!isAdmin && !id} />
            </div>
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={formData.project_id} onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value }))}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <MapPicker
              latitude={formData.latitude}
              longitude={formData.longitude}
              onCoordinatesChange={({ lat, lng }) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
              onLocationTextChange={(text) => setFormData(prev => ({ ...prev, location: text }))}
            >
              <div className="if-location-row">
                <input type="text" className="form-input" value={formData.location} onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Address or GPS auto-filled" />
                <button type="button" className="if-gps-btn" onClick={handleGps} title="Use current location">Use GPS</button>
              </div>
            </MapPicker>
          </div>
        </div>

        {/* Section 3 — Narrative & Evidence */}
        <div className="if-section if-section--narrative">
          <div className="if-section-label">
            <span className="if-section-num">3</span>
            What exactly happened?
          </div>
          <div className="form-group">
            <label className="form-label">Describe what happened *</label>
            <textarea className="form-textarea if-narrative-area" value={formData.details} onChange={e => setFormData(prev => ({ ...prev, details: e.target.value }))} placeholder="Describe the sequence of events in detail..." required />
          </div>
          {reportMode === 'full' && (
            <>
              <div className="if-row-2">
                <div className="form-group">
                  <label className="form-label">Immediate cause <span className="if-optional">optional</span></label>
                  <textarea className="form-textarea" rows="2" value={formData.immediate_cause} onChange={e => setFormData(prev => ({ ...prev, immediate_cause: e.target.value }))} placeholder="What directly caused the incident?" />
                </div>
                <div className="form-group">
                  <label className="form-label">Contributing factors <span className="if-optional">optional</span></label>
                  <textarea className="form-textarea" rows="2" value={formData.contributing_factors} onChange={e => setFormData(prev => ({ ...prev, contributing_factors: e.target.value }))} placeholder="What conditions contributed?" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Root cause <span className="if-optional">optional</span></label>
                <textarea className="form-textarea" rows="2" value={formData.root_cause} onChange={e => setFormData(prev => ({ ...prev, root_cause: e.target.value }))} placeholder="Underlying systemic cause..." />
              </div>
            </>
          )}
          <div className="if-toggle-row">
            <label className="if-toggle-label">
              <span className="if-toggle-text">Property damage involved?</span>
              <button type="button" className={`if-toggle-btn ${showPropertyDamage ? 'is-yes' : 'is-no'}`} onClick={() => setShowPropertyDamage(v => !v)}>{showPropertyDamage ? 'Yes' : 'No'}</button>
            </label>
          </div>
          {showPropertyDamage && (
            <div className="if-row-2" style={{ marginTop: 12 }}>
              <div className="form-group">
                <label className="form-label">Estimated cost ($) <span className="if-optional">optional</span></label>
                <input type="number" className="form-input" value={formData.estimated_property_cost} onChange={e => setFormData(prev => ({ ...prev, estimated_property_cost: e.target.value }))} placeholder="0.00" min="0" step="0.01" />
              </div>
              <div className="form-group">
                <label className="form-label">Equipment / item involved <span className="if-optional">optional</span></label>
                <input type="text" className="form-input" value={formData.equipment_involved} onChange={e => setFormData(prev => ({ ...prev, equipment_involved: e.target.value }))} placeholder="e.g. Ladder, forklift" />
              </div>
            </div>
          )}
          <div className="if-evidence-block">
            <div className="if-evidence-title">Photos / Evidence</div>
            <div className="if-optional" style={{ marginBottom: 10 }}>
              Up to {MAX_INCIDENT_PHOTOS} photos per incident.
            </div>
            {existingPhotos.length > 0 && (
              <div className="if-photo-grid" style={{ marginBottom: 10 }}>
                {existingPhotos.map((photo, index) => (
                  <div key={photo.id || photo.photo_url} className="if-photo-item">
                    <img src={photo.photo_url} alt={`Existing photo ${index + 1}`} />
                    <button type="button" className="btn-remove-photo" onClick={() => setExistingPhotos(prev => prev.filter((_, photoIndex) => photoIndex !== index))}>&#215;</button>
                  </div>
                ))}
              </div>
            )}
            {photos.length > 0 && (
              <div className="if-photo-grid">
                {photos.map((p, i) => (
                  <div key={i} className="if-photo-item">
                    <img src={p.preview} alt={`Photo ${i + 1}`} />
                    <button type="button" className="btn-remove-photo" onClick={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>&#215;</button>
                  </div>
                ))}
              </div>
            )}
            <div className="if-photo-actions">
              <label className="btn btn-secondary if-upload-btn">
                &#8679; Upload Photo
                <input type="file" accept="image/*" multiple onChange={handlePhotoAdd} style={{ display: 'none' }} />
              </label>
              <label className="btn btn-secondary if-upload-btn">
                Take Photo
                <input type="file" accept="image/*" capture="environment" onChange={handlePhotoAdd} style={{ display: 'none' }} />
              </label>
            </div>
          </div>
        </div>

        {/* Section 4 — People & Actions */}
        <div className="if-section if-section--people">
          <div className="if-section-label">
            <span className="if-section-num">4</span>
            Who is involved?
          </div>
          <div className="if-row-2">
            <div className="form-group">
              <label className="form-label">Involved person *</label>
              <select className="form-select" value={formData.employee_name} onChange={e => setFormData(prev => ({ ...prev, employee_name: e.target.value }))}>
                <option value="">Select from list</option>
                {involvedPersons.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <input type="text" className="form-input" style={{ marginTop: 8 }} placeholder="Or type name manually" value={formData.employee_name} onChange={e => setFormData(prev => ({ ...prev, employee_name: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Reporter *</label>
              <select className="form-select" value={formData.reporter_name}
                onChange={e => handleReporterSelect(e.target.value)}>
                <option value="">Select reporter</option>
                {leaders.length > 0 && (
                  <optgroup label="Workers performing the meetings">
                    {leaders.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                  </optgroup>
                )}
                {involvedPersons.length > 0 && (
                  <optgroup label="Involved Persons">
                    {involvedPersons.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </optgroup>
                )}
              </select>
              <input type="text" className="form-input" style={{ marginTop: 8 }} value={formData.reporter_name}
                onChange={e => handleReporterSelect(e.target.value)}
                required placeholder="Or type name manually" />
              {reportMode === 'full' && (
                <input type="tel" className="form-input" style={{ marginTop: 8 }} value={formData.phone} onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="Phone (optional)" />
              )}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Witnesses <span className="if-optional">optional</span></label>
            {witnesses.length > 0 && (
              <div className="if-chips-row">
                {witnesses.map((w, i) => (
                  <span key={i} className="if-chip">
                    {w.name}
                    <button type="button" className="if-chip-remove" onClick={() => removeWitness(i)}>&#215;</button>
                  </span>
                ))}
              </div>
            )}
            <div className="if-attendee-input-wrap">
              <input
                type="text"
                className="form-input"
                placeholder="Search or type witness name..."
                value={witnessSearch}
                onFocus={() => setWitnessDropdownOpen(true)}
                onBlur={() => setTimeout(() => setWitnessDropdownOpen(false), 150)}
                onChange={e => { setWitnessSearch(e.target.value); setWitnessDropdownOpen(true) }}
              />
              {witnessDropdownOpen && (witnessSearch || filteredWitnessOptions.length > 0) && (
                <div className="if-dropdown">
                  {filteredWitnessOptions.slice(0, 8).map(p => (
                    <button key={p.id} type="button" className="if-dropdown-option" onMouseDown={() => addWitness(p)}>{p.name}</button>
                  ))}
                  {witnessSearch.trim() && (
                    <button type="button" className="if-dropdown-option if-dropdown-option--add" onMouseDown={addWitnessCustom}>+ Add &quot;{witnessSearch.trim()}&quot;</button>
                  )}
                </div>
              )}
            </div>
          </div>
          {isInjury && (
            <div className="if-injury-block">
              <div className="if-injury-title">Injury Details</div>
              <div className="if-row-2">
                <div className="form-group">
                  <label className="form-label">Body part affected</label>
                  <select className="form-select" value={formData.body_part} onChange={e => setFormData(prev => ({ ...prev, body_part: e.target.value }))}>
                    <option value="">Select body part</option>
                    {BODY_PARTS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Medical treatment</label>
                  <select className="form-select" value={formData.medical_treatment} onChange={e => setFormData(prev => ({ ...prev, medical_treatment: e.target.value }))}>
                    <option value="">Select treatment level</option>
                    {MEDICAL_TREATMENT.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="if-row-2" style={{ marginTop: 12 }}>
                <label className="if-check-row">
                  <input type="checkbox" checked={formData.hospitalized} onChange={e => setFormData(prev => ({ ...prev, hospitalized: e.target.checked }))} />
                  <span>Hospitalized</span>
                </label>
                <div className="form-group">
                  <label className="form-label">Days away from work <span className="if-optional">optional</span></label>
                  <input type="number" className="form-input" min="0" value={formData.days_away_from_work} onChange={e => setFormData(prev => ({ ...prev, days_away_from_work: e.target.value }))} placeholder="0" />
                </div>
              </div>
            </div>
          )}
          <div className="if-actions-block">
            <div className="if-actions-header">
              <span className="if-actions-title">
                Corrective Actions
                {correctiveActions.length > 0 && <span className="if-badge">{correctiveActions.length}</span>}
              </span>
              <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setShowAddAction(v => !v)}>
                {showAddAction ? '&#10005; Cancel' : '+ Add Action'}
              </button>
            </div>
            {showAddAction && (
              <div className="if-add-action-card">
                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <select className="form-select" style={{ marginBottom: 8 }} value="" onChange={e => setNewAction(prev => ({ ...prev, description: e.target.value }))}>
                    <option value="">— Use predefined action —</option>
                    {Object.entries(predefinedGroups).map(([cat, acts]) => (
                      <optgroup key={cat} label={cat}>
                        {acts.map(a => <option key={a.id} value={a.description}>{a.description}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <textarea className="form-textarea" rows="2" value={newAction.description} onChange={e => setNewAction(prev => ({ ...prev, description: e.target.value }))} placeholder="Describe the corrective action..." />
                </div>
                <div className="if-row-2">
                  <div className="form-group">
                    <label className="form-label">Responsible person</label>
                    <select className="form-select" value={newAction.responsible_person_id} onChange={e => setNewAction(prev => ({ ...prev, responsible_person_id: e.target.value }))}>
                      <option value="">Not assigned</option>
                      {responsiblePersonOptions.map(person => <option key={person.value} value={person.value}>{person.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Declared created date</label>
                    <input type="date" className="form-input" value={newAction.declared_created_date} onChange={e => setNewAction(prev => ({ ...prev, declared_created_date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due date</label>
                    <input type="date" className="form-input" value={newAction.due_date} onChange={e => setNewAction(prev => ({ ...prev, due_date: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Photos <span className="if-optional">optional, up to {MAX_CORRECTIVE_ACTION_PHOTOS}</span></label>
                  {newAction.photos?.length > 0 && (
                    <div className="if-photo-grid" style={{ marginBottom: 10 }}>
                      {newAction.photos.map((photo, photoIndex) => (
                        <div key={photo.photo_url || photo.preview || photoIndex} className="if-photo-item">
                          <img src={photo.preview || photo.photo_url} alt={`Corrective action photo ${photoIndex + 1}`} />
                          <button type="button" className="btn-remove-photo" onClick={() => removeCorrectiveActionPhoto('new', photoIndex)}>&#215;</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label className="btn btn-secondary if-upload-btn">
                    + Add Photos
                    <input type="file" accept="image/*" multiple onChange={e => handleCorrectiveActionPhotoAdd('new', e)} style={{ display: 'none' }} />
                  </label>
                </div>
                <button type="button" className="btn btn-primary" onClick={addAction}>Add Action</button>
              </div>
            )}
            {correctiveActions.length > 0 && (
              <div className="if-action-list">
                {correctiveActions.map((a, i) => {
                  const responsible = getResponsiblePersonLabel(a.responsible_person_id)
                  return (
                    <div key={i} className={`if-action-card ${a.status === 'completed' ? 'is-done' : ''}`}>
                      <div className="if-action-main">
                        <p className="if-action-desc">{a.description}</p>
                        <div className="if-action-meta">
                          {responsible && <span>Responsible: {responsible}</span>}
                          {a.declared_created_date && <span>Created on: {new Date(a.declared_created_date).toLocaleDateString()}</span>}
                          {a.due_date && <span>Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                          {a.status === 'completed' && (a.declared_completion_date || getDeclaredCompletionDate(a)) && <span>Completed: {new Date(a.declared_completion_date || getDeclaredCompletionDate(a)).toLocaleDateString()}</span>}
                          {(a.photos?.length || 0) > 0 && <span>{a.photos.length} photo{a.photos.length === 1 ? '' : 's'}</span>}
                          <select className="form-select if-action-status-select" value={a.status} onChange={e => updateAction(i, 'status', e.target.value)}>
                            <option value="open">Open</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        {a.status === 'completed' && (
                          <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                            <label className="form-label">Declared completed date</label>
                            <input
                              type="date"
                              className="form-input"
                              value={a.declared_completion_date || getDeclaredCompletionDate(a) || ''}
                              onChange={e => updateAction(i, 'declared_completion_date', e.target.value)}
                            />
                          </div>
                        )}
                        <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                          {a.photos?.length > 0 && (
                            <div className="if-photo-grid" style={{ marginBottom: 10 }}>
                              {a.photos.map((photo, photoIndex) => (
                                <div key={photo.id || photo.photo_url || photo.preview || photoIndex} className="if-photo-item">
                                  <img src={photo.preview || photo.photo_url} alt={`Corrective action photo ${photoIndex + 1}`} />
                                  <button type="button" className="btn-remove-photo" onClick={() => removeCorrectiveActionPhoto(i, photoIndex)}>&#215;</button>
                                </div>
                              ))}
                            </div>
                          )}
                          <label className="btn btn-secondary if-upload-btn" style={{ alignSelf: 'flex-start' }}>
                            + Add Photos
                            <input type="file" accept="image/*" multiple onChange={e => handleCorrectiveActionPhotoAdd(i, e)} style={{ display: 'none' }} />
                          </label>
                        </div>
                      </div>
                      <button type="button" className="btn-remove" onClick={() => removeAction(i)}>&#215;</button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {isSafetyViolation && (
            <div className="if-actions-block if-actions-block--disciplinary">
              <div className="if-actions-header">
                <span className="if-actions-title">
                  Disciplinary Actions
                  {disciplinaryActions.length > 0 && <span className="if-badge">{disciplinaryActions.length}</span>}
                </span>
                <button type="button" className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: 13 }} onClick={() => setShowAddDisciplinaryAction(v => !v)}>
                  {showAddDisciplinaryAction ? '&#10005; Cancel' : '+ Add Disciplinary Action'}
                </button>
              </div>
              <p className="if-help-text">This action will be linked to the selected safety violation for this incident.</p>
              {showAddDisciplinaryAction && (
                <div className="if-add-action-card if-add-action-card--disciplinary">
                  <div className="if-row-2">
                    <div className="form-group">
                      <label className="form-label">Recipient *</label>
                      <select className="form-select" value={newDisciplinaryAction.recipient_person_id} onChange={e => setNewDisciplinaryAction(prev => ({ ...prev, recipient_person_id: e.target.value }))}>
                        <option value="">Select person</option>
                        {involvedPersons.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Responsible worker performing the meeting *</label>
                      <select className="form-select" value={newDisciplinaryAction.responsible_leader_id} onChange={e => setNewDisciplinaryAction(prev => ({ ...prev, responsible_leader_id: e.target.value }))}>
                        <option value="">Select worker performing the meeting</option>
                        {leaders.map(leader => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="if-row-3">
                    <div className="form-group">
                      <label className="form-label">Action taken *</label>
                      <select className="form-select" value={newDisciplinaryAction.action_type} onChange={e => setNewDisciplinaryAction(prev => ({ ...prev, action_type: e.target.value }))}>
                        <option value="">Select action</option>
                        {DISCIPLINARY_ACTION_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date *</label>
                      <input type="date" className="form-input" value={newDisciplinaryAction.action_date} onChange={e => setNewDisciplinaryAction(prev => ({ ...prev, action_date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Time *</label>
                      <input type="time" className="form-input" value={newDisciplinaryAction.action_time} onChange={e => setNewDisciplinaryAction(prev => ({ ...prev, action_time: e.target.value }))} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Action details <span className="if-optional">optional</span></label>
                    <textarea className="form-textarea" rows="2" value={newDisciplinaryAction.action_notes} onChange={e => setNewDisciplinaryAction(prev => ({ ...prev, action_notes: e.target.value }))} placeholder="Additional notes about the action taken..." />
                  </div>
                  <button type="button" className="btn btn-primary" onClick={addDisciplinaryAction}>Add Disciplinary Action</button>
                </div>
              )}
              {disciplinaryActions.length > 0 && (
                <div className="if-action-list">
                  {disciplinaryActions.map((action, index) => (
                    <div key={action.id || index} className="if-action-card if-action-card--disciplinary">
                      <div className="if-action-main">
                        <p className="if-action-desc">{action.action_type}</p>
                        <div className="if-action-meta">
                          <span>Recipient: {involvedPersons.find(person => person.id === action.recipient_person_id)?.name || 'Unknown'}</span>
                          <span>Worker performing the meeting: {leaders.find(leader => leader.id === action.responsible_leader_id)?.name || 'Unknown'}</span>
                          <span>Date: {new Date(action.action_date).toLocaleDateString()}</span>
                          <span>Time: {(action.action_time || '').slice(0, 5)}</span>
                        </div>
                        <div className="if-row-2" style={{ marginTop: 12 }}>
                          <div className="form-group">
                            <label className="form-label">Recipient *</label>
                            <select className="form-select" value={action.recipient_person_id} onChange={e => updateDisciplinaryAction(index, 'recipient_person_id', e.target.value)}>
                              <option value="">Select person</option>
                              {involvedPersons.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Responsible worker performing the meeting *</label>
                            <select className="form-select" value={action.responsible_leader_id} onChange={e => updateDisciplinaryAction(index, 'responsible_leader_id', e.target.value)}>
                              <option value="">Select worker performing the meeting</option>
                              {leaders.map(leader => <option key={leader.id} value={leader.id}>{leader.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="if-row-3" style={{ marginTop: 12 }}>
                          <div className="form-group">
                            <label className="form-label">Action taken *</label>
                            <select className="form-select" value={action.action_type} onChange={e => updateDisciplinaryAction(index, 'action_type', e.target.value)}>
                              {DISCIPLINARY_ACTION_TYPES.map(option => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input type="date" className="form-input" value={action.action_date} onChange={e => updateDisciplinaryAction(index, 'action_date', e.target.value)} />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Time *</label>
                            <input type="time" className="form-input" value={(action.action_time || '').slice(0, 5)} onChange={e => updateDisciplinaryAction(index, 'action_time', e.target.value)} />
                          </div>
                        </div>
                        <div className="form-group" style={{ marginTop: 12 }}>
                          <label className="form-label">Action details <span className="if-optional">optional</span></label>
                          <textarea className="form-textarea" rows="2" value={action.action_notes || ''} onChange={e => updateDisciplinaryAction(index, 'action_notes', e.target.value)} placeholder="Additional notes about the action taken..." />
                        </div>
                      </div>
                      <button type="button" className="btn-remove" onClick={() => removeDisciplinaryAction(index)}>&#215;</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 5 — Final Review */}
        <div className="if-section if-section--review">
          <div className="if-section-label">
            <span className="if-section-num">5</span>
            Final Review
          </div>
          <div className="if-verification">
            <LegalClauseNotice className="if-legal-note" />
            <label className="if-verify-item">
              <input type="checkbox" checked={confirmedAccurate} onChange={e => setConfirmedAccurate(e.target.checked)} />
              I confirm this report is accurate and complete
            </label>
            <label className="if-verify-item">
              <input type="checkbox" checked={confirmedHazards} onChange={e => setConfirmedHazards(e.target.checked)} />
              Immediate hazards have been addressed
            </label>
          </div>
          <div className="if-sig-toggle">
            <label className="if-verify-item">
              <input type="checkbox" checked={showSignaturePanel} onChange={e => {
                setShowSignaturePanel(e.target.checked)
                if (!e.target.checked) {
                  signatureRef.current?.clear()
                  setChosenDefaultSigUrl(null)
                  setManualSigDataUrl(null)
                  setRemoveExistingSig(false)
                }
              }} />
              Add digital signature (optional)
            </label>
          </div>
          {showSignaturePanel && (
            <div className="if-sig-panel">
              {id && existingSignatureUrl && !removeExistingSig && !chosenDefaultSigUrl && !manualSigDataUrl && (
                <div style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px 0' }}>Current signature:</p>
                  <img src={existingSignatureUrl} alt="Current signature"
                    style={{ maxHeight: 100, border: '1px solid #ddd', borderRadius: 4, padding: 8, background: '#fff', display: 'block' }} />
                  <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }}
                    onClick={() => setRemoveExistingSig(true)}>Remove signature</button>
                </div>
              )}
              {id && removeExistingSig && (
                <p style={{ fontSize: '13px', color: '#dc2626', margin: '0 0 10px 0' }}>
                  Signature will be removed.{' '}
                  <button type="button" className="if-link-btn" onClick={() => setRemoveExistingSig(false)}>Undo</button>
                </p>
              )}
              {reporterDefaultSignature && (
                <label className="if-verify-item" style={{ marginBottom: 10 }}>
                  <input type="checkbox"
                    checked={!!chosenDefaultSigUrl}
                    onChange={e => {
                      if (e.target.checked) {
                        setChosenDefaultSigUrl(reporterDefaultSignature)
                        signatureRef.current?.clear()
                        setManualSigDataUrl(null)
                      } else {
                        setChosenDefaultSigUrl(null)
                      }
                    }} />
                  Use my default signature
                </label>
              )}
              {chosenDefaultSigUrl
                ? <img src={chosenDefaultSigUrl} alt="Default signature"
                    style={{ maxHeight: 100, border: '1px solid #ddd', borderRadius: 4, padding: 8, background: '#fff', display: 'block', marginBottom: 8 }} />
                : <>
                    <SignaturePad ref={signatureRef} className="signature-canvas" height={160}
                      onEnd={() => setManualSigDataUrl(signatureRef.current?.toDataURL() || null)} />
                    <button type="button" className="btn btn-secondary" style={{ marginTop: 8 }}
                      onClick={() => { signatureRef.current?.clear(); setManualSigDataUrl(null) }}>Clear Signature</button>
                  </>
              }
            </div>
          )}
          {reportMode === 'full' && (
            <div className="form-group" style={{ marginTop: 20 }}>
              <label className="form-label">Additional notes <span className="if-optional">optional</span></label>
              <textarea className="form-textarea" rows="3" value={formData.notes} onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))} placeholder="Any other relevant information..." />
            </div>
          )}
        </div>

      </form>

      <div className="if-bottom-bar">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/incidents')}>Cancel</button>
        <button type="submit" form="incident-form-el" className="btn btn-accent" disabled={loading || (!confirmedAccurate && !id)}>
          {loading ? 'Saving...' : id ? 'Update Incident' : 'Report Incident'}
        </button>
      </div>
    </div>
  )
}

