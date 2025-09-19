// Security & Audit Center Admin Page
// Provides comprehensive security monitoring and audit logging

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  ClockIcon,
  UserIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

const Security = () => {
  const { getToken } = useAuth()
  const [securityData, setSecurityData] = useState(null)
  const [events, setEvents] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [selectedType, setSelectedType] = useState('')

  useEffect(() => {
    fetchSecurityDashboard()
    fetchSecurityEvents()
    fetchSecurityRecommendations()
  }, [selectedTimeRange, selectedSeverity, selectedType])

  const fetchSecurityDashboard = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`/api/admin/security/overview?range=${selectedTimeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSecurityData(data.data)
        }
      }
    } catch (error) {
      console.error('Security dashboard fetch error:', error)
    }
  }

  const fetchSecurityEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams()
      if (selectedSeverity) params.append('severity', selectedSeverity)
      if (selectedType) params.append('type', selectedType)
      params.append('limit', '50')

      const response = await fetch(`/api/admin/security/events?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setEvents(data.data.events || [])
      } else {
        throw new Error(data.error || 'Failed to fetch security events')
      }
    } catch (error) {
      console.error('Security events fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchSecurityRecommendations = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/security/recommendations', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRecommendations(data.data.recommendations || [])
        }
      }
    } catch (error) {
      console.error('Security recommendations fetch error:', error)
    }
  }

  const exportSecurityLogs = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/security/export?format=csv', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `security-logs-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200'
      case 'high':
        return 'bg-orange-50 border-orange-200'
      case 'medium':
        return 'bg-yellow-50 border-yellow-200'
      case 'low':
        return 'bg-green-50 border-green-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'login':
      case 'logout':
        return <UserIcon className="h-4 w-4" />
      case 'failed_login':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'permission_denied':
        return <ShieldCheckIcon className="h-4 w-4" />
      case 'data_access':
      case 'data_modification':
        return <DocumentTextIcon className="h-4 w-4" />
      case 'system_change':
        return <CogIcon className="h-4 w-4" />
      case 'suspicious_activity':
        return <ExclamationTriangleIcon className="h-4 w-4" />
      default:
        return <InformationCircleIcon className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Security & Audit">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Security & Audit">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-blue-500 mr-3" />
                Security & Audit Center
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor security events, audit logs, and system access
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={exportSecurityLogs}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Export Logs
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

        {/* Security Dashboard */}
        {securityData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Critical Events</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityData.metrics?.criticalEvents || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-8 w-8 text-orange-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">High Events</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityData.metrics?.highEvents || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Failed Logins</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityData.metrics?.failedLogins || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Permission Denied</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityData.metrics?.permissionDenied || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Security Recommendations</h2>
            <div className="space-y-4">
              {recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className={`border-l-4 p-4 rounded-r-lg ${getSeverityColor(recommendation.priority)}`}
                >
                  <div className="flex items-start">
                    {getSeverityIcon(recommendation.priority)}
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-gray-900">
                        {recommendation.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {recommendation.description}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        <strong>Recommendation:</strong> {recommendation.recommendation}
                      </p>
                      {recommendation.actionItems && recommendation.actionItems.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-900">Action Items:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                            {recommendation.actionItems.map((item, itemIndex) => (
                              <li key={itemIndex}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Security Events</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="1d">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
                <option value="failed_login">Failed Login</option>
                <option value="permission_denied">Permission Denied</option>
                <option value="data_access">Data Access</option>
                <option value="data_modification">Data Modification</option>
                <option value="system_change">System Change</option>
                <option value="suspicious_activity">Suspicious Activity</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security Events List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Security Events</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {events.length === 0 ? (
              <div className="p-6 text-center">
                <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Security Events</h3>
                <p className="text-gray-600">
                  No security events match your current filters.
                </p>
              </div>
            ) : (
              events.map((event) => (
                <div key={event._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getTypeIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(event.severity)}
                          <p className="text-sm font-medium text-gray-900 capitalize">
                            {event.type.replace('_', ' ')}
                          </p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                            {event.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {event.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          {event.userId && (
                            <span className="flex items-center">
                              <UserIcon className="h-3 w-3 mr-1" />
                              {event.userId}
                            </span>
                          )}
                          {event.ipAddress && (
                            <span className="flex items-center">
                              <GlobeAltIcon className="h-3 w-3 mr-1" />
                              {event.ipAddress}
                            </span>
                          )}
                          <span className="flex items-center">
                            <ClockIcon className="h-3 w-3 mr-1" />
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <EyeIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default Security
