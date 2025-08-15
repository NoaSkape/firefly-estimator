import { useCallback, useMemo, useRef, useState } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'

export default function AdminModelEditor({ idParam, model, onClose, onSaved }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState('overview')
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')
  const isAdmin = canEditModelsClient(user)

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
  const [packages, setPackages] = useState(Array.isArray(model.packages) ? model.packages : [])
  const [addOns, setAddOns] = useState(Array.isArray(model.addOns) ? model.addOns : [])
  const [uploading, setUploading] = useState(false)
  const [imageTag, setImageTag] = useState('gallery')
  const dragIndexRef = useRef(null)

	// Safely build images endpoint with both modelId and modelCode to avoid mismatches
	const buildImagesEndpoint = useCallback(() => {
		const coerceId = (val) => {
			if (!val) return null
			if (typeof val === 'string') return val
			if (typeof val === 'object') {
				if (typeof val.$oid === 'string') return val.$oid
				const asStr = String(val)
				// Only accept if it looks like a hex ObjectId
				return /^[a-fA-F0-9]{24}$/.test(asStr) ? asStr : null
			}
			const asStr = String(val)
			return /^[a-fA-F0-9]{24}$/.test(asStr) ? asStr : null
		}
		const modelIdStr = coerceId(model?._id)
		const params = new URLSearchParams()
		if (modelIdStr) params.set('modelId', modelIdStr)
		if (idParam) params.set('modelCode', String(idParam))
		return `/api/models/images?${params.toString()}`
	}, [model?._id, idParam])

  const handleSave = async () => {
    try {
      setSaving(true)
      if (debug) {
        console.log('[DEBUG_ADMIN] AdminModelEditor: starting save', { idParam, isAdmin })
      }
      const token = await getToken()
      if (debug) {
        const masked = token ? `${token.slice(0, 6)}...${token.slice(-6)}` : null
        console.log('[DEBUG_ADMIN] AdminModelEditor: token from getToken()', { hasToken: !!token, length: token?.length || 0, masked })
      }
      if (!token) {
        alert('No Clerk token from getToken(). Are you signed in?')
        return
      }
      const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
      const url = `/api/models/${idParam}`
      if (debug) {
        const maskedAuth = headers.Authorization ? `${headers.Authorization.slice(0, 13)}...${headers.Authorization.slice(-6)}` : undefined
        console.log('[DEBUG_ADMIN] Request', { method: 'PATCH', url, headers: { ...headers, Authorization: maskedAuth } })
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ name, price, description, specs, features, packages, addOns })
      })
      if (!res.ok) throw new Error('Failed to save model')
      const updated = await res.json()
      if (debug) {
        const primary = Array.isArray(updated?.images) ? updated.images.find(i => i?.isPrimary)?.publicId : null
        console.log('[DEBUG_ADMIN] onSaved(updated)', {
          _id: updated?._id,
          modelCode: updated?.modelCode,
          imagesLength: Array.isArray(updated?.images) ? updated.images.length : 0,
          primaryPublicId: primary
        })
      }
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
      if (debug) {
        console.log('[DEBUG_ADMIN] Upload image start', { size: file.size, type: file.type, name: file.name })
      }
      // sign request
      const subfolder = model.modelCode || idParam
      const token = await getToken()
      if (debug) {
        const masked = token ? `${token.slice(0, 6)}...${token.slice(-6)}` : null
        console.log('[DEBUG_ADMIN] getToken for sign', { hasToken: !!token, length: token?.length || 0, masked })
      }
      if (!token) {
        alert('No Clerk token from getToken(). Are you signed in?')
        return
      }
      const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
      const signUrl = '/api/cloudinary/sign'
      if (debug) {
        const maskedAuth = headers.Authorization ? `${headers.Authorization.slice(0, 13)}...${headers.Authorization.slice(-6)}` : undefined
        console.log('[DEBUG_ADMIN] Request sign', { method: 'POST', url: signUrl, body: { subfolder, tags: [imageTag] }, headers: { ...headers, Authorization: maskedAuth } })
      }
      const signRes = await fetch(signUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subfolder, tags: [imageTag] })
      })
      if (!signRes.ok) throw new Error('Failed to get upload signature')
      const params = await signRes.json()
      if (debug) {
        console.log('[DEBUG_ADMIN] Sign response', { folder: params.folder, cloudName: params.cloudName, hasSignature: !!params.signature })
      }

      const form = new FormData()
      form.append('file', file)
      form.append('timestamp', params.timestamp)
      form.append('signature', params.signature)
      form.append('api_key', params.apiKey)
      form.append('folder', params.folder)
      form.append('tags', imageTag)

      const cloudUrl = `https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`
      if (debug) {
        console.log('[DEBUG_ADMIN] Cloudinary upload start', { url: cloudUrl, folder: params.folder, tags: imageTag })
      }
      const uploadRes = await fetch(cloudUrl, {
        method: 'POST',
        body: form,
      })
      if (!uploadRes.ok) {
        let msg = 'Cloudinary upload failed'
        try { msg = `${msg}: ${await uploadRes.text()}` } catch {}
        throw new Error(msg)
      }
      const uploaded = await uploadRes.json()
      if (debug) {
        console.log('[DEBUG_ADMIN] Cloudinary upload success', { public_id: uploaded.public_id, url: uploaded.secure_url })
      }

		// Save into DB using images endpoint (must include Authorization)
		const imagesUrl = buildImagesEndpoint()
      if (debug) {
        const maskedAuth = headers.Authorization ? `${headers.Authorization.slice(0, 13)}...${headers.Authorization.slice(-6)}` : undefined
        console.log('[DEBUG_ADMIN] Persist image metadata', { method: 'PATCH', url: imagesUrl, headers: { ...headers, Authorization: maskedAuth } })
      }
      const saveRes = await fetch(imagesUrl, {
        method: 'PATCH',
        headers,
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
      if (debug) {
        const primary = Array.isArray(updated?.images) ? updated.images.find(i => i?.isPrimary)?.publicId : null
        console.log('[DEBUG_ADMIN] onSaved(updated) after image add', {
          _id: updated?._id,
          modelCode: updated?.modelCode,
          imagesLength: Array.isArray(updated?.images) ? updated.images.length : 0,
          primaryPublicId: primary
        })
      }
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
      if (debug) console.log('[DEBUG_ADMIN] Delete image start', { publicId })
      const token = await getToken()
      if (debug) {
        const masked = token ? `${token.slice(0, 6)}...${token.slice(-6)}` : null
        console.log('[DEBUG_ADMIN] getToken for delete', { hasToken: !!token, length: token?.length || 0, masked })
      }
      if (!token) { alert('No Clerk token from getToken(). Are you signed in?'); return }
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
		const baseUrl = buildImagesEndpoint()
		const sep = baseUrl.includes('?') ? '&' : '?'
		const res = await fetch(`${baseUrl}${sep}publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        headers
      })
      if (!res.ok) throw new Error('Failed to delete image')
      const next = images.filter(img => img.publicId !== publicId)
      setImages(next)
      const updated = { ...model, images: next }
      if (debug) {
        const primary = Array.isArray(updated?.images) ? updated.images.find(i => i?.isPrimary)?.publicId : null
        console.log('[DEBUG_ADMIN] onSaved(updated) after delete', {
          _id: updated?._id,
          modelCode: updated?.modelCode,
          imagesLength: Array.isArray(updated?.images) ? updated.images.length : 0,
          primaryPublicId: primary
        })
      }
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
      const order = images.map(img => img.publicId)
      const body = {
        order,
      }
      if (primaryPublicId) body.setPrimary = primaryPublicId
      const token = await getToken()
      if (debug) {
        const masked = token ? `${token.slice(0, 6)}...${token.slice(-6)}` : null
        console.log('[DEBUG_ADMIN] Save images (order/primary)', { orderLength: order.length, setPrimary: primaryPublicId || null, hasToken: !!token, masked })
      }
      if (!token) { alert('No Clerk token from getToken(). Are you signed in?'); return }
      const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
		const url = buildImagesEndpoint()
      if (debug) {
        const maskedAuth = headers.Authorization ? `${headers.Authorization.slice(0, 13)}...${headers.Authorization.slice(-6)}` : undefined
        console.log('[DEBUG_ADMIN] Request', { method: 'PATCH', url, headers: { ...headers, Authorization: maskedAuth }, body })
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      })
      if (!res.ok) throw new Error('Failed to save image settings')
      const updated = await res.json()
      setImages(Array.isArray(updated.images) ? updated.images : [])
      if (debug) {
        const primary = Array.isArray(updated?.images) ? updated.images.find(i => i?.isPrimary)?.publicId : null
        console.log('[DEBUG_ADMIN] onSaved(updated) after image settings', {
          _id: updated?._id,
          modelCode: updated?.modelCode,
          imagesLength: Array.isArray(updated?.images) ? updated.images.length : 0,
          primaryPublicId: primary
        })
      }
      onSaved?.(updated)
    } catch (e) {
      alert(e.message)
    }
  }, [images, primaryPublicId, idParam, getToken, onSaved])

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col text-gray-900 dark:text-gray-100">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit Model</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="px-4 pt-2 flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {['overview','specs','features','images','packages','addons'].map(t => (
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
          {tab==='packages' && (
            <div className="space-y-4">
              <div className="text-sm text-gray-500">Up to 4 packages. Each package can include a description, price, images and bullet items.</div>
              {packages.map((p, idx) => (
                <div key={idx} className="border rounded p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input-field" placeholder="Key" value={p.key||''} onChange={e=>{const n=[...packages];n[idx]={...p,key:e.target.value};setPackages(n)}} />
                    <input className="input-field" placeholder="Name" value={p.name||''} onChange={e=>{const n=[...packages];n[idx]={...p,name:e.target.value};setPackages(n)}} />
                    <input className="input-field" type="number" placeholder="Price Delta" value={p.priceDelta||0} onChange={e=>{const n=[...packages];n[idx]={...p,priceDelta:parseFloat(e.target.value)||0};setPackages(n)}} />
                    <input className="input-field" placeholder="Images (comma URLs)" value={(p.images||[]).join(',')} onChange={e=>{const n=[...packages];n[idx]={...p,images:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)};setPackages(n)}} />
                  </div>
                  <textarea className="input-field" rows={3} placeholder="Description" value={p.description||''} onChange={e=>{const n=[...packages];n[idx]={...p,description:e.target.value};setPackages(n)}} />
                  <input className="input-field" placeholder="Items (comma list)" value={(p.items||[]).join(',')} onChange={e=>{const n=[...packages];n[idx]={...p,items:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)};setPackages(n)}} />
                  <div className="flex justify-end"><button className="text-red-600" onClick={()=>setPackages(packages.filter((_,i)=>i!==idx))}>Remove</button></div>
                </div>
              ))}
              {packages.length < 4 && (<button className="btn-secondary" onClick={()=>setPackages([...packages,{ key:'', name:'', priceDelta:0, description:'', items:[], images:[] }])}>Add Package</button>)}
            </div>
          )}
          {tab==='addons' && (
            <div className="space-y-4">
              {addOns.map((a, idx) => (
                <div key={idx} className="border rounded p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className="input-field" placeholder="Id" value={a.id||''} onChange={e=>{const n=[...addOns];n[idx]={...a,id:e.target.value};setAddOns(n)}} />
                    <input className="input-field" placeholder="Name" value={a.name||''} onChange={e=>{const n=[...addOns];n[idx]={...a,name:e.target.value};setAddOns(n)}} />
                    <input className="input-field" type="number" placeholder="Price Delta" value={a.priceDelta||0} onChange={e=>{const n=[...addOns];n[idx]={...a,priceDelta:parseFloat(e.target.value)||0};setAddOns(n)}} />
                    <input className="input-field" placeholder="Image URL" value={a.image||''} onChange={e=>{const n=[...addOns];n[idx]={...a,image:e.target.value};setAddOns(n)}} />
                  </div>
                  <textarea className="input-field" rows={3} placeholder="Description" value={a.description||''} onChange={e=>{const n=[...addOns];n[idx]={...a,description:e.target.value};setAddOns(n)}} />
                  <div className="flex justify-end"><button className="text-red-600" onClick={()=>setAddOns(addOns.filter((_,i)=>i!==idx))}>Remove</button></div>
                </div>
              ))}
              <button className="btn-secondary" onClick={()=>setAddOns([...addOns,{ id:'', name:'', priceDelta:0, description:'', image:'' }])}>Add Add‑On</button>
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

