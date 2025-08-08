import { useCallback, useMemo, useRef, useState } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'

export default function AdminModelEditor({ idParam, model, onClose, onSaved }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('overview')

  // Local editable state
  const [name, setName] = useState(model.name || '')
  const [price, setPrice] = useState(model.basePrice || 0)
  const [description, setDescription] = useState(model.description || '')
  const [specs, setSpecs] = useState({
    width: model.width || '',
    length: model.length || '',
    height: model.height || '',
    squareFeet: model.squareFeet || 0,
    weight: model.weight || '',
    bedrooms: model.bedrooms || 0,
    bathrooms: model.bathrooms || 0,
  })
  const [features, setFeatures] = useState(Array.isArray(model.features) ? model.features : [])
  const [images, setImages] = useState(Array.isArray(model.images) ? model.images : [])
  const [uploading, setUploading] = useState(false)
  const [imageTag, setImageTag] = useState('gallery')
  const dragIndexRef = useRef(null)

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = await getToken()
      const res = await fetch(`/api/models/${idParam}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name, price, description, specs, features })
      })
      if (!res.ok) throw new Error('Failed to save model')
      const updated = await res.json()
      onSaved?.(updated)
      onClose?.()
    } catch (e) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  const addFeature = () => setFeatures([...features, ''])
  const updateFeature = (idx, val) => {
    const next = features.slice()
    next[idx] = val
    setFeatures(next)
  }
  const removeFeature = (idx) => setFeatures(features.filter((_, i) => i !== idx))

  // Drag reorder for features
  const onFeatureDragStart = (idx) => {
    dragIndexRef.current = idx
  }
  const onFeatureDragOver = (e) => {
    e.preventDefault()
  }
  const onFeatureDrop = (idx) => {
    const from = dragIndexRef.current
    if (from == null || from === idx) return
    const next = features.slice()
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    setFeatures(next)
    dragIndexRef.current = null
  }

  // Images helpers
  const primaryPublicId = useMemo(() => images.find(i => i.isPrimary)?.publicId || null, [images])

  const handleUploadImage = async (file) => {
    if (!file) return
    try {
      setUploading(true)
      const token = await getToken()
      // sign request
      const subfolder = model.modelCode || idParam
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subfolder, tags: [imageTag] })
      })
      if (!signRes.ok) throw new Error('Failed to get upload signature')
      const params = await signRes.json()

      const form = new FormData()
      form.append('file', file)
      form.append('timestamp', params.timestamp)
      form.append('signature', params.signature)
      form.append('api_key', params.apiKey)
      form.append('folder', params.folder)
      form.append('tags', imageTag)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, {
        method: 'POST',
        body: form,
      })
      if (!uploadRes.ok) throw new Error('Cloudinary upload failed')
      const uploaded = await uploadRes.json()

      // Save into DB using images.patch add
      const saveRes = await fetch(`/api/models/${idParam}/images`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          add: [{
            url: uploaded.secure_url,
            publicId: uploaded.public_id,
            alt: `${model?.name || 'Model'} image`,
          }]
        })
      })
      if (!saveRes.ok) throw new Error('Failed to save image metadata')
      const updated = await saveRes.json()
      setImages(Array.isArray(updated.images) ? updated.images : [])
      onSaved?.(updated)
    } catch (e) {
      alert(e.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteImage = async (publicId) => {
    if (!publicId) return
    try {
      const token = await getToken()
      const res = await fetch(`/api/models/${idParam}/images?publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('Failed to delete image')
      const next = images.filter(img => img.publicId !== publicId)
      setImages(next)
      const updated = { ...model, images: next }
      onSaved?.(updated)
    } catch (e) {
      alert(e.message)
    }
  }

  const setPrimary = (publicId) => {
    setImages(prev => prev.map(img => ({ ...img, isPrimary: img.publicId === publicId })))
  }

  // Drag reorder images
  const onImageDragStart = (idx) => {
    dragIndexRef.current = idx
  }
  const onImageDragOver = (e) => {
    e.preventDefault()
  }
  const onImageDrop = (idx) => {
    const from = dragIndexRef.current
    if (from == null || from === idx) return
    const next = images.slice()
    const [moved] = next.splice(from, 1)
    next.splice(idx, 0, moved)
    setImages(next)
    dragIndexRef.current = null
  }

  const persistImageOrderAndPrimary = useCallback(async () => {
    try {
      const token = await getToken()
      const order = images.map(img => img.publicId)
      const body = {
        order,
      }
      if (primaryPublicId) body.setPrimary = primaryPublicId
      const res = await fetch(`/api/models/${idParam}/images`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to save image settings')
      const updated = await res.json()
      setImages(Array.isArray(updated.images) ? updated.images : [])
      onSaved?.(updated)
    } catch (e) {
      alert(e.message)
    }
  }, [images, primaryPublicId, idParam, user, onSaved])

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-end z-50">
      <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit Model</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="px-4 pt-2 flex gap-2 border-b">
          {['overview','specs','features','images'].map(t => (
            <button key={t} className={`px-3 py-2 ${tab===t?'border-b-2 border-primary-600 text-primary-700':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <div className="p-4 overflow-auto flex-1">
          {tab==='overview' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input className="input-field" value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Price</label>
                <input className="input-field" type="number" value={price} onChange={e=>setPrice(parseFloat(e.target.value)||0)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea className="input-field" rows={5} value={description} onChange={e=>setDescription(e.target.value)} />
              </div>
            </div>
          )}
          {tab==='specs' && (
            <div className="grid grid-cols-2 gap-4">
              {[
                ['width','text'],['length','text'],['height','text'],['squareFeet','number'],['weight','text'],['bedrooms','number'],['bathrooms','number']
              ].map(([key,type]) => (
                <div key={key}>
                  <label className="block text-sm font-medium">{key}</label>
                  <input className="input-field" type={type} value={specs[key]} onChange={e=>setSpecs({...specs,[key]: type==='number'?(parseFloat(e.target.value)||0):e.target.value})} />
                </div>
              ))}
            </div>
          )}
          {tab==='features' && (
            <div className="space-y-3">
              {features.map((f, idx)=>(
                <div
                  key={idx}
                  className="flex gap-2 items-center"
                  draggable
                  onDragStart={()=>onFeatureDragStart(idx)}
                  onDragOver={onFeatureDragOver}
                  onDrop={()=>onFeatureDrop(idx)}
                >
                  <span className="cursor-move select-none text-gray-400">⋮⋮</span>
                  <input className="input-field flex-1" value={f} onChange={e=>updateFeature(idx,e.target.value)} />
                  <button className="px-2 py-1 bg-red-100 text-red-700 rounded" onClick={()=>removeFeature(idx)}>Remove</button>
                </div>
              ))}
              <button className="btn-secondary" onClick={addFeature}>Add Feature</button>
            </div>
          )}
          {tab==='images' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tag</label>
                  <select className="input-field" value={imageTag} onChange={e=>setImageTag(e.target.value)}>
                    <option value="gallery">Gallery</option>
                    <option value="hero">Hero</option>
                    <option value="floorplan">Floor Plan</option>
                    <option value="kitchen">Kitchen</option>
                    <option value="living">Living</option>
                    <option value="bedroom">Bedroom</option>
                    <option value="bathroom">Bathroom</option>
                    <option value="exterior">Exterior</option>
                    <option value="porch">Porch</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Upload</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e)=>{
                      const f = e.target.files?.[0]
                      if (!f) return
                      if (f.size > 10*1024*1024) { alert('Max 10MB'); return }
                      handleUploadImage(f)
                      e.target.value = ''
                    }}
                    disabled={uploading}
                    className="input-field"
                  />
                </div>
              </div>

              <div className="text-sm text-gray-600">Drag to reorder. Select a primary image.</div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <div
                    key={img.publicId || idx}
                    className={`border rounded p-2 space-y-2 ${img.isPrimary ? 'ring-2 ring-primary-500' : ''}`}
                    draggable
                    onDragStart={()=>onImageDragStart(idx)}
                    onDragOver={onImageDragOver}
                    onDrop={()=>onImageDrop(idx)}
                  >
                    <img src={img.url} alt={img.alt || ''} className="w-full h-28 object-cover rounded" />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name="primaryImage"
                          checked={!!img.isPrimary}
                          onChange={()=>setPrimary(img.publicId)}
                        />
                        Primary
                      </label>
                      <button
                        className="text-red-600 text-sm"
                        onClick={()=>handleDeleteImage(img.publicId)}
                      >Delete</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  className="btn-primary disabled:opacity-50"
                  disabled={!images.length || uploading}
                  onClick={persistImageOrderAndPrimary}
                >Save Images</button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button disabled={saving} className="btn-primary disabled:opacity-50" onClick={handleSave}>{saving?'Saving...':'Save'}</button>
        </div>
      </div>
    </div>
  )
}

