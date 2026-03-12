import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { scoreChecklist, tradeBadgeLabel } from '../lib/suggestChecklists'
import SignaturePad from '../components/SignaturePad'
import MapPicker from '../components/MapPicker'
import TopicPicker from '../components/TopicPicker'
import { JurisdictionWarningNotice, LegalClauseNotice } from '../components/LegalNotice'
import { JURISDICTION_WARNING_MESSAGE, describeSystemDateTimeMismatch, getSystemDateTimeMismatchDetails } from '../lib/legal'
import { resolveMeetingLeader } from '../lib/meetingLeader'
import { fetchTrades } from '../lib/trades'
import './MeetingForm.css'

export default function MeetingForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const signatureRef = useRef()
  const attendeeSignatureRefs = useRef([])
  const fieldRefs = useRef({})
  
  const [loading, setLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState([])
  const [leaders, setLeaders] = useState([])
  const [users, setUsers] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [safetyTopics, setSafetyTopics] = useState([])
  const [checklists, setChecklists] = useState([])
  const [selectedChecklists, setSelectedChecklists] = useState([])
  const [showCustomTopic, setShowCustomTopic] = useState(false)
  const [checklistSearch, setChecklistSearch] = useState('')
  const [openChecklistModal, setOpenChecklistModal] = useState(null) // Holds checklist ID being filled
  const [currentChecklist, setCurrentChecklist] = useState(null) // Current checklist details
  const [checklistItems, setChecklistItems] = useState([]) // Items for the open checklist
  const [checklistNotes, setChecklistNotes] = useState('') // Notes for checklist completion
  const [selectedTopicDetails, setSelectedTopicDetails] = useState(null) // Details of selected topic
  const [showTopicContent, setShowTopicContent] = useState(true) // Show/hide topic content
  const [completedChecklists, setCompletedChecklists] = useState({}) // Store completed checklists before saving meeting
  
  const [formData, setFormData] = useState({
    project_id: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: '',
    latitude: null,
    longitude: null,
    leader_id: '',
    leader_name: '',
    trade: '',
    topic: '',
    notes: '',
    completed: false,
    is_self_training: false,
  })
  
  const [attendees, setAttendees] = useState([])
  const [newAttendee, setNewAttendee] = useState('')
  const [photos, setPhotos] = useState([])
  const [newLeader, setNewLeader] = useState('')
  const [showNewLeader, setShowNewLeader] = useState(false)
  const [userDefaultSignatures, setUserDefaultSignatures] = useState({}) // Map of name -> default_signature_url
  const [leaderDefaultSignature, setLeaderDefaultSignature] = useState(null) // Leader's default signature URL

  // ── New UI state ──
  const [suggestedChecklists, setSuggestedChecklists] = useState([])
  const [showChecklistPanel, setShowChecklistPanel] = useState(false)
  const [showNotesPanel, setShowNotesPanel] = useState(false)
  const [showPhotosPanel, setShowPhotosPanel] = useState(false)
  const [showSignaturePanel, setShowSignaturePanel] = useState(false)
  // chosenDefaultSigUrl: URL of leader's default sig if they picked it; null = draw manually
  const [chosenDefaultSigUrl, setChosenDefaultSigUrl] = useState(null)
  // manualSigDataUrl: stores the drawn signature as data URL on every stroke
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)
  // existingSignatureUrl: signature already saved in DB when editing
  const [existingSignatureUrl, setExistingSignatureUrl] = useState(null)
  // removeExistingSig: user explicitly asked to delete the existing signature
  const [removeExistingSig, setRemoveExistingSig] = useState(false)
  const [attendeeSearch, setAttendeeSearch] = useState('')
  const [attendeeDropdownOpen, setAttendeeDropdownOpen] = useState(false)
  const [allTrades, setAllTrades] = useState([])
  const [featuredCategories, setFeaturedCategories] = useState([])
  const [featuredTopics, setFeaturedTopics] = useState([])
  const [featuredTrades, setFeaturedTrades] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
  const [validationMessage, setValidationMessage] = useState('')

  // Draft mode — set when editing an is_draft=true meeting
  const [isDraft, setIsDraft] = useState(false)
  // approveMode — when true, submit sets is_draft=false + completed=true
  // Use both state (for render) and ref (for synchronous read in handleSubmit)
  const [approveMode, setApproveMode] = useState(false)
  const approveModeRef = useRef(false)
  // Guards the one-time auto-detection run on initial draft load
  const initialDetectionDoneRef = useRef(false)
  // Draft-to-draft navigation context (passed via React Router state)
  const [draftNavIds, setDraftNavIds] = useState([])
  const [draftNavIndex, setDraftNavIndex] = useState(-1)

  const meetingDateTimeMismatchDetails = getSystemDateTimeMismatchDetails({
    date: formData.date,
    time: formData.time,
  })
  const showJurisdictionWarning = meetingDateTimeMismatchDetails.length > 0

  const setFieldRef = (fieldName) => (node) => {
    if (node) fieldRefs.current[fieldName] = node
  }

  const setSharedFieldRef = (fieldNames) => (node) => {
    if (!node) return
    fieldNames.forEach(fieldName => {
      fieldRefs.current[fieldName] = node
    })
  }

  const clearValidationError = (fieldName) => {
    setValidationErrors(prev => {
      if (!prev[fieldName]) return prev
      const next = { ...prev }
      delete next[fieldName]
      return next
    })
  }

  const hasAttendeeSignature = (attendee) => Boolean(attendee?.signature_url || attendee?.drawn_sig_data_url)
  const isAttendeeConfirmationMissing = (attendee) => !attendee?.signed_with_checkbox && !hasAttendeeSignature(attendee)
  const isAttendeeSignatureMissing = (attendee) => attendee?.show_signature_field && !hasAttendeeSignature(attendee)

  const focusFirstInvalidField = (errors) => {
    const fieldOrder = [
      'leader',
      'date',
      'time',
      'topic',
      'attendees',
      'attendeeConfirmations',
      'attendeeSignatures',
      'completed',
      'leaderSignature',
    ]
    const firstInvalidField = fieldOrder.find(field => errors[field])
    const fieldNode = firstInvalidField ? fieldRefs.current[firstInvalidField] : null

    if (fieldNode) {
      window.setTimeout(() => {
        fieldNode.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 0)
    }
  }

  const buildValidationErrors = ({ requiresFinalApproval }) => {
    const errors = {}

    if (!formData.leader_name) {
      errors.leader = 'Select the worker performing the meeting.'
    }
    if (!formData.date) {
      errors.date = 'Select the meeting date.'
    }
    if (!formData.time) {
      errors.time = 'Select the meeting time.'
    }
    if (!formData.topic?.trim()) {
      errors.topic = 'Select or enter a meeting topic.'
    }

    if (attendees.length === 0) {
      errors.attendees = 'Add at least one attendee.'
    } else {
      if (attendees.some(isAttendeeConfirmationMissing)) {
        errors.attendeeConfirmations = 'Each attendee must be confirmed or signed.'
      }
      if (attendees.some(isAttendeeSignatureMissing)) {
        errors.attendeeSignatures = 'Complete every attendee signature that was enabled.'
      }
    }

    if (requiresFinalApproval && !formData.completed) {
      errors.completed = 'Confirm that the meeting is complete.'
    }

    const hasLeaderSignature = Boolean(
      chosenDefaultSigUrl ||
      manualSigDataUrl ||
      (id && existingSignatureUrl && !removeExistingSig)
    )

    if (showSignaturePanel && !hasLeaderSignature) {
      errors.leaderSignature = 'Add the meeting leader signature or turn off digital signature.'
    }

    return errors
  }

  const showValidationFeedback = (errors) => {
    setValidationErrors(errors)
    setValidationMessage(`Complete the highlighted required fields: ${Object.values(errors).join(' ')}`)
    focusFirstInvalidField(errors)
  }

  useEffect(() => {
    // Reset the one-shot guard whenever we navigate to a different meeting
    initialDetectionDoneRef.current = false
    checkAdminAndLoadData()
  }, [id])

  // For meetings loaded from DB (drafts or edits), run autoDetectLeader once all
  // async data (attendees, leaders, involvedPersons) has settled.
  // We don't gate on involvedPersons.length > 0 because attendees may be direct
  // leaders (not linked via involved_persons).
  useEffect(() => {
    if (
      id &&
      !initialDetectionDoneRef.current &&
      attendees.length > 0 &&
      leaders.length > 0
    ) {
      initialDetectionDoneRef.current = true
      autoDetectLeader(attendees)
    }
  }, [id, attendees, leaders, involvedPersons])

  // Pre-fill project_id from URL query param (?project_id=...)
  useEffect(() => {
    if (!id) {
      const params = new URLSearchParams(location.search)
      const qProjectId = params.get('project_id')
      if (qProjectId) {
        setFormData(prev => ({ ...prev, project_id: qProjectId }))
      }
    }
  }, [id, location.search])

  // Load draft navigation context from React Router state
  useEffect(() => {
    if (id && location.state?.draftIds?.length) {
      setDraftNavIds(location.state.draftIds)
      setDraftNavIndex(location.state.draftIndex ?? -1)
    }
  }, [id])

  // Load from localStorage if creating new meeting
  useEffect(() => {
    if (!id) {
      const savedData = localStorage.getItem('meeting-draft')
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData)
          if (parsed.formData) setFormData(prev => ({ ...prev, ...parsed.formData }))
          if (parsed.attendees) setAttendees(
            parsed.attendees.map(a => ({
              ...a,
              // Never restore checkbox states from localStorage — always start fresh
              signed_with_checkbox: false,
              show_signature_field: false,
            }))
          )
          if (parsed.selectedChecklists) setSelectedChecklists(parsed.selectedChecklists)
          if (parsed.completedChecklists) setCompletedChecklists(parsed.completedChecklists)
        } catch (e) {
          console.error('Error loading draft:', e)
        }
      }
    }
  }, [])

  // Auto-save to localStorage (only for new meetings)
  useEffect(() => {
    if (!id && formData.topic) {
      const draftData = {
        formData: {
          project_id: formData.project_id,
          date: formData.date,
          time: formData.time,
          location: formData.location,
          latitude: formData.latitude,
          longitude: formData.longitude,
          leader_id: formData.leader_id,
          leader_name: formData.leader_name,
          trade: formData.trade,
          topic: formData.topic,
          notes: formData.notes
        },
        attendees,
        selectedChecklists,
        completedChecklists,
        timestamp: new Date().toISOString()
      }
      localStorage.setItem('meeting-draft', JSON.stringify(draftData))
    }
  }, [formData, attendees, selectedChecklists, completedChecklists, id])

  const checkAdminAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      setIsAdmin(data?.is_admin || false)
      
      // If editing and not admin, redirect
      if (id && !data?.is_admin) {
        alert('Only administrators can edit meetings')
        navigate('/meetings')
        return
      }
    }
    
    fetchProjects()
    fetchLeaders()
    fetchSafetyTopics()
    fetchChecklists()
    fetchAllTrades()
    fetchFeaturedCategories()
    fetchFeaturedTopics()
    fetchFeaturedTrades()
    
    // Fetch users and involved persons, then build signature map
    Promise.all([fetchUsers(), fetchInvolvedPersons()]).then(([usersData, involvedPersonsData]) => {
      buildSignatureMap(usersData, involvedPersonsData)
    })
    
    if (id) {
      fetchMeeting()
    }
  }

  useEffect(() => {
    // Get user's location
    if (navigator.geolocation && !id) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            )
            const data = await response.json()
            setFormData(prev => ({ 
              ...prev, 
              location: data.display_name || `${position.coords.latitude}, ${position.coords.longitude}` 
            }))
          } catch (error) {
            console.error('Error getting location:', error)
          }
        },
        (error) => {
          console.log('Location access denied:', error)
        }
      )
    }
  }, [id])

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
  }

  const fetchLeaders = async () => {
    const { data } = await supabase
      .from('leaders')
      .select('*, default_signature_url')
      .order('name')
    if (data) {
      setLeaders(data)
    }
  }

  const fetchUsers = async () => {
    // Fetch users with their default signatures
    const { data } = await supabase
      .from('users')
      .select('id, name, email, default_signature_url')
      .order('name')
    
    if (data) {
      setUsers(data)
      return data
    }
    return []
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase
      .from('involved_persons')
      .select('id, name, leader_id, company:companies(name), default_signature_url')
      .order('name')
    
    if (data) {
      setInvolvedPersons(data)
      return data
    }
    return []
  }

  const buildSignatureMap = (usersData, involvedPersonsData) => {
    const sigMap = {}
    
    // Add signatures from users
    usersData.forEach(user => {
      if (user.default_signature_url) {
        sigMap[user.name] = user.default_signature_url
      }
    })
    
    // Add signatures from involved persons
    involvedPersonsData.forEach(person => {
      if (person.default_signature_url) {
        sigMap[person.name] = person.default_signature_url
      }
    })
    
    setUserDefaultSignatures(sigMap)
  }

  const fetchSafetyTopics = async () => {
    const { data } = await supabase
      .from('safety_topics')
      .select('*')
      .order('category')
      .order('name')
    if (data) setSafetyTopics(data)
  }

  const handleTradeChange = (newTrade) => {
    setFormData(prev => ({ ...prev, trade: newTrade, topic: '' }))
    setShowCustomTopic(false)
    setSelectedTopicDetails(null)
    setSuggestedChecklists([])
    setShowTopicContent(false)
    clearValidationError('topic')
  }

  const handleTopicChange = (topicName) => {
    if (topicName === 'custom' || !topicName) {
      setSelectedTopicDetails(null)
      setSuggestedChecklists([])
      return
    }
    clearValidationError('topic')
    const topic = safetyTopics.find(t => t.name === topicName)
    if (topic) {
      setSelectedTopicDetails(topic)
      setShowTopicContent(true)
      fetchSuggestedChecklists(topic.id)
      setShowChecklistPanel(true) // auto-open checklists panel when topic selected
    }
  }

  const fetchSuggestedChecklists = async (topicId) => {
    if (!topicId) { setSuggestedChecklists([]); return }
    const { data } = await supabase
      .from('topic_checklist_suggestions')
      .select('checklist_id')
      .eq('topic_id', topicId)
    if (data) {
      const ids = data.map(r => r.checklist_id)
      setSuggestedChecklists(ids)
      // Auto-select suggested checklists that aren't already selected
      setSelectedChecklists(prev => [...new Set([...prev, ...ids])])
    }
  }

  const loadLastMeetingAttendees = async () => {
    const { data } = await supabase
      .from('meetings')
      .select('attendees:meeting_attendees(name)')
      .order('date', { ascending: false })
      .order('time', { ascending: false })
      .limit(2)
    if (data) {
      // Take the most recent meeting that isn't the current one
      const source = data.find(m => m.attendees && m.attendees.length > 0)
      if (source) {
        const existingNames = new Set(attendees.map(a => a.name))
        const newOnes = source.attendees
          .filter(a => !existingNames.has(a.name))
          .map(a => ({ name: a.name, signature_url: null }))
        const merged = [...attendees, ...newOnes]
        setAttendees(merged)
        autoDetectLeader(merged)
      }
    }
  }

  const autoDetectLeader = (newAttendees, options = {}) => {
    const resolution = resolveMeetingLeader({
      attendees: newAttendees,
      leaders,
      involvedPersons,
      isSelfTraining: options.isSelfTraining ?? (newAttendees.length === 1),
    })

    setLeaderDefaultSignature(resolution.leaderDefaultSignature)
    setChosenDefaultSigUrl((resolution.leaderDefaultSignature && !manualSigDataUrl) ? resolution.leaderDefaultSignature : null)
    setFormData(prev => ({
      ...prev,
      leader_id: resolution.leaderId,
      leader_name: resolution.leaderName,
      is_self_training: resolution.isSelfTraining,
    }))
  }

  const addAttendeeFromPerson = (person) => {
    if (!attendees.find(a => a.name === person.name)) {
      const newAttendees = [...attendees, { name: person.name, signature_url: null }]
      setAttendees(newAttendees)
      autoDetectLeader(newAttendees)
    }
    clearValidationError('attendees')
    clearValidationError('attendeeConfirmations')
    clearValidationError('attendeeSignatures')
    setAttendeeSearch('')
    setAttendeeDropdownOpen(false)
  }

  const addAttendeeCustom = () => {
    const name = attendeeSearch.trim()
    if (!name) return
    if (!attendees.find(a => a.name === name)) {
      const newAttendees = [...attendees, { name, signature_url: null }]
      setAttendees(newAttendees)
      autoDetectLeader(newAttendees)
    }
    clearValidationError('attendees')
    clearValidationError('attendeeConfirmations')
    clearValidationError('attendeeSignatures')
    setAttendeeSearch('')
    setAttendeeDropdownOpen(false)
  }

  const fetchChecklists = async () => {
    const { data } = await supabase
      .from('checklists')
      .select('id, name, category, trades')
      .order('name')
    if (data) setChecklists(data)
  }

  const fetchAllTrades = async () => {
    const trades = await fetchTrades()
    setAllTrades(trades)
  }

  const fetchFeaturedCategories = async () => {
    const { data } = await supabase
      .from('featured_categories')
      .select('category')
      .order('display_order')
    if (data) setFeaturedCategories(data.map(r => r.category))
  }

  const fetchFeaturedTopics = async () => {
    const { data } = await supabase
      .from('featured_topics')
      .select('topic_id, display_order, topic:safety_topics(id, name, category, risk_level, trades)')
      .order('display_order')
    if (data) setFeaturedTopics(data.map(r => r.topic).filter(Boolean))
  }

  const fetchFeaturedTrades = async () => {
    const { data } = await supabase
      .from('featured_trades')
      .select('trade')
      .order('display_order')
    if (data) setFeaturedTrades(data.map(r => r.trade))
  }

  const openChecklistForFilling = async (checklistId) => {
    console.log('Opening checklist:', checklistId)
    setOpenChecklistModal(checklistId)
    
    // Fetch checklist items
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        items:checklist_items(*)
      `)
      .eq('id', checklistId)
      .single()

    console.log('Checklist data:', data)
    console.log('Checklist error:', error)

    if (error) {
      console.error('Error fetching checklist:', error)
      alert('Error loading checklist')
      setOpenChecklistModal(null)
      return
    }

    if (data) {
      setCurrentChecklist(data)
      const items = data.items || []
      console.log('Items found:', items.length)
      const sortedItems = items.sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
      
      // Check if there's a saved completion for this checklist
      const savedCompletion = completedChecklists[checklistId]
      
      if (savedCompletion) {
        // Load saved data
        console.log('Loading saved completion')
        setChecklistItems(savedCompletion.items)
        setChecklistNotes(savedCompletion.notes || '')
      } else {
        // Initialize empty
        console.log('Initializing empty checklist items')
        const initializedItems = sortedItems.map(item => ({
          ...item,
          is_checked: false,
          notes: ''
        }))
        console.log('Initialized items:', initializedItems)
        setChecklistItems(initializedItems)
        setChecklistNotes('')
      }
    }
  }

  const closeChecklistModal = () => {
    setOpenChecklistModal(null)
    setCurrentChecklist(null)
    setChecklistItems([])
    setChecklistNotes('')
  }

  const handleToggleChecklistItem = (index) => {
    const newItems = [...checklistItems]
    newItems[index].is_checked = !newItems[index].is_checked
    setChecklistItems(newItems)
  }

  const handleChecklistItemNoteChange = (index, value) => {
    const newItems = [...checklistItems]
    newItems[index].notes = value
    setChecklistItems(newItems)
  }

  const saveChecklistCompletion = async () => {
    // If meeting not saved yet, store in state and localStorage
    if (!id) {
      const completionData = {
        checklistId: openChecklistModal,
        items: checklistItems,
        notes: checklistNotes,
        timestamp: new Date().toISOString()
      }
      
      const newCompletedChecklists = {
        ...completedChecklists,
        [openChecklistModal]: completionData
      }
      
      setCompletedChecklists(newCompletedChecklists)
      alert('Checklist saved temporarily. It will be submitted when you save the meeting.')
      closeChecklistModal()
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Create completion
    const { data: completion, error: completionError } = await supabase
      .from('checklist_completions')
      .insert([{
        checklist_id: openChecklistModal,
        project_id: formData.project_id || null,
        completed_by: user.id,
        completion_datetime: new Date().toISOString(),
        notes: checklistNotes,
        meeting_id: id // Associate with this meeting
      }])
      .select()
      .single()

    if (completionError) {
      console.error('Error creating completion:', completionError)
      alert('Error saving checklist completion')
      return
    }

    // Save item completions
    const itemCompletions = checklistItems.map(item => ({
      completion_id: completion.id,
      item_id: item.id,
      is_checked: item.is_checked,
      notes: item.notes || null
    }))

    const { error: itemsError } = await supabase
      .from('checklist_item_completions')
      .insert(itemCompletions)

    if (itemsError) {
      console.error('Error saving items:', itemsError)
      alert('Error saving checklist items')
      return
    }

    alert('Checklist completed successfully!')
    closeChecklistModal()
  }

  const fetchMeeting = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        attendees:meeting_attendees(*),
        photos:meeting_photos(*)
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      // If meeting has leader_name but no leader_id (e.g. CSV-imported draft),
      // resolve the ID so the dropdown shows the correct selection
      let resolvedLeaderId = data.leader_id || ''
      let resolvedLeaderSig = null
      if (!resolvedLeaderId && data.leader_name) {
        const { data: ldr } = await supabase
          .from('leaders')
          .select('id, default_signature_url')
          .eq('name', data.leader_name)
          .maybeSingle()
        if (ldr) {
          resolvedLeaderId = ldr.id
          resolvedLeaderSig = ldr.default_signature_url || null
        }
      }

      const isDraftMeeting = data.is_draft === true

      // For drafts also check leader's default sig via leader_id if not already resolved by name
      if (!resolvedLeaderSig && resolvedLeaderId) {
        const { data: ldr2 } = await supabase
          .from('leaders')
          .select('default_signature_url')
          .eq('id', resolvedLeaderId)
          .maybeSingle()
        if (ldr2?.default_signature_url) resolvedLeaderSig = ldr2.default_signature_url
      }

      setFormData({
        project_id: data.project_id || '',
        date: data.date.split('T')[0],
        time: data.time,
        location: data.location || '',
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        leader_id: resolvedLeaderId,
        leader_name: data.leader_name || '',
        trade: data.trade || '',
        topic: data.topic,
        notes: data.notes || '',
        // Drafts: pre-check "Leader confirms" so admin just needs to approve
        completed: isDraftMeeting ? true : (data.completed || false),
        is_self_training: data.is_self_training || false,
      })
      setLeaderDefaultSignature(resolvedLeaderSig)
      setAttendees(
        (data.attendees || []).map(a => ({
          ...a,
          show_signature_field: isDraftMeeting ? false : (a.show_signature_field || !!a.signature_url),
          // Drafts: Confirmed pre-checked — admin can uncheck if needed
          signed_with_checkbox: isDraftMeeting ? true : (a.signed_with_checkbox || false),
        }))
      )
      setPhotos(data.photos || [])

      // Draft mode
      setIsDraft(isDraftMeeting)

      if (isDraftMeeting) {
        // Pre-check "Add digital signature".
        // chosenDefaultSigUrl is intentionally NOT set here — autoDetectLeader
        // will run after attendees/leaders load and set the correct leader's sig
        // (or null if that leader has no default sig). This prevents Bo Mikuta's
        // sig from being pre-filled for drafts that were imported with a wrong
        // default leader_name.
        setShowSignaturePanel(true)
      } else if (data.signature_url) {
        setExistingSignatureUrl(data.signature_url)
        setShowSignaturePanel(true)
      }

      // Load topic details if available
      if (data.topic) {
        handleTopicChange(data.topic)
      }
      
      // Fetch associated checklists
      const { data: checklistsData } = await supabase
        .from('meeting_checklists')
        .select('checklist_id')
        .eq('meeting_id', id)
      
      if (checklistsData) {
        setSelectedChecklists(checklistsData.map(mc => mc.checklist_id))
      }
    }
    setLoading(false)
  }

  const handleAddLeader = async () => {
    if (!newLeader.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('leaders')
      .insert([{ name: newLeader, user_id: user.id }])
      .select()
      .single()

    if (!error && data) {
      setLeaders([...leaders, data])
      setFormData({ ...formData, leader_id: data.id, leader_name: data.name, is_self_training: false })
      clearValidationError('leader')
      setNewLeader('')
      setShowNewLeader(false)
    }
  }

  const handleAddAttendee = () => {
    if (!newAttendee.trim()) return
    const newAttendees = [...attendees, { name: newAttendee, signature_url: null }]
    setAttendees(newAttendees)
    autoDetectLeader(newAttendees)
    clearValidationError('attendees')
    clearValidationError('attendeeConfirmations')
    clearValidationError('attendeeSignatures')
    setNewAttendee('')
  }

  const handleRemoveAttendee = (index) => {
    const newAttendees = attendees.filter((_, i) => i !== index)
    setAttendees(newAttendees)
    autoDetectLeader(newAttendees)
    clearValidationError('attendees')
    clearValidationError('attendeeConfirmations')
    clearValidationError('attendeeSignatures')
  }

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('safety-photos')
        .upload(filePath, file)

      if (!uploadError) {
        const { data } = supabase.storage
          .from('safety-photos')
          .getPublicUrl(filePath)
        
        setPhotos([...photos, { photo_url: data.publicUrl }])
      }
    }
  }

  const handleRemovePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  // Load default signature into canvas
  const loadDefaultSignature = (attendeeName, index) => {
    const defaultSignatureUrl = userDefaultSignatures[attendeeName]
    
    if (defaultSignatureUrl && attendeeSignatureRefs.current[index]) {
      const canvas = attendeeSignatureRefs.current[index]
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const ctx = canvas.getCanvas().getContext('2d')
        const canvasElement = canvas.getCanvas()
        
        // Clear canvas first
        canvas.clear()
        
        // Calculate scaling to maintain aspect ratio
        const canvasWidth = canvasElement.width
        const canvasHeight = canvasElement.height
        const imgWidth = img.width
        const imgHeight = img.height
        
        // Calculate scale to fit image within canvas while maintaining aspect ratio
        const scale = Math.min(canvasWidth / imgWidth, canvasHeight / imgHeight)
        
        // Calculate dimensions and position to center the image
        const scaledWidth = imgWidth * scale
        const scaledHeight = imgHeight * scale
        const x = (canvasWidth - scaledWidth) / 2
        const y = (canvasHeight - scaledHeight) / 2
        
        // Draw the image with proper scaling and centering
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight)

        // Capture the drawn default signature so handleSubmit will upload it
        const dataUrl = canvas.toDataURL()
        setAttendees(prev => {
          const n = [...prev]
          n[index] = { ...n[index], drawn_sig_data_url: dataUrl }
          return n
        })
      }
      img.onerror = (error) => {
        console.error('Error loading signature image:', error)
      }
      img.src = defaultSignatureUrl
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        alert('User not authenticated')
        setLoading(false)
        return
      }

      const requiresFinalApproval = !isDraft || approveModeRef.current
      const errors = buildValidationErrors({ requiresFinalApproval })
      if (Object.keys(errors).length > 0) {
        showValidationFeedback(errors)
        setLoading(false)
        return
      }

      setValidationErrors({})
      setValidationMessage('')

      if (requiresFinalApproval && showJurisdictionWarning) {
        const confirmed = confirm(`The selected meeting ${describeSystemDateTimeMismatch(meetingDateTimeMismatchDetails)} from the current system values. ${JURISDICTION_WARNING_MESSAGE}`)
        if (!confirmed) {
          setLoading(false)
          return
        }
      }

      // ── Signature upload ──────────────────────────────────────────────
      let signatureUrl = id ? undefined : null  // undefined = preserve existing on edit

      if (removeExistingSig) {
        signatureUrl = null  // user explicitly removed the existing signature

      } else if (chosenDefaultSigUrl) {
        // Leader picked their default signature — use URL directly, no canvas ops
        signatureUrl = chosenDefaultSigUrl

      } else if (manualSigDataUrl) {
        // Leader drew manually — data URL stored in state on each stroke, safe to use
        const blob = await new Promise((resolve) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            canvas.getContext('2d').drawImage(img, 0, 0)
            canvas.toBlob(resolve, 'image/png')
          }
          img.src = manualSigDataUrl
        })
        if (blob) {
          const fileName = `leader-sig-${Date.now()}.png`
          const { error: uploadErr } = await supabase.storage
            .from('safety-photos')
            .upload(fileName, blob, { contentType: 'image/png' })
          if (!uploadErr) {
            const { data: urlData } = supabase.storage
              .from('safety-photos')
              .getPublicUrl(fileName)
            signatureUrl = urlData.publicUrl
          } else {
            console.error('Signature upload error:', uploadErr)
          }
        }
      }
      // ─────────────────────────────────────────────────────────────────

      // Insert or update meeting
      const meetingData = {
        project_id: formData.project_id || null,
        date: formData.date,
        time: formData.time,
        location: formData.location || null,
        latitude: formData.latitude ?? null,
        longitude: formData.longitude ?? null,
        // Don't include leader_id if it's not set properly - use only leader_name
        ...(formData.leader_id ? { leader_id: formData.leader_id } : {}),
        leader_name: formData.leader_name,
        trade: formData.trade || null,
        topic: formData.topic,
        notes: formData.notes || null,
        ...(signatureUrl !== undefined ? { signature_url: signatureUrl } : {}),
        completed: approveModeRef.current ? true : formData.completed,
        is_self_training: formData.is_self_training || false,
        // Draft handling: preserve is_draft unless explicitly approving
        ...(id && isDraft ? { is_draft: approveModeRef.current ? false : true } : {}),
        // Tag manually-created meetings
        ...(!id ? { source: 'manual' } : {}),
      }

    let meetingId = id
    if (id) {
      const meetingUpdateData = {
        ...meetingData,
        updated_by: user.id,
      }

      const { error } = await supabase
        .from('meetings')
        .update(meetingUpdateData)
        .eq('id', id)
      
      if (error) {
        console.error('Error updating meeting:', error)
        setLoading(false)
        return
      }

      // Delete existing attendees and photos
      await supabase.from('meeting_attendees').delete().eq('meeting_id', id)
      await supabase.from('meeting_photos').delete().eq('meeting_id', id)
      await supabase.from('meeting_checklists').delete().eq('meeting_id', id)
    } else {
      const meetingInsertData = {
        ...meetingData,
        created_by: user.id,
        updated_by: user.id,
      }

      const { data, error } = await supabase
        .from('meetings')
        .insert([meetingInsertData])
        .select()
        .single()

      if (error) {
        console.error('Error creating meeting:', error)
        alert(`Error creating meeting: ${error.message}`)
        setLoading(false)
        return
      }
      meetingId = data.id
    }

      // Insert attendees with signatures
      if (attendees.length > 0) {
        const attendeesWithSignatures = await Promise.all(
          attendees.map(async (attendee, index) => {
            let signatureUrl = attendee.signature_url || null
            
            // Upload drawn signature if present (stored in state on each stroke)
            if (attendee.drawn_sig_data_url) {
              const signatureBlob = await fetch(attendee.drawn_sig_data_url).then(r => r.blob())
              const signatureFile = `attendee-signature-${Date.now()}-${index}.png`
              
              const { error: uploadError } = await supabase.storage
                .from('safety-photos')
                .upload(signatureFile, signatureBlob)

              if (!uploadError) {
                const { data } = supabase.storage
                  .from('safety-photos')
                  .getPublicUrl(signatureFile)
                signatureUrl = data.publicUrl
              }
            }
            
            return {
              meeting_id: meetingId,
              name: attendee.name,
              user_id: attendee.user_id || null,
              signature_url: signatureUrl,
              signed_with_checkbox: attendee.signed_with_checkbox || false
            }
          })
        )
        
        const { error: attendeesError } = await supabase.from('meeting_attendees').insert(attendeesWithSignatures)
        if (attendeesError) {
          console.error('Error adding attendees:', attendeesError)
        }
      }

      // Insert photos
      if (photos.length > 0) {
        const { error: photosError } = await supabase.from('meeting_photos').insert(
          photos.map((p, index) => ({
            meeting_id: meetingId,
            photo_url: p.photo_url,
            display_order: index
          }))
        )
        if (photosError) {
          console.error('Error adding photos:', photosError)
        }
      }

      // Insert checklist associations
      if (selectedChecklists.length > 0) {
        const { error: checklistsError } = await supabase.from('meeting_checklists').insert(
          selectedChecklists.map(checklistId => ({
            meeting_id: meetingId,
            checklist_id: checklistId
          }))
        )
        if (checklistsError) {
          console.error('Error adding checklists:', checklistsError)
        }
      }

      // Save completed checklists
      if (Object.keys(completedChecklists).length > 0) {
        for (const [checklistId, completion] of Object.entries(completedChecklists)) {
          const { data: comp, error: compError } = await supabase
            .from('checklist_completions')
            .insert([{
              checklist_id: checklistId,
              project_id: formData.project_id || null,
              completed_by: user.id,
              completion_datetime: completion.timestamp,
              notes: completion.notes,
              meeting_id: meetingId
            }])
            .select()
            .single()

          if (!compError && comp) {
            const itemCompletions = completion.items.map(item => ({
              completion_id: comp.id,
              item_id: item.id,
              is_checked: item.is_checked,
              notes: item.notes || null
            }))
            await supabase.from('checklist_item_completions').insert(itemCompletions)
          }
        }
      }

      // Auto-add the meeting's trade to the project's trades array
      if (formData.trade && formData.project_id) {
        try {
          const { data: proj } = await supabase
            .from('projects')
            .select('trades')
            .eq('id', formData.project_id)
            .single()
          if (proj && !proj.trades?.includes(formData.trade)) {
            await supabase
              .from('projects')
              .update({ trades: [...(proj.trades || []), formData.trade] })
              .eq('id', formData.project_id)
          }
        } catch (tradeErr) {
          console.warn('Could not auto-add trade to project:', tradeErr)
        }
      }

      // Clear localStorage draft
      localStorage.removeItem('meeting-draft')

      setLoading(false)
      navigate('/meetings')
    } catch (error) {
      console.error('Error in handleSubmit:', error)
      alert(`Error: ${error.message}`)
      setLoading(false)
    }
  }

  const handleLeaderChange = (e) => {
    const leaderId = e.target.value
    if (leaderId === 'new') {
      setShowNewLeader(true)
      return
    }
    clearValidationError('leader')
    const leader = leaders.find(l => l.id === leaderId)
    setFormData({
      ...formData,
      leader_id: leaderId,
      leader_name: leader?.name || '',
      is_self_training: false,
    })
    // Set leader's default signature
    if (leader?.default_signature_url) {
      setLeaderDefaultSignature(leader.default_signature_url)
      if (!manualSigDataUrl) setChosenDefaultSigUrl(leader.default_signature_url)
    } else {
      setLeaderDefaultSignature(null)
      if (!manualSigDataUrl) setChosenDefaultSigUrl(null)
    }
  }

  if (loading && id) return <div className="spinner"></div>

  return (
    <div className="meeting-form">

      {/* ── Page header ── */}
      <div className="mf-page-header">
        <h2 className="page-title">{id ? (isDraft ? 'Review Draft Meeting' : 'Edit Meeting') : 'New Daily Safety Meeting'}</h2>
        {!id && localStorage.getItem('meeting-draft') && (
          <button type="button" className="btn btn-secondary btn-sm"
            onClick={() => { if (confirm('Clear saved draft?')) { localStorage.removeItem('meeting-draft'); window.location.reload() } }}>
            Clear Draft
          </button>
        )}
      </div>

      {/* ── Draft banner ── */}
      {isDraft && (
        <div className="mf-draft-banner">
          <div style={{ flex: 1 }}>
            <span className="mf-draft-badge">DRAFT</span>
            <span>This meeting was generated from a CSV import and is pending approval.</span>
            <span className="mf-draft-hint">Review and edit below, then click <strong>Approve &amp; Save</strong> to publish.</span>
          </div>
          {draftNavIds.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary btn-sm"
                disabled={draftNavIndex <= 0}
                onClick={() => navigate(`/meetings/${draftNavIds[draftNavIndex - 1]}/edit`, {
                  state: { draftIds: draftNavIds, draftIndex: draftNavIndex - 1 }
                })}>← Prev</button>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#92400e', whiteSpace: 'nowrap' }}>
                {draftNavIndex + 1} / {draftNavIds.length}
              </span>
              <button type="button" className="btn btn-secondary btn-sm"
                disabled={draftNavIndex >= draftNavIds.length - 1}
                onClick={() => navigate(`/meetings/${draftNavIds[draftNavIndex + 1]}/edit`, {
                  state: { draftIds: draftNavIds, draftIndex: draftNavIndex + 1 }
                })}>Next →</button>
            </div>
          )}
        </div>
      )}

      {validationMessage && (
        <div className="mf-validation-banner" role="alert" aria-live="assertive">
          <span>{validationMessage}</span>
          <button type="button" className="mf-validation-banner-close" onClick={() => setValidationMessage('')}>
            ×
          </button>
        </div>
      )}

      <form id="meeting-form-el" onSubmit={handleSubmit}>

        {/* ════════════════════════════════════
            SECTION 1 — MEETING SETUP
        ════════════════════════════════════ */}
        <div className="mf-section mf-section--setup">
          <div className="mf-section-label"><span className="mf-section-num">1</span> Meeting Setup</div>

          <div className="mf-row-2">
            <div className="form-group">
              <label className="form-label">Project</label>
              <select className="form-select" value={formData.project_id}
                onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}>
                <option value="">Select Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className={`form-group${validationErrors.leader ? ' mf-field--invalid' : ''}`} ref={setFieldRef('leader')}>
              <label className="form-label">Worker performing the meeting *</label>
              <select className="form-select" value={formData.leader_id} onChange={handleLeaderChange} required={!formData.is_self_training}>
                <option value="">{formData.is_self_training && formData.leader_name ? `Self-training: ${formData.leader_name}` : 'Select worker performing the meeting'}</option>
                {leaders.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                <option value="new">+ Add worker performing the meeting</option>
              </select>
              {validationErrors.leader && <p className="mf-field-error">{validationErrors.leader}</p>}
            </div>
          </div>

          {showNewLeader && (
            <div className="mf-inline-form">
              <input type="text" className="form-input" placeholder="Worker performing the meeting name"
                value={newLeader} onChange={(e) => setNewLeader(e.target.value)} />
              <button type="button" className="btn btn-primary" onClick={handleAddLeader}>Add</button>
              <button type="button" className="btn btn-secondary"
                onClick={() => { setShowNewLeader(false); setNewLeader('') }}>Cancel</button>
            </div>
          )}

          <div className="mf-row-3">
            <div className={`form-group${validationErrors.date ? ' mf-field--invalid' : ''}`} ref={setFieldRef('date')}>
              <label className="form-label">Date *</label>
              <input type="date" className={`form-input${!isAdmin && !id ? ' form-input--locked' : ''}`} value={formData.date}
                onChange={(e) => {
                  clearValidationError('date')
                  setFormData({ ...formData, date: e.target.value })
                }} required readOnly={!isAdmin && !id} />
              {validationErrors.date && <p className="mf-field-error">{validationErrors.date}</p>}
            </div>
            <div className={`form-group${validationErrors.time ? ' mf-field--invalid' : ''}`} ref={setFieldRef('time')}>
              <label className="form-label">Time *</label>
              <input type="time" className={`form-input${!isAdmin && !id ? ' form-input--locked' : ''}`} value={formData.time}
                onChange={(e) => {
                  clearValidationError('time')
                  setFormData({ ...formData, time: e.target.value })
                }} step="60" required readOnly={!isAdmin && !id} />
              {validationErrors.time && <p className="mf-field-error">{validationErrors.time}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <MapPicker
                latitude={formData.latitude}
                longitude={formData.longitude}
                onCoordinatesChange={({ lat, lng }) => setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                onLocationTextChange={(text) => setFormData(prev => ({ ...prev, location: text }))}
              >
                <input type="text" className="form-input" value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Address or GPS auto-filled" />
              </MapPicker>
            </div>
          </div>

          <div className="mf-row-2">
            <div className="form-group">
              <label className="form-label">Trade</label>
              {featuredTrades.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                  {featuredTrades.map(trade => (
                    <button
                      key={trade}
                      type="button"
                      onClick={() => handleTradeChange(formData.trade === trade ? '' : trade)}
                      style={{
                        padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                        border: formData.trade === trade ? '2px solid #16a34a' : '1.5px solid #d1fae5',
                        background: formData.trade === trade ? '#16a34a' : '#f0fdf4',
                        color: formData.trade === trade ? 'white' : '#166534',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {trade}
                    </button>
                  ))}
                </div>
              )}
              <select
                className="form-select"
                value={formData.trade}
                onChange={(e) => handleTradeChange(e.target.value)}
              >
                <option value="">— Not specified —</option>
                {allTrades.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className={`form-group${validationErrors.topic ? ' mf-field--invalid' : ''}`} ref={setFieldRef('topic')}>
              <label className="form-label">Topic *</label>
              <TopicPicker
                topics={safetyTopics}
                selectedTrade={formData.trade}
                featuredCategories={featuredCategories}
                featuredTopics={featuredTopics}
                value={showCustomTopic ? 'custom' : formData.topic}
                onChange={(value) => {
                  clearValidationError('topic')
                  if (!value) {
                    setShowCustomTopic(false)
                    setFormData(prev => ({ ...prev, topic: '' }))
                    setSelectedTopicDetails(null)
                    setSuggestedChecklists([])
                    setShowTopicContent(false)
                  } else if (value === 'custom') {
                    setShowCustomTopic(true)
                    setFormData(prev => ({ ...prev, topic: '' }))
                    setSelectedTopicDetails(null)
                    setSuggestedChecklists([])
                    setShowTopicContent(false)
                  } else {
                    setShowCustomTopic(false)
                    setFormData(prev => ({ ...prev, topic: value }))
                    handleTopicChange(value)
                  }
                }}
              />
              {validationErrors.topic && !showCustomTopic && <p className="mf-field-error">{validationErrors.topic}</p>}
            </div>
          </div>

          {showCustomTopic && (
            <div className={`form-group${validationErrors.topic ? ' mf-field--invalid' : ''}`}>
              <label className="form-label">Custom Topic *</label>
              <input type="text" className="form-input" value={formData.topic}
                onChange={(e) => {
                  clearValidationError('topic')
                  setFormData({ ...formData, topic: e.target.value })
                }}
                placeholder="Describe the meeting topic" required />
              {validationErrors.topic && <p className="mf-field-error">{validationErrors.topic}</p>}
              <button type="button" className="mf-link-btn"
                style={{ marginTop: '6px' }}
                onClick={() => { setShowCustomTopic(false); setFormData({ ...formData, topic: '' }) }}>
                ← Select from list
              </button>
            </div>
          )}

          {selectedTopicDetails && !showCustomTopic && (
            <div className="topic-content-card">
              <div className="topic-content-header" onClick={() => setShowTopicContent(!showTopicContent)}>
                <h4>Topic Guidelines</h4>
                <button type="button" className="topic-toggle-btn">{showTopicContent ? '▼' : '▶'}</button>
              </div>
              {showTopicContent && (
                <div className="topic-content-body">
                  {selectedTopicDetails.description && (
                    <div className="topic-section"><h5>Description</h5><p>{selectedTopicDetails.description}</p></div>
                  )}
                  {selectedTopicDetails.osha_reference && (
                    <div className="topic-section"><h5>OSHA Reference</h5><p className="topic-osha">{selectedTopicDetails.osha_reference}</p></div>
                  )}
                  {selectedTopicDetails.risk_level && (
                    <div className="topic-section">
                      <h5>Risk Level</h5>
                      <span className={`topic-risk-badge risk-${selectedTopicDetails.risk_level}`}>
                        {selectedTopicDetails.risk_level.toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════
            SECTION 2 — CONTENT & CONTEXT
        ════════════════════════════════════ */}
        <div className="mf-section mf-section--content">
          <div className="mf-section-label mf-section-label--padded"><span className="mf-section-num">2</span> Content & Context</div>

          {/* Checklists accordion */}
          <div className="mf-accordion">
            <button type="button" className="mf-accordion-head"
              onClick={() => setShowChecklistPanel(!showChecklistPanel)}>
              <span className="mf-accordion-title">Checklists</span>
              {selectedChecklists.length > 0 && (
                <span className="mf-accordion-count">{selectedChecklists.length} selected</span>
              )}
              {suggestedChecklists.length > 0 && selectedChecklists.length === 0 && (
                <span className="mf-accordion-hint">{suggestedChecklists.length} suggested</span>
              )}
              <span className="mf-accordion-chevron">{showChecklistPanel ? '▼' : '▶'}</span>
            </button>
            {showChecklistPanel && (
              <div className="mf-accordion-body">
                {suggestedChecklists.length > 0 && (
                  <div className="mf-suggested-bar">
                    <span>✨ Suggested for this topic</span>
                    <button type="button" className="mf-link-btn"
                      onClick={() => setSelectedChecklists(prev => [...new Set([...prev, ...suggestedChecklists])])}>
                      Select all suggested
                    </button>
                  </div>
                )}
                <input type="text" className="form-input" style={{ marginBottom: '12px' }}
                  placeholder="Search by name, category or trade..."
                  value={checklistSearch} onChange={(e) => setChecklistSearch(e.target.value)} />
                <div className="mf-checklist-list">
                  {(() => {
                    const filtered = checklists.filter(c => {
                      if (!checklistSearch.trim()) return true
                      const s = checklistSearch.toLowerCase()
                      return c.name.toLowerCase().includes(s)
                        || (c.category && c.category.toLowerCase().includes(s))
                        || (c.trades && c.trades.some(t => t.toLowerCase().includes(s)))
                    })
                    const topicTrades = selectedTopicDetails?.trades || []
                    const tier1 = filtered.filter(c => suggestedChecklists.includes(c.id))

                    // Score-based Tier 2: any checklist with trade (+ optional category) overlap
                    const tier2WithScores = filtered
                      .filter(c => !suggestedChecklists.includes(c.id))
                      .map(c => ({ c, score: scoreChecklist(selectedTopicDetails || {}, c) }))
                      .filter(r => r.score > 0)
                      .sort((a, b) => b.score - a.score)

                    const tier2Ids = new Set(tier2WithScores.map(r => r.c.id))
                    const tier3 = filtered.filter(c =>
                      !suggestedChecklists.includes(c.id) && !tier2Ids.has(c.id)
                    )

                    const renderRow = (checklist, isTradeRelated, score) => (
                      <div key={checklist.id} className={`mf-checklist-row${selectedChecklists.includes(checklist.id) ? ' is-selected' : ''}${isTradeRelated ? ' is-trade-related' : ''}`}>
                        <label className="mf-checklist-label">
                          <input type="checkbox" checked={selectedChecklists.includes(checklist.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedChecklists(prev => [...prev, checklist.id])
                              else setSelectedChecklists(prev => prev.filter(i => i !== checklist.id))
                            }} />
                          <div className="mf-checklist-info">
                            <span className="mf-checklist-name">{checklist.name}</span>
                            <div className="mf-checklist-meta">
                              {checklist.category && <span className="mf-checklist-cat">{checklist.category}</span>}
                              {checklist.trades?.map(t => <span key={t} className="mf-checklist-trade">{t}</span>)}
                              {suggestedChecklists.includes(checklist.id) && <span className="mf-badge mf-badge--suggested">Suggested</span>}
                              {isTradeRelated && <span className={`mf-badge ${score >= 60 ? 'mf-badge--trade-plus' : 'mf-badge--trade'}`}>{tradeBadgeLabel(score)}</span>}
                              {completedChecklists[checklist.id] && <span className="mf-badge mf-badge--filled">✓ Filled</span>}
                            </div>
                          </div>
                        </label>
                        {selectedChecklists.includes(checklist.id) && (
                          <button type="button"
                            className={`mf-fill-btn${completedChecklists[checklist.id] ? ' mf-fill-btn--done' : ''}`}
                            onClick={() => openChecklistForFilling(checklist.id)}>
                            {completedChecklists[checklist.id] ? '✎ Edit' : '▶ Fill'}
                          </button>
                        )}
                      </div>
                    )

                    return (
                      <>
                        {tier1.map(c => renderRow(c, false, 0))}
                        {tier2WithScores.length > 0 && (
                          <>
                            {tier1.length > 0 && <div className="mf-checklist-separator" />}
                            <div className="mf-checklist-group-label">
                              Related to: {topicTrades.join(', ')}
                            </div>
                            {tier2WithScores.map(({ c, score }) => renderRow(c, true, score))}
                          </>
                        )}
                        {tier3.length > 0 && (tier1.length > 0 || tier2WithScores.length > 0) && (
                          <div className="mf-checklist-separator" />
                        )}
                        {tier3.map(c => renderRow(c, false, 0))}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Notes accordion */}
          <div className="mf-accordion">
            <button type="button" className="mf-accordion-head"
              onClick={() => setShowNotesPanel(!showNotesPanel)}>
              <span className="mf-accordion-title">Notes</span>
              {formData.notes && <span className="mf-accordion-count">Added</span>}
              <span className="mf-accordion-chevron">{showNotesPanel ? '▼' : '▶'}</span>
            </button>
            {showNotesPanel && (
              <div className="mf-accordion-body">
                <textarea className="form-textarea" rows={5}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Key discussion points, instructions, observations..." />
              </div>
            )}
          </div>

          {/* Photos accordion */}
          <div className="mf-accordion">
            <button type="button" className="mf-accordion-head"
              onClick={() => setShowPhotosPanel(!showPhotosPanel)}>
              <span className="mf-accordion-title">Photos</span>
              {photos.length > 0 && <span className="mf-accordion-count">{photos.length} added</span>}
              <span className="mf-accordion-chevron">{showPhotosPanel ? '▼' : '▶'}</span>
            </button>
            {showPhotosPanel && (
              <div className="mf-accordion-body">
                {photos.length > 0 && (
                  <div className="photos-grid">
                    {photos.map((photo, index) => (
                      <div key={index} className="photo-item">
                        <img src={photo.photo_url} alt={`Photo ${index + 1}`} />
                        <button type="button" className="btn-remove-photo" onClick={() => handleRemovePhoto(index)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input type="file" className="form-input" accept="image/*" multiple onChange={handlePhotoUpload} />
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════
            SECTION 3 — ATTENDANCE & CONFIRMATION
        ════════════════════════════════════ */}
        <div className="mf-section mf-section--confirm">
          <div className="mf-section-label"><span className="mf-section-num">3</span> Attendance & Confirmation</div>

          {/* Attendees tag-input */}
          <div className={`form-group${validationErrors.attendees || validationErrors.attendeeConfirmations || validationErrors.attendeeSignatures ? ' mf-field--invalid' : ''}`} ref={setSharedFieldRef(['attendees', 'attendeeConfirmations', 'attendeeSignatures'])}>
            <label className="form-label">
              Attendees
              {formData.is_self_training && (
                <span className="mf-self-training-badge">Self-Training</span>
              )}
            </label>

            {attendees.length > 0 && (
              <div className="mf-chips-row">
                {attendees.map((a, i) => (
                  <span key={i} className="mf-chip">
                    {a.name}
                    {a.signed_with_checkbox && <span className="mf-chip-check" title="Confirmed">✓</span>}
                    <button type="button" className="mf-chip-remove" onClick={() => handleRemoveAttendee(i)}>✕</button>
                  </span>
                ))}
              </div>
            )}

            <div className="mf-attendee-input-wrap">
              <input type="text" className="form-input"
                placeholder="Type name to search or add..."
                value={attendeeSearch}
                onChange={(e) => {
                  clearValidationError('attendees')
                  clearValidationError('attendeeConfirmations')
                  clearValidationError('attendeeSignatures')
                  setAttendeeSearch(e.target.value)
                  setAttendeeDropdownOpen(true)
                }}
                onFocus={() => setAttendeeDropdownOpen(true)}
                onBlur={() => setTimeout(() => setAttendeeDropdownOpen(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addAttendeeCustom() }
                  if (e.key === 'Escape') setAttendeeDropdownOpen(false)
                }}
              />
              {attendeeDropdownOpen && (
                <div className="mf-attendee-dropdown">
                  {involvedPersons
                    .filter(p => !attendees.find(a => a.name === p.name) &&
                      (!attendeeSearch || p.name.toLowerCase().includes(attendeeSearch.toLowerCase())))
                    .map(p => (
                      <button key={p.id} type="button" className="mf-attendee-option"
                        onMouseDown={(e) => { e.preventDefault(); addAttendeeFromPerson(p) }}>
                        {p.name}
                        {p.company?.name && <span className="mf-attendee-option-co">{p.company.name}</span>}
                      </button>
                    ))}
                  {attendeeSearch.trim() &&
                    !involvedPersons.find(p => p.name.toLowerCase() === attendeeSearch.toLowerCase()) && (
                      <button type="button" className="mf-attendee-option mf-attendee-option--add"
                        onMouseDown={(e) => { e.preventDefault(); addAttendeeCustom() }}>
                        + Add "{attendeeSearch.trim()}"
                      </button>
                    )}
                </div>
              )}
            </div>

            <div className="mf-attendee-actions">
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadLastMeetingAttendees}>
                Load last meeting
              </button>
            </div>

            {attendees.length === 1 && (
              <label className="mf-inline-check" style={{ marginTop: 10 }}>
                <input
                  type="checkbox"
                  checked={formData.is_self_training}
                  onChange={(e) => autoDetectLeader(attendees, { isSelfTraining: e.target.checked })}
                />
                <span>Is self training</span>
              </label>
            )}

            {validationErrors.attendees && <p className="mf-field-error">{validationErrors.attendees}</p>}
            {validationErrors.attendeeConfirmations && <p className="mf-field-error">{validationErrors.attendeeConfirmations}</p>}
            {validationErrors.attendeeSignatures && <p className="mf-field-error">{validationErrors.attendeeSignatures}</p>}
          </div>

          {/* Per-attendee signature rows */}
          {attendees.length > 0 && (
            <div className="mf-attendee-list">
              {attendees.map((attendee, index) => (
                <div
                  key={index}
                  className={`mf-attendee-row${((validationErrors.attendeeConfirmations && isAttendeeConfirmationMissing(attendee)) || (validationErrors.attendeeSignatures && isAttendeeSignatureMissing(attendee))) ? ' mf-attendee-row--invalid' : ''}`}
                >
                  <div className="mf-attendee-row-head">
                    <span className="mf-attendee-row-name">{attendee.name}</span>
                    <div className="mf-attendee-row-controls">
                      <label className="mf-inline-check">
                        <input type="checkbox" checked={attendee.signed_with_checkbox || false}
                          onChange={(e) => {
                            clearValidationError('attendeeConfirmations')
                            const n = [...attendees]
                            n[index] = { ...n[index], signed_with_checkbox: e.target.checked }
                            setAttendees(n)
                          }} />
                        Confirmed
                      </label>
                      <label className="mf-inline-check">
                        <input type="checkbox" checked={attendee.show_signature_field || false}
                          onChange={(e) => {
                            clearValidationError('attendeeSignatures')
                            clearValidationError('attendeeConfirmations')
                            const n = [...attendees]
                            n[index] = { ...n[index], show_signature_field: e.target.checked }
                            setAttendees(n)
                            if (e.target.checked) setTimeout(() => loadDefaultSignature(attendee.name, index), 100)
                          }} />
                        Signature
                      </label>
                    </div>
                  </div>
                  {attendee.show_signature_field && (
                    <div className="mf-attendee-sig">
                      {attendee.signature_url ? (
                        <>
                          <img src={attendee.signature_url} alt={`Signature of ${attendee.name}`} className="mf-sig-img" />
                          <button type="button" className="btn btn-secondary btn-sm"
                            onClick={() => {
                              clearValidationError('attendeeSignatures')
                              clearValidationError('attendeeConfirmations')
                              const n = [...attendees]
                              n[index] = { ...n[index], signature_url: null }
                              setAttendees(n)
                            }}>
                            Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <SignaturePad
                            ref={(ref) => { attendeeSignatureRefs.current[index] = ref }}
                            className="signature-canvas" height={160}
                            onEnd={() => {
                              const ref = attendeeSignatureRefs.current[index]
                              if (ref) {
                                clearValidationError('attendeeSignatures')
                                clearValidationError('attendeeConfirmations')
                                const dataUrl = ref.toDataURL()
                                setAttendees(prev => {
                                  const n = [...prev]
                                  n[index] = { ...n[index], drawn_sig_data_url: dataUrl }
                                  return n
                                })
                              }
                            }}
                          />
                          <button type="button" className="btn btn-secondary btn-sm"
                            onClick={() => {
                              clearValidationError('attendeeSignatures')
                              attendeeSignatureRefs.current[index]?.clear()
                              setAttendees(prev => {
                                const n = [...prev]
                                n[index] = { ...n[index], drawn_sig_data_url: null }
                                return n
                              })
                            }}>
                            Clear
                          </button>
                        </>
                      )}
                      {validationErrors.attendeeConfirmations && isAttendeeConfirmationMissing(attendee) && (
                        <p className="mf-field-error">Confirm or sign this attendee.</p>
                      )}
                      {validationErrors.attendeeSignatures && isAttendeeSignatureMissing(attendee) && (
                        <p className="mf-field-error">Signature is enabled for this attendee but not completed.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Verification */}
          <div className={`mf-verification${validationErrors.completed || validationErrors.leaderSignature ? ' mf-field--invalid' : ''}`} ref={setSharedFieldRef(['completed', 'leaderSignature'])}>
            <h4 className="mf-verify-title">Verification</h4>
            {showJurisdictionWarning && (
              <JurisdictionWarningNotice className="mf-legal-note">
                The selected meeting {describeSystemDateTimeMismatch(meetingDateTimeMismatchDetails)} from the current system values. {JURISDICTION_WARNING_MESSAGE}
              </JurisdictionWarningNotice>
            )}
            <LegalClauseNotice className="mf-legal-note" />
            <label className="mf-verify-item">
              <input type="checkbox" checked={formData.completed}
                onChange={(e) => {
                  clearValidationError('completed')
                  setFormData({ ...formData, completed: e.target.checked })
                }} />
              <span>Worker performing the meeting confirms this meeting is complete</span>
            </label>
            {validationErrors.completed && <p className="mf-field-error">{validationErrors.completed}</p>}
            <label className="mf-verify-item">
              <input type="checkbox" checked={showSignaturePanel}
                onChange={(e) => {
                  clearValidationError('leaderSignature')
                  setShowSignaturePanel(e.target.checked)
                  if (!e.target.checked) {
                    signatureRef.current?.clear()
                    setChosenDefaultSigUrl(null)
                    setManualSigDataUrl(null)
                    setRemoveExistingSig(false)
                  }
                }} />
              <span>Add digital signature</span>
            </label>
            {showSignaturePanel && (
              <div className="mf-signature-panel">
                {/* Existing signature preview (edit mode) */}
                {id && existingSignatureUrl && !removeExistingSig && !chosenDefaultSigUrl && !manualSigDataUrl && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ fontSize: '13px', color: '#666', margin: '0 0 6px 0' }}>Current signature:</p>
                    <img src={existingSignatureUrl} alt="Current signature"
                      style={{ maxHeight: 100, border: '1px solid #ddd', borderRadius: 4, padding: 8, background: '#fff', display: 'block' }} />
                    <button type="button" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}
                      onClick={() => setRemoveExistingSig(true)}>
                      Remove signature
                    </button>
                  </div>
                )}
                {id && removeExistingSig && (
                  <p style={{ fontSize: '13px', color: '#dc2626', margin: '0 0 10px 0' }}>
                    Signature will be removed.{' '}
                    <button type="button" className="mf-link-btn" onClick={() => setRemoveExistingSig(false)}>Undo</button>
                  </p>
                )}
                {leaderDefaultSignature && (
                  <label className="mf-verify-item">
                    <input type="checkbox"
                      checked={!!chosenDefaultSigUrl}
                      onChange={(e) => {
                        clearValidationError('leaderSignature')
                        if (e.target.checked) {
                          setChosenDefaultSigUrl(leaderDefaultSignature)
                          signatureRef.current?.clear()
                          setManualSigDataUrl(null)
                        } else {
                          setChosenDefaultSigUrl(null)
                          setManualSigDataUrl(null)
                        }
                      }} />
                    <span>Use my default signature</span>
                  </label>
                )}
                {chosenDefaultSigUrl
                  ? <img src={chosenDefaultSigUrl} alt="Default signature"
                      style={{ maxHeight: 100, border: '1px solid #ddd', borderRadius: 4, padding: 8, background: '#fff' }} />
                  : <SignaturePad ref={signatureRef}
                      className="signature-canvas" height={180}
                      onEnd={() => {
                        if (signatureRef.current) {
                          clearValidationError('leaderSignature')
                          setManualSigDataUrl(signatureRef.current.toDataURL())
                        }
                      }} />
                }
                {!chosenDefaultSigUrl && (
                  <button type="button" className="btn btn-secondary btn-sm"
                    onClick={() => {
                      clearValidationError('leaderSignature')
                      signatureRef.current?.clear()
                      setManualSigDataUrl(null)
                    }}>
                    Clear Signature
                  </button>
                )}
                {validationErrors.leaderSignature && <p className="mf-field-error">{validationErrors.leaderSignature}</p>}
              </div>
            )}
          </div>
        </div>

      </form>

      {/* ── Sticky bottom bar ── */}
      <div className="mf-bottom-bar">
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/meetings')}>
          Cancel
        </button>
        {isDraft ? (
          <>
            <button
              type="submit"
              form="meeting-form-el"
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => { approveModeRef.current = false; setApproveMode(false) }}
            >
              {loading && !approveMode ? 'Saving...' : 'Save Draft'}
            </button>
            <button
              type="submit"
              form="meeting-form-el"
              className="btn btn-approve"
              disabled={loading}
              onClick={() => { approveModeRef.current = true; setApproveMode(true) }}
            >
              {loading && approveMode ? 'Approving...' : 'Approve & Save'}
            </button>
          </>
        ) : (
          <button type="submit" form="meeting-form-el" className="btn btn-primary" disabled={loading}>
            {loading ? 'Saving...' : id ? 'Update Meeting' : 'Create Meeting'}
          </button>
        )}
      </div>

      {/* ── Checklist Modal ── */}
      {openChecklistModal && (
        <div className="checklist-modal-overlay" onClick={closeChecklistModal}>
          <div className="checklist-modal" onClick={(e) => e.stopPropagation()}>
            <div className="checklist-modal-header">
              <h3>{currentChecklist ? currentChecklist.name : 'Fill Checklist'}</h3>
              <button className="btn-close" onClick={closeChecklistModal}>×</button>
            </div>
            <div className="checklist-modal-body">
              {checklistItems.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                  <p>Loading checklist items...</p>
                </div>
              ) : (
                <>
                  <div className="checklist-items-container">
                    {checklistItems.map((item, index) => (
                      <div key={item.id} className="checklist-item-card">
                        <div className="checklist-item-header">
                          <label className="checklist-item-checkbox">
                            <input type="checkbox" checked={item.is_checked}
                              onChange={() => handleToggleChecklistItem(index)} />
                            <span className={item.is_checked ? 'checked' : ''}>{item.title}</span>
                          </label>
                        </div>
                        {item.description && <p className="checklist-item-description">{item.description}</p>}
                        <div className="checklist-item-notes">
                          <input type="text" className="form-input" placeholder="Notes (optional)"
                            value={item.notes}
                            onChange={(e) => handleChecklistItemNoteChange(index, e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="checklist-modal-footer-notes">
                    <label className="form-label">Overall Notes</label>
                    <textarea className="form-textarea" value={checklistNotes}
                      onChange={(e) => setChecklistNotes(e.target.value)}
                      placeholder="Additional notes about this checklist..." rows="3" />
                  </div>
                  {!id && (
                    <div style={{ padding: '12px', backgroundColor: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#92400e' }}>
                      <strong>Note:</strong> This checklist will be saved when you submit the meeting.
                    </div>
                  )}
                  <div className="checklist-modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeChecklistModal}>Cancel</button>
                    <button type="button" className="btn btn-primary" onClick={saveChecklistCompletion}>Save Checklist</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
