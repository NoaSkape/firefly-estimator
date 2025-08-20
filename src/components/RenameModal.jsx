import { useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from './ToastProvider'

export default function RenameModal({ build, isOpen, onClose, onRenamed }) {
  const [name, setName] = useState(build?.modelName || '')
  const [saving, setSaving] = useState(false)
  const { getToken } = useAuth()
  const { addToast } = useToast()

  if (!isOpen || !build) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    
    setSaving(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/builds/${build._id}/rename`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ name: name.trim() })
      })
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.message || 'Failed to rename build')
      }
      
      const result = await res.json()
      addToast({ type: 'success', message: 'Build renamed successfully' })
      onRenamed?.(result.build)
      onClose()
    } catch (error) {
      addToast({ type: 'error', message: error.message || 'Failed to rename build' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Rename Build
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="build-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Build Name
            </label>
            <input
              id="build-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Enter build name..."
              maxLength={200}
              required
            />
          </div>
          
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
