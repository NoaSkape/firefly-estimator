// Admin Analytics & Reporting Dashboard
// Comprehensive business intelligence with charts, metrics, and insights

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
  CubeIcon,
  CalendarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '../../components/AdminLayout'

const AdminAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d, 1y
  const [selectedMetric, setSelectedMetric] = useState('revenue')

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/analytics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data)
      } else {
        throw new Error('Failed to fetch analytics data')
      }
    } catch (error) {
      console.error('Analytics fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
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

  // Calculate percentage change
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
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

  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Analytics">
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
      <AdminLayout title="Analytics">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading analytics
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Analytics">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Reporting</h1>
            <p className="text-gray-600">Business intelligence and performance insights</p>
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

            {/* Export Button */}
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(analyticsData?.metrics?.totalRevenue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.revenueChange && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">vs previous period</span>
                  {getChangeIndicator(analyticsData.metrics.revenueChange)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCartIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analyticsData?.metrics?.totalOrders || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.ordersChange && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">vs previous period</span>
                  {getChangeIndicator(analyticsData.metrics.ordersChange)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customers */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    New Customers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analyticsData?.metrics?.newCustomers || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.customersChange && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">vs previous period</span>
                  {getChangeIndicator(analyticsData.metrics.customersChange)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Order Value
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(analyticsData?.metrics?.averageOrderValue || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.aovChange && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">vs previous period</span>
                  {getChangeIndicator(analyticsData.metrics.aovChange)}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Revenue Trend Chart */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Revenue Trend</h3>
            <p className="text-sm text-gray-500">Revenue performance over time</p>
          </div>
          <div className="p-6">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart visualization would be implemented here</p>
                <p className="text-sm text-gray-400">Using Chart.js or similar library</p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Order Status Distribution</h3>
            <p className="text-sm text-gray-500">Current order pipeline status</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData?.orderStatuses?.map((status) => (
                <div key={status.status} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${status.color}`}></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {status.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">{status.count}</span>
                    <span className="text-sm text-gray-500">
                      ({((status.count / analyticsData.metrics.totalOrders) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No order status data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Top Performing Models */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Models</h3>
            <p className="text-sm text-gray-500">Best performing models by orders</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData?.topModels?.slice(0, 5).map((model, index) => (
                <div key={model._id} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mr-3 ${
                      index === 0 ? 'bg-yellow-100 text-yellow-800' :
                      index === 1 ? 'bg-gray-100 text-gray-800' :
                      index === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{model.name}</p>
                      <p className="text-xs text-gray-500">{model.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{model.orderCount} orders</p>
                    <p className="text-xs text-gray-500">{formatCurrency(model.totalRevenue)}</p>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  <CubeIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No model data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Acquisition */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Customer Acquisition</h3>
            <p className="text-sm text-gray-500">New customer sources</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {analyticsData?.customerSources?.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3 bg-blue-400"></div>
                    <span className="text-sm font-medium text-gray-900 capitalize">
                      {source.source.replace('-', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-900">{source.count}</span>
                    <span className="text-sm text-gray-500">
                      ({((source.count / analyticsData.metrics.newCustomers) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              )) || (
                <div className="text-center text-gray-500 py-8">
                  <UsersIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p>No customer source data available</p>
                </div>
              )}
            </div>
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
              {analyticsData?.recentActivity?.slice(0, 5).map((activity, index) => (
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

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          <p className="text-sm text-gray-500">Common admin tasks and reports</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/orders"
              className="group relative rounded-lg p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center">
                <ShoppingCartIcon className="h-8 w-8 text-blue-600 group-hover:text-blue-700" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">View Orders</p>
                  <p className="text-xs text-blue-700">Manage all orders</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/customers"
              className="group relative rounded-lg p-4 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <div className="flex items-center">
                <UsersIcon className="h-8 w-8 text-green-600 group-hover:text-green-700" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">Customer List</p>
                  <p className="text-xs text-green-700">View all customers</p>
                </div>
              </div>
            </Link>

            <Link
              to="/admin/models"
              className="group relative rounded-lg p-4 bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              <div className="flex items-center">
                <CubeIcon className="h-8 w-8 text-purple-600 group-hover:text-purple-700" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-900">Model Catalog</p>
                  <p className="text-xs text-purple-700">Manage models</p>
                </div>
              </div>
            </Link>

            <button className="group relative rounded-lg p-4 bg-orange-50 hover:bg-orange-100 transition-colors">
              <div className="flex items-center">
                <DocumentArrowDownIcon className="h-8 w-8 text-orange-600 group-hover:text-orange-700" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-900">Export Data</p>
                  <p className="text-xs text-orange-700">Download reports</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminAnalytics
