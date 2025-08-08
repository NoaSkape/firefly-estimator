import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'

export default function AdminModelEditor({ idParam, model, onClose, onSaved }) {
  const { user } = useUser()
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

  const handleSave = async () => {
    try {
      setSaving(true)
      const token = await user?.getToken()
      const res = await fetch(`/api/models/${idParam}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-end z-50">
      <div className="w-full max-w-2xl h-full bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit Model</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="px-4 pt-2 flex gap-2 border-b">
          {['overview','specs','features'].map(t => (
            <button key={t} className={`px-3 py-2 ${tab===t?'border-b-2 border-primary-600 text-primary-700':''}`} onClick={()=>setTab(t)}>{t[0].toUpperCase()+t.slice(1)}</button>
          ))}
        </div>
        <div className="p-4 overflow-auto flex-1">
          {tab==='overview' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input className="input" value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Price</label>
                <input className="input" type="number" value={price} onChange={e=>setPrice(parseFloat(e.target.value)||0)} />
              </div>
              <div>
                <label className="block text-sm font-medium">Description</label>
                <textarea className="input" rows={5} value={description} onChange={e=>setDescription(e.target.value)} />
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
                  <input className="input" type={type} value={specs[key]} onChange={e=>setSpecs({...specs,[key]: type==='number'?(parseFloat(e.target.value)||0):e.target.value})} />
                </div>
              ))}
            </div>
          )}
          {tab==='features' && (
            <div className="space-y-3">
              {features.map((f, idx)=>(
                <div key={idx} className="flex gap-2">
                  <input className="input flex-1" value={f} onChange={e=>updateFeature(idx,e.target.value)} />
                  <button className="px-2 py-1 bg-red-100 text-red-700 rounded" onClick={()=>removeFeature(idx)}>Remove</button>
                </div>
              ))}
              <button className="px-3 py-2 bg-gray-100 rounded" onClick={addFeature}>Add Feature</button>
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={onClose}>Cancel</button>
          <button disabled={saving} className="px-4 py-2 bg-primary-600 text-white rounded disabled:opacity-50" onClick={handleSave}>{saving?'Saving...':'Save'}</button>
        </div>
      </div>
    </div>
  )
}

