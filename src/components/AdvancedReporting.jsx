// Advanced Reporting Component
// Comprehensive business analytics with Chart.js integration

import React, { useState, useEffect } from 'react'
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
  Filler,
  RadialLinearScale
} from 'chart.js'
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2'
import {
  DocumentChartBarIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  UsersIcon,
  CubeIcon,
  ShoppingCartIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

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
  Filler,
  RadialLinearScale
)

const AdvancedReporting = () => {
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState('revenue')
  const [dateRange, setDateRange] = useState('30d')
  const [filters, setFilters] = useState({})

  const reportTypes = [
    { id: 'revenue', name: 'Revenue Analysis', icon: CurrencyDollarIcon },
    { id: 'orders', name: 'Order Performance', icon: ShoppingCartIcon },
    { id: 'customers', name: 'Customer Insights', icon: UsersIcon },
    { id: 'models', name: 'Model Performance', icon: CubeIcon },
    { id: 'trends', name: 'Business Trends', icon: DocumentChartBarIcon }
  ]

  useEffect(() => {
    fetchReportData()
  }, [selectedReport, dateRange, filters])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        report: selectedReport,
        range: dateRange,
        ...filters
      })

      const response = await fetch(`/api/admin/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data.data)
      } else {
        throw new Error('Failed to fetch report data')
      }
    } catch (error) {
      console.error('Report fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const exportReport = async (format = 'csv') => {
    try {
      const params = new URLSearchParams({
        report: selectedReport,
        range: dateRange,
        format,
        ...filters
      })

      const response = await fetch(`/api/admin/reports/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedReport}_report_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Export error:', error)
    }
  }

  const renderRevenueChart = () => {
    if (!reportData?.revenue) return null

    const data = {
      labels: reportData.revenue.map(item => item.period),
      datasets: [
        {
          label: 'Revenue',
          data: reportData.revenue.map(item => item.total),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Orders',
          data: reportData.revenue.map(item => item.orderCount),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          yAxisID: 'y1'
        }
      ]
    }

    const options = {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Revenue ($)'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Orders'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: 'Revenue vs Orders Over Time'
        }
      }
    }

    return <Line data={data} options={options} />
  }

  const renderOrderStatusChart = () => {
    if (!reportData?.orderStatuses) return null

    const data = {
      labels: reportData.orderStatuses.map(status => 
        status.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [
        {
          data: reportData.orderStatuses.map(status => status.count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)',
            'rgba(236, 72, 153, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    }

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Order Status Distribution'
        }
      }
    }

    return <Doughnut data={data} options={options} />
  }

  const renderCustomerAcquisitionChart = () => {
    if (!reportData?.customerSources) return null

    const data = {
      labels: reportData.customerSources.map(source => 
        source.source.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
      ),
      datasets: [
        {
          label: 'New Customers',
          data: reportData.customerSources.map(source => source.count),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(139, 92, 246, 0.8)',
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    }

    const options = {
      responsive: true,
      plugins: {
        legend: {
          display: false,
        },
        title: {
          display: true,
          text: 'Customer Acquisition by Source'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
        }
      }
    }

    return <Bar data={data} options={options} />
  }

  const renderModelPerformanceChart = () => {
    if (!reportData?.topModels) return null

    const data = {
      labels: reportData.topModels.map(model => model.name),
      datasets: [
        {
          label: 'Orders',
          data: reportData.topModels.map(model => model.orderCount),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1
        },
        {
          label: 'Revenue',
          data: reportData.topModels.map(model => model.totalRevenue),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    }

    const options = {
      responsive: true,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Orders'
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Revenue ($)'
          },
          grid: {
            drawOnChartArea: false,
          },
        },
      },
      plugins: {
        title: {
          display: true,
          text: 'Model Performance: Orders vs Revenue'
        }
      }
    }

    return <Bar data={data} options={options} />
  }

  const renderBusinessTrendsChart = () => {
    if (!reportData?.trends) return null

    const data = {
      labels: reportData.trends.map(trend => trend.period),
      datasets: [
        {
          label: 'Revenue Growth',
          data: reportData.trends.map(trend => trend.revenueGrowth),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4
        },
        {
          label: 'Customer Growth',
          data: reportData.trends.map(trend => trend.customerGrowth),
          borderColor: 'rgb(16, 185, 129)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: false,
          tension: 0.4
        }
      ]
    }

    const options = {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: 'Business Growth Trends'
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Growth Rate (%)'
          }
        }
      }
    }

    return <Line data={data} options={options} />
  }

  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    switch (selectedReport) {
      case 'revenue':
        return renderRevenueChart()
      case 'orders':
        return renderOrderStatusChart()
      case 'customers':
        return renderCustomerAcquisitionChart()
      case 'models':
        return renderModelPerformanceChart()
      case 'trends':
        return renderBusinessTrendsChart()
      default:
        return <div className="text-center text-gray-500 py-8">Select a report type</div>
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Advanced Reporting</h1>
            <p className="text-gray-600">Comprehensive business analytics and insights</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => exportReport('csv')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={() => exportReport('json')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 mb-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Report Type:</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {reportTypes.map((report) => {
            const Icon = report.icon
            return (
              <button
                key={report.id}
                onClick={() => setSelectedReport(report.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedReport === report.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-8 w-8 mx-auto mb-2" />
                <span className="text-sm font-medium">{report.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Date Range and Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Filter
            </label>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="luxury">Luxury</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status Filter
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="production">Production</option>
              <option value="ready">Ready</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {reportTypes.find(r => r.id === selectedReport)?.name}
          </h3>
          <p className="text-sm text-gray-500">
            {dateRange === '7d' ? 'Last 7 Days' : 
             dateRange === '30d' ? 'Last 30 Days' : 
             dateRange === '90d' ? 'Last 90 Days' : 
             dateRange === '1y' ? 'Last Year' : 'Custom Range'}
          </p>
        </div>
        <div className="p-6">
          {renderReportContent()}
        </div>
      </div>

      {/* Report Summary */}
      {reportData && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {reportData.summary?.map((metric, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {metric.label[0]}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">{metric.label}</p>
                  <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdvancedReporting
