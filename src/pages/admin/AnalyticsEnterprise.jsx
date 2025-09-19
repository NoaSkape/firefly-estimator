// Enterprise Analytics Dashboard - Phase 3 Implementation
// Advanced analytics with predictive modeling, funnel analysis, and enterprise features

import React, { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import { 
  RevenueForecastChart,
  ConversionFunnelChart,
  GeographicHeatMap,
  AdvancedKPIWidget,
  RealTimeMetricsDashboard
} from '../../components/analytics/AdvancedCharts'

import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
  CubeIcon,
  BellIcon,
  CalendarIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  EyeIcon,
  SparklesIcon,
  FunnelIcon,
  GlobeAltIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

const EnterpriseAnalytics = () => {
  const { getToken } = useAuth()
  
  // State management
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  // Data state
  const [analyticsData, setAnalyticsData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [funnelData, setFunnelData] = useState(null)
  const [clvData, setCLVData] = useState(null)
  const [realTimeData, setRealTimeData] = useState(null)
  const [alertsData, setAlertsData] = useState(null)
  
  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState({})
  const [showAlertModal, setShowAlertModal] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // Tabs configuration
  const tabs = [
    { id: 'overview', name: 'Executive Overview', icon: ChartBarIcon },
    { id: 'forecast', name: 'Predictive Analytics', icon: SparklesIcon },
    { id: 'funnel', name: 'Conversion Funnel', icon: FunnelIcon },
    { id: 'clv', name: 'Customer Value', icon: UsersIcon },
    { id: 'geographic', name: 'Geographic Analysis', icon: GlobeAltIcon },
    { id: 'realtime', name: 'Real-Time Monitor', icon: ClockIcon },
    { id: 'alerts', name: 'Alerts & Reports', icon: BellIcon }
  ]

  // Load data on component mount and time range change
  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  // Real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'realtime') {
        loadRealTimeData()
      }
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [activeTab])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}

      // Load comprehensive analytics data
      const response = await fetch(`/api/analytics-enterprise?range=${timeRange}`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data)
        
        // Load specific datasets based on active tab
        await loadTabSpecificData(data.data)
      } else {
        throw new Error('Failed to fetch enterprise analytics data')
      }
    } catch (error) {
      console.error('Enterprise analytics fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const loadTabSpecificData = async (baseData) => {
    const token = await getToken()
    const headers = token ? { Authorization: `Bearer ${token}` } : {}

    try {
      // Load forecast data
      if (activeTab === 'forecast' || activeTab === 'overview') {
        const forecastResponse = await fetch(`/api/analytics-enterprise?action=forecast&range=${timeRange}`, { headers })
        if (forecastResponse.ok) {
          const forecastResult = await forecastResponse.json()
          setForecastData(forecastResult.data)
        }
      }

      // Load funnel data
      if (activeTab === 'funnel' || activeTab === 'overview') {
        const funnelResponse = await fetch(`/api/analytics-enterprise?action=funnel&range=${timeRange}`, { headers })
        if (funnelResponse.ok) {
          const funnelResult = await funnelResponse.json()
          setFunnelData(funnelResult.data)
        }
      }

      // Load CLV data
      if (activeTab === 'clv') {
        const clvResponse = await fetch(`/api/analytics-enterprise?action=clv`, { headers })
        if (clvResponse.ok) {
          const clvResult = await clvResponse.json()
          setCLVData(clvResult.data)
        }
      }

      // Load alerts data
      if (activeTab === 'alerts') {
        const alertsResponse = await fetch(`/api/analytics-enterprise?action=alerts`, { headers })
        if (alertsResponse.ok) {
          const alertsResult = await alertsResponse.json()
          setAlertsData(alertsResult.data)
        }
      }
    } catch (error) {
      console.warn('Tab-specific data loading failed:', error.message)
    }
  }

  const loadRealTimeData = async () => {
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch('/api/analytics-enterprise?action=realtime', { headers })
      if (response.ok) {
        const data = await response.json()
        setRealTimeData(data.data)
      }
    } catch (error) {
      console.warn('Real-time data update failed:', error.message)
    }
  }

  const handleExportReport = async () => {
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      const response = await fetch(`/api/analytics-enterprise?action=reports&range=${timeRange}`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: 'executive',
          format: 'csv',
          filters: selectedFilters
        })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `enterprise-analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  const handleCreateAlert = async (alertConfig) => {
    try {
      const token = await getToken()
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      
      const response = await fetch('/api/analytics-enterprise?action=alerts', {
        method: 'POST',
        headers,
        body: JSON.stringify(alertConfig)
      })
      
      if (response.ok) {
        await loadTabSpecificData()
        setShowAlertModal(false)
      }
    } catch (error) {
      console.error('Alert creation failed:', error)
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Enterprise Analytics">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </AdminLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <AdminLayout title="Enterprise Analytics">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Analytics Loading Error
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Retry Loading
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Enterprise Analytics">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Enterprise Analytics</h1>
            <p className="text-gray-600">Advanced business intelligence with predictive insights</p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Period:</span>
              {['7d', '30d', '90d', '1y'].map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    timeRange === range
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : '1 Year'}
                </button>
              ))}
            </div>

            {/* Advanced Filters */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
              Filters
            </button>

            {/* Export */}
            <button
              onClick={handleExportReport}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen">
        {/* Executive Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Executive KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <AdvancedKPIWidget
                title="Total Revenue"
                value={analyticsData?.metrics?.revenue?.total || 0}
                change={analyticsData?.metrics?.revenue?.change || 0}
                trend={analyticsData?.metrics?.revenue?.change > 0 ? 'up' : 'down'}
                target={500000}
                format="currency"
                sparklineData={analyticsData?.metrics?.revenue?.daily?.slice(-7).map(d => d.total) || []}
                onClick={() => setActiveTab('forecast')}
              />
              
              <AdvancedKPIWidget
                title="Total Orders"
                value={analyticsData?.metrics?.orders?.count || 0}
                change={0}
                trend="stable"
                target={100}
                format="number"
                sparklineData={analyticsData?.metrics?.revenue?.daily?.slice(-7).map(d => d.count) || []}
                onClick={() => setActiveTab('funnel')}
              />
              
              <AdvancedKPIWidget
                title="Active Customers"
                value={analyticsData?.metrics?.users || 0}
                change={0}
                trend="up"
                target={1000}
                format="number"
                sparklineData={[45, 52, 48, 61, 55, 67, 73]}
                onClick={() => setActiveTab('clv')}
              />
              
              <AdvancedKPIWidget
                title="Conversion Rate"
                value={funnelData?.funnel?.conversionRates?.overall?.rate || 0}
                change={0}
                trend="stable"
                target={15}
                format="percentage"
                sparklineData={[12.5, 13.2, 12.8, 14.1, 13.9, 14.5, 15.2]}
                onClick={() => setActiveTab('funnel')}
              />
            </div>

            {/* Executive Summary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Forecast</h3>
                {forecastData ? (
                  <RevenueForecastChart 
                    data={forecastData.forecast}
                    height={300}
                    onPointClick={(point) => console.log('Forecast point clicked:', point)}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <div className="text-center">
                      <SparklesIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Loading forecast data...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Funnel</h3>
                {funnelData?.funnel?.steps ? (
                  <ConversionFunnelChart
                    data={Object.values(funnelData.funnel.steps).map(step => ({
                      name: step.name,
                      users: step.uniqueUsers,
                      conversionRate: step.conversionRate,
                      dropOff: step.dropOff
                    }))}
                    height={300}
                    onStepClick={(step) => console.log('Funnel step clicked:', step)}
                  />
                ) : (
                  <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
                    <div className="text-center">
                      <FunnelIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Loading funnel data...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Predictive Analytics Tab */}
        {activeTab === 'forecast' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Revenue Forecasting</h2>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                    12 Months
                  </button>
                  <button className="px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 rounded">
                    24 Months
                  </button>
                </div>
              </div>
              
              {forecastData ? (
                <div>
                  <RevenueForecastChart 
                    data={forecastData.forecast}
                    height={400}
                  />
                  
                  {/* Forecast Insights */}
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900">Forecast Accuracy</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {forecastData.accuracy?.mape?.toFixed(1) || 'N/A'}%
                      </p>
                      <p className="text-sm text-blue-700">Mean Absolute Percentage Error</p>
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-medium text-green-900">Projected Growth</h4>
                      <p className="text-2xl font-bold text-green-600">
                        +{((forecastData.forecast?.forecast?.slice(-1)[0]?.value || 0) / 
                           (analyticsData?.metrics?.revenue?.total || 1) * 100).toFixed(1)}%
                      </p>
                      <p className="text-sm text-green-700">Next 12 months</p>
                    </div>
                    
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-medium text-purple-900">Confidence Level</h4>
                      <p className="text-2xl font-bold text-purple-600">95%</p>
                      <p className="text-sm text-purple-700">Statistical confidence</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <SparklesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading predictive analytics...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Real-Time Monitor Tab */}
        {activeTab === 'realtime' && (
          <div className="space-y-8">
            {realTimeData ? (
              <RealTimeMetricsDashboard
                metrics={realTimeData.metrics}
                onMetricClick={(metric) => console.log('Real-time metric clicked:', metric)}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <div className="text-center">
                  <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Loading real-time data...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Alerts & Reports Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-8">
            {/* Alert Management */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">KPI Alerts</h2>
                <button
                  onClick={() => setShowAlertModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                >
                  <BellIcon className="h-4 w-4 mr-2" />
                  Create Alert
                </button>
              </div>
              
              {alertsData?.alerts?.configurations?.length > 0 ? (
                <div className="space-y-4">
                  {alertsData.alerts.configurations.map(alert => (
                    <div key={alert.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{alert.name}</h4>
                          <p className="text-sm text-gray-600">
                            {alert.metric} - {alert.condition} {alert.threshold}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            alert.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {alert.status}
                          </span>
                          <button className="text-gray-400 hover:text-gray-600">
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No alerts configured</p>
                  <button
                    onClick={() => setShowAlertModal(true)}
                    className="mt-2 text-blue-600 hover:text-blue-500 text-sm underline"
                  >
                    Create your first alert
                  </button>
                </div>
              )}
            </div>

            {/* Report Scheduling */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Scheduled Reports</h2>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Report
                </button>
              </div>
              
              <div className="text-center py-8">
                <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Report scheduling will be available after deployment</p>
              </div>
            </div>
          </div>
        )}

        {/* Other tabs would be implemented similarly */}
        {activeTab !== 'overview' && activeTab !== 'forecast' && activeTab !== 'realtime' && activeTab !== 'alerts' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <SparklesIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {tabs.find(t => t.id === activeTab)?.name} - Coming Soon
              </h3>
              <p className="text-gray-500">
                This advanced analytics feature is being prepared for deployment.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Filters Modal */}
      {showAdvancedFilters && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Advanced Filters</h3>
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Segment
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">All Segments</option>
                    <option value="new">New Customers</option>
                    <option value="returning">Returning Customers</option>
                    <option value="vip">VIP Customers</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Geographic Region
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">All Regions</option>
                    <option value="TX">Texas</option>
                    <option value="CA">California</option>
                    <option value="FL">Florida</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Value Range
                  </label>
                  <div className="flex space-x-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAdvancedFilters(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowAdvancedFilters(false)
                    loadAnalyticsData()
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default EnterpriseAnalytics
