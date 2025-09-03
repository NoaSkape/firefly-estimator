// Admin Drafts Page
// Lists all draft blog posts with edit, publish, and delete actions

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import {
  PencilIcon,
  EyeIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  CalendarIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '../../components/AdminLayout'

const AdminDrafts = () => {
  const [drafts, setDrafts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDrafts, setSelectedDrafts] = useState([])
  const [actionLoading, setActionLoading] = useState(false)
  const { getToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchDrafts()
  }, [])

  const fetchDrafts = async () => {
    try {
      setLoading(true)
      setError('')
      
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch('/api/admin/drafts', { headers })
      
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.posts || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(`Failed to fetch drafts: ${errorData.error || 'Server error'}`)
      }
    } catch (err) {
      console.error('Fetch drafts error:', err)
      setError(`Network error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (draft) => {
    navigate(`/blog/edit/${draft._id}`)
  }

  const handlePublish = async (draft) => {
    try {
      setActionLoading(true)
      
      const token = await getToken()
      const headers = { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
      
      const response = await fetch(`/api/admin/blog/${draft._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...draft,
          status: 'published',
          publishDate: new Date().toISOString()
        })
      })
      
      if (response.ok) {
        // Remove from drafts list since it's now published
        setDrafts(drafts.filter(d => d._id !== draft._id))
        alert('Post published successfully!')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to publish: ${errorData.error || 'Server error'}`)
      }
    } catch (err) {
      console.error('Publish error:', err)
      alert(`Publish failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (draft) => {
    if (!confirm(`Are you sure you want to delete "${draft.title}"? This action cannot be undone.`)) {
      return
    }
    
    try {
      setActionLoading(true)
      
      const token = await getToken()
      const headers = { Authorization: `Bearer ${token}` }
      
      const response = await fetch(`/api/admin/blog/${draft._id}`, {
        method: 'DELETE',
        headers
      })
      
      if (response.ok) {
        setDrafts(drafts.filter(d => d._id !== draft._id))
        alert('Draft deleted successfully!')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        alert(`Failed to delete: ${errorData.error || 'Server error'}`)
      }
    } catch (err) {
      console.error('Delete error:', err)
      alert(`Delete failed: ${err.message}`)
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTemplateLabel = (template) => {
    switch (template) {
      case 'story': return 'Story-Driven'
      case 'educational': return 'Educational'
      case 'inspiration': return 'Inspirational'
      default: return 'Default'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Draft Posts">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading drafts...</p>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Draft Posts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Draft Posts</h1>
            <p className="text-gray-600 mt-1">
              Manage your unpublished blog posts. Edit, publish, or delete drafts.
            </p>
          </div>
          <Link
            to="/blog/create"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
            Create New Post
          </Link>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
                <div className="mt-4">
                  <button
                    onClick={fetchDrafts}
                    className="bg-red-100 px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drafts list */}
        {drafts.length === 0 ? (
          <div className="text-center py-12">
            <DocumentDuplicateIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No drafts</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new blog post.
            </p>
            <div className="mt-6">
              <Link
                to="/blog/create"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                Create New Post
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {drafts.map((draft) => (
                <li key={draft._id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {draft.title}
                          </h3>
                          {draft.excerpt && (
                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {draft.excerpt}
                            </p>
                          )}
                          <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                            <div className="flex items-center">
                              <CalendarIcon className="h-4 w-4 mr-1" />
                              Created: {formatDate(draft.createdAt)}
                            </div>
                            <div className="flex items-center">
                              <ClockIcon className="h-4 w-4 mr-1" />
                              Updated: {formatDate(draft.updatedAt)}
                            </div>
                            <div className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                              {getTemplateLabel(draft.template)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(draft)}
                        disabled={actionLoading}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        title="Edit draft"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handlePublish(draft)}
                        disabled={actionLoading}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                        title="Publish draft"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Publish
                      </button>
                      
                      <button
                        onClick={() => handleDelete(draft)}
                        disabled={actionLoading}
                        className="inline-flex items-center p-2 border border-gray-300 rounded-md text-sm text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                        title="Delete draft"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminDrafts
