import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MAX_CORRECTIVE_ACTION_PHOTOS, normalizeCorrectiveActionPhotos } from '../lib/correctiveActionPhotos'
import { buildCompletionStatusFields, getDeclaredCompletionDate, getTodayDateString, promptForDeclaredCompletionDate, resolveCorrectiveActionStatus } from '../lib/correctiveActionDates'
import {
  downloadChunkedCorrectiveActionsListPDFZIP,
  downloadCorrectiveActionsAsZIP,
  downloadCorrectiveActionsListPDF,
} from '../lib/pdfBulkGenerator'
import { buildResponsiblePersonOptions, mergeResponsiblePerson, resolveResponsiblePersonId } from '../lib/responsiblePeople'
import { formatDateOnly } from '../lib/dateTime'
import {
  compareNumberValues,
  compareTextValues,
  DEFAULT_EXPORT_CHUNK_SIZE,
  DEFAULT_PAGE_SIZE,
  EXPORT_CHUNK_SIZE_OPTIONS,
  getPageRangeLabel,
  getStoredOption,
  getStoredPageSize,
  normalizeListText,
  PAGE_SIZE_OPTIONS,
} from '../lib/historyList'
import ExportProgress from '../components/ExportProgress'
import HistoryFilterField from '../components/HistoryFilterField'
import { NEW_TAB_LINK_PROPS } from '../lib/navigation'
import './CorrectiveActions.css'

const PAGE_SIZE_STORAGE_KEY = 'corrective-actions:page-size'
const EXPORT_CHUNK_STORAGE_KEY = 'corrective-actions:export-chunk-size'

const createEmptyAction = () => ({
  incident_id: '',
  description: '',
  responsible_person_id: '',
  declared_created_date: getTodayDateString(),
  declared_completion_date: '',
  due_date: '',
  status: 'open',
  completion_date: null,
  photos: [],
})

const normalizeActionForState = (action) => ({
  ...action,
  status: resolveCorrectiveActionStatus({
    status: action.status,
    declaredCompletionDate: getDeclaredCompletionDate(action),
  }),
  photos: normalizeCorrectiveActionPhotos(action),
})

const getActionCreatedDate = (action) => action.declared_created_date || action.created_at?.slice(0, 10) || ''

const getActionSortTimestamp = (action) => {
  const value = action.declared_created_date || action.created_at || action.due_date || ''
  if (!value) return 0
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
}

const formatDisplayDate = (value, fallback = 'No date') => {
  if (!value) return fallback
  return formatDateOnly(value, { fallback: value })
}

export default function CorrectiveActions() {
  const navigate = useNavigate()
  const cancelExportRef = useRef(false)
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [projects, setProjects] = useState([])
  const [involvedPersons, setInvolvedPersons] = useState([])
  const [leaders, setLeaders] = useState([])
  const [incidents, setIncidents] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [predefinedActions, setPredefinedActions] = useState([])
  const [editingActionId, setEditingActionId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newAction, setNewAction] = useState(createEmptyAction())

  const [quickSearch, setQuickSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [responsibleFilter, setResponsibleFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [incidentTypeFilter, setIncidentTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('newest')

  const [pageSize, setPageSize] = useState(() => getStoredPageSize(PAGE_SIZE_STORAGE_KEY, DEFAULT_PAGE_SIZE))
  const [exportChunkSize, setExportChunkSize] = useState(() => getStoredOption(EXPORT_CHUNK_STORAGE_KEY, EXPORT_CHUNK_SIZE_OPTIONS, DEFAULT_EXPORT_CHUNK_SIZE))
  const [page, setPage] = useState(1)
  const [selectedActionIds, setSelectedActionIds] = useState(new Set())

  const [exportListLoading, setExportListLoading] = useState(false)
  const [chunkedExportLoading, setChunkedExportLoading] = useState(false)
  const [rowPdfLoading, setRowPdfLoading] = useState(null)
  const [zipProgress, setZipProgress] = useState({ visible: false, done: 0, total: 0, label: '' })

  const responsiblePersonOptions = useMemo(() => buildResponsiblePersonOptions({ involvedPersons, leaders }), [involvedPersons, leaders])

  const responsibleFilterOptions = useMemo(() => {
    const ids = new Set(actions.map(action => action.responsible_person_id).filter(Boolean))
    return involvedPersons.filter(person => ids.has(person.id)).sort((left, right) => compareTextValues(left.name, right.name, 'asc'))
  }, [actions, involvedPersons])

  const projectOptions = useMemo(() => {
    const ids = new Set(incidents.map(incident => incident.project_id).filter(Boolean))
    return projects.filter(project => ids.has(project.id)).sort((left, right) => compareTextValues(left.name, right.name, 'asc'))
  }, [incidents, projects])

  const incidentTypeOptions = useMemo(() => {
    const values = new Set(incidents.map(incident => incident.type_name).filter(Boolean))
    return Array.from(values).sort((left, right) => compareTextValues(left, right, 'asc'))
  }, [incidents])

  useEffect(() => {
    checkAdminAndLoadActions()
  }, [])

  useEffect(() => {
    window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize))
  }, [pageSize])

  useEffect(() => {
    window.localStorage.setItem(EXPORT_CHUNK_STORAGE_KEY, String(exportChunkSize))
  }, [exportChunkSize])

  useEffect(() => {
    setPage(1)
  }, [statusFilter, responsibleFilter, projectFilter, incidentTypeFilter, dateFrom, dateTo, sortBy, pageSize])

  const checkAdminAndLoadActions = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('users').select('is_admin').eq('id', user.id).single()
      setIsAdmin(data?.is_admin || false)
    }

    await Promise.all([
      fetchProjects(),
      fetchInvolvedPersons(),
      fetchLeaders(),
      fetchIncidents(),
      fetchPredefinedActions(),
      fetchActions(),
    ])
  }

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name')
    if (data) setProjects(data)
  }

  const fetchInvolvedPersons = async () => {
    const { data } = await supabase.from('involved_persons').select('id, name, leader_id').order('name')
    if (data) setInvolvedPersons(data)
  }

  const fetchLeaders = async () => {
    const { data } = await supabase.from('leaders').select('id, name').order('name')
    if (data) setLeaders(data)
  }

  const fetchIncidents = async () => {
    const { data } = await supabase
      .from('incidents')
      .select('id, type_name, date, project_id, employee_name')
      .is('deleted_at', null)
      .order('date', { ascending: false })
    if (data) setIncidents(data)
  }

  const fetchPredefinedActions = async () => {
    const { data } = await supabase.from('predefined_corrective_actions').select('*').order('category').order('description')
    if (data) setPredefinedActions(data)
  }

  const fetchActions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('corrective_actions')
      .select('*, corrective_action_photos(id, photo_url, display_order)')
      .order('declared_created_date', { ascending: false })
      .order('due_date', { ascending: false })

    if (!error && data) {
      setActions(data.map(normalizeActionForState))
    }
    setLoading(false)
  }

  const getIncidentInfo = (incidentId) => incidents.find(incident => incident.id === incidentId) || null
  const getProjectName = (projectId) => projects.find(project => project.id === projectId)?.name || 'Unknown project'
  const getPersonName = (personId) => involvedPersons.find(person => person.id === personId)?.name || 'Unassigned'

  const filteredActions = useMemo(() => {
    const result = [...actions].filter((action) => {
      const incident = getIncidentInfo(action.incident_id)
      const createdDate = getActionCreatedDate(action)

      if (statusFilter !== 'all' && action.status !== statusFilter) return false
      if (responsibleFilter && action.responsible_person_id !== responsibleFilter) return false
      if (projectFilter && incident?.project_id !== projectFilter) return false
      if (incidentTypeFilter && incident?.type_name !== incidentTypeFilter) return false
      if (dateFrom && (!createdDate || createdDate < dateFrom)) return false
      if (dateTo && (!createdDate || createdDate > dateTo)) return false
      return true
    })

    result.sort((left, right) => {
      switch (sortBy) {
        case 'oldest':
          return compareNumberValues(getActionSortTimestamp(left), getActionSortTimestamp(right), 'asc')
        case 'due-asc':
          return compareNumberValues(new Date(left.due_date || 0).getTime(), new Date(right.due_date || 0).getTime(), 'asc')
        case 'due-desc':
          return compareNumberValues(new Date(left.due_date || 0).getTime(), new Date(right.due_date || 0).getTime(), 'desc')
        case 'status':
          return compareTextValues(left.status, right.status, 'asc') || compareNumberValues(getActionSortTimestamp(left), getActionSortTimestamp(right), 'desc')
        case 'responsible':
          return compareTextValues(getPersonName(left.responsible_person_id), getPersonName(right.responsible_person_id), 'asc') || compareNumberValues(getActionSortTimestamp(left), getActionSortTimestamp(right), 'desc')
        default:
          return compareNumberValues(getActionSortTimestamp(left), getActionSortTimestamp(right), 'desc')
      }
    })

    return result
  }, [actions, statusFilter, responsibleFilter, projectFilter, incidentTypeFilter, dateFrom, dateTo, sortBy, incidents, involvedPersons, projects])

  const totalPages = Math.max(1, Math.ceil(filteredActions.length / pageSize))

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pagedBaseActions = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return filteredActions.slice(startIndex, startIndex + pageSize)
  }, [filteredActions, page, pageSize])

  const pagedActions = useMemo(() => {
    const query = normalizeListText(quickSearch)
    if (!query) return pagedBaseActions

    return pagedBaseActions.filter((action) => {
      const incident = getIncidentInfo(action.incident_id)
      return [
        action.description,
        getPersonName(action.responsible_person_id),
        incident?.type_name,
        incident?.employee_name,
        incident?.project_id ? getProjectName(incident.project_id) : '',
      ].some(value => normalizeListText(value).includes(query))
    })
  }, [pagedBaseActions, quickSearch, incidents, involvedPersons, projects])

  const filtersActive = Boolean(
    quickSearch || statusFilter !== 'all' || responsibleFilter || projectFilter || incidentTypeFilter || dateFrom || dateTo || sortBy !== 'newest'
  )

  const handleToggleStatus = async (action) => {
    if (!isAdmin) return

    const { data: { user } } = await supabase.auth.getUser()
    const currentStatus = resolveCorrectiveActionStatus({
      status: action.status,
      declaredCompletionDate: getDeclaredCompletionDate(action),
    })
    const nextStatus = currentStatus === 'open' ? 'completed' : 'open'
    const declaredCompletionDate = nextStatus === 'completed'
      ? promptForDeclaredCompletionDate(getDeclaredCompletionDate(action) || getTodayDateString())
      : null

    if (nextStatus === 'completed' && !declaredCompletionDate) return

    const { error } = await supabase
      .from('corrective_actions')
      .update({
        status: nextStatus,
        ...buildCompletionStatusFields({
          currentStatus,
          nextStatus,
          currentCompletionDate: action.completion_date,
          currentDeclaredCompletionDate: action.declared_completion_date,
          declaredCompletionDate,
        }),
        updated_by: user?.id || null,
      })
      .eq('id', action.id)

    if (!error) await fetchActions()
  }

  const handleDeleteAction = async (actionId, description) => {
    if (!confirm(`Are you sure you want to delete the corrective action "${description}"? This action cannot be undone.`)) return
    await supabase.from('corrective_action_photos').delete().eq('corrective_action_id', actionId)
    await supabase.from('corrective_actions').delete().eq('id', actionId)
    await fetchActions()
  }

  const handleDeleteSelectedActions = async () => {
    const ids = Array.from(selectedActionIds)
    if (ids.length === 0) return
    if (!confirm(`Delete ${ids.length} selected corrective action${ids.length === 1 ? '' : 's'}? This action cannot be undone.`)) return
    await supabase.from('corrective_action_photos').delete().in('corrective_action_id', ids)
    await supabase.from('corrective_actions').delete().in('id', ids)
    setSelectedActionIds(new Set())
    await fetchActions()
  }

  const handleStartEdit = (action) => {
    const declaredCompletionDate = getDeclaredCompletionDate(action) || ''
    setEditingActionId(action.id)
    setEditForm({
      description: action.description,
      responsible_person_id: action.responsible_person_id || '',
      declared_created_date: action.declared_created_date || '',
      declared_completion_date: declaredCompletionDate,
      due_date: action.due_date || '',
      status: resolveCorrectiveActionStatus({
        status: action.status,
        declaredCompletionDate,
      }),
      completion_date: action.completion_date || null,
      photos: action.photos || [],
    })
  }

  const handleActionPhotoAdd = (target, event) => {
    const selectedFiles = Array.from(event.target.files || [])
    const currentPhotos = target === 'new' ? (newAction.photos || []) : (editForm.photos || [])
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

    filesToAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photo = { file, preview: reader.result }
        if (target === 'new') {
          setNewAction(prev => ({ ...prev, photos: [...(prev.photos || []), photo] }))
          return
        }
        setEditForm(prev => ({ ...prev, photos: [...(prev.photos || []), photo] }))
      }
      reader.readAsDataURL(file)
    })

    event.target.value = ''
  }

  const handleRemoveActionPhoto = (target, photoIndex) => {
    if (target === 'new') {
      setNewAction(prev => ({ ...prev, photos: (prev.photos || []).filter((_, index) => index !== photoIndex) }))
      return
    }
    setEditForm(prev => ({ ...prev, photos: (prev.photos || []).filter((_, index) => index !== photoIndex) }))
  }

  const syncCorrectiveActionPhotos = async (actionId, photos) => {
    const { error: deletePhotosError } = await supabase.from('corrective_action_photos').delete().eq('corrective_action_id', actionId)
    if (deletePhotosError) throw deletePhotosError

    const photoRows = []
    for (const [photoIndex, photo] of (photos || []).entries()) {
      if (photo.photo_url) {
        photoRows.push({ photo_url: photo.photo_url, display_order: photoIndex })
        continue
      }
      if (!photo.file) continue

      const ext = photo.file.name.split('.').pop()
      const fileName = `corrective-action-${actionId}-${Date.now()}-${photoIndex}.${ext}`
      const { error: uploadPhotoError } = await supabase.storage.from('safety-photos').upload(fileName, photo.file)
      if (uploadPhotoError) throw uploadPhotoError

      const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
      photoRows.push({ photo_url: urlData.publicUrl, display_order: photoIndex })
    }

    if (photoRows.length === 0) return

    const { error: insertPhotosError } = await supabase.from('corrective_action_photos').insert(
      photoRows.map(photo => ({
        corrective_action_id: actionId,
        photo_url: photo.photo_url,
        display_order: photo.display_order,
      }))
    )

    if (insertPhotosError) throw insertPhotosError
  }

  const handleSaveEdit = async (actionId) => {
    const { data: { user } } = await supabase.auth.getUser()
    const existingAction = actions.find(action => action.id === actionId)
    const nextStatus = resolveCorrectiveActionStatus({
      status: editForm.status,
      declaredCompletionDate: editForm.declared_completion_date || null,
    })

    let responsiblePersonId = null
    let syncedPerson = null
    try {
      const resolved = await resolveResponsiblePersonId({
        selectedValue: editForm.responsible_person_id,
        involvedPersons,
        leaders,
        supabase,
      })
      responsiblePersonId = resolved.responsiblePersonId
      syncedPerson = resolved.syncedPerson
    } catch (error) {
      console.error(error)
      alert('Unable to assign the selected responsible person')
      return
    }

    const { error } = await supabase
      .from('corrective_actions')
      .update({
        description: editForm.description,
        responsible_person_id: responsiblePersonId,
        declared_created_date: editForm.declared_created_date || null,
        due_date: editForm.due_date || null,
        status: nextStatus,
        ...buildCompletionStatusFields({
          currentStatus: existingAction?.status,
          nextStatus,
          currentCompletionDate: existingAction?.completion_date,
          currentDeclaredCompletionDate: existingAction?.declared_completion_date,
          declaredCompletionDate: editForm.declared_completion_date || null,
        }),
        updated_by: user?.id || null,
      })
      .eq('id', actionId)

    if (!error) {
      try {
        await syncCorrectiveActionPhotos(actionId, editForm.photos)
        if (syncedPerson) setInvolvedPersons(prev => mergeResponsiblePerson(prev, syncedPerson))
        setEditingActionId(null)
        await Promise.all([fetchActions(), fetchInvolvedPersons()])
      } catch (photoError) {
        console.error(photoError)
        alert('Unable to save corrective action photos')
      }
    }
  }

  const handleAddAction = async () => {
    if (!newAction.incident_id || !newAction.description.trim()) {
      alert('Please select an incident and enter a description')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    let responsiblePersonId = null
    let syncedPerson = null
    try {
      const resolved = await resolveResponsiblePersonId({
        selectedValue: newAction.responsible_person_id,
        involvedPersons,
        leaders,
        supabase,
      })
      responsiblePersonId = resolved.responsiblePersonId
      syncedPerson = resolved.syncedPerson
    } catch (resolveError) {
      console.error(resolveError)
      alert('Unable to assign the selected responsible person')
      return
    }

    const { data: insertedAction, error } = await supabase
      .from('corrective_actions')
      .insert({
        incident_id: newAction.incident_id,
        description: newAction.description,
        responsible_person_id: responsiblePersonId,
        declared_created_date: newAction.declared_created_date || null,
        due_date: newAction.due_date || null,
        status: newAction.status,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      })
      .select('*')
      .single()

    if (error) {
      alert('Error adding corrective action')
      return
    }

    try {
      await syncCorrectiveActionPhotos(insertedAction.id, newAction.photos)
    } catch (photoError) {
      console.error(photoError)
      alert('Corrective action was created, but photos could not be saved')
    }

    setNewAction(createEmptyAction())
    setShowAddForm(false)
    if (syncedPerson) setInvolvedPersons(prev => mergeResponsiblePerson(prev, syncedPerson))
    await Promise.all([fetchActions(), fetchInvolvedPersons()])
  }

  const handleSelectPredefinedAction = (actionDescription) => {
    setNewAction(prev => ({ ...prev, description: actionDescription }))
  }

  const toggleSelectAllActions = () => {
    const pageIds = pagedActions.map(action => action.id)
    setSelectedActionIds(prev => {
      const next = new Set(prev)
      const allSelected = pageIds.every(id => next.has(id))
      pageIds.forEach((id) => {
        if (allSelected) next.delete(id)
        else next.add(id)
      })
      return next
    })
  }

  const toggleActionSelect = (actionId) => {
    setSelectedActionIds(prev => {
      const next = new Set(prev)
      if (next.has(actionId)) next.delete(actionId)
      else next.add(actionId)
      return next
    })
  }

  const clearSelectedActions = () => setSelectedActionIds(new Set())

  const resetFilters = () => {
    setQuickSearch('')
    setStatusFilter('all')
    setResponsibleFilter('')
    setProjectFilter('')
    setIncidentTypeFilter('')
    setDateFrom('')
    setDateTo('')
    setSortBy('newest')
  }

  const buildExportSubtitle = () => {
    const filters = []
    if (statusFilter !== 'all') filters.push(`Status: ${statusFilter}`)
    if (responsibleFilter) filters.push(`Responsible: ${getPersonName(responsibleFilter)}`)
    if (projectFilter) filters.push(`Project: ${getProjectName(projectFilter)}`)
    if (incidentTypeFilter) filters.push(`Incident type: ${incidentTypeFilter}`)
    if (dateFrom || dateTo) filters.push(`Created: ${dateFrom || '...'} to ${dateTo || '...'}`)
    return filters.length === 0 ? `${filteredActions.length} actions` : `${filteredActions.length} actions · ${filters.join(' · ')}`
  }

  const handleExportList = async () => {
    setExportListLoading(true)
    try {
      await downloadCorrectiveActionsListPDF(filteredActions, involvedPersons, incidents, 'Corrective Actions Report', buildExportSubtitle())
    } finally {
      setExportListLoading(false)
    }
  }

  const handleExportSelectedZIP = async () => {
    const selectedActions = filteredActions.filter(action => selectedActionIds.has(action.id))
    if (selectedActions.length === 0) return

    cancelExportRef.current = false
    setZipProgress({ visible: true, done: 0, total: selectedActions.length, label: 'Preparing selected actions...' })
    try {
      await downloadCorrectiveActionsAsZIP(selectedActions, involvedPersons, incidents, {
        onProgress: ({ done, total, label }) => setZipProgress({ visible: true, done, total, label }),
        shouldCancel: () => cancelExportRef.current,
      })
    } finally {
      setZipProgress({ visible: false, done: 0, total: 0, label: '' })
    }
  }

  const handleChunkedExport = async () => {
    cancelExportRef.current = false
    setChunkedExportLoading(true)
    setZipProgress({ visible: true, done: 0, total: Math.ceil(filteredActions.length / exportChunkSize), label: 'Preparing export...' })
    try {
      await downloadChunkedCorrectiveActionsListPDFZIP({
        actions: filteredActions,
        persons: involvedPersons,
        incidents,
        chunkSize: exportChunkSize,
        title: 'Corrective Actions Report',
        subtitle: buildExportSubtitle(),
        onProgress: ({ done, total, label }) => setZipProgress({ visible: true, done, total, label }),
        shouldCancel: () => cancelExportRef.current,
      })
    } finally {
      setChunkedExportLoading(false)
      setZipProgress({ visible: false, done: 0, total: 0, label: '' })
    }
  }

  const handleSinglePDF = async (action) => {
    setRowPdfLoading(action.id)
    try {
      await downloadCorrectiveActionsListPDF([action], involvedPersons, incidents, action.description || 'Corrective Action', '')
    } finally {
      setRowPdfLoading(null)
    }
  }

  if (loading) return <div className="loading">Loading corrective actions...</div>

  return (
    <div className="corrective-actions-page">
      <ExportProgress
        visible={zipProgress.visible}
        done={zipProgress.done}
        total={zipProgress.total}
        label={zipProgress.label}
        onCancel={() => { cancelExportRef.current = true }}
      />

      <div className="page-header">
        <h1>Corrective Actions Log</h1>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {filteredActions.length > 0 && (
            <>
              <button className="btn btn-secondary" disabled={exportListLoading} onClick={handleExportList}>{exportListLoading ? '…' : '↓ List PDF'}</button>
              <button className="btn btn-secondary" disabled={chunkedExportLoading} onClick={handleChunkedExport}>{chunkedExportLoading ? '…' : '↓ Chunked List'}</button>
            </>
          )}
          <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>{showAddForm ? 'Cancel' : '+ Add Corrective Action'}</button>
        </div>
      </div>

      {showAddForm && (
        <div className="add-form-container">
          <h2>Add New Corrective Action</h2>
          <div className="action-form">
            <div className="form-group">
              <label>Select Incident *</label>
              <select value={newAction.incident_id} onChange={(e) => setNewAction({ ...newAction, incident_id: e.target.value })} required>
                <option value="">Select an incident</option>
                {incidents.map(incident => <option key={incident.id} value={incident.id}>{incident.type_name} - {incident.employee_name} ({formatDisplayDate(incident.date)})</option>)}
              </select>
            </div>

            <div className="form-group">
              <label>Select from predefined actions (optional)</label>
              <select value="" onChange={(e) => handleSelectPredefinedAction(e.target.value)}>
                <option value="">-- Select a predefined action --</option>
                {predefinedActions.reduce((acc, action) => {
                  if (!acc.find(item => item.category === action.category)) {
                    acc.push({ category: action.category, actions: [] })
                  }
                  acc.find(item => item.category === action.category).actions.push(action)
                  return acc
                }, []).map((group, idx) => (
                  <optgroup key={idx} label={group.category}>
                    {group.actions.map(action => <option key={action.id} value={action.description}>{action.description}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Description *</label>
              <textarea value={newAction.description} onChange={(e) => setNewAction({ ...newAction, description: e.target.value })} required rows="3" placeholder="Enter corrective action description" />
            </div>

            <div className="form-row form-row--three">
              <div className="form-group">
                <label>Responsible Person</label>
                <select value={newAction.responsible_person_id} onChange={(e) => setNewAction({ ...newAction, responsible_person_id: e.target.value })}>
                  <option value="">Select Person (Optional)</option>
                  {responsiblePersonOptions.map(person => <option key={person.value} value={person.value}>{person.label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Declared Created Date</label>
                <input type="date" value={newAction.declared_created_date} onChange={(e) => setNewAction({ ...newAction, declared_created_date: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={newAction.due_date} onChange={(e) => setNewAction({ ...newAction, due_date: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Photos <span className="ca-optional">optional, up to {MAX_CORRECTIVE_ACTION_PHOTOS}</span></label>
              {newAction.photos?.length > 0 && (
                <div className="ca-photo-grid">
                  {newAction.photos.map((photo, index) => (
                    <div key={photo.preview || photo.photo_url || index} className="ca-photo-item">
                      <img src={photo.preview || photo.photo_url} alt={`Corrective action photo ${index + 1}`} />
                      <button type="button" className="ca-photo-remove" onClick={() => handleRemoveActionPhoto('new', index)}>&#215;</button>
                    </div>
                  ))}
                </div>
              )}
              <label className="btn-secondary ca-upload-btn">
                + Add Photos
                <input type="file" accept="image/*" multiple onChange={(e) => handleActionPhotoAdd('new', e)} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="form-actions">
              <button className="btn-primary" onClick={handleAddAction}>Add Action</button>
              <button className="btn-secondary" onClick={() => { setShowAddForm(false); setNewAction(createEmptyAction()) }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="filter-bar history-filter-bar">
        <div className="history-filter-grid history-filter-grid--wide">
          <HistoryFilterField label="Loaded-page search">
            <input className="filter-search-input" type="text" placeholder="Quick search inside loaded results..." value={quickSearch} onChange={e => setQuickSearch(e.target.value)} />
          </HistoryFilterField>
          <HistoryFilterField label="Status">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
              <option value="all">All statuses</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
          </HistoryFilterField>
          <HistoryFilterField label="Responsible">
            <select value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)} className="filter-select">
              <option value="">All responsible people</option>
              {responsibleFilterOptions.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            </select>
          </HistoryFilterField>
          <HistoryFilterField label="Project">
            <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)} className="filter-select">
              <option value="">All projects</option>
              {projectOptions.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </HistoryFilterField>
          <HistoryFilterField label="Incident type">
            <select value={incidentTypeFilter} onChange={e => setIncidentTypeFilter(e.target.value)} className="filter-select">
              <option value="">All incident types</option>
              {incidentTypeOptions.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </HistoryFilterField>
          <HistoryFilterField label="Created from">
            <input className="history-filter-input" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </HistoryFilterField>
          <HistoryFilterField label="Created to">
            <input className="history-filter-input" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </HistoryFilterField>
          <HistoryFilterField label="Sort by">
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
              <option value="newest">Newest created</option>
              <option value="oldest">Oldest created</option>
              <option value="due-asc">Due date earliest</option>
              <option value="due-desc">Due date latest</option>
              <option value="status">Status</option>
              <option value="responsible">Responsible A-Z</option>
            </select>
          </HistoryFilterField>
        </div>

        <div className="history-filter-toolbar">
          <div className="history-toolbar-groups">
            <div className="history-page-size">
              <span className="history-page-size-label">Rows per page</span>
              <select className="filter-select filter-select--compact" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
            <div className="history-page-size">
              <span className="history-page-size-label">Export chunk</span>
              <select className="filter-select filter-select--compact" value={exportChunkSize} onChange={e => setExportChunkSize(Number(e.target.value))}>
                {EXPORT_CHUNK_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size}</option>)}
              </select>
            </div>
          </div>

          <div className="history-toolbar-actions">
            {filtersActive && <button className="filter-clear-btn" onClick={resetFilters}>Clear filters</button>}
          </div>

          <span className="pagination-info history-summary-pill">
            {getPageRangeLabel(page, pageSize, filteredActions.length)} total
          </span>
        </div>

        {quickSearch && (
          <div className="history-inline-note">
            Quick search applies only to the currently loaded page. Structured filters above control the full list and exports.
          </div>
        )}
      </div>

      {isAdmin && pagedActions.length > 0 && (
        <div className="history-selection-toolbar">
          <label className="history-selection-toggle">
            <input type="checkbox" checked={pagedActions.length > 0 && pagedActions.every(action => selectedActionIds.has(action.id))} onChange={toggleSelectAllActions} />
            <span>Select page</span>
          </label>
          <span className="history-selection-count">Selected: {selectedActionIds.size}</span>
          {selectedActionIds.size > 0 && (
            <div className="history-selection-actions">
              <button className="btn btn-secondary btn-sm" onClick={clearSelectedActions}>Clear selection</button>
              <button className="btn btn-secondary btn-sm" onClick={handleExportSelectedZIP}>ZIP selected ({selectedActionIds.size})</button>
              <button className="btn btn-danger btn-sm" onClick={handleDeleteSelectedActions}>Delete selected</button>
            </div>
          )}
        </div>
      )}

      <div className="history-list">
        {pagedActions.length === 0 ? (
          <div className="empty-state">
            <p>{filteredActions.length === 0 ? 'No corrective actions found for the selected filters.' : 'No loaded-page matches for the current quick search.'}</p>
          </div>
        ) : (
          pagedActions.map((action) => {
            const incident = getIncidentInfo(action.incident_id)
            const isEditing = editingActionId === action.id
            const isOverdue = action.status === 'open' && action.due_date && new Date(action.due_date) < new Date()

            return (
              <div key={action.id} className={`history-row ${selectedActionIds.has(action.id) ? 'history-row--selected' : ''}`}>
                {isAdmin && (
                  <div className="history-row-select">
                    <input type="checkbox" checked={selectedActionIds.has(action.id)} onChange={() => toggleActionSelect(action.id)} aria-label={`Select action ${action.description}`} />
                  </div>
                )}

                <div className="history-row-body">
                  <div className="history-row-top">
                    <div className="history-row-heading">
                      <h3 className="history-row-title">{action.description}</h3>
                      <div className="history-row-meta">
                        <span>{formatDisplayDate(getActionCreatedDate(action), 'No created date')}</span>
                        {action.due_date && <><span className="history-meta-sep">•</span><span>Due {formatDisplayDate(action.due_date)}</span></>}
                        {incident?.type_name && <><span className="history-meta-sep">•</span><span>{incident.type_name}</span></>}
                        {incident?.project_id && <><span className="history-meta-sep">•</span><span>{getProjectName(incident.project_id)}</span></>}
                      </div>
                    </div>

                    <div className="history-row-actions">
                      {incident && <Link className="history-action-btn" to={`/incidents/${action.incident_id}`} title="View incident" aria-label="View incident">→</Link>}
                      {incident && <Link className="history-action-btn" to={`/incidents/${action.incident_id}`} {...NEW_TAB_LINK_PROPS} title="Open incident in new tab" aria-label="Open incident in new tab">↗</Link>}
                      <button className="history-action-btn history-action-btn--pdf" onClick={() => handleSinglePDF(action)} disabled={rowPdfLoading === action.id} title="Download PDF" aria-label="Download PDF">{rowPdfLoading === action.id ? '…' : 'PDF'}</button>
                      {isAdmin && !isEditing && (
                        <>
                          <button className="history-action-btn" onClick={() => handleStartEdit(action)} title="Edit" aria-label="Edit">✎</button>
                          <button className="history-action-btn history-action-btn--danger" onClick={() => handleDeleteAction(action.id, action.description)} title="Delete" aria-label="Delete">✕</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="history-row-chips">
                    <span className={`history-chip ${action.status === 'completed' ? 'history-chip--success' : ''}`}>{action.status === 'completed' ? 'Completed' : 'Open'}</span>
                    {isOverdue && <span className="history-chip history-chip--warning">Overdue</span>}
                    {action.responsible_person_id && <span className="history-chip history-chip--accent">Responsible: {getPersonName(action.responsible_person_id)}</span>}
                    {incident?.employee_name && <span className="history-chip">Employee: {incident.employee_name}</span>}
                    {(action.photos?.length || 0) > 0 && <span className="history-chip">Photos: {action.photos.length}</span>}
                  </div>

                  {isEditing ? (
                    <div className="inline-edit-form">
                      <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-textarea" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows="2" />
                      </div>
                      <div className="inline-edit-row">
                        <div className="form-group">
                          <label className="form-label">Responsible Person</label>
                          <select className="form-select" value={editForm.responsible_person_id} onChange={e => setEditForm({ ...editForm, responsible_person_id: e.target.value })}>
                            <option value="">Unassigned</option>
                            {responsiblePersonOptions.map(person => <option key={person.value} value={person.value}>{person.label}</option>)}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Declared Created Date</label>
                          <input type="date" className="form-input" value={editForm.declared_created_date} onChange={e => setEditForm({ ...editForm, declared_created_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Due Date</label>
                          <input type="date" className="form-input" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Status</label>
                          <select
                            className="form-select"
                            value={editForm.status}
                            onChange={e => {
                              const nextStatus = e.target.value
                              setEditForm({
                                ...editForm,
                                status: nextStatus,
                                declared_completion_date: nextStatus === 'completed' ? (editForm.declared_completion_date || getTodayDateString()) : '',
                                completion_date: nextStatus === 'completed' ? editForm.completion_date : null,
                              })
                            }}
                          >
                            <option value="open">Open</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        {editForm.status === 'completed' && (
                          <div className="form-group">
                            <label className="form-label">Declared Completed Date</label>
                            <input type="date" className="form-input" value={editForm.declared_completion_date} onChange={e => setEditForm({ ...editForm, declared_completion_date: e.target.value })} />
                          </div>
                        )}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Photos <span className="ca-optional">optional, up to {MAX_CORRECTIVE_ACTION_PHOTOS}</span></label>
                        {editForm.photos?.length > 0 && (
                          <div className="ca-photo-grid">
                            {editForm.photos.map((photo, index) => (
                              <div key={photo.id || photo.preview || photo.photo_url || index} className="ca-photo-item">
                                <img src={photo.preview || photo.photo_url} alt={`Corrective action photo ${index + 1}`} />
                                <button type="button" className="ca-photo-remove" onClick={() => handleRemoveActionPhoto('edit', index)}>&#215;</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <label className="btn-secondary ca-upload-btn">
                          + Add Photos
                          <input type="file" accept="image/*" multiple onChange={(e) => handleActionPhotoAdd('edit', e)} style={{ display: 'none' }} />
                        </label>
                      </div>
                      <div className="inline-edit-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(action.id)}>Save</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => setEditingActionId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {incident && (
                        <div className="history-card-panel">
                          <div className="incident-reference">
                            <strong>Related to incident:</strong> {incident.type_name} - {incident.employee_name}
                            <span className="incident-date">{formatDisplayDate(incident.date)}</span>
                            {incident.project_id && <span className="incident-project">Project: {getProjectName(incident.project_id)}</span>}
                            <button className="btn-link" onClick={() => navigate(`/incidents/${action.incident_id}`)}>View incident →</button>
                          </div>
                        </div>
                      )}

                      <div className="action-metadata">
                        {action.responsible_person_id && <span className="meta-item"><strong>Responsible:</strong> {getPersonName(action.responsible_person_id)}</span>}
                        {action.due_date && <span className="meta-item"><strong>Due:</strong> {formatDisplayDate(action.due_date)}</span>}
                        {action.status === 'completed' && getDeclaredCompletionDate(action) && <span className="meta-item"><strong>Completed:</strong> {formatDisplayDate(getDeclaredCompletionDate(action))}</span>}
                        {getActionCreatedDate(action) && <span className="meta-item meta-created">Created on: {formatDisplayDate(getActionCreatedDate(action))}</span>}
                      </div>

                      {action.photos?.length > 0 && (
                        <div className="ca-photo-grid ca-photo-grid--compact">
                          {action.photos.map((photo, index) => (
                            <a key={photo.id || photo.photo_url || index} href={photo.photo_url} target="_blank" rel="noreferrer" className="ca-photo-item ca-photo-item--readonly">
                              <img src={photo.photo_url} alt={`Corrective action photo ${index + 1}`} />
                            </a>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {incident ? <Link className="history-row-arrow" to={`/incidents/${action.incident_id}`} aria-label={`Open incident for ${action.description}`}>›</Link> : null}
              </div>
            )
          })
        )}

        {totalPages > 1 && (
          <div className="history-pagination-bar">
            <span className="pagination-info">Page {page} of {totalPages}</span>
            <div className="history-pagination-controls">
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(1)} disabled={page === 1}>« First</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1}>← Prev</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages}>Next →</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setPage(totalPages)} disabled={page === totalPages}>Last »</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
