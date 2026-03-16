import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LegalClauseNotice } from '../components/LegalNotice'
import { supabase } from '../lib/supabase'
import { dateTimeInputToUtcIsoString, getDateTimeInputValueForTimeZone } from '../lib/dateTime'
import SignaturePad from '../components/SignaturePad'
import './ChecklistCompletion.css'

export default function ChecklistCompletion() {
  const navigate = useNavigate()
  const { id } = useParams()
  const signatureRef = useRef()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [checklist, setChecklist] = useState(null)
  const [projects, setProjects] = useState([])
  const [projectId, setProjectId] = useState('')
  const [completionDateTime, setCompletionDateTime] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [completionPhotos, setCompletionPhotos] = useState([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // Signature state
  const [signerType, setSignerType] = useState('leader') // 'leader' | 'worker'
  const [leaders, setLeaders] = useState([])
  const [workers, setWorkers] = useState([])
  const [selectedPersonName, setSelectedPersonName] = useState('')
  const [defaultSigUrl, setDefaultSigUrl] = useState(null)
  const [chosenDefaultSig, setChosenDefaultSig] = useState(false)
  const [manualSigDataUrl, setManualSigDataUrl] = useState(null)

  // Set default datetime to current date/time
  useEffect(() => {
    setCompletionDateTime(getDateTimeInputValueForTimeZone(new Date()))
  }, [])

  useEffect(() => {
    fetchChecklist()
    fetchProjects()
    fetchPersons()
  }, [id])

  const fetchChecklist = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('checklists')
      .select(`
        *,
        items:checklist_items(*)
      `)
      .eq('id', id)
      .single()

    if (!error && data) {
      setChecklist(data)
      const sortedItems = data.items.sort((a, b) => a.display_order - b.display_order)
      setItems(sortedItems.map(item => ({
        ...item,
        is_checked: false,
        notes: '',
        photos: []
      })))
    }
    setLoading(false)
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (data) setProjects(data)
  }

  const fetchPersons = async () => {
    const [{ data: ldrs }, { data: wkrs }] = await Promise.all([
      supabase.from('leaders').select('id, name, default_signature_url').order('name'),
      supabase.from('involved_persons').select('id, name, default_signature_url').order('name'),
    ])
    if (ldrs) setLeaders(ldrs)
    if (wkrs) setWorkers(wkrs)
  }

  // When person selection changes, load their default signature
  const handlePersonChange = (name) => {
    setSelectedPersonName(name)
    setChosenDefaultSig(false)
    setManualSigDataUrl(null)
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

  const handleCompletionPhotoUpload = async (e) => {
    const files = Array.from(e.target.files)
    setUploadingPhotos(true)
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `checklist-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('safety-photos')
        .upload(fileName, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
        setCompletionPhotos(prev => [...prev, { photo_url: data.publicUrl }])
      }
    }
    setUploadingPhotos(false)
    e.target.value = ''
  }

  const handleRemoveCompletionPhoto = (index) => {
    setCompletionPhotos(prev => prev.filter((_, i) => i !== index))
  }

  const handleItemPhotoUpload = async (e, index) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const fileExt = file.name.split('.').pop()
      const fileName = `checklist-item-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('safety-photos')
        .upload(fileName, file)
      if (!uploadError) {
        const { data } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
        setItems(prev => {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            photos: [...(updated[index].photos || []), { photo_url: data.publicUrl }]
          }
          return updated
        })
      }
    }
    e.target.value = ''
  }

  const handleRemoveItemPhoto = (itemIndex, photoIndex) => {
    setItems(prev => {
      const updated = [...prev]
      updated[itemIndex] = {
        ...updated[itemIndex],
        photos: updated[itemIndex].photos.filter((_, i) => i !== photoIndex)
      }
      return updated
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()

    // ── Upload manual signature if drawn ──────────────────────────────
    let signatureUrl = null
    if (chosenDefaultSig && defaultSigUrl) {
      signatureUrl = defaultSigUrl
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
        const fileName = `checklist-sig-${Date.now()}.png`
        const { error: upErr } = await supabase.storage
          .from('safety-photos')
          .upload(fileName, blob, { contentType: 'image/png' })
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('safety-photos').getPublicUrl(fileName)
          signatureUrl = urlData.publicUrl
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────

    // Create completion
    const { data: completion, error: completionError } = await supabase
      .from('checklist_completions')
      .insert([{
        checklist_id: id,
        project_id: projectId || null,
        completed_by: user.id,
        completion_datetime: dateTimeInputToUtcIsoString(completionDateTime),
        notes: notes,
        signer_name: selectedPersonName || null,
        signer_type: selectedPersonName ? signerType : null,
        signature_url: signatureUrl,
      }])
      .select()
      .single()

    if (completionError) {
      console.error('Error creating completion:', completionError)
      setSubmitting(false)
      return
    }

    // Insert completion items
    const completionItems = items.map(item => ({
      completion_id: completion.id,
      checklist_item_id: item.id,
      is_checked: item.is_checked,
      notes: item.notes || null
    }))

    const { data: insertedItems, error: itemsError } = await supabase
      .from('checklist_completion_items')
      .insert(completionItems)
      .select()

    if (itemsError) {
      console.error('Error creating completion items:', itemsError)
      setSubmitting(false)
      return
    }

    // Save global completion photos
    if (completionPhotos.length > 0) {
      await supabase.from('checklist_completion_photos').insert(
        completionPhotos.map(p => ({
          completion_id: completion.id,
          completion_item_id: null,
          photo_url: p.photo_url
        }))
      )
    }

    // Save per-item photos
    const itemPhotoRows = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.photos && item.photos.length > 0) {
        const completionItem = insertedItems?.find(ci => ci.checklist_item_id === item.id)
        if (completionItem) {
          item.photos.forEach(p => {
            itemPhotoRows.push({
              completion_id: completion.id,
              completion_item_id: completionItem.id,
              photo_url: p.photo_url
            })
          })
        }
      }
    }
    if (itemPhotoRows.length > 0) {
      await supabase.from('checklist_completion_photos').insert(itemPhotoRows)
    }

    setSubmitting(false)
    navigate('/checklists')
  }

  if (loading) return <div className="spinner"></div>

  const checkedCount = items.filter(item => item.is_checked).length
  const totalCount = items.length
  const progress = totalCount > 0 ? (checkedCount / totalCount) * 100 : 0

  return (
    <div className="checklist-completion">
      <h2 className="page-title">{checklist?.name}</h2>
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
                    <span className="item-text">{item.title}</span>
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
                  value={item.notes}
                  onChange={(e) => handleItemNoteChange(index, e.target.value)}
                />

                <div className="item-photos-section">
                  <label className="item-photo-upload-btn">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      hidden
                      onChange={(e) => handleItemPhotoUpload(e, index)}
                    />
                    {item.photos?.length > 0 ? `${item.photos.length} photo(s) attached` : 'Add photo to step'}
                  </label>
                  {item.photos?.length > 0 && (
                    <div className="photo-thumbnails">
                      {item.photos.map((photo, pIndex) => (
                        <div key={pIndex} className="photo-thumbnail">
                          <img src={photo.photo_url} alt={`Photo ${pIndex + 1}`} />
                          <button
                            type="button"
                            className="photo-remove-btn"
                            onClick={() => handleRemoveItemPhoto(index, pIndex)}
                          >
                            ×
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
              {uploadingPhotos ? 'Uploading...' : 'Add photos'}
            </label>
            {completionPhotos.length > 0 && (
              <div className="photo-thumbnails">
                {completionPhotos.map((photo, index) => (
                  <div key={index} className="photo-thumbnail">
                    <img src={photo.photo_url} alt={`Photo ${index + 1}`} />
                    <button
                      type="button"
                      className="photo-remove-btn"
                      onClick={() => handleRemoveCompletionPhoto(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="section-title">Signature (optional)</h3>
          <LegalClauseNotice className="cc-legal-note" />

          {/* Signer type toggle */}
          <div className="sig-type-toggle">
            <button
              type="button"
              className={`sig-type-btn ${signerType === 'leader' ? 'active' : ''}`}
              onClick={() => handleSignerTypeChange('leader')}
            >
              Performs the meetings
            </button>
            <button
              type="button"
              className={`sig-type-btn ${signerType === 'worker' ? 'active' : ''}`}
              onClick={() => handleSignerTypeChange('worker')}
            >
              Worker
            </button>
          </div>

          {/* Person picker */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">
              {signerType === 'leader' ? 'Select worker performing the meeting' : 'Select Worker'}
            </label>
            <select
              className="form-select"
              value={selectedPersonName}
              onChange={(e) => handlePersonChange(e.target.value)}
            >
              <option value="">— Select person —</option>
              {(signerType === 'leader' ? leaders : workers).map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>

          {selectedPersonName && (
            <div className="sig-panel">
              {/* Use default signature checkbox */}
              {defaultSigUrl && (
                <label className="sig-default-label">
                  <input
                    type="checkbox"
                    checked={chosenDefaultSig}
                    onChange={(e) => {
                      setChosenDefaultSig(e.target.checked)
                      if (e.target.checked) {
                        signatureRef.current?.clear()
                        setManualSigDataUrl(null)
                      }
                    }}
                  />
                  <span>Use default signature</span>
                </label>
              )}

              {chosenDefaultSig && defaultSigUrl ? (
                <div className="sig-preview">
                  <img src={defaultSigUrl} alt="Default signature" />
                </div>
              ) : (
                <div className="sig-draw-section">
                  <label className="form-label" style={{ marginBottom: 6 }}>
                    {defaultSigUrl ? 'Or draw signature:' : 'Draw signature:'}
                  </label>
                  <SignaturePad
                    ref={signatureRef}
                    className="signature-canvas"
                    height={160}
                    onEnd={() => {
                      if (signatureRef.current && !signatureRef.current.isEmpty()) {
                        setManualSigDataUrl(signatureRef.current.toDataURL())
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 8 }}
                    onClick={() => { signatureRef.current?.clear(); setManualSigDataUrl(null) }}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/checklists')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Complete Checklist'}
          </button>
        </div>
      </form>
    </div>
  )
}
