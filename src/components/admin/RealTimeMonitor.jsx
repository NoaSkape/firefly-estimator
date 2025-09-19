// Enterprise Real-Time Monitor Component
// Live customer activity monitoring for admin dashboard

import React, { useState, useEffect } from 'react'
import { 
  EyeIcon, 
  UserIcon, 
  GlobeAltIcon, 
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
  SignalIcon,
  MapPinIcon
} from '@heroicons/react/24/outline'

export default function RealTimeMonitor({ isOpen, onClose }) {
  const [activeSessions, setActiveSessions] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [stats, setStats] = useState({
    currentVisitors: 0,
    avgSessionTime: 0,
    topPages: [],
    devices: { desktop: 0, mobile: 0, tablet: 0 }
  })
  const [loading, setLoading] = useState(true)

  // Fetch real-time data
  useEffect(() => {
    if (!isOpen) return

    const fetchRealTimeData = async () => {
      try {
        const response = await fetch('/api/admin/realtime-monitor')
        if (response.ok) {
          const data = await response.json()
          setActiveSessions(data.activeSessions || [])
          setRecentActivity(data.recentActivity || [])
          setStats(data.stats || stats)
        }
      } catch (error) {
        console.error('[REALTIME_MONITOR] Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    // Initial fetch
    fetchRealTimeData()

    // Set up real-time updates every 5 seconds
    const interval = setInterval(fetchRealTimeData, 5000)

    return () => clearInterval(interval)
  }, [isOpen])

  const formatDuration = (seconds) => {
    if (!seconds) return '0s'
    if (seconds < 60) return `${Math.round(seconds)}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${Math.round(remainingSeconds)}s`
  }

  const getDeviceIcon = (device) => {
    switch (device) {
      case 'mobile': return DevicePhoneMobileIcon
      case 'tablet': return DevicePhoneMobileIcon
      default: return ComputerDesktopIcon
    }
  }

  const getLocationString = (location) => {
    if (!location) return 'Unknown'
    return `${location.city || 'Unknown'}, ${location.region || location.country || 'Unknown'}`
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <SignalIcon className="w-6 h-6 text-white" />
              <h2 className="text-xl font-semibold text-white">Real-Time Monitor</h2>
            </div>
            <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-white">Live</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <EyeIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.currentVisitors}</div>
                <div className="text-sm text-gray-500">Current Visitors</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgSessionTime)}</div>
                <div className="text-sm text-gray-500">Avg Session</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <ComputerDesktopIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalDevices || 0}
                </div>
                <div className="text-sm text-gray-500">Total Devices</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <GlobeAltIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.activePages || 0}</div>
                <div className="text-sm text-gray-500">Active Pages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Active Sessions */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <EyeIcon className="w-5 h-5 text-blue-600" />
                  Active Sessions ({activeSessions.length})
                </h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : activeSessions.length > 0 ? (
                  <div className="space-y-3">
                    {activeSessions.map((session, index) => {
                      const DeviceIcon = getDeviceIcon(session.device)
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              {session.userId ? (
                                <UserIcon className="w-4 h-4 text-blue-600" />
                              ) : (
                                <EyeIcon className="w-4 h-4 text-gray-600" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {session.userName || 'Anonymous Visitor'}
                              </div>
                              <div className="text-xs text-gray-500 flex items-center gap-2">
                                <DeviceIcon className="w-3 h-3" />
                                {session.device || 'Unknown'} • {session.currentPage || '/'}
                                {session.userEmail && (
                                  <span className="ml-2 text-blue-600">({session.userEmail})</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {formatDuration(session.duration)}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <MapPinIcon className="w-3 h-3" />
                              {getLocationString(session.location)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <EyeIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active sessions</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Visitors will appear here when they're browsing your site.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-green-600" />
                  Recent Activity
                </h3>
              </div>
              <div className="p-4">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  </div>
                ) : recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'pageview' ? 'bg-blue-500' :
                          activity.type === 'session_start' ? 'bg-green-500' :
                          activity.type === 'session_end' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`}></div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {activity.description}
                          </div>
                          <div className="text-xs text-gray-500">
                            {activity.user || 'Anonymous'} • {activity.timeAgo}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      User activity will appear here as it happens.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Pages & Device Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">
            {/* Top Pages */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Top Pages</h3>
              </div>
              <div className="p-4">
                {stats.topPages.length > 0 ? (
                  <div className="space-y-2">
                    {stats.topPages.map((page, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="text-sm text-gray-900">{page.path}</div>
                        <div className="text-sm font-medium text-blue-600">{page.views} views</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">No page data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Device Breakdown</h3>
              </div>
              <div className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ComputerDesktopIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-900">Desktop</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{stats.devices?.desktop || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DevicePhoneMobileIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-900">Mobile</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{stats.devices?.mobile || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DevicePhoneMobileIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-900">Tablet</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">{stats.devices?.tablet || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Updates every 5 seconds • Last updated: {new Date().toLocaleTimeString()}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Close Monitor
          </button>
        </div>
      </div>
    </div>
  )
}
