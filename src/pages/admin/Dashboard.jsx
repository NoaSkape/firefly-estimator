// Enhanced Admin Dashboard with Chart.js Integration and Real-time Data
// Provides interactive charts, real-time updates, and detailed drill-down views

import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  UsersIcon,
  CubeIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '../../components/AdminLayout'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMetric, setSelectedMetric] = useState(null)
  const [showMetricDetail, setShowMetricDetail] = useState(false)
  const [timeRange, setTimeRange] = useState('30d')
  const [realTimeData, setRealTimeData] = useState(null)
  
  const refreshInterval = useRef(null)

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData()
    setupRealTimeUpdates()
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current)
      }
    }
  }, [timeRange])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/dashboard?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setDashboardData(data.data)
      } else {
        throw new Error('Failed to fetch dashboard data')
      }
    } catch (error) {
      console.error('Dashboard fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const setupRealTimeUpdates = () => {
    // Poll for updates every 30 seconds
    refreshInterval.current = setInterval(() => {
      fetchDashboardData()
    }, 30000)
  }

  // Handle metric click
  const handleMetricClick = async (metricType) => {
    setSelectedMetric(metricType)
    setShowMetricDetail(true)
    
    try {
      let endpoint = ''
      switch (metricType) {
        case 'users':
          endpoint = '/api/admin/users/detailed'
          break
        case 'builds':
          endpoint = '/api/admin/builds/active'
          break
        case 'orders':
          endpoint = '/api/admin/orders/paid'
          break
        case 'revenue':
          endpoint = '/api/admin/financial/revenue'
          break
        default:
          return
      }
      
      const response = await fetch(endpoint)
      if (response.ok) {
        const data = await response.json()
        setRealTimeData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch detailed data:', error)
    }
  }

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Format number with K/M suffixes
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  // Get change indicator
  const getChangeIndicator = (change) => {
    if (change > 0) {
      return (
        <div className="flex items-center text-green-600">
          <ArrowUpIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">+{change.toFixed(1)}%</span>
        </div>
      )
    } else if (change < 0) {
      return (
        <div className="flex items-center text-red-600">
          <ArrowDownIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">{change.toFixed(1)}%</span>
        </div>
      )
    }
    return <span className="text-sm text-gray-500">0%</span>
  }

  // Chart data for revenue trend
  const getRevenueChartData = () => {
    if (!dashboardData?.dailyRevenue) return null
    
    return {
      labels: dashboardData.dailyRevenue.map(item => item._id),
      datasets: [
        {
          label: 'Daily Revenue',
          data: dashboardData.dailyRevenue.map(item => item.revenue),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        }
      ]
    }
  }

  // Chart data for order status distribution
  const getOrderStatusChartData = () => {
    if (!dashboardData?.orderStatuses) return null
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',   // Blue
      'rgba(16, 185, 129, 0.8)',   // Green
      'rgba(245, 158, 11, 0.8)',   // Yellow
      'rgba(239, 68, 68, 0.8)',    // Red
      'rgba(139, 92, 246, 0.8)',   // Purple
      'rgba(236, 72, 153, 0.8)',   // Pink
    ]
    
    return {
      labels: dashboardData.orderStatuses.map(status => 
        status.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [
        {
          data: dashboardData.orderStatuses.map(status => status.count),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    }
  }

  // Chart data for customer acquisition
  const getCustomerAcquisitionChartData = () => {
    if (!dashboardData?.customerSources) return null
    
    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(139, 92, 246, 0.8)',
    ]
    
    return {
      labels: dashboardData.customerSources.map(source => 
        source.source.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [
        {
          data: dashboardData.customerSources.map(source => source.count),
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    }
  }

  // Loading state
  if (loading && !dashboardData) {
    return (
      <AdminLayout title="Dashboard">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  // Error state
  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">Real-time business metrics and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Time Range Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Time Range:</span>
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

            {/* Real-time indicator */}
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500">Live updates</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('users')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <UsersIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(dashboardData?.metrics?.totalUsers || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm flex items-center justify-between">
              <span className="text-gray-500">Click to view details</span>
              <EyeIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Active Builds */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('builds')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <CubeIcon className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Builds
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(dashboardData?.metrics?.activeBuilds || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm flex items-center justify-between">
              <span className="text-gray-500">Click to view details</span>
              <EyeIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Orders */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('orders')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <ShoppingCartIcon className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(dashboardData?.metrics?.totalOrders || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm flex items-center justify-between">
              <span className="text-gray-500">Click to view details</span>
              <EyeIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('revenue')}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(dashboardData?.metrics?.totalRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm flex items-center justify-between">
              <span className="text-gray-500">Click to view details</span>
              <EyeIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <p className="text-sm text-gray-500">Daily revenue performance over time</p>
          </div>
          <div className="p-6">
            {getRevenueChartData() ? (
              <Line 
                data={getRevenueChartData()} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'top',
                    },
                    title: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return formatCurrency(value)
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <TrendingUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No revenue data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Order Status Distribution</h3>
            <p className="text-sm text-gray-500">Current order pipeline status</p>
          </div>
          <div className="p-6">
            {getOrderStatusChartData() ? (
              <Doughnut 
                data={getOrderStatusChartData()} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0)
                          const percentage = ((context.parsed / total) * 100).toFixed(1)
                          return `${context.label}: ${context.parsed} (${percentage}%)`
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No order data available</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Customer Acquisition */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Customer Acquisition</h3>
            <p className="text-sm text-gray-500">New customer sources</p>
          </div>
          <div className="p-6">
            {getCustomerAcquisitionChartData() ? (
              <Bar 
                data={getCustomerAcquisitionChartData()} 
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    }
                  }
                }}
              />
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No customer data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
            <p className="text-sm text-gray-500">Latest system events</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {dashboardData?.recentActivity?.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{activity.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <ClockIcon className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Metric Detail Modal */}
      {showMetricDetail && selectedMetric && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {selectedMetric === 'users' && 'User Details'}
                    {selectedMetric === 'builds' && 'Active Builds'}
                    {selectedMetric === 'orders' && 'Order Details'}
                    {selectedMetric === 'revenue' && 'Revenue Breakdown'}
                  </h3>
                  <button
                    onClick={() => setShowMetricDetail(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {realTimeData ? (
                    <div className="space-y-4">
                      {selectedMetric === 'users' && (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            Showing {realTimeData.length} users from Clerk and MongoDB
                          </p>
                          {realTimeData.map((user, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{user.firstName} {user.lastName}</h4>
                                  <p className="text-sm text-gray-500">{user.email}</p>
                                  <p className="text-xs text-gray-400">Role: {user.role}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{user.status}</p>
                                  <p className="text-xs text-gray-400">
                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedMetric === 'builds' && (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            Showing {realTimeData.length} active builds
                          </p>
                          {realTimeData.map((build, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{build.modelName}</h4>
                                  <p className="text-sm text-gray-500">Customer: {build.customerName}</p>
                                  <p className="text-xs text-gray-400">Stage: {build.stage}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{build.status}</p>
                                  <p className="text-xs text-gray-400">
                                    Started: {new Date(build.startDate).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedMetric === 'orders' && (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            Showing {realTimeData.length} paid orders
                          </p>
                          {realTimeData.map((order, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{order.orderId}</h4>
                                  <p className="text-sm text-gray-500">{order.customerName}</p>
                                  <p className="text-xs text-gray-400">Model: {order.modelName}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{formatCurrency(order.totalAmount)}</p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(order.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selectedMetric === 'revenue' && (
                        <div>
                          <p className="text-sm text-gray-600 mb-4">
                            Revenue breakdown by period
                          </p>
                          {realTimeData.map((revenue, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h4 className="font-medium">{revenue.period}</h4>
                                  <p className="text-sm text-gray-500">{revenue.orderCount} orders</p>
                                  <p className="text-xs text-gray-400">Avg: {formatCurrency(revenue.averageOrder)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium">{formatCurrency(revenue.total)}</p>
                                  <p className="text-xs text-gray-400">
                                    {revenue.change > 0 ? '+' : ''}{revenue.change}% vs previous
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-gray-500">Loading detailed data...</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => setShowMetricDetail(false)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}

export default AdminDashboard
