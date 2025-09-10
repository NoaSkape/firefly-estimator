// Data Export & Backup Admin Page
// Manages data export jobs and backup operations

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  CpuChipIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  PauseIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'

const DataExport = () => {
  const { getToken } = useAuth()
  const [exports, setExports] = useState([])
  const [templates, setTemplates] = useState([])
  const [backupStatus, setBackupStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [executingExport, setExecutingExport] = useState(null)

  useEffect(() => {
    fetchExports()
    fetchTemplates()
    fetchBackupStatus()
  }, [])

  const fetchExports = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/admin/export', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setExports(data.data.exports || [])
      } else {
        throw new Error(data.error || 'Failed to fetch exports')
      }
    } catch (error) {
      console.error('Exports fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/export/templates', {
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

  const fetchBackupStatus = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/export/backup/status', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setBackupStatus(data.data)
        }
      }
    } catch (error) {
      console.error('Backup status fetch error:', error)
    }
  }

  const executeExport = async (exportId) => {
    try {
      setExecutingExport(exportId)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/export/${exportId}/execute`, {
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
        alert(`Export started successfully!`)
        fetchExports() // Refresh exports to show updated status
      } else {
        throw new Error(data.error || 'Failed to execute export')
      }
    } catch (error) {
      console.error('Export execution error:', error)
      setError(error.message)
    } finally {
      setExecutingExport(null)
    }
  }

  const downloadExport = async (exportId) => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`/api/admin/export/${exportId}/download`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `export-${exportId}-${new Date().toISOString().split('T')[0]}.zip`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Download error:', error)
    }
  }

  const createExportFromTemplate = async (templateId) => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const template = templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          collections: template.collections,
          format: template.format,
          filters: template.filters,
          isScheduled: false
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          fetchExports() // Refresh exports list
          setShowCreateModal(false)
        }
      }
    } catch (error) {
      console.error('Export creation error:', error)
      setError(error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'running':
        return <ClockIcon className="h-5 w-5 text-blue-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />
    }
  }

  const getFormatColor = (format) => {
    switch (format) {
      case 'json':
        return 'bg-blue-100 text-blue-800'
      case 'csv':
        return 'bg-green-100 text-green-800'
      case 'xlsx':
        return 'bg-purple-100 text-purple-800'
      case 'sql':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <AdminLayout title="Data Export">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Data Export">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <CpuChipIcon className="h-8 w-8 text-blue-500 mr-3" />
                Data Export & Backup
              </h1>
              <p className="text-gray-600 mt-1">
                Manage data exports, backups, and system recovery
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Export
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

        {/* Backup Status */}
        {backupStatus && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Backup Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Last Backup</p>
                <p className="text-lg font-semibold text-gray-900">
                  {backupStatus.lastBackup ? new Date(backupStatus.lastBackup).toLocaleDateString() : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Backup Size</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatFileSize(backupStatus.backupSize || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {backupStatus.status || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Exports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exports.map((exportItem) => (
            <div key={exportItem._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {exportItem.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {exportItem.description || 'No description'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormatColor(exportItem.format)}`}>
                      {exportItem.format}
                    </span>
                    {getStatusIcon(exportItem.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Collections:</span>
                  <span>{exportItem.collections?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Records:</span>
                  <span>{exportItem.recordCount?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>File Size:</span>
                  <span>{formatFileSize(exportItem.fileSize || 0)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Last Run:</span>
                  <span>{exportItem.lastExecutedAt ? new Date(exportItem.lastExecutedAt).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => executeExport(exportItem._id)}
                  disabled={executingExport === exportItem._id || exportItem.status === 'running'}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {executingExport === exportItem._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Export
                    </>
                  )}
                </button>
                {exportItem.status === 'completed' && exportItem.downloadUrl && (
                  <button
                    onClick={() => downloadExport(exportItem._id)}
                    className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm"
                  >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                  </button>
                )}
                <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center text-sm">
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Export Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Export</h2>
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
                        onClick={() => createExportFromTemplate(template.id)}
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getFormatColor(template.format)}`}>
                            {template.format}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.collections?.length || 0} collections
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
        {exports.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <CpuChipIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exports</h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first data export to backup your system data.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Export
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default DataExport
