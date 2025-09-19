// Admin Analytics & Reporting Dashboard
// Comprehensive business intelligence with charts, metrics, and insights

import React, { useState, useEffect, useMemo } from 'react'
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
  ClockIcon,
  ChartPieIcon,
  PresentationChartLineIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '../../components/AdminLayout'
import { useAuth } from '@clerk/clerk-react'

// Chart.js imports
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
  TimeScale
} from 'chart.js'
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'

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
  TimeScale
)

const AdminAnalytics = () => {
  const { getToken } = useAuth()
  const [analyticsData, setAnalyticsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('30d') // 7d, 30d, 90d, 1y
  const [selectedMetric, setSelectedMetric] = useState('revenue')
  const [chartGrouping, setChartGrouping] = useState('day') // day, month, quarter, year
  const [drillDownData, setDrillDownData] = useState(null)
  const [showDrillDown, setShowDrillDown] = useState(false)

  // Fetch analytics data
  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange])

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      // Use direct endpoint to bypass Express router issues
      const response = await fetch(`/api/admin-analytics-direct?range=${timeRange}`, { headers })
      if (response.ok) {
        const data = await response.json()
        setAnalyticsData(data.data)
        console.log('[ANALYTICS_PAGE] Data loaded successfully:', data.data)
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

  // Process chart data based on grouping
  const processChartData = useMemo(() => {
    if (!analyticsData?.metrics?.revenue?.daily) return null

    const data = analyticsData.metrics.revenue.daily
    let processedData = []

    switch (chartGrouping) {
      case 'day':
        processedData = data.slice(-30) // Last 30 days
        break
      case 'month':
        // Group by month
        const monthlyData = {}
        data.forEach(item => {
          const date = new Date(item._id.date)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { total: 0, count: 0, date: monthKey }
          }
          monthlyData[monthKey].total += item.total
          monthlyData[monthKey].count += item.count
        })
        processedData = Object.values(monthlyData).slice(-12) // Last 12 months
        break
      case 'quarter':
        // Group by quarter
        const quarterlyData = {}
        data.forEach(item => {
          const date = new Date(item._id.date)
          const quarter = Math.floor(date.getMonth() / 3) + 1
          const quarterKey = `${date.getFullYear()}-Q${quarter}`
          if (!quarterlyData[quarterKey]) {
            quarterlyData[quarterKey] = { total: 0, count: 0, date: quarterKey }
          }
          quarterlyData[quarterKey].total += item.total
          quarterlyData[quarterKey].count += item.count
        })
        processedData = Object.values(quarterlyData).slice(-8) // Last 8 quarters
        break
      case 'year':
        // Group by year
        const yearlyData = {}
        data.forEach(item => {
          const date = new Date(item._id.date)
          const yearKey = date.getFullYear().toString()
          if (!yearlyData[yearKey]) {
            yearlyData[yearKey] = { total: 0, count: 0, date: yearKey }
          }
          yearlyData[yearKey].total += item.total
          yearlyData[yearKey].count += item.count
        })
        processedData = Object.values(yearlyData).slice(-5) // Last 5 years
        break
    }

    return {
      labels: processedData.map(item => {
        if (chartGrouping === 'day') {
          return new Date(item._id.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        return item.date
      }),
      datasets: [
        {
          label: 'Revenue',
          data: processedData.map(item => item.total),
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }
      ]
    }
  }, [analyticsData, chartGrouping])

  // Order status chart data
  const orderStatusChartData = useMemo(() => {
    if (!analyticsData?.metrics?.orders?.byStatus) return null

    const colors = [
      'rgba(59, 130, 246, 0.8)', // blue
      'rgba(16, 185, 129, 0.8)', // green
      'rgba(245, 158, 11, 0.8)', // yellow
      'rgba(239, 68, 68, 0.8)',  // red
      'rgba(139, 92, 246, 0.8)', // purple
      'rgba(236, 72, 153, 0.8)', // pink
    ]

    return {
      labels: analyticsData.metrics.orders.byStatus.map(status => 
        status._id?.replace('_', ' ') || 'Unknown'
      ),
      datasets: [
        {
          data: analyticsData.metrics.orders.byStatus.map(status => status.count),
          backgroundColor: colors.slice(0, analyticsData.metrics.orders.byStatus.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    }
  }, [analyticsData])

  // Handle metric click for drill-down
  const handleMetricClick = (metricType, data) => {
    setDrillDownData({ type: metricType, data })
    setShowDrillDown(true)
  }

  // Export functionality
  const exportToCSV = () => {
    if (!analyticsData) return

    const csvData = []
    csvData.push(['Metric', 'Value', 'Change'])
    csvData.push(['Total Revenue', analyticsData.metrics?.revenue?.current || 0, analyticsData.metrics?.revenue?.change || 0])
    csvData.push(['Total Orders', analyticsData.metrics?.orders?.current || 0, ''])
    csvData.push(['Total Users', analyticsData.metrics?.users?.total || 0, ''])

    // Add daily revenue data
    if (analyticsData.metrics?.revenue?.daily) {
      csvData.push(['', '', ''])
      csvData.push(['Date', 'Daily Revenue', 'Orders'])
      analyticsData.metrics.revenue.daily.forEach(day => {
        csvData.push([day._id.date, day.total, day.count])
      })
    }

    const csvContent = csvData.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top'
      },
      title: {
        display: true,
        text: `Revenue Trends (${chartGrouping})`
      }
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
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index
        const data = processChartData?.datasets[0]?.data[index]
        handleMetricClick('revenue_detail', { date: processChartData?.labels[index], revenue: data })
      }
    }
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

            {/* Chart Grouping Selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Group By:</span>
              {['day', 'month', 'quarter', 'year'].map((group) => (
                <button
                  key={group}
                  onClick={() => setChartGrouping(group)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                    chartGrouping === group
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {group}
                </button>
              ))}
            </div>

            {/* Export Button */}
            <button 
              onClick={exportToCSV}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Revenue */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('revenue', analyticsData?.metrics?.revenue)}
        >
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
                    {formatCurrency(analyticsData?.metrics?.revenue?.current || 0)}
                  </dd>
                </dl>
              </div>
              <div className="flex-shrink-0">
                <EyeIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.revenue?.change && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">vs previous period</span>
                  {getChangeIndicator(analyticsData.metrics.revenue.change)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Orders */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('orders', analyticsData?.metrics?.orders)}
        >
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
                    {formatNumber(analyticsData?.metrics?.orders?.current || 0)}
                  </dd>
                </dl>
              </div>
              <div className="flex-shrink-0">
                <EyeIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.orders?.change && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">vs previous period</span>
                  {getChangeIndicator(analyticsData.metrics.orders.change)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users */}
        <div 
          className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => handleMetricClick('users', analyticsData?.metrics?.users)}
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(analyticsData?.metrics?.users?.total || 0)}
                  </dd>
                </dl>
              </div>
              <div className="flex-shrink-0">
                <EyeIcon className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              {analyticsData?.metrics?.users?.new > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">New users this period</span>
                  <span className="text-sm font-medium text-green-600">
                    +{analyticsData.metrics.users.new}
                  </span>
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
            <p className="text-sm text-gray-500">Revenue performance over time (grouped by {chartGrouping})</p>
          </div>
          <div className="p-6">
            {processChartData ? (
              <div className="h-64">
                <Line data={processChartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <PresentationChartLineIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No revenue data available for chart</p>
                  <p className="text-sm text-gray-400">Revenue data will appear here when orders are confirmed</p>
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
            {orderStatusChartData ? (
              <div className="h-64 flex items-center justify-center">
                <Doughnut 
                  data={orderStatusChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    },
                    onClick: (event, elements) => {
                      if (elements.length > 0) {
                        const index = elements[0].index
                        const status = analyticsData.metrics.orders.byStatus[index]
                        handleMetricClick('order_status', status)
                      }
                    }
                  }} 
                />
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <ChartPieIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No order status data available</p>
                </div>
              </div>
            )}
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
              {analyticsData?.metrics?.models?.topPerformers?.slice(0, 5).map((model, index) => (
                <div key={model.modelId} className="flex items-center justify-between">
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
                      <p className="text-sm font-medium text-gray-900">{model.modelName}</p>
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

      {/* Drill-Down Modal */}
      {showDrillDown && drillDownData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 capitalize">
                  {drillDownData.type.replace('_', ' ')} Details
                </h3>
                <button
                  onClick={() => setShowDrillDown(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                {drillDownData.type === 'revenue' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Current Revenue:</span>
                      <span className="text-sm text-gray-900">{formatCurrency(drillDownData.data?.current || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Previous Period:</span>
                      <span className="text-sm text-gray-900">{formatCurrency(drillDownData.data?.previous || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Change:</span>
                      <span className="text-sm text-gray-900">{drillDownData.data?.change?.toFixed(1) || 0}%</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Daily Breakdown:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {drillDownData.data?.daily?.slice(-10).map((day, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-gray-600">{day._id.date}</span>
                            <span className="text-gray-900">{formatCurrency(day.total)}</span>
                          </div>
                        )) || <p className="text-xs text-gray-500">No daily data available</p>}
                      </div>
                    </div>
                  </div>
                )}
                
                {drillDownData.type === 'orders' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Total Orders:</span>
                      <span className="text-sm text-gray-900">{drillDownData.data?.current || 0}</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Status Breakdown:</h4>
                      <div className="space-y-1">
                        {drillDownData.data?.byStatus?.map((status, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span className="text-gray-600 capitalize">{status._id?.replace('_', ' ')}</span>
                            <span className="text-gray-900">{status.count}</span>
                          </div>
                        )) || <p className="text-xs text-gray-500">No status data available</p>}
                      </div>
                    </div>
                  </div>
                )}
                
                {drillDownData.type === 'users' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Total Users:</span>
                      <span className="text-sm text-gray-900">{drillDownData.data?.total || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">New Users (this period):</span>
                      <span className="text-sm text-gray-900">{drillDownData.data?.new || 0}</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">User Growth:</h4>
                      <div className="text-xs text-gray-600">
                        {drillDownData.data?.new > 0 ? (
                          <p>Growing by {drillDownData.data.new} new users in the selected time period.</p>
                        ) : (
                          <p>No new user registrations in the selected time period.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                {drillDownData.type === 'revenue_detail' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Date:</span>
                      <span className="text-sm text-gray-900">{drillDownData.data?.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Revenue:</span>
                      <span className="text-sm text-gray-900">{formatCurrency(drillDownData.data?.revenue || 0)}</span>
                    </div>
                  </div>
                )}
                
                {drillDownData.type === 'order_status' && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className="text-sm text-gray-900 capitalize">{drillDownData.data?._id?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Count:</span>
                      <span className="text-sm text-gray-900">{drillDownData.data?.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Total Revenue:</span>
                      <span className="text-sm text-gray-900">{formatCurrency(drillDownData.data?.total || 0)}</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowDrillDown(false)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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

export default AdminAnalytics
