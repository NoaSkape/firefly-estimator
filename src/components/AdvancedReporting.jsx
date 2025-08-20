import React, { useState, useEffect } from 'react'
import { useToast } from './ToastProvider'
import analytics from '../utils/analytics'

export default function AdvancedReporting() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [reportData, setReportData] = useState({
    funnelData: [],
    revenueData: [],
    userActivity: [],
    modelPerformance: []
  })
  const [filters, setFilters] = useState({
    dateRange: '30d',
    modelFilter: 'all',
    userType: 'all'
  })
  const [selectedChart, setSelectedChart] = useState('funnel')

  useEffect(() => {
    loadReportData()
  }, [filters])

  const loadReportData = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(filters)
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      } else {
        throw new Error('Failed to load report data')
      }

      analytics.trackEvent('admin_report_generated', {
        filters,
        chartType: selectedChart
      })
    } catch (error) {
      console.error('Report loading error:', error)
      addToast({
        type: 'error',
        title: 'Report Error',
        message: 'Failed to load report data.'
      })
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format = 'csv') => {
    try {
      const response = await fetch('/api/admin/reports/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters,
          chartType: selectedChart,
          format
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `report_${selectedChart}_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        addToast({
          type: 'success',
          title: 'Export Complete',
          message: `Report exported as ${format.toUpperCase()}`
        })

        analytics.trackEvent('admin_report_exported', {
          format,
          chartType: selectedChart
        })
      } else {
        throw new Error('Export failed')
      }
    } catch (error) {
      console.error('Export error:', error)
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export report.'
      })
    }
  }

  const renderFunnelChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
      <div className="space-y-4">
        {reportData.funnelData.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="w-32 text-sm font-medium text-gray-700">{step.name}</div>
            <div className="flex-1 mx-4">
              <div className="bg-gray-200 rounded-full h-4">
                <div 
                  className="bg-yellow-500 h-4 rounded-full transition-all duration-500"
                  style={{ width: `${step.percentage}%` }}
                />
              </div>
            </div>
            <div className="w-20 text-sm text-gray-600 text-right">
              {step.count.toLocaleString()}
            </div>
            <div className="w-16 text-sm text-gray-500 text-right">
              {step.percentage.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderRevenueChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
      <div className="space-y-4">
        {reportData.revenueData.map((item, index) => (
          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-sm font-medium text-gray-900">{item.period}</div>
              <div className="text-sm text-gray-500">{item.orders} orders</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-gray-900">
                ${item.revenue.toLocaleString()}
              </div>
              <div className={`text-sm ${item.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderUserActivityChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">User Activity</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reportData.userActivity.map((metric, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-700">{metric.name}</div>
            <div className="text-2xl font-bold text-gray-900">{metric.value.toLocaleString()}</div>
            <div className={`text-sm ${metric.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {metric.change >= 0 ? '+' : ''}{metric.change.toFixed(1)}% from last period
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderModelPerformanceChart = () => (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Performance</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Views
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Builds
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Orders
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Conversion
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reportData.modelPerformance.map((model, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {model.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.views.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.builds.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.orders.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {model.conversionRate.toFixed(1)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${model.revenue.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 animate-spin rounded-full border-3 border-gray-300 border-t-yellow-500 mx-auto mb-4" />
          <div className="text-gray-400 text-lg">Generating report...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Reporting</h1>
          <p className="text-gray-600">Comprehensive analytics and insights</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Model Filter
              </label>
              <select
                value={filters.modelFilter}
                onChange={(e) => setFilters(prev => ({ ...prev, modelFilter: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Models</option>
                <option value="popular">Popular Models</option>
                <option value="premium">Premium Models</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Type
              </label>
              <select
                value={filters.userType}
                onChange={(e) => setFilters(prev => ({ ...prev, userType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="all">All Users</option>
                <option value="new">New Users</option>
                <option value="returning">Returning Users</option>
                <option value="active">Active Users</option>
              </select>
            </div>
          </div>
        </div>

        {/* Chart Selection */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Chart Type</h2>
            <div className="flex gap-2">
              <button
                onClick={() => exportReport('csv')}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportReport('pdf')}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Export PDF
              </button>
            </div>
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedChart('funnel')}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedChart === 'funnel'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Conversion Funnel
            </button>
            <button
              onClick={() => setSelectedChart('revenue')}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedChart === 'revenue'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Revenue Trends
            </button>
            <button
              onClick={() => setSelectedChart('activity')}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedChart === 'activity'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              User Activity
            </button>
            <button
              onClick={() => setSelectedChart('models')}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedChart === 'models'
                  ? 'bg-yellow-500 text-gray-900'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Model Performance
            </button>
          </div>
        </div>

        {/* Chart Display */}
        <div className="mb-8">
          {selectedChart === 'funnel' && renderFunnelChart()}
          {selectedChart === 'revenue' && renderRevenueChart()}
          {selectedChart === 'activity' && renderUserActivityChart()}
          {selectedChart === 'models' && renderModelPerformanceChart()}
        </div>

        {/* Insights */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">Top Performing Model</div>
              <div className="text-2xl font-bold text-blue-900">Magnolia</div>
              <div className="text-sm text-blue-600">23% of total revenue</div>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-800">Conversion Rate</div>
              <div className="text-2xl font-bold text-green-900">12.4%</div>
              <div className="text-sm text-green-600">+2.1% from last month</div>
            </div>
            
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm font-medium text-purple-800">Average Order Value</div>
              <div className="text-2xl font-bold text-purple-900">$45,200</div>
              <div className="text-sm text-purple-600">+8.3% from last month</div>
            </div>
            
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">Customer Lifetime Value</div>
              <div className="text-2xl font-bold text-yellow-900">$67,800</div>
              <div className="text-sm text-yellow-600">+15.2% from last month</div>
            </div>
            
            <div className="p-4 bg-red-50 rounded-lg">
              <div className="text-sm font-medium text-red-800">Cart Abandonment</div>
              <div className="text-2xl font-bold text-red-900">34.2%</div>
              <div className="text-sm text-red-600">-5.1% from last month</div>
            </div>
            
            <div className="p-4 bg-indigo-50 rounded-lg">
              <div className="text-sm font-medium text-indigo-800">Mobile Conversion</div>
              <div className="text-2xl font-bold text-indigo-900">8.7%</div>
              <div className="text-sm text-indigo-600">+12.3% from last month</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
