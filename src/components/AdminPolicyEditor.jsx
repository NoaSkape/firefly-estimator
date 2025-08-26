import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function AdminPolicyEditor({ policyId, title, onSave, onCancel }) {
  const { getToken } = useAuth()
  const [policy, setPolicy] = useState(null)
  const [editedTitle, setEditedTitle] = useState('')
  const [editedContent, setEditedContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadPolicy() {
      try {
        const response = await fetch(`/api/policies/${policyId}`)
        if (response.ok) {
          const data = await response.json()
          setPolicy(data)
          setEditedTitle(data.title || '')
          setEditedContent(data.content || '')
        } else {
          setError('Failed to load policy')
        }
      } catch (err) {
        console.error('Failed to load policy:', err)
        setError('Failed to load policy')
      } finally {
        setLoading(false)
      }
    }

    loadPolicy()
  }, [policyId])

  const handleSave = async () => {
    if (!editedTitle.trim() || !editedContent.trim()) {
      setError('Title and content are required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const token = await getToken()
      const response = await fetch(`/api/admin/policies/${policyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editedTitle.trim(),
          content: editedContent.trim()
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPolicy(data.policy)
        onSave?.(data.policy)
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Failed to save policy')
      }
    } catch (err) {
      console.error('Failed to save policy:', err)
      setError('Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-4"></div>
          <div className="h-64 bg-gray-300 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">{title || 'Edit Policy'}</h2>
          {policy?.lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {new Date(policy.lastUpdated).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter policy title"
            />
          </div>

          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
              Content
              <span className="text-gray-500 text-xs ml-2">(Markdown supported)</span>
            </label>
            <textarea
              id="content"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder="Enter policy content (Markdown supported)"
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !editedTitle.trim() || !editedContent.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Markdown Guide</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p><code># Heading 1</code> or <code>## Heading 2</code> for headings</p>
          <p><code>**bold text**</code> for bold, <code>*italic text*</code> for italic</p>
          <p><code>- Item 1</code> or <code>* Item 1</code> for bullet lists</p>
          <p><code>1. Item 1</code> for numbered lists</p>
        </div>
      </div>
    </div>
  )
}
