// Advanced Reports Admin Page
// Provides comprehensive reporting with custom report builder

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  ChartBarIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline'

const AdvancedReports = () => {
  const { getToken } = useAuth()
  const [reports, setReports] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState(null)
  const [executingReport, setExecutingReport] = useState(null)

  useEffect(() => {
    fetchReports()
    fetchTemplates()
  }, [])

  const fetchReports = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/admin/reports', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setReports(data.data.reports || [])
      } else {
        throw new Error(data.error || 'Failed to fetch reports')
      }
    } catch (error) {
      console.error('Reports fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/reports/templates', {
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

  const executeReport = async (reportId, format = 'json') => {
    try {
      setExecutingReport(reportId)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/reports/${reportId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ format })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        // Handle different response types
        if (format === 'csv' && data.data.downloadUrl) {
          // Download CSV file
          window.open(data.data.downloadUrl, '_blank')
        } else {
          // Show JSON data in modal or download
          setSelectedReport({ ...data.data, format })
        }
      } else {
        throw new Error(data.error || 'Failed to execute report')
      }
    } catch (error) {
      console.error('Report execution error:', error)
      setError(error.message)
    } finally {
      setExecutingReport(null)
    }
  }

  const createReportFromTemplate = async (templateId) => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/reports/templates/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `Report from ${templates.find(t => t.id === templateId)?.name}`,
          description: 'Created from template'
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          fetchReports() // Refresh reports list
          setShowCreateModal(false)
        }
      }
    } catch (error) {
      console.error('Template creation error:', error)
      setError(error.message)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'inactive':
        return <XCircleIcon className="h-5 w-5 text-gray-400" />
      default:
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'financial':
        return 'bg-green-100 text-green-800'
      case 'operational':
        return 'bg-blue-100 text-blue-800'
      case 'customer':
        return 'bg-purple-100 text-purple-800'
      case 'inventory':
        return 'bg-orange-100 text-orange-800'
      case 'marketing':
        return 'bg-pink-100 text-pink-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Advanced Reports">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Advanced Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-8 w-8 text-blue-500 mr-3" />
                Advanced Reports
              </h1>
              <p className="text-gray-600 mt-1">
                Create, manage, and execute custom business reports
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Report
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

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {report.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {report.description || 'No description'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                    {getStatusIcon(report.status)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Last Run:</span>
                  <span>{report.lastRunAt ? new Date(report.lastRunAt).toLocaleDateString() : 'Never'}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Run Count:</span>
                  <span>{report.runCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Created:</span>
                  <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => executeReport(report._id, 'json')}
                  disabled={executingReport === report._id}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {executingReport === report._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Run
                    </>
                  )}
                </button>
                <button
                  onClick={() => executeReport(report._id, 'csv')}
                  disabled={executingReport === report._id}
                  className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                </button>
                <button className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center text-sm">
                  <EyeIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Report Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Report</h2>
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
                        onClick={() => createReportFromTemplate(template.id)}
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(template.type)}`}>
                            {template.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.columns?.length || 0} columns
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

        {/* Report Results Modal */}
        {selectedReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Report Results</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Report Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedReport.report?.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Type:</span>
                      <span className="ml-2 font-medium">{selectedReport.report?.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Format:</span>
                      <span className="ml-2 font-medium">{selectedReport.format}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Records:</span>
                      <span className="ml-2 font-medium">{selectedReport.recordCount}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Data Preview</h3>
                  <pre className="text-sm text-gray-700 overflow-x-auto">
                    {JSON.stringify(selectedReport.data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdvancedReports
