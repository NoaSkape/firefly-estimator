// Performance Monitoring Admin Page
// Provides system health monitoring and performance metrics

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ClockIcon,
  CpuChipIcon,
  ServerIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowPathIcon,
  BellIcon
} from '@heroicons/react/24/outline'

const Monitoring = () => {
  const { getToken } = useAuth()
  const [healthData, setHealthData] = useState(null)
  const [performanceData, setPerformanceData] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h')
  const [selectedLogLevel, setSelectedLogLevel] = useState('')

  useEffect(() => {
    fetchSystemHealth()
    fetchPerformanceMetrics()
    fetchAlerts()
    fetchLogs()
  }, [selectedTimeRange, selectedLogLevel])

  const fetchSystemHealth = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/monitoring/health', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setHealthData(data.data)
        }
      }
    } catch (error) {
      console.error('System health fetch error:', error)
    }
  }

  const fetchPerformanceMetrics = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch(`/api/admin/monitoring/performance?range=${selectedTimeRange}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setPerformanceData(data.data)
        }
      }
    } catch (error) {
      console.error('Performance metrics fetch error:', error)
    }
  }

  const fetchAlerts = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/monitoring/alerts', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAlerts(data.data.alerts || [])
        }
      }
    } catch (error) {
      console.error('Alerts fetch error:', error)
    }
  }

  const fetchLogs = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams()
      if (selectedLogLevel) params.append('level', selectedLogLevel)
      params.append('limit', '50')

      const response = await fetch(`/api/admin/monitoring/logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setLogs(data.data.logs || [])
      } else {
        throw new Error(data.error || 'Failed to fetch logs')
      }
    } catch (error) {
      console.error('Logs fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getHealthStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />
      case 'degraded':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />
      case 'unhealthy':
        return <XCircleIcon className="h-6 w-6 text-red-500" />
      default:
        return <ClockIcon className="h-6 w-6 text-gray-500" />
    }
  }

  const getHealthStatusColor = (status) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200'
      case 'degraded':
        return 'bg-yellow-50 border-yellow-200'
      case 'unhealthy':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const getLogLevelColor = (level) => {
    switch (level) {
      case 'error':
        return 'text-red-600 bg-red-50'
      case 'warn':
        return 'text-yellow-600 bg-yellow-50'
      case 'info':
        return 'text-blue-600 bg-blue-50'
      case 'debug':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${days}d ${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <AdminLayout title="Monitoring">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Monitoring">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <EyeIcon className="h-8 w-8 text-blue-500 mr-3" />
                Performance Monitoring
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor system health, performance metrics, and alerts
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  fetchSystemHealth()
                  fetchPerformanceMetrics()
                  fetchAlerts()
                  fetchLogs()
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <ArrowPathIcon className="h-5 w-5 mr-2" />
                Refresh
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

        {/* System Health Overview */}
        {healthData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`bg-white shadow rounded-lg p-6 border-l-4 ${getHealthStatusColor(healthData.overall?.status)}`}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {getHealthStatusIcon(healthData.overall?.status)}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overall Health</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.overall?.score || 0}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Database</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.database?.responseTime || 0}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <GlobeAltIcon className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">API Response</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.api?.responseTime || 0}ms
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CpuChipIcon className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {healthData.system?.memory?.usagePercent?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        {healthData?.system && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">System Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Uptime</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatUptime(healthData.system.uptime?.seconds || 0)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Node Version</p>
                <p className="text-lg font-semibold text-gray-900">
                  {healthData.system.nodeVersion || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Platform</p>
                <p className="text-lg font-semibold text-gray-900">
                  {healthData.system.platform || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Memory Total</p>
                <p className="text-lg font-semibold text-gray-900">
                  {formatBytes(healthData.system.memory?.total || 0)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {performanceData && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500">Average Response Time</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {performanceData.responseTime?.avgResponseTime?.toFixed(0) || 0}ms
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Error Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {performanceData.errorRate?.toFixed(2) || 0}%
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Total Requests</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {performanceData.totalRequests?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Alerts</h2>
            <div className="space-y-4">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert._id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <BellIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">{alert.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Logs */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">System Logs</h2>
            <div className="flex space-x-3">
              <select
                value={selectedLogLevel}
                onChange={(e) => setSelectedLogLevel(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
          </div>
          
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Logs</h3>
                <p className="text-gray-600">
                  No system logs match your current filters.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div key={log._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getLogLevelColor(log.level)}`}>
                    {log.level}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{log.message}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                      {log.source && (
                        <span>Source: {log.source}</span>
                      )}
                      <span>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
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

export default Monitoring
