// Integration Hub Admin Page
// Manages third-party service integrations and API connections

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  CogIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const Integrations = () => {
  const { getToken } = useAuth()
  const [integrations, setIntegrations] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [testingIntegration, setTestingIntegration] = useState(null)
  const [syncingIntegration, setSyncingIntegration] = useState(null)

  useEffect(() => {
    fetchIntegrations()
    fetchTemplates()
  }, [])

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/admin/integrations', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setIntegrations(data.data.integrations || [])
      } else {
        throw new Error(data.error || 'Failed to fetch integrations')
      }
    } catch (error) {
      console.error('Integrations fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/integrations/templates', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTemplates(data.data || [])
        }
      }
    } catch (error) {
      console.error('Templates fetch error:', error)
    }
  }

  const testIntegration = async (integrationId) => {
    try {
      setTestingIntegration(integrationId)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/integrations/${integrationId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // Refresh integrations to show updated status
        fetchIntegrations()
        alert(`Integration test ${data.data.success ? 'passed' : 'failed'}: ${data.data.message}`)
      } else {
        throw new Error(data.error || 'Failed to test integration')
      }
    } catch (error) {
      console.error('Integration test error:', error)
      setError(error.message)
    } finally {
      setTestingIntegration(null)
    }
  }

  const syncIntegration = async (integrationId) => {
    try {
      setSyncingIntegration(integrationId)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // Refresh integrations to show updated sync status
        fetchIntegrations()
        alert(`Sync completed: ${data.data.message}`)
      } else {
        throw new Error(data.error || 'Failed to sync integration')
      }
    } catch (error) {
      console.error('Integration sync error:', error)
      setError(error.message)
    } finally {
      setSyncingIntegration(null)
    }
  }

  const createIntegrationFromTemplate = async (templateId) => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const template = templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      const response = await fetch('/api/admin/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: template.name,
          type: template.type,
          provider: template.provider,
          description: template.description,
          configuration: template.configuration,
          isEnabled: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          fetchIntegrations() // Refresh integrations list
          setShowCreateModal(false)
        }
      }
    } catch (error) {
      console.error('Integration creation error:', error)
      setError(error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'pending':
        return <ArrowPathIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'payment':
        return 'bg-green-100 text-green-800'
      case 'shipping':
        return 'bg-blue-100 text-blue-800'
      case 'marketing':
        return 'bg-purple-100 text-purple-800'
      case 'analytics':
        return 'bg-orange-100 text-orange-800'
      case 'communication':
        return 'bg-pink-100 text-pink-800'
      case 'storage':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Integrations">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Integrations">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <CloudArrowUpIcon className="h-8 w-8 text-blue-500 mr-3" />
                Integration Hub
              </h1>
              <p className="text-gray-600 mt-1">
                Manage third-party service integrations and API connections
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Integration
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {integrations.map((integration) => (
            <div key={integration._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {integration.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {integration.provider}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(integration.type)}`}>
                      {integration.type}
                    </span>
                    {getStatusIcon(integration.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Status:</span>
                  <span className="capitalize">{integration.status}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Enabled:</span>
                  <span>{integration.isEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Last Sync:</span>
                  <span>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sync Count:</span>
                  <span>{integration.syncCount || 0}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => testIntegration(integration._id)}
                  disabled={testingIntegration === integration._id}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {testingIntegration === integration._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Test
                    </>
                  )}
                </button>
                <button
                  onClick={() => syncIntegration(integration._id)}
                  disabled={syncingIntegration === integration._id || !integration.isEnabled}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {syncingIntegration === integration._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <ArrowPathIcon className="h-4 w-4" />
                  )}
                </button>
                <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center text-sm">
                  <CogIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Integration Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Add New Integration</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Choose a Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                        onClick={() => createIntegrationFromTemplate(template.id)}
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                            {template.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.provider}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {integrations.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <CloudArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Integrations</h3>
            <p className="text-gray-600 mb-4">
              Get started by adding your first integration to connect with third-party services.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Integration
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Integrations
