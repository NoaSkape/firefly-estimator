import React, { useState, useEffect } from 'react'
import { securityAuditLogger, SECURITY_EVENTS, SEVERITY_LEVELS } from '../../lib/securityAudit'
import { usePrivacyCompliance } from '../utils/privacy'

export default function SecurityAuditReport() {
  const [timeframe, setTimeframe] = useState('30d')
  const [selectedEventType, setSelectedEventType] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('')
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({})
  const [showDetails, setShowDetails] = useState(false)
  const [exportFormat, setExportFormat] = useState('json')
  
  const { checkCompliance } = usePrivacyCompliance()

  // Load security statistics and logs
  useEffect(() => {
    loadSecurityData()
  }, [timeframe])

  const loadSecurityData = () => {
    const securityStats = securityAuditLogger.getSecurityStats(timeframe)
    const securityLogs = securityAuditLogger.getLogs({
      eventType: selectedEventType || undefined,
      severity: selectedSeverity || undefined
    })
    
    setStats(securityStats)
    setLogs(securityLogs)
  }

  // Filter logs
  const filterLogs = () => {
    loadSecurityData()
  }

  // Export logs
  const exportLogs = () => {
    const criteria = {
      eventType: selectedEventType || undefined,
      severity: selectedSeverity || undefined
    }
    
    const exportedData = securityAuditLogger.exportLogs(exportFormat, criteria)
    
    if (exportFormat === 'json') {
      const blob = new Blob([exportedData], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `security-audit-${timeframe}-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else if (exportFormat === 'csv') {
      const blob = new Blob([exportedData], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `security-audit-${timeframe}-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case SEVERITY_LEVELS.LOW:
        return 'text-green-600 bg-green-100'
      case SEVERITY_LEVELS.MEDIUM:
        return 'text-yellow-600 bg-yellow-100'
      case SEVERITY_LEVELS.HIGH:
        return 'text-orange-600 bg-orange-100'
      case SEVERITY_LEVELS.CRITICAL:
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  // Get event type label
  const getEventTypeLabel = (eventType) => {
    const labels = {
      [SECURITY_EVENTS.AUTH_LOGIN_SUCCESS]: 'Login Success',
      [SECURITY_EVENTS.AUTH_LOGIN_FAILURE]: 'Login Failure',
      [SECURITY_EVENTS.AUTH_LOGOUT]: 'Logout',
      [SECURITY_EVENTS.AUTH_ACCESS_GRANTED]: 'Access Granted',
      [SECURITY_EVENTS.AUTH_ACCESS_DENIED]: 'Access Denied',
      [SECURITY_EVENTS.SUSPICIOUS_ACTIVITY]: 'Suspicious Activity',
      [SECURITY_EVENTS.RATE_LIMIT_EXCEEDED]: 'Rate Limit Exceeded',
      [SECURITY_EVENTS.DATA_ACCESS]: 'Data Access',
      [SECURITY_EVENTS.DATA_MODIFICATION]: 'Data Modification',
      [SECURITY_EVENTS.GDPR_REQUEST]: 'GDPR Request',
      [SECURITY_EVENTS.CPRA_REQUEST]: 'CPRA Request'
    }
    return labels[eventType] || eventType
  }

  // Check compliance status
  const checkComplianceStatus = () => {
    return checkCompliance()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Security Audit Report
        </h1>
        <p className="text-gray-600">
          Comprehensive security monitoring and compliance reporting for Firefly Tiny Homes
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeframe
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Type
            </label>
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Events</option>
              {Object.values(SECURITY_EVENTS).map(eventType => (
                <option key={eventType} value={eventType}>
                  {getEventTypeLabel(eventType)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity
            </label>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              {Object.values(SEVERITY_LEVELS).map(severity => (
                <option key={severity} value={severity}>
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={filterLogs}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Security Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Events</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalEvents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Successful Logins</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.successfulAuthAttempts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed Logins</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failedAuthAttempts || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Suspicious Activity</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.suspiciousActivity || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Severity Distribution */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Events by Severity</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.bySeverity || {}).map(([severity, count]) => (
            <div key={severity} className="text-center">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(severity)}`}>
                {severity.charAt(0).toUpperCase() + severity.slice(1)}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Compliance Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">GDPR Compliance</h4>
            <div className="space-y-2">
              {Object.entries(checkComplianceStatus().gdpr.requirements || {}).map(([requirement, status]) => (
                <div key={requirement} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {requirement.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status.compliant 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.compliant ? 'Compliant' : 'Non-Compliant'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-3">CPRA Compliance</h4>
            <div className="space-y-2">
              {Object.entries(checkComplianceStatus().cpra.requirements || {}).map(([requirement, status]) => (
                <div key={requirement} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">
                    {requirement.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status.compliant 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {status.compliant ? 'Compliant' : 'Non-Compliant'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Security Logs */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Security Event Logs</h3>
          <div className="flex items-center space-x-4">
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
            <button
              onClick={exportLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              Export
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.slice(0, 50).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getEventTypeLabel(log.eventType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                      {log.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.details.userId || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <button
                      onClick={() => setShowDetails(log.id === showDetails ? null : log.id)}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {log.id === showDetails ? 'Hide' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {logs.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No security events found for the selected criteria.
          </div>
        )}
        
        {logs.length > 50 && (
          <div className="text-center py-4 text-sm text-gray-500">
            Showing first 50 events. Use filters to narrow results.
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {showDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Event Details</h3>
                <button
                  onClick={() => setShowDetails(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {(() => {
                const log = logs.find(l => l.id === showDetails)
                if (!log) return null
                
                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Event ID</label>
                        <p className="text-sm text-gray-900">{log.id}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                        <p className="text-sm text-gray-900">{new Date(log.timestamp).toLocaleString()}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Event Type</label>
                        <p className="text-sm text-gray-900">{getEventTypeLabel(log.eventType)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Severity</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(log.severity)}`}>
                          {log.severity}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Details</label>
                      <pre className="mt-1 p-3 bg-gray-50 rounded text-sm text-gray-900 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Metadata</label>
                      <div className="mt-1 space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">User Agent:</span> {log.userAgent}
                          </div>
                          <div>
                            <span className="font-medium">URL:</span> {log.url}
                          </div>
                          <div>
                            <span className="font-medium">Session ID:</span> {log.sessionId}
                          </div>
                          <div>
                            <span className="font-medium">Hash:</span> {log.hash}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
