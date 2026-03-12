import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LegalClauseNotice } from '../components/LegalNotice'
import { supabase } from '../lib/supabase'
import SignaturePad from '../components/SignaturePad'
import './ChecklistCompletion.css'

export default function ChecklistHistoryEdit() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [completion, setCompletion] = useState(null)
  const [checklist, setChecklist] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [completionDateTime, setCompletionDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  // photos: { id?, photo_url, completion_item_id, _new? }
  const [photos, setPhotos] = useState([])
  const [deletedPhotoIds, setDeletedPhotoIds] = useState([])

  // Signature state
  const [leaders, setLeaders] = useState([])
  const [workers, setWorkers] = useState([])
  const [signerType, setSignerType] = useState('leader')
  const [selectedPersonName, setSelectedPersonName] = useState('')
  const [defaultSigUrl, setDefaultSigUrl] = useState(null)
  const [chosenDefaultSig, setChosenDefaultSig] = useState(false)
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)
  const [existingSignatureUrl, setExistingSignatureUrl] = useState(null)
  const [removeExistingSig, setRemoveExistingSig] = useState(false)

  useEffect(() => {
    checkAdmin()
    fetchProjects()
    fetchCompletion()
    fetchPersons()
  }, [id])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single()
      
      const adminStatus = userData?.is_admin || false
      setIsAdmin(adminStatus)
      
      // If not admin, redirect
      if (!adminStatus) {
        navigate('/checklist-history')
      }
    }
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
  }

  const fetchCompletion = async () => {
    setLoading(true)

    // Fetch completion
    const { data: completionData, error: completionError } = await supabase
      .from('checklist_completions')
      .select('*')
      .eq('id', id)
      .single()

    if (completionError || !completionData) {
      console.error('Error fetching completion:', completionError)
      setLoading(false)
      return
    }

    setCompletion(completionData)
    setProjectId(completionData.project_id || '')
    setNotes(completionData.notes || '')
    if (completionData.signer_name) setSelectedPersonName(completionData.signer_name)
    if (completionData.signer_type) setSignerType(completionData.signer_type)
    if (completionData.signature_url) setExistingSignatureUrl(completionData.signature_url)
    
    // Format datetime for input
    const dt = new Date(completionData.completion_datetime)
    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, '0')
    const day = String(dt.getDate()).padStart(2, '0')
    const hours = String(dt.getHours()).padStart(2, '0')
    const minutes = String(dt.getMinutes()).padStart(2, '0')
    setCompletionDateTime(`${year}-${month}-${day}T${hours}:${minutes}`)

    // Fetch checklist
    const { data: checklistData } = await supabase
      .from('checklists')
      .select('*')
      .eq('id', completionData.checklist_id)
      .single()

    if (checklistData) setChecklist(checklistData)

    // Fetch completion items
    const { data: itemsData } = await supabase
      .from('checklist_completion_items')
      .select('*, checklist_item:checklist_items(*)')
      .eq('completion_id', id)

    if (itemsData) {
      const sortedItems = itemsData.sort((a, b) => 
        a.checklist_item.display_order - b.checklist_item.display_order
      )
      setItems(sortedItems)
    }

    // Fetch existing photos
    const { data: photosData } = await supabase
      .from('checklist_completion_photos')
      .select('*')
      .eq('completion_id', id)
    if (photosData) setPhotos(photosData)

    setLoading(false)
  }

  const fetchPersons = async () => {
    const [{ data: ldrs }, { data: wkrs }] = await Promise.all([
      supabase.from('leaders').select('id, name, default_signature_url').order('name'),
      supabase.from('involved_persons').select('id, name, default_signature_url').order('name'),
    ])
    if (ldrs) setLeaders(ldrs)
    if (wkrs) setWorkers(wkrs)
    // resolve default sig for whoever is already selected
    setSelectedPersonName(prev => {
      if (prev) {
        setSignerType(st => {
          const list = st === 'leader' ? (ldrs || []) : (wkrs || [])
          const person = list.find(p => p.name === prev)
          if (person?.default_signature_url) setDefaultSigUrl(person.default_signature_url)
          return st
        })
      }
      return prev
    })
  }

  const handlePersonChange = (name) => {
    setSelectedPersonName(name)
    setChosenDefaultSig(false)
    setManualSigDataUrl(null)
    setRemoveExistingSig(false)
    signatureRef.current?.clear()
    const list = signerType === 'leader' ? leaders : workers
    const person = list.find(p => p.name === name)
    setDefaultSigUrl(person?.default_signature_url || null)
  }

  const handleSignerTypeChange = (type) => {
    setSignerType(type)
    setSelectedPersonName('')
    setDefaultSigUrl(null)
    setChosenDefaultSig(false)
    setManualSigDataUrl(null)
    signatureRef.current?.clear()
  }

  const handleCompletedByChange = (e) => {
    const [type, name] = e.target.value.split('::')
    if (!name) {
      setSignerType('leader')
      setSelectedPersonName('')
      setDefaultSigUrl(null)
      setChosenDefaultSig(false)
      setManualSigDataUrl(null)
      signatureRef.current?.clear()
      return
    }
    setSignerType(type)
    setSelectedPersonName(name)
    setChosenDefaultSig(false)
    setManualSigDataUrl(null)
    setRemoveExistingSig(false)
    signatureRef.current?.clear()
    const list = type === 'leader' ? leaders : workers
    const person = list.find(p => p.name === name)
    setDefaultSigUrl(person?.default_signature_url || null)
  }

  const handleToggleItem = (index) => {
    const newItems = [...items]
    newItems[index].is_checked = !newItems[index].is_checked
    setItems(newItems)
  }

  const handleItemNoteChange = (index, value) => {
    const newItems = [...items]
    newItems[index].notes = value
    setItems(newItems)
  }

  const handleQuickAnswer = (index, answer) => {
    const newItems = [...items]
    newItems[index].notes = answer
    newItems[index].is_checked = true
    setItems(newItems)
  }

  const uploadPhoto = async (file, completionItemId) => {
    const fileExt = file.name.split('.').pop()
    const fileName = `checklist-edit-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
    const { error } = await supabase.storage.from('safety-photos').upload(fileName, file)
    if (error) return null
    const { data } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
    return { photo_url: data.publicUrl, completion_item_id: completionItemId, _new: true }
  }

  const handleItemPhotoUpload = async (e, itemId) => {
    const files = Array.from(e.target.files)
    const results = await Promise.all(files.map(f => uploadPhoto(f, itemId)))
    setPhotos(prev => [...prev, ...results.filter(Boolean)])
    e.target.value = ''
  }

  const handleCompletionPhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    const results = await Promise.all(files.map(f => uploadPhoto(f, null)))
    setPhotos(prev => [...prev, ...results.filter(Boolean)])
    e.target.value = ''
  }

  const handleRemovePhoto = (photo, arrayIndex) => {
    if (photo.id) setDeletedPhotoIds(prev => [...prev, photo.id])
    setPhotos(prev => prev.filter((_, i) => i !== arrayIndex))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    
    setSubmitting(true)

    // Update completion
    const { error: completionError } = await supabase
      .from('checklist_completions')
      .update({
        project_id: projectId || null,
        completion_datetime: completionDateTime,
        notes: notes
      })
      .eq('id', id)

    if (completionError) {
      console.error('Error updating completion:', completionError)
      alert('Error updating completion: ' + completionError.message)
      setSubmitting(false)
      return
    }

    // Update completion items
    const updates = items.map(item => 
      supabase
        .from('checklist_completion_items')
        .update({
          is_checked: item.is_checked,
          notes: item.notes || null
        })
        .eq('id', item.id)
    )

    await Promise.all(updates)

    // ── Signature ──────────────────────────────────────────────────
    let newSignatureUrl = undefined // undefined = don't touch the column
    if (removeExistingSig) {
      newSignatureUrl = null
    } else if (chosenDefaultSig && defaultSigUrl) {
      newSignatureUrl = defaultSigUrl
    } else if (manualSigDataUrl) {
      const blob = await new Promise(resolve => {
        const img = new Image()
        img.onload = () => {
          const c = document.createElement('canvas')
          c.width = img.width; c.height = img.height
          c.getContext('2d').drawImage(img, 0, 0)
          c.toBlob(resolve, 'image/png')
        }
        img.src = manualSigDataUrl
      })
      if (blob) {
        const fileName = `checklist-sig-edit-${Date.now()}.png`
        const { error: upErr } = await supabase.storage
          .from('safety-photos')
          .upload(fileName, blob, { contentType: 'image/png' })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
          newSignatureUrl = urlData.publicUrl
        }
      }
    }

    const sigUpdate = {}
    if (newSignatureUrl !== undefined) sigUpdate.signature_url = newSignatureUrl
    if (selectedPersonName !== (completion?.signer_name || '')) sigUpdate.signer_name = selectedPersonName || null
    if (signerType !== (completion?.signer_type || 'leader') || selectedPersonName !== (completion?.signer_name || '')) {
      sigUpdate.signer_type = selectedPersonName ? signerType : null
    }
    if (Object.keys(sigUpdate).length > 0) {
      await supabase.from('checklist_completions').update(sigUpdate).eq('id', id)
    }
    // ──────────────────────────────────────────────────────────

    // Delete removed photos
    if (deletedPhotoIds.length > 0) {
      await supabase
        .from('checklist_completion_photos')
        .delete()
        .in('id', deletedPhotoIds)
    }

    // Insert new photos
    const newPhotos = photos.filter(p => p._new)
    if (newPhotos.length > 0) {
      await supabase.from('checklist_completion_photos').insert(
        newPhotos.map(p => ({
          completion_id: id,
          completion_item_id: p.completion_item_id,
          photo_url: p.photo_url
        }))
      )
    }

    setSubmitting(false)
    navigate(`/checklist-history/${id}`)
  }

  if (loading) return <div className="spinner"></div>
  if (!isAdmin) return null

  const checkedCount = items.filter(item => item.is_checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <div className="checklist-completion">
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h2 className="page-title">Edit: {checklist?.name}</h2>
        <button className="btn btn-secondary" onClick={() => navigate(`/checklist-history/${id}`)}>
          Cancel
        </button>
      </div>

      {checklist?.description && (
        <p className="checklist-subtitle">{checklist.description}</p>
      )}

      <div className="progress-card">
        <div className="progress-header">
          <span className="progress-label">Progress</span>
          <span className="progress-count">{checkedCount}/{totalCount}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <div className="form-group">
            <label className="form-label">Completed by</label>
            <select
              className="form-select"
              value={selectedPersonName ? `${signerType}::${selectedPersonName}` : '::'}
              onChange={handleCompletedByChange}
            >
              <option value="::">-- Select person --</option>
              {leaders.length > 0 && (
                <optgroup label="Workers performing the meetings">
                  {leaders.map(p => (
                    <option key={p.id} value={`leader::${p.name}`}>{p.name}</option>
                  ))}
                </optgroup>
              )}
              {workers.length > 0 && (
                <optgroup label="Workers">
                  {workers.map(p => (
                    <option key={p.id} value={`worker::${p.name}`}>{p.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Project (Optional)</label>
            <select
              className="form-select"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              <option value="">Select Project</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Completion Date & Time *</label>
            <input
              type="datetime-local"
              className="form-input"
              value={completionDateTime}
              onChange={(e) => setCompletionDateTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Checklist Items</h3>
          
          <div className="completion-items-list">
            {items.map((item, index) => (
              <div key={item.id} className="completion-item-row">
                <div className="completion-item-header">
                  <input
                    type="checkbox"
                    className="checkbox-input"
                    checked={item.is_checked}
                    onChange={() => handleToggleItem(index)}
                    id={`item-${item.id}`}
                  />
                  <label 
                    htmlFor={`item-${item.id}`}
                    className={`item-label ${item.is_checked ? 'checked' : ''}`}
                  >
                    <span className="item-number">{index + 1}.</span>
                    <span className="item-text">{item.checklist_item?.title}</span>
                  </label>
                </div>
                
                <div className="quick-answers">
                  {['Yes', 'No', 'N/A', 'Checked', 'See the picture'].map(answer => (
                    <button
                      key={answer}
                      type="button"
                      className="quick-answer-btn"
                      onClick={() => handleQuickAnswer(index, answer)}
                    >{answer}</button>
                  ))}
                </div>

                <input
                  type="text"
                  className="form-input item-note-input"
                  placeholder="Add note (optional)"
                  value={item.notes || ''}
                  onChange={(e) => handleItemNoteChange(index, e.target.value)}
                />

                <div className="item-photos-section">
                  <label className="item-photo-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => handleItemPhotoUpload(e, item.id)}
                    />
                    {photos.filter(p => p.completion_item_id === item.id).length > 0
                      ? `${photos.filter(p => p.completion_item_id === item.id).length} photo(s) attached`
                      : 'Add photo to step'}
                  </label>
                  {photos.filter(p => p.completion_item_id === item.id).length > 0 && (
                    <div className="photo-thumbnails">
                      {photos.map((photo, pIndex) => photo.completion_item_id !== item.id ? null : (
                        <div key={pIndex} className="photo-thumbnail">
                          <img src={photo.photo_url} alt={`Photo ${pIndex + 1}`} />
                          <button
                            type="button"
                            className="photo-remove-btn"
                            onClick={() => handleRemovePhoto(photo, pIndex)}
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="form-group">
            <label className="form-label">Additional Notes</label>
            <textarea
              className="form-textarea"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about this completion..."
            />
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Photos (optional)</h3>
          <div className="photos-section">
            <label className="completion-photo-upload-btn">
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleCompletionPhotoUpload}
              />
              Add photos
            </label>
            {photos.filter(p => p.completion_item_id === null).length > 0 && (
              <div className="photo-thumbnails">
                {photos.map((photo, pIndex) => photo.completion_item_id !== null ? null : (
                  <div key={pIndex} className="photo-thumbnail">
                    <img src={photo.photo_url} alt={`Photo ${pIndex + 1}`} />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => handleRemovePhoto(photo, pIndex)}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Signature ── */}
        <div className="form-section">
          <h3>Signature</h3>
          <LegalClauseNotice className="cc-legal-note" />
          <div className="sig-type-toggle">
            <button
              type="button"
              className={`sig-type-btn${signerType === 'leader' ? ' active' : ''}`}
              onClick={() => handleSignerTypeChange('leader')}
            >Performs the meetings</button>
            <button
              type="button"
              className={`sig-type-btn${signerType === 'worker' ? ' active' : ''}`}
              onClick={() => handleSignerTypeChange('worker')}
            >Worker</button>
          </div>

          <div className="sig-panel">
            <select
              className="form-select"
              value={selectedPersonName}
              onChange={e => handlePersonChange(e.target.value)}
            >
              <option value="">-- Select person --</option>
              {(signerType === 'leader' ? leaders : workers).map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>

            {defaultSigUrl && (
              <label className="sig-default-label">
                <input
                  type="checkbox"
                  checked={chosenDefaultSig}
                  onChange={e => setChosenDefaultSig(e.target.checked)}
                />
                Use default signature
              </label>
            )}

            {chosenDefaultSig && defaultSigUrl ? (
              <div className="sig-preview">
                <img src={defaultSigUrl} alt="Default signature" />
              </div>
            ) : (
              <div className="sig-draw-section">
                <p style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Draw signature:</p>
                <SignaturePad
                  ref={signatureRef}
                  onEnd={() => setManualSigDataUrl(signatureRef.current?.toDataURL())}
                  className="signature-canvas"
                />
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ marginTop: 6, fontSize: 13 }}
                  onClick={() => { signatureRef.current?.clear(); setManualSigDataUrl(null) }}
                >
                  Clear
                </button>
              </div>
            )}

            {existingSignatureUrl && !removeExistingSig && (
              <div className="sig-view">
                <strong>Current signature:</strong>
                <img className="sig-view-img" src={existingSignatureUrl} alt="Current signature" />
                <button
                  type="button"
                  className="btn btn-danger"
                  style={{ marginTop: 6, fontSize: 12 }}
                  onClick={() => setRemoveExistingSig(true)}
                >
                  Remove signature
                </button>
              </div>
            )}
            {existingSignatureUrl && removeExistingSig && (
              <p style={{ color: '#dc2626', fontSize: 13 }}>
                Signature will be removed on save.{' '}
                <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }}
                  onClick={() => setRemoveExistingSig(false)}>Undo</button>
              </p>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={() => navigate(`/checklist-history/${id}`)}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
