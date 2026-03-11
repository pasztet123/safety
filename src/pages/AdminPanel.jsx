import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchAllPages, supabase } from '../lib/supabase'
import { SAFETY_CATEGORIES } from '../lib/categories'
import SignaturePad from '../components/SignaturePad'
import AdminAnalyticsDashboard from '../components/AdminAnalyticsDashboard'
import './AdminPanel.css'

const ADMIN_TABS = [
  { key: 'meetings', label: 'Meetings' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'users', label: 'Users' },
  { key: 'leaders', label: 'Leaders' },
  { key: 'involved-persons', label: 'Workers & Subs' },
  { key: 'companies', label: 'Companies' },
  { key: 'topic-checklists', label: 'Topic Checklists' },
  { key: 'settings', label: 'Settings' },
  { key: 'analytics', label: 'Analytics' },
]

export default function AdminPanel() {
  const navigate = useNavigate()
  const tabsRef = useRef(null)
  const newUserSignatureRef = useRef()
  const newLeaderSignatureRef = useRef()
  const editLeaderSignatureRef = useRef()
  const newInvolvedPersonSignatureRef = useRef()
  const editInvolvedPersonSignatureRef = useRef()
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminChecked, setAdminChecked] = useState(false)
  const [activeTab, setActiveTab] = useState('meetings')
  const [tabScrollState, setTabScrollState] = useState({ canScrollLeft: false, canScrollRight: false })

  // ── Topic → Checklist Suggestions tool ──
  const [tcTopics, setTcTopics] = useState([])
  const [tcChecklists, setTcChecklists] = useState([])
  const [tcSelectedTopicId, setTcSelectedTopicId] = useState('')
  const [tcSuggestions, setTcSuggestions] = useState([])
  const [tcTopicSearch, setTcTopicSearch] = useState('')
  const [tcChecklistSearch, setTcChecklistSearch] = useState('')
  const [tcEditingTradesId, setTcEditingTradesId] = useState('')
  const [tcTradeInput, setTcTradeInput] = useState('')
  const [tcPendingTrades, setTcPendingTrades] = useState([])

  // ── Settings: Featured Categories ──
  const [settingsAllCategories, setSettingsAllCategories] = useState([]) // all unique cats from safety_topics
  const [settingsFeatured, setSettingsFeatured] = useState([]) // [{id, category, display_order}] from DB
  const [settingsSaving, setSettingsSaving] = useState(false)

  // ── Settings: Featured Topics ──
  const [settingsAllTopics, setSettingsAllTopics] = useState([]) // all topics from safety_topics
  const [settingsFeaturedTopics, setSettingsFeaturedTopics] = useState([]) // [{topic_id, topic:{id,name,category}, display_order}]
  const [settingsTopicSearch, setSettingsTopicSearch] = useState('')
  const [settingsTopicsSaving, setSettingsTopicsSaving] = useState(false)

  // ── Settings: Featured Trades ──
  const [settingsAllTrades, setSettingsAllTrades] = useState([]) // all trade names from trades table
  const [settingsFeaturedTrades, setSettingsFeaturedTrades] = useState([]) // [{id, trade, display_order}]
  const [settingsTradesSaving, setSettingsTradesSaving] = useState(false)
  const [meetings, setMeetings] = useState([])
  const [incidents, setIncidents] = useState([])
  const [users, setUsers] = useState([])
  const [leaders, setLeaders] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Form states
  const [showUserForm, setShowUserForm] = useState(false)
  const [showLeaderForm, setShowLeaderForm] = useState(false)
  const [showInvolvedPersonForm, setShowInvolvedPersonForm] = useState(false)
  const [showCompanyForm, setShowCompanyForm] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editingLeader, setEditingLeader] = useState(null)
  const [editingInvolvedPerson, setEditingInvolvedPerson] = useState(null)
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', is_admin: false })
  const [newUserShowSignature, setNewUserShowSignature] = useState(false)
  const [newLeader, setNewLeader] = useState({ name: '', email: '', phone: '' })
  const [newLeaderShowSignature, setNewLeaderShowSignature] = useState(false)
  const [editLeaderShowSignature, setEditLeaderShowSignature] = useState(false)
  const [newInvolvedPerson, setNewInvolvedPerson] = useState({ name: '', email: '', phone: '', company_id: '' })
  const [newInvolvedPersonShowSignature, setNewInvolvedPersonShowSignature] = useState(false)
  const [editInvolvedPersonShowSignature, setEditInvolvedPersonShowSignature] = useState(false)
  const [newCompany, setNewCompany] = useState({ name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', website: '' })

  // ── Draft leader migration ──
  const [draftMigrationRunning, setDraftMigrationRunning] = useState(false)
  const [draftMigrationResult, setDraftMigrationResult] = useState(null) // { updated, skipped, total }

  // Batch-fix leader_name/leader_id on all draft meetings.
  // Logic mirrors autoDetectLeader: for each draft, look at attendees and find
  // the first one linked to a leader (via involved_persons.leader_id) or whose
  // name matches a leader directly.
  const handleFixDraftLeaders = async () => {
    if (!window.confirm(
      'This will update leader_name and leader_id on ALL draft meetings based on their attendees. Approved (non-draft) meetings will NOT be touched. Continue?'
    )) return

    setDraftMigrationRunning(true)
    setDraftMigrationResult(null)
    try {
      // 1. Load everything we need in parallel
      const [draftsRes, leadersRes, involvedRes] = await Promise.all([
        supabase
          .from('meetings')
          .select('id, leader_id, leader_name, attendees:meeting_attendees(name)')
          .eq('is_draft', true),
        supabase
          .from('leaders')
          .select('id, name, default_signature_url')
          .order('name'),
        supabase
          .from('involved_persons')
          .select('name, leader_id'),
      ])

      const allDrafts    = draftsRes.data    || []
      const allLeaders   = leadersRes.data   || []
      const allPersons   = involvedRes.data  || []

      // Build lookup maps
      const personByName  = {}  // lowercase name → { leader_id }
      allPersons.forEach(p => { personByName[(p.name || '').toLowerCase().trim()] = p })
      const leaderById   = {}  // id → leader
      const leaderByName = {}  // lowercase name → leader
      allLeaders.forEach(l => {
        leaderById[l.id]  = l
        leaderByName[(l.name || '').toLowerCase().trim()] = l
      })

      // 2. For each draft decide the correct leader
      const updates = []  // { id, leader_id, leader_name }
      let skipped   = 0

      for (const draft of allDrafts) {
        const attendees = draft.attendees || []
        let found = null

        // Pass 1: via involved_persons.leader_id
        for (const a of attendees) {
          const key = (a.name || '').toLowerCase().trim()
          const person = personByName[key]
          if (person?.leader_id && leaderById[person.leader_id]) {
            found = leaderById[person.leader_id]
            break
          }
        }
        // Pass 2: attendee IS a leader (direct name match)
        if (!found) {
          for (const a of attendees) {
            const key = (a.name || '').toLowerCase().trim()
            if (leaderByName[key]) { found = leaderByName[key]; break }
          }
        }

        if (!found) { skipped++; continue }

        // Only queue update if something actually changes
        if (found.id !== draft.leader_id || found.name !== draft.leader_name) {
          updates.push({ id: draft.id, leader_id: found.id, leader_name: found.name })
        } else {
          skipped++
        }
      }

      // 3. Apply updates in batches of 50
      const BATCH = 50
      for (let i = 0; i < updates.length; i += BATCH) {
        const batch = updates.slice(i, i + BATCH)
        // Supabase JS v2 doesn't support bulk upsert by different IDs in one call,
        // so we fire parallel updates within the batch
        await Promise.all(
          batch.map(u =>
            supabase
              .from('meetings')
              .update({ leader_id: u.leader_id, leader_name: u.leader_name })
              .eq('id', u.id)
          )
        )
      }

      setDraftMigrationResult({ updated: updates.length, skipped, total: allDrafts.length })
    } catch (err) {
      console.error('Draft leader migration error:', err)
      alert('Migration error: ' + err.message)
    } finally {
      setDraftMigrationRunning(false)
    }
  }

  useEffect(() => {
    checkAdmin()
  }, [])

  useEffect(() => {
    if (!adminChecked || !isAdmin) return

    fetchData()
    if (activeTab === 'involved-persons') {
      fetchCompaniesForSelect()
    }
  }, [activeTab, adminChecked, isAdmin])

  useEffect(() => {
    const tabsNode = tabsRef.current
    if (!tabsNode) return undefined

    const updateTabScrollState = () => {
      const maxScrollLeft = tabsNode.scrollWidth - tabsNode.clientWidth
      setTabScrollState({
        canScrollLeft: tabsNode.scrollLeft > 4,
        canScrollRight: maxScrollLeft - tabsNode.scrollLeft > 4,
      })
    }

    updateTabScrollState()
    tabsNode.addEventListener('scroll', updateTabScrollState, { passive: true })
    window.addEventListener('resize', updateTabScrollState)

    return () => {
      tabsNode.removeEventListener('scroll', updateTabScrollState)
      window.removeEventListener('resize', updateTabScrollState)
    }
  }, [adminChecked, isAdmin])

  useEffect(() => {
    const tabsNode = tabsRef.current
    if (!tabsNode) return

    const activeButton = tabsNode.querySelector('.admin-tab.active')
    if (!activeButton) return

    activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeTab])

  const scrollTabsBy = (direction) => {
    const tabsNode = tabsRef.current
    if (!tabsNode) return

    const amount = Math.max(180, Math.round(tabsNode.clientWidth * 0.45))
    tabsNode.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  const closeLeaderEditModal = () => {
    setEditingLeader(null)
    setEditLeaderShowSignature(false)
    if (editLeaderSignatureRef.current) {
      editLeaderSignatureRef.current.clear()
    }
  }

  const closeInvolvedPersonEditModal = () => {
    setEditingInvolvedPerson(null)
    setEditInvolvedPersonShowSignature(false)
    if (editInvolvedPersonSignatureRef.current) {
      editInvolvedPersonSignatureRef.current.clear()
    }
  }

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/')
      return
    }

    const { data } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (!data?.is_admin) {
      navigate('/meetings')
      return
    }

    setIsAdmin(true)
    setAdminChecked(true)
  }

  const fetchCompaniesForSelect = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')
    if (data) setCompanies(data)
  }

  const fetchData = async () => {
    setLoading(true)

    if (activeTab === 'analytics') {
      setLoading(false)
      return
    }
    
    if (activeTab === 'meetings') {
      const data = await fetchAllPages(() => supabase
        .from('meetings')
        .select(`
          *,
          project:projects(name)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }))
      if (data) setMeetings(data)
    } else if (activeTab === 'incidents') {
      const { data } = await supabase
        .from('incidents')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false })
      if (data) setIncidents(data)
    } else if (activeTab === 'users') {
      const { data } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) setUsers(data)
    } else if (activeTab === 'leaders') {
      const { data } = await supabase
        .from('leaders')
        .select('*')
        .order('name')
      if (data) setLeaders(data)
    } else if (activeTab === 'involved-persons') {
      const { data } = await supabase
        .from('involved_persons')
        .select('*, company:companies(name)')
        .order('name')
      if (data) setInvolvedPersons(data)
    } else if (activeTab === 'companies') {
      const { data } = await supabase
        .from('companies')
        .select('*')
        .order('name')
      if (data) setCompanies(data)
    } else if (activeTab === 'topic-checklists') {
      await fetchTcData()
    } else if (activeTab === 'settings') {
      await fetchSettingsData()
    }
    
    setLoading(false)
  }

  const fetchTcData = async () => {
    const [{ data: topics }, { data: cls }] = await Promise.all([
      supabase.from('safety_topics').select('id, name, category, trades').order('category').order('name'),
      supabase.from('checklists').select('id, name, category').order('name')
    ])
    if (topics) setTcTopics(topics)
    if (cls) setTcChecklists(cls)
  }

  const fetchSettingsData = async () => {
    const [{ data: featCatData }, { data: featTopicsData }, { data: allTopicsData }, { data: featTradesData }, { data: allTradesData }] = await Promise.all([
      supabase.from('featured_categories').select('*').order('display_order'),
      supabase.from('featured_topics').select('topic_id, display_order, topic:safety_topics(id, name, category)').order('display_order'),
      supabase.from('safety_topics').select('id, name, category').order('category').order('name'),
      supabase.from('featured_trades').select('*').order('display_order'),
      supabase.from('trades').select('name').order('name')
    ])
    setSettingsAllCategories(SAFETY_CATEGORIES)
    if (featCatData) setSettingsFeatured(featCatData)
    if (featTopicsData) setSettingsFeaturedTopics(featTopicsData.filter(r => r.topic))
    if (allTopicsData) setSettingsAllTopics(allTopicsData)
    if (featTradesData) setSettingsFeaturedTrades(featTradesData)
    if (allTradesData) setSettingsAllTrades(allTradesData.map(r => r.name))
  }

  const settingsToggleFeatured = (cat) => {
    const existing = settingsFeatured.find(f => f.category === cat)
    if (existing) {
      // Remove from featured
      setSettingsFeatured(prev => prev.filter(f => f.category !== cat)
        .map((f, i) => ({ ...f, display_order: i })))
    } else {
      // Add at end
      setSettingsFeatured(prev => [...prev, { id: null, category: cat, display_order: prev.length }])
    }
  }

  const settingsMoveUp = (idx) => {
    if (idx === 0) return
    setSettingsFeatured(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr.map((f, i) => ({ ...f, display_order: i }))
    })
  }

  const settingsMoveDown = (idx) => {
    setSettingsFeatured(prev => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr.map((f, i) => ({ ...f, display_order: i }))
    })
  }

  const settingsSave = async () => {
    setSettingsSaving(true)
    // Delete all existing, then re-insert in order
    await supabase.from('featured_categories').delete().gte('display_order', 0)
    if (settingsFeatured.length > 0) {
      await supabase.from('featured_categories').insert(
        settingsFeatured.map((f, i) => ({ category: f.category, display_order: i }))
      )
    }
    setSettingsSaving(false)
    await fetchSettingsData()
    alert('Featured categories saved!')
  }

  const settingsToggleFeaturedTopic = (topic) => {
    const exists = settingsFeaturedTopics.find(f => f.topic_id === topic.id)
    if (exists) {
      setSettingsFeaturedTopics(prev => prev.filter(f => f.topic_id !== topic.id).map((f, i) => ({ ...f, display_order: i })))
    } else {
      setSettingsFeaturedTopics(prev => [...prev, { topic_id: topic.id, topic: { id: topic.id, name: topic.name, category: topic.category }, display_order: prev.length }])
    }
  }

  const settingsTopicMoveUp = (idx) => {
    if (idx === 0) return
    setSettingsFeaturedTopics(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr.map((f, i) => ({ ...f, display_order: i }))
    })
  }

  const settingsTopicMoveDown = (idx) => {
    setSettingsFeaturedTopics(prev => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr.map((f, i) => ({ ...f, display_order: i }))
    })
  }

  const settingsSaveTopics = async () => {
    setSettingsTopicsSaving(true)
    await supabase.from('featured_topics').delete().gte('display_order', 0)
    if (settingsFeaturedTopics.length > 0) {
      await supabase.from('featured_topics').insert(
        settingsFeaturedTopics.map((f, i) => ({ topic_id: f.topic_id, display_order: i }))
      )
    }
    setSettingsTopicsSaving(false)
    await fetchSettingsData()
    alert('Featured topics saved!')
  }

  const settingsToggleFeaturedTrade = (trade) => {
    const exists = settingsFeaturedTrades.find(f => f.trade === trade)
    if (exists) {
      setSettingsFeaturedTrades(prev => prev.filter(f => f.trade !== trade).map((f, i) => ({ ...f, display_order: i })))
    } else {
      setSettingsFeaturedTrades(prev => [...prev, { id: null, trade, display_order: prev.length }])
    }
  }

  const settingsTradeMoveUp = (idx) => {
    if (idx === 0) return
    setSettingsFeaturedTrades(prev => {
      const arr = [...prev]
      ;[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]
      return arr.map((f, i) => ({ ...f, display_order: i }))
    })
  }

  const settingsTradeMoveDown = (idx) => {
    setSettingsFeaturedTrades(prev => {
      if (idx >= prev.length - 1) return prev
      const arr = [...prev]
      ;[arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]
      return arr.map((f, i) => ({ ...f, display_order: i }))
    })
  }

  const settingsSaveTrades = async () => {
    setSettingsTradesSaving(true)
    await supabase.from('featured_trades').delete().gte('display_order', 0)
    if (settingsFeaturedTrades.length > 0) {
      await supabase.from('featured_trades').insert(
        settingsFeaturedTrades.map((f, i) => ({ trade: f.trade, display_order: i }))
      )
    }
    setSettingsTradesSaving(false)
    await fetchSettingsData()
    alert('Featured trades saved!')
  }

  const saveTcTopicTrades = async (topicId, trades) => {
    const { error } = await supabase
      .from('safety_topics')
      .update({ trades })
      .eq('id', topicId)
    if (!error) {
      setTcTopics(prev => prev.map(t => t.id === topicId ? { ...t, trades } : t))
      setTcEditingTradesId('')
      setTcTradeInput('')
    } else {
      alert('Error saving trades: ' + error.message)
    }
  }

  const fetchTcSuggestions = async (topicId) => {
    if (!topicId) { setTcSuggestions([]); return }
    const { data } = await supabase
      .from('topic_checklist_suggestions')
      .select('checklist_id')
      .eq('topic_id', topicId)
    if (data) setTcSuggestions(data.map(r => r.checklist_id))
  }

  const toggleTcChecklist = async (checklistId) => {
    if (!tcSelectedTopicId) return
    const isSelected = tcSuggestions.includes(checklistId)
    if (isSelected) {
      const { error } = await supabase.from('topic_checklist_suggestions')
        .delete()
        .eq('topic_id', tcSelectedTopicId)
        .eq('checklist_id', checklistId)
      if (!error) setTcSuggestions(prev => prev.filter(id => id !== checklistId))
    } else {
      const { error } = await supabase.from('topic_checklist_suggestions')
        .insert([{ topic_id: tcSelectedTopicId, checklist_id: checklistId }])
      if (!error) setTcSuggestions(prev => [...prev, checklistId])
    }
  }

  const handleDeleteMeeting = async (id) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return
    
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    } else {
      alert('Error deleting meeting: ' + error.message)
    }
  }

  const handleDeleteIncident = async (id) => {
    if (!confirm('Are you sure you want to delete this incident?')) return
    
    const { error } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload default signature if present
      let defaultSignatureUrl = null
      if (newUserSignatureRef.current && !newUserSignatureRef.current.isEmpty()) {
        const signatureBlob = await fetch(newUserSignatureRef.current.toDataURL()).then(r => r.blob())
        const signatureFile = `default-signature-${Date.now()}.png`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(signatureFile, signatureBlob)

        if (uploadError) {
          console.error('Error uploading signature:', uploadError)
          alert('Error uploading signature. User will be created without default signature.')
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('signatures')
            .getPublicUrl(signatureFile)
          defaultSignatureUrl = publicUrl
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: newUser.email,
            password: newUser.password,
            name: newUser.name,
            is_admin: newUser.is_admin,
            default_signature_url: defaultSignatureUrl,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        console.error('Edge Function error:', data)
        alert(`Error creating user (${response.status}): ${data.error || JSON.stringify(data)}`)
      } else {
        alert('User created successfully!')
        setNewUser({ email: '', password: '', name: '', is_admin: false })
        setNewUserShowSignature(false)
        if (newUserSignatureRef.current) {
          newUserSignatureRef.current.clear()
        }
        setShowUserForm(false)
        fetchData()
      }
    } catch (error) {
      console.error('Request error:', error)
      alert(`Request failed: ${error.message}`)
    }
    
    setLoading(false)
  }

  const handleDeleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: id }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(`Error deleting user: ${data.error}`)
      } else {
        fetchData()
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    }

    setLoading(false)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('users')
      .update({
        name: editingUser.name,
        is_admin: editingUser.is_admin
      })
      .eq('id', editingUser.id)

    if (error) {
      alert(`Error updating user: ${error.message}`)
    } else {
      setEditingUser(null)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleResetPassword = async (userId, userEmail) => {
    const newPassword = prompt(`Enter new password for ${userEmail}:`)
    
    if (!newPassword) return
    
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        alert(`Error resetting password: ${data.error}`)
      } else {
        alert(`Password successfully reset for ${userEmail}`)
      }
    } catch (error) {
      alert(`Error: ${error.message}`)
    }

    setLoading(false)
  }

  const handleAddLeader = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Upload default signature if present
    let defaultSignatureUrl = null
    if (newLeaderSignatureRef.current && !newLeaderSignatureRef.current.isEmpty()) {
      const signatureBlob = await fetch(newLeaderSignatureRef.current.toDataURL()).then(r => r.blob())
      const signatureFile = `leader-signature-${Date.now()}.png`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(signatureFile, signatureBlob)

      if (uploadError) {
        console.error('Error uploading signature:', uploadError)
        alert('Error uploading signature. Leader will be added without default signature.')
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('signatures')
          .getPublicUrl(signatureFile)
        defaultSignatureUrl = publicUrl
      }
    }

    const dataToInsert = {
      ...newLeader,
      default_signature_url: defaultSignatureUrl
    }

    const { error } = await supabase
      .from('leaders')
      .insert([dataToInsert])

    if (error) {
      alert(`Error adding leader: ${error.message}`)
    } else {
      setNewLeader({ name: '', email: '', phone: '' })
      setNewLeaderShowSignature(false)
      if (newLeaderSignatureRef.current) {
        newLeaderSignatureRef.current.clear()
      }
      setShowLeaderForm(false)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleUpdateLeader = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Upload default signature if present
    let defaultSignatureUrl = null
    if (editLeaderSignatureRef.current && !editLeaderSignatureRef.current.isEmpty()) {
      const signatureBlob = await fetch(editLeaderSignatureRef.current.toDataURL()).then(r => r.blob())
      const signatureFile = `leader-signature-${Date.now()}.png`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(signatureFile, signatureBlob)

      if (uploadError) {
        console.error('Error uploading signature:', uploadError)
        alert('Error uploading signature. Update will proceed without changing signature.')
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('signatures')
          .getPublicUrl(signatureFile)
        defaultSignatureUrl = publicUrl
      }
    }

    const dataToUpdate = {
      name: editingLeader.name,
      email: editingLeader.email || null,
      phone: editingLeader.phone || null
    }

    // Only update signature URL if a new one was uploaded
    if (defaultSignatureUrl) {
      dataToUpdate.default_signature_url = defaultSignatureUrl
    }

    const { error } = await supabase
      .from('leaders')
      .update(dataToUpdate)
      .eq('id', editingLeader.id)

    if (error) {
      alert(`Error updating leader: ${error.message}`)
    } else {
      // If a new default signature was uploaded, offer to propagate it to associated draft meetings
      if (defaultSignatureUrl) {
        const allDraftMeetings = await fetchAllPages(() => supabase
          .from('meetings')
          .select('id')
          .eq('leader_id', editingLeader.id)
          .eq('is_draft', true))

        if (allDraftMeetings && allDraftMeetings.length > 0) {
          const count = allDraftMeetings.length
          const apply = window.confirm(
            `There ${count === 1 ? 'is' : 'are'} ${count} draft meeting${count !== 1 ? 's' : ''} associated with ${editingLeader.name}. Would you like to update their leader signature with the new default?`
          )
          if (apply) {
            await supabase
              .from('meetings')
              .update({ signature_url: defaultSignatureUrl })
              .in('id', allDraftMeetings.map(m => m.id))
          }
        }
      }

      setEditingLeader(null)
      setEditLeaderShowSignature(false)
      if (editLeaderSignatureRef.current) {
        editLeaderSignatureRef.current.clear()
      }
      fetchData()
    }
    
    setLoading(false)
  }

  const handleDeleteLeader = async (id) => {
    if (!confirm('Are you sure you want to delete this leader?')) return
    
    const { error } = await supabase
      .from('leaders')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleAddInvolvedPerson = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Upload default signature if present
    let defaultSignatureUrl = null
    if (newInvolvedPersonSignatureRef.current && !newInvolvedPersonSignatureRef.current.isEmpty()) {
      const signatureBlob = await fetch(newInvolvedPersonSignatureRef.current.toDataURL()).then(r => r.blob())
      const signatureFile = `involved-person-signature-${Date.now()}.png`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(signatureFile, signatureBlob)

      if (uploadError) {
        console.error('Error uploading signature:', uploadError)
        alert('Error uploading signature. Person will be added without default signature.')
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('signatures')
          .getPublicUrl(signatureFile)
        defaultSignatureUrl = publicUrl
      }
    }

    const dataToInsert = {
      name: newInvolvedPerson.name,
      email: newInvolvedPerson.email || null,
      phone: newInvolvedPerson.phone || null,
      company_id: newInvolvedPerson.company_id || null,
      default_signature_url: defaultSignatureUrl,
      created_by: user?.id || null,
      updated_by: user?.id || null
    }

    const { error } = await supabase
      .from('involved_persons')
      .insert([dataToInsert])

    if (error) {
      alert(`Error adding involved person: ${error.message}`)
    } else {
      setNewInvolvedPerson({ name: '', email: '', phone: '', company_id: '' })
      setNewInvolvedPersonShowSignature(false)
      if (newInvolvedPersonSignatureRef.current) {
        newInvolvedPersonSignatureRef.current.clear()
      }
      setShowInvolvedPersonForm(false)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleUpdateInvolvedPerson = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    // Upload new signature if present
    let defaultSignatureUrl = editingInvolvedPerson.default_signature_url
    if (editInvolvedPersonSignatureRef.current && !editInvolvedPersonSignatureRef.current.isEmpty()) {
      const signatureBlob = await fetch(editInvolvedPersonSignatureRef.current.toDataURL()).then(r => r.blob())
      const signatureFile = `involved-person-signature-${Date.now()}.png`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('signatures')
        .upload(signatureFile, signatureBlob)

      if (uploadError) {
        console.error('Error uploading signature:', uploadError)
        alert('Error uploading signature. Update will proceed without changing signature.')
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('signatures')
          .getPublicUrl(signatureFile)
        defaultSignatureUrl = publicUrl
      }
    }

    const dataToUpdate = {
      name: editingInvolvedPerson.name,
      email: editingInvolvedPerson.email || null,
      phone: editingInvolvedPerson.phone || null,
      company_id: editingInvolvedPerson.company_id || null,
      updated_by: user?.id || null
    }

    // Only update signature URL if a new one was uploaded
    if (defaultSignatureUrl) {
      dataToUpdate.default_signature_url = defaultSignatureUrl
    }

    const { error } = await supabase
      .from('involved_persons')
      .update(dataToUpdate)
      .eq('id', editingInvolvedPerson.id)

    if (error) {
      alert(`Error updating involved person: ${error.message}`)
    } else {
      setEditingInvolvedPerson(null)
      setEditInvolvedPersonShowSignature(false)
      if (editInvolvedPersonSignatureRef.current) {
        editInvolvedPersonSignatureRef.current.clear()
      }
      fetchData()
    }
    
    setLoading(false)
  }

  const handleDeleteInvolvedPerson = async (id) => {
    if (!confirm('Are you sure you want to delete this involved person?')) return
    
    const { error } = await supabase
      .from('involved_persons')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  const handleAddCompany = async (e) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from('companies')
      .insert([newCompany])

    if (error) {
      alert(`Error adding company: ${error.message}`)
    } else {
      setNewCompany({ name: '', address: '', city: '', state: '', zip: '', phone: '', email: '', website: '' })
      setShowCompanyForm(false)
      fetchData()
    }
    
    setLoading(false)
  }

  const handleDeleteCompany = async (id) => {
    if (!confirm('Are you sure you want to delete this company?')) return
    
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchData()
    }
  }

  if (!adminChecked) {
    return <div className="spinner"></div>
  }

  return (
    <div className="admin-panel">
      <h2 className="page-title">Admin Panel</h2>

      <div className="admin-tabs-shell">
        <button
          type="button"
          className={`admin-tabs-arrow admin-tabs-arrow-left ${!tabScrollState.canScrollLeft ? 'is-hidden' : ''}`}
          onClick={() => scrollTabsBy(-1)}
          aria-label="Scroll tabs left"
          disabled={!tabScrollState.canScrollLeft}
        >
          ‹
        </button>
        <div className="admin-tabs" ref={tabsRef}>
          {ADMIN_TABS.map((tab) => (
            <button
              key={tab.key}
              className={`admin-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`admin-tabs-arrow admin-tabs-arrow-right ${!tabScrollState.canScrollRight ? 'is-hidden' : ''}`}
          onClick={() => scrollTabsBy(1)}
          aria-label="Scroll tabs right"
          disabled={!tabScrollState.canScrollRight}
        >
          ›
        </button>
      </div>

      {loading ? (
        <div className="spinner"></div>
      ) : (
        <div className="admin-content">
          {activeTab === 'analytics' && <AdminAnalyticsDashboard />}

          {activeTab === 'meetings' && (
            <div className="data-table">
              <h3 className="section-title">All Meetings ({meetings.length})</h3>
              {meetings.length === 0 ? (
                <p>No meetings found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Topic</th>
                        <th>Leader</th>
                        <th>Project</th>
                        <th>Location</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {meetings.map((meeting) => (
                        <tr key={meeting.id}>
                          <td>{new Date(meeting.date).toLocaleDateString()}</td>
                          <td>{meeting.topic}</td>
                          <td>{meeting.leader_name}</td>
                          <td>{meeting.project?.name || '-'}</td>
                          <td>{meeting.location || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteMeeting(meeting.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="data-table">
              <h3 className="section-title">All Incidents ({incidents.length})</h3>
              {incidents.length === 0 ? (
                <p>No incidents found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Employee</th>
                        <th>Reporter</th>
                        <th>Project</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident) => (
                        <tr key={incident.id}>
                          <td>{new Date(incident.date).toLocaleDateString()}</td>
                          <td>
                            <span className="type-badge">{incident.type_name}</span>
                          </td>
                          <td>{incident.employee_name}</td>
                          <td>{incident.reporter_name}</td>
                          <td>{incident.project?.name || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteIncident(incident.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Users ({users.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowUserForm(!showUserForm)}>
                  {showUserForm ? 'Cancel' : '+ Add User'}
                </button>
              </div>

              {editingUser && (
                <form className="form-card" onSubmit={handleUpdateUser}>
                  <h4>Edit User</h4>
                  <div className="form-group">
                    <label>Email (read-only)</label>
                    <input
                      type="email"
                      value={editingUser.email}
                      disabled
                      style={{ backgroundColor: '#f5f5f5' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingUser.is_admin}
                        onChange={(e) => setEditingUser({...editingUser, is_admin: e.target.checked})}
                      />
                      Admin Access
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update User'}
                    </button>
                    <button type="button" className="btn" onClick={() => setEditingUser(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {showUserForm && (
                <form className="form-card" onSubmit={handleAddUser}>
                  <h4>Add New User</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newUser.is_admin}
                        onChange={(e) => setNewUser({...newUser, is_admin: e.target.checked})}
                      />
                      Admin Access
                    </label>
                  </div>
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newUserShowSignature}
                        onChange={(e) => setNewUserShowSignature(e.target.checked)}
                      />
                      Add default signature (optional)
                    </label>
                  </div>
                  
                  {newUserShowSignature && (
                    <div className="form-group">
                      <label>Default Signature</label>
                      <div style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '8px',
                        marginTop: '8px'
                      }}>
                        <SignaturePad
                          ref={newUserSignatureRef}
                          height={150}
                          style={{ borderRadius: '8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: '8px' }}
                        onClick={() => newUserSignatureRef.current?.clear()}
                      >
                        Clear Signature
                      </button>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                        This signature will be automatically loaded when the user adds a drawn signature in meetings.
                      </p>
                    </div>
                  )}
                  
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add User'}
                  </button>
                </form>
              )}

              {users.length === 0 ? (
                <p>No users found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Admin</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.email}</td>
                          <td>{user.is_admin ? '✓' : '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                onClick={() => setEditingUser(user)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => handleResetPassword(user.id, user.email)}
                              >
                                Reset Password
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'leaders' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Leaders ({leaders.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowLeaderForm(!showLeaderForm)}>
                  {showLeaderForm ? 'Cancel' : '+ Add Leader'}
                </button>
              </div>

              {showLeaderForm && (
                <form className="form-card" onSubmit={handleAddLeader}>
                  <h4>Add New Leader</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newLeader.name}
                      onChange={(e) => setNewLeader({...newLeader, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newLeader.email}
                      onChange={(e) => setNewLeader({...newLeader, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newLeader.phone}
                      onChange={(e) => setNewLeader({...newLeader, phone: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newLeaderShowSignature}
                        onChange={(e) => setNewLeaderShowSignature(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Add Default Signature</span>
                    </label>
                  </div>

                  {newLeaderShowSignature && (
                    <div className="form-group">
                      <label>Default Signature</label>
                      <div style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '8px',
                        marginTop: '8px'
                      }}>
                        <SignaturePad
                          ref={newLeaderSignatureRef}
                          height={150}
                          style={{ borderRadius: '8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => newLeaderSignatureRef.current?.clear()}
                        style={{ marginTop: '8px' }}
                      >
                        Clear Signature
                      </button>
                    </div>
                  )}
                  
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Leader'}
                  </button>
                </form>
              )}

              {leaders.length === 0 ? (
                <p>No leaders found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaders.map((leader) => (
                        <tr key={leader.id}>
                          <td>{leader.name}</td>
                          <td>{leader.email || '-'}</td>
                          <td>{leader.phone || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => {
                                  setEditingLeader(leader)
                                  setShowLeaderForm(false)
                                  setEditLeaderShowSignature(false)
                                  if (editLeaderSignatureRef.current) {
                                    editLeaderSignatureRef.current.clear()
                                  }
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteLeader(leader.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'involved-persons' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Workers & Subs ({involvedPersons.length})</h3>
                <button className="btn btn-primary" onClick={() => {
                  setShowInvolvedPersonForm(!showInvolvedPersonForm)
                  setEditingInvolvedPerson(null)
                }}>
                  {showInvolvedPersonForm ? 'Cancel' : '+ Add Worker/Sub'}
                </button>
              </div>

              {showInvolvedPersonForm && (
                <form className="form-card" onSubmit={handleAddInvolvedPerson}>
                  <h4>Add New Involved Person</h4>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={newInvolvedPerson.name}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newInvolvedPerson.email}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newInvolvedPerson.phone}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <select
                      value={newInvolvedPerson.company_id}
                      onChange={(e) => setNewInvolvedPerson({...newInvolvedPerson, company_id: e.target.value})}
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={newInvolvedPersonShowSignature}
                        onChange={(e) => setNewInvolvedPersonShowSignature(e.target.checked)}
                      />
                      Add default signature (optional)
                    </label>
                  </div>
                  
                  {newInvolvedPersonShowSignature && (
                    <div className="form-group">
                      <label>Default Signature</label>
                      <div style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '8px',
                        marginTop: '8px'
                      }}>
                        <SignaturePad
                          ref={newInvolvedPersonSignatureRef}
                          height={150}
                          style={{ borderRadius: '8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: '8px' }}
                        onClick={() => newInvolvedPersonSignatureRef.current?.clear()}
                      >
                        Clear Signature
                      </button>
                      <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '8px' }}>
                        This signature will be automatically loaded when this person adds a drawn signature in meetings.
                      </p>
                    </div>
                  )}
                  
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Worker/Sub'}
                  </button>
                </form>
              )}

              {involvedPersons.length === 0 ? (
                <p>No workers or subs found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Company</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {involvedPersons.map((person) => (
                        <tr key={person.id}>
                          <td>{person.name}</td>
                          <td>{person.email || '-'}</td>
                          <td>{person.phone || '-'}</td>
                          <td>{person.company?.name || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon"
                                onClick={() => {
                                  setEditingInvolvedPerson(person)
                                  setEditInvolvedPersonShowSignature(false)
                                  setShowInvolvedPersonForm(false)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteInvolvedPerson(person.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {editingLeader && (
            <div className="admin-edit-modal-overlay" onClick={closeLeaderEditModal}>
              <div className="admin-edit-modal" onClick={(event) => event.stopPropagation()}>
                <form className="form-card admin-edit-form-card" onSubmit={handleUpdateLeader}>
                  <div className="admin-edit-modal-header">
                    <h4>Edit Leader</h4>
                    <button type="button" className="admin-edit-modal-close" onClick={closeLeaderEditModal}>×</button>
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editingLeader.name}
                      onChange={(e) => setEditingLeader({...editingLeader, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editingLeader.email || ''}
                      onChange={(e) => setEditingLeader({...editingLeader, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editingLeader.phone || ''}
                      onChange={(e) => setEditingLeader({...editingLeader, phone: e.target.value})}
                    />
                  </div>
                  
                  {editingLeader.default_signature_url && (
                    <div className="form-group">
                      <label>Current Default Signature</label>
                      <img 
                        src={editingLeader.default_signature_url}
                        alt="Current signature"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '150px',
                          border: '1px solid var(--color-border)', 
                          borderRadius: '8px',
                          display: 'block',
                          marginTop: '8px'
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editLeaderShowSignature}
                        onChange={(e) => setEditLeaderShowSignature(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span>Update Default Signature</span>
                    </label>
                  </div>

                  {editLeaderShowSignature && (
                    <div className="form-group">
                      <label>Default Signature</label>
                      <div style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '8px',
                        marginTop: '8px'
                      }}>
                        <SignaturePad
                          ref={editLeaderSignatureRef}
                          height={150}
                          style={{ borderRadius: '8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => editLeaderSignatureRef.current?.clear()}
                        style={{ marginTop: '8px' }}
                      >
                        Clear Signature
                      </button>
                    </div>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Leader'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={closeLeaderEditModal}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editingInvolvedPerson && (
            <div className="admin-edit-modal-overlay" onClick={closeInvolvedPersonEditModal}>
              <div className="admin-edit-modal" onClick={(event) => event.stopPropagation()}>
                <form className="form-card admin-edit-form-card" onSubmit={handleUpdateInvolvedPerson}>
                  <div className="admin-edit-modal-header">
                    <h4>Edit Worker/Sub</h4>
                    <button type="button" className="admin-edit-modal-close" onClick={closeInvolvedPersonEditModal}>×</button>
                  </div>
                  <div className="form-group">
                    <label>Name *</label>
                    <input
                      type="text"
                      value={editingInvolvedPerson.name}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={editingInvolvedPerson.email || ''}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={editingInvolvedPerson.phone || ''}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company</label>
                    <select
                      value={editingInvolvedPerson.company_id || ''}
                      onChange={(e) => setEditingInvolvedPerson({...editingInvolvedPerson, company_id: e.target.value})}
                    >
                      <option value="">Select Company</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>{company.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  {editingInvolvedPerson.default_signature_url && (
                    <div className="form-group">
                      <label>Current Default Signature</label>
                      <img 
                        src={editingInvolvedPerson.default_signature_url}
                        alt="Current signature"
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '150px',
                          border: '1px solid var(--color-border)', 
                          borderRadius: '8px',
                          display: 'block',
                          marginTop: '8px'
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={editInvolvedPersonShowSignature}
                        onChange={(e) => setEditInvolvedPersonShowSignature(e.target.checked)}
                      />
                      {editingInvolvedPerson.default_signature_url ? 'Update default signature' : 'Add default signature (optional)'}
                    </label>
                  </div>
                  
                  {editInvolvedPersonShowSignature && (
                    <div className="form-group">
                      <label>New Default Signature</label>
                      <div style={{ 
                        border: '1px solid var(--color-border)', 
                        borderRadius: '8px',
                        marginTop: '8px'
                      }}>
                        <SignaturePad
                          ref={editInvolvedPersonSignatureRef}
                          height={150}
                          style={{ borderRadius: '8px' }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ marginTop: '8px' }}
                        onClick={() => editInvolvedPersonSignatureRef.current?.clear()}
                      >
                        Clear Signature
                      </button>
                    </div>
                  )}
                  
                  <div className="form-row">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Involved Person'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={closeInvolvedPersonEditModal}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="data-table">
              <div className="section-header">
                <h3 className="section-title">Companies ({companies.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowCompanyForm(!showCompanyForm)}>
                  {showCompanyForm ? 'Cancel' : '+ Add Company'}
                </button>
              </div>

              {showCompanyForm && (
                <form className="form-card" onSubmit={handleAddCompany}>
                  <h4>Add New Company</h4>
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      value={newCompany.name}
                      onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <input
                      type="text"
                      value={newCompany.address}
                      onChange={(e) => setNewCompany({...newCompany, address: e.target.value})}
                    />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>City</label>
                      <input
                        type="text"
                        value={newCompany.city}
                        onChange={(e) => setNewCompany({...newCompany, city: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>State</label>
                      <input
                        type="text"
                        value={newCompany.state}
                        onChange={(e) => setNewCompany({...newCompany, state: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label>ZIP</label>
                      <input
                        type="text"
                        value={newCompany.zip}
                        onChange={(e) => setNewCompany({...newCompany, zip: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="tel"
                      value={newCompany.phone}
                      onChange={(e) => setNewCompany({...newCompany, phone: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={newCompany.email}
                      onChange={(e) => setNewCompany({...newCompany, email: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>Website</label>
                    <input
                      type="url"
                      value={newCompany.website}
                      onChange={(e) => setNewCompany({...newCompany, website: e.target.value})}
                      placeholder="https://"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Adding...' : 'Add Company'}
                  </button>
                </form>
              )}

              {companies.length === 0 ? (
                <p>No companies found.</p>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Address</th>
                        <th>City</th>
                        <th>Phone</th>
                        <th>Email</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map((company) => (
                        <tr key={company.id}>
                          <td>{company.name}</td>
                          <td>{company.address || '-'}</td>
                          <td>{company.city || '-'}</td>
                          <td>{company.phone || '-'}</td>
                          <td>{company.email || '-'}</td>
                          <td>
                            <div className="table-actions">
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDeleteCompany(company.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'topic-checklists' && (
            <div className="tc-tool">
              <h3 className="section-title">Topic → Checklist Suggestions</h3>
              <p className="tc-intro">Select a safety topic to configure which checklists are suggested when it's chosen in a new meeting. Changes save instantly.</p>
              <div className="tc-layout">
                <div className="tc-col tc-col--topics">
                  <div className="tc-col-header">Safety Topics</div>
                  <input
                    type="text"
                    className="form-input tc-search"
                    placeholder="Search topics..."
                    value={tcTopicSearch}
                    onChange={(e) => setTcTopicSearch(e.target.value)}
                  />
                  <div className="tc-list">
                    {tcTopics
                      .filter(t => !tcTopicSearch || t.name.toLowerCase().includes(tcTopicSearch.toLowerCase()))
                      .map(topic => (
                        <div key={topic.id} className="tc-topic-item-wrap">
                          <button
                            type="button"
                            className={`tc-topic-item ${tcSelectedTopicId === topic.id ? 'is-selected' : ''}`}
                            onClick={() => { setTcSelectedTopicId(topic.id); fetchTcSuggestions(topic.id) }}
                          >
                            <span className="tc-topic-name">{topic.name}</span>
                            {topic.category && <span className="tc-topic-cat">{topic.category}</span>}
                            {topic.trades && topic.trades.length > 0 && (
                              <div className="tc-topic-trades">
                                {topic.trades.map(t => <span key={t} className="tc-trade-badge">{t}</span>)}
                              </div>
                            )}
                          </button>
                          <button
                            type="button"
                            className="tc-trades-edit-btn"
                            title="Edit trades"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (tcEditingTradesId === topic.id) {
                                setTcEditingTradesId('')
                                setTcTradeInput('')
                              } else {
                                setTcEditingTradesId(topic.id)
                                setTcPendingTrades(topic.trades || [])
                                setTcTradeInput('')
                              }
                            }}
                          >✎</button>
                          {tcEditingTradesId === topic.id && (
                            <div className="tc-trades-editor">
                              <div className="tc-trades-pills">
                                {tcPendingTrades.map(t => (
                                  <span key={t} className="tc-trade-pill">
                                    {t}
                                    <button
                                      type="button"
                                      onClick={() => setTcPendingTrades(prev => prev.filter(x => x !== t))}
                                    >×</button>
                                  </span>
                                ))}
                                <input
                                  type="text"
                                  className="tc-trade-input"
                                  placeholder="Add trade…"
                                  value={tcTradeInput}
                                  onChange={(e) => setTcTradeInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if ((e.key === 'Enter' || e.key === ',') && tcTradeInput.trim()) {
                                      e.preventDefault()
                                      const val = tcTradeInput.trim().replace(/,$/, '')
                                      if (val && !tcPendingTrades.includes(val)) {
                                        setTcPendingTrades(prev => [...prev, val])
                                      }
                                      setTcTradeInput('')
                                    }
                                  }}
                                />
                              </div>
                              <div className="tc-trades-actions">
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    const finalTrades = tcTradeInput.trim()
                                      ? [...tcPendingTrades, tcTradeInput.trim()]
                                      : tcPendingTrades
                                    saveTcTopicTrades(topic.id, finalTrades)
                                  }}
                                >Save</button>
                                <button
                                  type="button"
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => { setTcEditingTradesId(''); setTcTradeInput('') }}
                                >Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
                <div className="tc-col tc-col--checklists">
                  {tcSelectedTopicId ? (
                    <>
                      <div className="tc-col-header">
                        Checklists
                        <span className="tc-count">{tcSuggestions.length} selected</span>
                      </div>
                      <input
                        type="text"
                        className="form-input tc-search"
                        placeholder="Search checklists..."
                        value={tcChecklistSearch}
                        onChange={(e) => setTcChecklistSearch(e.target.value)}
                      />
                      <div className="tc-list">
                        {tcChecklists
                          .filter(c => !tcChecklistSearch || c.name.toLowerCase().includes(tcChecklistSearch.toLowerCase()))
                          .map(checklist => (
                            <label
                              key={checklist.id}
                              className={`tc-checklist-row ${tcSuggestions.includes(checklist.id) ? 'is-selected' : ''}`}
                            >
                              <input
                                type="checkbox"
                                checked={tcSuggestions.includes(checklist.id)}
                                onChange={() => toggleTcChecklist(checklist.id)}
                              />
                              <div>
                                <div className="tc-checklist-name">{checklist.name}</div>
                                {checklist.category && <div className="tc-checklist-cat">{checklist.category}</div>}
                              </div>
                            </label>
                          ))}
                      </div>
                    </>
                  ) : (
                    <div className="tc-empty-state">← Select a topic to configure its suggested checklists</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Settings tab ── */}
          {activeTab === 'settings' && (
            <div>

              {/* ── Maintenance ── */}
              <div style={{ marginBottom: '40px', padding: '20px', background: '#fef9f0', border: '1.5px solid #fcd34d', borderRadius: '12px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: '#92400e' }}>Maintenance</h3>
                <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#78350f' }}>
                  One-time data repair tools. These operations modify records in the database directly.
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#374151', marginBottom: '4px' }}>Fix draft meeting leaders</div>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
                      Re-assigns correct leader on all draft meetings based on their attendees.<br/>
                      Only draft meetings are affected — approved meetings are untouched.
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleFixDraftLeaders}
                      disabled={draftMigrationRunning}
                    >
                      {draftMigrationRunning ? 'Running…' : 'Run migration'}
                    </button>
                    {draftMigrationResult && (
                      <span style={{ marginLeft: '14px', fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                        ✓ {draftMigrationResult.updated} updated, {draftMigrationResult.skipped} already correct (of {draftMigrationResult.total} drafts)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <h3 className="section-title">Topic Category Settings</h3>
              <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
                Choose which categories appear at the top of the Topic Picker in the meeting form.
                Drag or use arrows to reorder. Categories not listed here appear below the divider, alphabetically.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Featured list */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', marginBottom: '12px' }}>
                    Featured (shown first)
                  </div>
                  {settingsFeatured.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', border: '1.5px dashed #e2e8f0', borderRadius: '10px', fontSize: '14px' }}>
                      No featured categories yet — click a category on the right to add it
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {settingsFeatured.map((f, idx) => (
                        <li key={f.category} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', border: '1.5px solid #bfdbfe' }}>
                          <span style={{ width: '22px', height: '22px', background: '#3b82f6', borderRadius: '50%', color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 500, color: '#1e40af' }}>{f.category}</span>
                          <button type="button" onClick={() => settingsMoveUp(idx)} disabled={idx === 0}
                            style={{ background: 'none', border: '1px solid #93c5fd', borderRadius: '5px', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '3px 7px', fontSize: '12px', opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                          <button type="button" onClick={() => settingsMoveDown(idx)} disabled={idx === settingsFeatured.length - 1}
                            style={{ background: 'none', border: '1px solid #93c5fd', borderRadius: '5px', cursor: idx === settingsFeatured.length - 1 ? 'not-allowed' : 'pointer', padding: '3px 7px', fontSize: '12px', opacity: idx === settingsFeatured.length - 1 ? 0.4 : 1 }}>↓</button>
                          <button type="button" onClick={() => settingsToggleFeatured(f.category)}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '5px', cursor: 'pointer', padding: '3px 8px', fontSize: '12px', color: '#dc2626' }}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={settingsSave}
                    disabled={settingsSaving}
                    style={{ marginTop: '20px' }}
                  >
                    {settingsSaving ? 'Saving…' : 'Save Featured Categories'}
                  </button>
                </div>

                {/* All categories list */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', marginBottom: '12px' }}>
                    All Categories — click to feature
                  </div>
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {settingsAllCategories.map(cat => {
                      const isFeatured = settingsFeatured.some(f => f.category === cat)
                      return (
                        <li key={cat}>
                          <button
                            type="button"
                            onClick={() => settingsToggleFeatured(cat)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                              padding: '9px 14px', borderRadius: '8px', border: '1.5px solid',
                              borderColor: isFeatured ? '#bfdbfe' : '#e2e8f0',
                              background: isFeatured ? '#eff6ff' : 'white',
                              cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
                              color: isFeatured ? '#1d4ed8' : '#374151', textAlign: 'left',
                              transition: 'background 0.1s, border-color 0.1s',
                              fontWeight: isFeatured ? 600 : 400
                            }}
                          >
                            <span style={{ fontSize: '14px' }}>{isFeatured ? '★' : '☆'}</span>
                            <span style={{ flex: 1 }}>{cat}</span>
                            {isFeatured && (
                              <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 700 }}>
                                #{settingsFeatured.findIndex(f => f.category === cat) + 1}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </div>

              </div>

            {/* ── Featured Topics ── */}
            <div style={{ marginTop: '40px' }}>
              <h3 className="section-title">Featured Topics (Quick Picks)</h3>
              <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
                Pin specific topics that appear as large chip buttons at the very top of the Topic Picker — before the category accordion.
                Use this for the most common daily topics your crew actually uses.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Featured topics list */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', marginBottom: '12px' }}>
                    Quick Picks (shown first)
                  </div>
                  {settingsFeaturedTopics.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', border: '1.5px dashed #e2e8f0', borderRadius: '10px', fontSize: '14px' }}>
                      No featured topics yet — click a topic on the right to feature it
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {settingsFeaturedTopics.map((f, idx) => (
                        <li key={f.topic_id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fefce8', borderRadius: '8px', border: '1.5px solid #fde68a' }}>
                          <span style={{ width: '22px', height: '22px', background: '#f59e0b', borderRadius: '50%', color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: '#92400e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.topic?.name}</div>
                            {f.topic?.category && <div style={{ fontSize: '11px', color: '#a16207' }}>{f.topic.category}</div>}
                          </div>
                          <button type="button" onClick={() => settingsTopicMoveUp(idx)} disabled={idx === 0}
                            style={{ background: 'none', border: '1px solid #fcd34d', borderRadius: '5px', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '3px 7px', fontSize: '12px', opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                          <button type="button" onClick={() => settingsTopicMoveDown(idx)} disabled={idx === settingsFeaturedTopics.length - 1}
                            style={{ background: 'none', border: '1px solid #fcd34d', borderRadius: '5px', cursor: idx === settingsFeaturedTopics.length - 1 ? 'not-allowed' : 'pointer', padding: '3px 7px', fontSize: '12px', opacity: idx === settingsFeaturedTopics.length - 1 ? 0.4 : 1 }}>↓</button>
                          <button type="button" onClick={() => settingsToggleFeaturedTopic(f.topic)}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '5px', cursor: 'pointer', padding: '3px 8px', fontSize: '12px', color: '#dc2626' }}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={settingsSaveTopics}
                    disabled={settingsTopicsSaving}
                    style={{ marginTop: '20px' }}
                  >
                    {settingsTopicsSaving ? 'Saving…' : 'Save Quick Picks'}
                  </button>
                </div>

                {/* All topics list with search */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', marginBottom: '10px' }}>
                    All Topics — click to feature
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search topics…"
                    value={settingsTopicSearch}
                    onChange={(e) => setSettingsTopicSearch(e.target.value)}
                    style={{ marginBottom: '10px' }}
                  />
                  <div style={{ maxHeight: '420px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    {settingsAllTopics
                      .filter(t => !settingsTopicSearch || t.name.toLowerCase().includes(settingsTopicSearch.toLowerCase()) || (t.category && t.category.toLowerCase().includes(settingsTopicSearch.toLowerCase())))
                      .map(topic => {
                        const isFeatured = settingsFeaturedTopics.some(f => f.topic_id === topic.id)
                        return (
                          <button
                            key={topic.id}
                            type="button"
                            onClick={() => settingsToggleFeaturedTopic(topic)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                              padding: '9px 14px', border: 'none', borderBottom: '1px solid #f1f5f9',
                              background: isFeatured ? '#fefce8' : 'white',
                              cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                              transition: 'background 0.1s',
                            }}
                          >
                            <span style={{ fontSize: '14px', flexShrink: 0 }}>{isFeatured ? '✦' : '○'}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: isFeatured ? 600 : 400, color: isFeatured ? '#92400e' : '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topic.name}</div>
                              {topic.category && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{topic.category}</div>}
                            </div>
                            {isFeatured && (
                              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 700, flexShrink: 0 }}>
                                #{settingsFeaturedTopics.findIndex(f => f.topic_id === topic.id) + 1}
                              </span>
                            )}
                          </button>
                        )
                      })}
                  </div>
                </div>

              </div>
            </div>

            {/* ── Featured Trades ── */}
            <div style={{ marginTop: '40px' }}>
              <h3 className="section-title">Featured Trades</h3>
              <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '14px' }}>
                Choose which trades appear as quick-pick chips above the Trade dropdown in the meeting form.
                Use this for the most common trades your crew works with daily.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                {/* Featured trades list */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', marginBottom: '12px' }}>
                    Featured (shown as chips)
                  </div>
                  {settingsFeaturedTrades.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', border: '1.5px dashed #e2e8f0', borderRadius: '10px', fontSize: '14px' }}>
                      No featured trades yet — click a trade on the right to feature it
                    </div>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {settingsFeaturedTrades.map((f, idx) => (
                        <li key={f.trade} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', border: '1.5px solid #bbf7d0' }}>
                          <span style={{ width: '22px', height: '22px', background: '#16a34a', borderRadius: '50%', color: 'white', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{idx + 1}</span>
                          <span style={{ flex: 1, fontSize: '14px', fontWeight: 600, color: '#14532d' }}>{f.trade}</span>
                          <button type="button" onClick={() => settingsTradeMoveUp(idx)} disabled={idx === 0}
                            style={{ background: 'none', border: '1px solid #86efac', borderRadius: '5px', cursor: idx === 0 ? 'not-allowed' : 'pointer', padding: '3px 7px', fontSize: '12px', opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                          <button type="button" onClick={() => settingsTradeMoveDown(idx)} disabled={idx === settingsFeaturedTrades.length - 1}
                            style={{ background: 'none', border: '1px solid #86efac', borderRadius: '5px', cursor: idx === settingsFeaturedTrades.length - 1 ? 'not-allowed' : 'pointer', padding: '3px 7px', fontSize: '12px', opacity: idx === settingsFeaturedTrades.length - 1 ? 0.4 : 1 }}>↓</button>
                          <button type="button" onClick={() => settingsToggleFeaturedTrade(f.trade)}
                            style={{ background: 'none', border: '1px solid #fca5a5', borderRadius: '5px', cursor: 'pointer', padding: '3px 8px', fontSize: '12px', color: '#dc2626' }}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={settingsSaveTrades}
                    disabled={settingsTradesSaving}
                    style={{ marginTop: '20px' }}
                  >
                    {settingsTradesSaving ? 'Saving…' : 'Save Featured Trades'}
                  </button>
                </div>

                {/* All trades list */}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#374151', marginBottom: '10px' }}>
                    All Trades — click to feature
                  </div>
                  <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    {settingsAllTrades.map(trade => {
                      const isFeatured = settingsFeaturedTrades.some(f => f.trade === trade)
                      return (
                        <button
                          key={trade}
                          type="button"
                          onClick={() => settingsToggleFeaturedTrade(trade)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                            padding: '10px 14px', border: 'none', borderBottom: '1px solid #f1f5f9',
                            background: isFeatured ? '#f0fdf4' : 'white',
                            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                            transition: 'background 0.1s',
                          }}
                        >
                          <span style={{ fontSize: '15px', flexShrink: 0 }}>{isFeatured ? '✦' : '○'}</span>
                          <span style={{ flex: 1, fontSize: '13px', fontWeight: isFeatured ? 600 : 400, color: isFeatured ? '#14532d' : '#374151' }}>{trade}</span>
                          {isFeatured && (
                            <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: 700, flexShrink: 0 }}>
                              #{settingsFeaturedTrades.findIndex(f => f.trade === trade) + 1}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>
            </div>
          </div>
          )}
        </div>
      )}
    </div>
  )
}
