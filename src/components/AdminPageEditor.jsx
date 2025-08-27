import { useState, useRef } from 'react'
import { useUser, useAuth } from '@clerk/clerk-react'
import { canEditModelsClient } from '../lib/canEditModels'

export default function AdminPageEditor({ pageId, content, images: initialImages = {}, onClose, onSaved, imageFields = [] }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState({})
  const [activeTab, setActiveTab] = useState('content')
  const fileInputRefs = useRef({})
  const debug = (import.meta.env?.VITE_DEBUG_ADMIN === 'true')
  const isAdmin = canEditModelsClient(user)

  // Local editable state
  const [pageContent, setPageContent] = useState(content || {})
  const [images, setImages] = useState(initialImages || {})

  const handleSave = async () => {
    try {
      setSaving(true)
      if (debug) {
        console.log('[DEBUG_ADMIN] AdminPageEditor: starting save', { pageId, isAdmin })
      }
      const token = await getToken()
      if (debug) {
        const masked = token ? `${token.slice(0, 6)}...${token.slice(-6)}` : null
        console.log('[DEBUG_ADMIN] AdminPageEditor: token from getToken()', { hasToken: !!token, length: token?.length || 0, masked })
      }
      if (!token) {
        alert('No Clerk token from getToken(). Are you signed in?')
        return
      }
      const headers = token ? { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } : { 'Content-Type': 'application/json' }
      const url = `/api/pages/${pageId}`
      if (debug) {
        const maskedAuth = headers.Authorization ? `${headers.Authorization.slice(0, 13)}...${headers.Authorization.slice(-6)}` : undefined
        console.log('[DEBUG_ADMIN] Request', { method: 'PATCH', url, headers: { ...headers, Authorization: maskedAuth } })
      }
      const res = await fetch(url, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ content: pageContent, images })
      })
      if (!res.ok) throw new Error('Failed to save page content')
      const updated = await res.json()
      if (debug) {
        console.log('[DEBUG_ADMIN] onSaved(updated)', {
          pageId: updated?.pageId,
          contentLength: JSON.stringify(updated?.content).length,
          imagesLength: Object.keys(updated?.images || {}).length
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

  const handleUploadImage = async (file, imageField) => {
    if (!file) return
    try {
      setUploading(prev => ({ ...prev, [imageField]: true }))
      if (debug) {
        console.log('[DEBUG_ADMIN] Upload image start', { size: file.size, type: file.type, name: file.name, imageField })
      }
      // sign request
      const subfolder = `pages/${pageId}/${imageField}`
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
        console.log('[DEBUG_ADMIN] Request sign', { method: 'POST', url: signUrl, body: { subfolder, tags: ['page-images'] }, headers: { ...headers, Authorization: maskedAuth } })
      }
      const signRes = await fetch(signUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subfolder, tags: ['page-images'] })
      })
      if (!signRes.ok) throw new Error('Failed to get upload signature')
      const params = await signRes.json()
      if (debug) {
        console.log('[DEBUG_ADMIN] Sign response', { folder: params.folder, cloudName: params.cloudName, hasSignature: !!params.signature })
      }

      const form = new FormData()
      form.append('file', file)
      form.append('timestamp', params.timestamp)
      form.append('api_key', params.apiKey)
      form.append('signature', params.signature)
      form.append('folder', params.folder)
      form.append('tags', 'page-images')

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${params.cloudName}/image/upload`, {
        method: 'POST',
        body: form
      })
      if (!uploadRes.ok) throw new Error('Failed to upload image')
      const uploadResult = await uploadRes.json()
      if (debug) {
        console.log('[DEBUG_ADMIN] Upload result', { publicId: uploadResult.public_id, url: uploadResult.secure_url })
      }

      // Update images state
      setImages(prev => ({
        ...prev,
        [imageField]: {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          alt: file.name
        }
      }))
    } catch (e) {
      alert(e.message)
    } finally {
      setUploading(prev => ({ ...prev, [imageField]: false }))
    }
  }

  const handleDeleteImage = async (imageField) => {
    try {
      const currentImage = images[imageField]
      if (!currentImage?.publicId) return

      const token = await getToken()
      if (!token) {
        alert('No Clerk token from getToken(). Are you signed in?')
        return
      }

      const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      const res = await fetch('/api/cloudinary/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ publicId: currentImage.publicId })
      })

      if (res.ok) {
        setImages(prev => {
          const newImages = { ...prev }
          delete newImages[imageField]
          return newImages
        })
      }
    } catch (e) {
      alert(e.message)
    }
  }

  const updateContentField = (section, field, value) => {
    setPageContent(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }))
  }

  const updateSection = (section, value) => {
    setPageContent(prev => ({
      ...prev,
      [section]: value
    }))
  }

  const addSection = (sectionName) => {
    setPageContent(prev => ({
      ...prev,
      [sectionName]: {
        title: '',
        content: ''
      }
    }))
  }

  const removeSection = (sectionName) => {
    setPageContent(prev => {
      const newContent = { ...prev }
      delete newContent[sectionName]
      return newContent
    })
  }

  if (!isAdmin) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="w-full max-w-6xl h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col text-gray-900 dark:text-gray-100">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="font-semibold">Edit Page Content</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        
        <div className="px-4 pt-2 flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {['content', 'images'].map(tab => (
            <button 
              key={tab} 
              className={`px-3 py-2 ${activeTab === tab ? 'border-b-2 border-primary-600 text-primary-700' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'content' ? 'Page Content' : 'Images'}
            </button>
          ))}
        </div>
        
        <div className="p-4 overflow-auto flex-1">
          {activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Page Content</h3>
                <div className="space-y-4">
                  {Object.entries(pageContent).map(([section, content]) => (
                    <div key={section} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium capitalize">{section.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        <button
                          onClick={() => removeSection(section)}
                          className="text-red-600 text-sm hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                      
                      {typeof content === 'object' && content !== null ? (
                        <div className="space-y-3">
                          {content.title !== undefined && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Title</label>
                              <input
                                type="text"
                                value={content.title || ''}
                                onChange={(e) => updateContentField(section, 'title', e.target.value)}
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                              />
                            </div>
                          )}
                          {content.content !== undefined && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Content</label>
                              <textarea
                                value={content.content || ''}
                                onChange={(e) => updateContentField(section, 'content', e.target.value)}
                                rows={6}
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                              />
                            </div>
                          )}
                          {content.description !== undefined && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Description</label>
                              <textarea
                                value={content.description || ''}
                                onChange={(e) => updateContentField(section, 'description', e.target.value)}
                                rows={3}
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                              />
                            </div>
                          )}
                          {content.subtitle !== undefined && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Subtitle</label>
                              <textarea
                                value={content.subtitle || ''}
                                onChange={(e) => updateContentField(section, 'subtitle', e.target.value)}
                                rows={3}
                                className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium mb-1">Content</label>
                          <textarea
                            value={content || ''}
                            onChange={(e) => updateSection(section, e.target.value)}
                            rows={4}
                            className="w-full p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={() => addSection('newSection')}
                    className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Add Section
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'images' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Page Images</h3>
                
                {imageFields.length > 0 ? (
                  <div className="space-y-6">
                    {imageFields.map((field) => (
                      <div key={field.name} className="border rounded-lg p-4">
                        <h4 className="font-medium mb-3 capitalize">{field.label || field.name.replace(/([A-Z])/g, ' $1').trim()}</h4>
                        
                        {/* Current Image */}
                        {images[field.name] && (
                          <div className="mb-4">
                            <img 
                              src={images[field.name].url} 
                              alt={images[field.name].alt || field.label} 
                              className="w-full max-w-md h-48 object-cover rounded-lg"
                            />
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                {images[field.name].alt || 'Current image'}
                              </span>
                              <button
                                onClick={() => handleDeleteImage(field.name)}
                                className="text-red-600 text-sm hover:text-red-800"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Upload Section */}
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4">
                          <input
                            ref={el => fileInputRefs.current[field.name] = el}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadImage(e.target.files[0], field.name)}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRefs.current[field.name]?.click()}
                            disabled={uploading[field.name]}
                            className="w-full py-4 text-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                          >
                            {uploading[field.name] ? 'Uploading...' : `Click to upload ${field.label || field.name} image`}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No image fields configured for this page
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button 
            disabled={saving} 
            className="btn-primary disabled:opacity-50" 
            onClick={handleSave}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
