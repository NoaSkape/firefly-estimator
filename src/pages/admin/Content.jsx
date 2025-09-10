// Content Management Admin Page
// Manages blog posts, policies, and other content

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  DocumentTextIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const Content = () => {
  const { getToken } = useAuth()
  const [activeTab, setActiveTab] = useState('blog')
  const [blogPosts, setBlogPosts] = useState([])
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  useEffect(() => {
    fetchBlogPosts()
    fetchPolicies()
  }, [])

  const fetchBlogPosts = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/content/blog', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBlogPosts(data.data.posts || [])
        }
      }
    } catch (error) {
      console.error('Blog posts fetch error:', error)
    }
  }

  const fetchPolicies = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/content/policies', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPolicies(data.data.policies || [])
        }
      }
    } catch (error) {
      console.error('Policies fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const deleteBlogPost = async (postId) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return

    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`/api/admin/content/blog/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        fetchBlogPosts() // Refresh the list
      }
    } catch (error) {
      console.error('Blog post deletion error:', error)
    }
  }

  const deletePolicy = async (policyId) => {
    if (!confirm('Are you sure you want to delete this policy?')) return

    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`/api/admin/content/policies/${policyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        fetchPolicies() // Refresh the list
      }
    } catch (error) {
      console.error('Policy deletion error:', error)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'draft':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      case 'archived':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Content Management">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Content Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <DocumentTextIcon className="h-8 w-8 text-blue-500 mr-3" />
                Content Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage blog posts, policies, and other content
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create {activeTab === 'blog' ? 'Post' : 'Policy'}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XCircleIcon className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('blog')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'blog'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Blog Posts ({blogPosts.length})
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'policies'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Policies ({policies.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'blog' ? (
              <div className="space-y-4">
                {blogPosts.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Blog Posts</h3>
                    <p className="text-gray-600 mb-4">
                      Get started by creating your first blog post.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Blog Post
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {blogPosts.map((post) => (
                      <div key={post._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{post.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(post.status)}`}>
                                {post.status}
                              </span>
                              {getStatusIcon(post.status)}
                            </div>
                            <p className="text-gray-600 mb-3">{post.excerpt || 'No excerpt available'}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <UserIcon className="h-4 w-4 mr-1" />
                                {post.author || 'Unknown'}
                              </span>
                              <span className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-1" />
                                {new Date(post.createdAt).toLocaleDateString()}
                              </span>
                              {post.tags && post.tags.length > 0 && (
                                <span className="flex items-center">
                                  <TagIcon className="h-4 w-4 mr-1" />
                                  {post.tags.join(', ')}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm">
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => setEditingItem(post)}
                              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => deleteBlogPost(post._id)}
                              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {policies.length === 0 ? (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Policies</h3>
                    <p className="text-gray-600 mb-4">
                      Get started by creating your first policy document.
                    </p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Create Policy
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <div key={policy._id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{policy.title}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                                {policy.status}
                              </span>
                              {getStatusIcon(policy.status)}
                            </div>
                            <p className="text-gray-600 mb-3">{policy.description || 'No description available'}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <UserIcon className="h-4 w-4 mr-1" />
                                {policy.author || 'Unknown'}
                              </span>
                              <span className="flex items-center">
                                <CalendarIcon className="h-4 w-4 mr-1" />
                                {new Date(policy.createdAt).toLocaleDateString()}
                              </span>
                              <span className="flex items-center">
                                <TagIcon className="h-4 w-4 mr-1" />
                                {policy.type || 'General'}
                              </span>
                            </div>
                          </div>
                          <div className="flex space-x-2 ml-4">
                            <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm">
                              <EyeIcon className="h-4 w-4 mr-1" />
                              View
                            </button>
                            <button
                              onClick={() => setEditingItem(policy)}
                              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm"
                            >
                              <PencilIcon className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={() => deletePolicy(policy._id)}
                              className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm"
                            >
                              <TrashIcon className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Modal */}
        {(showCreateModal || editingItem) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingItem ? 'Edit' : 'Create'} {activeTab === 'blog' ? 'Blog Post' : 'Policy'}
                </h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setEditingItem(null)
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      defaultValue={editingItem?.title || ''}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      defaultValue={editingItem?.status || 'draft'}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {activeTab === 'blog' ? 'Excerpt' : 'Description'}
                  </label>
                  <textarea
                    defaultValue={editingItem?.excerpt || editingItem?.description || ''}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter excerpt/description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content
                  </label>
                  <textarea
                    defaultValue={editingItem?.content || ''}
                    rows={10}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter content..."
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setEditingItem(null)
                    }}
                    className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    {editingItem ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Content
