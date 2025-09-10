// AI Insights Admin Page
// Displays AI-powered business insights and recommendations

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline'

const AIInsights = () => {
  const { getToken } = useAuth()
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedType, setSelectedType] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')

  useEffect(() => {
    fetchInsights()
  }, [selectedType, selectedPriority])

  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams()
      if (selectedType) params.append('type', selectedType)
      if (selectedPriority) params.append('priority', selectedPriority)
      params.append('limit', '20')

      const response = await fetch(`/api/admin/ai-insights/insights?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setInsights(data.data.insights || [])
      } else {
        throw new Error(data.error || 'Failed to fetch insights')
      }
    } catch (error) {
      console.error('AI insights fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'high':
        return <ArrowTrendingUpIcon className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <InformationCircleIcon className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
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
      case 'revenue':
        return '💰'
      case 'customer':
        return '👥'
      case 'inventory':
        return '📦'
      case 'marketing':
        return '📢'
      case 'operational':
        return '⚙️'
      case 'financial':
        return '💳'
      default:
        return '💡'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="AI Insights">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout title="AI Insights">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mr-3" />
            <div>
              <h3 className="text-lg font-medium text-red-800">Error Loading AI Insights</h3>
              <p className="text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="AI Insights">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <LightBulbIcon className="h-8 w-8 text-yellow-500 mr-3" />
                AI-Powered Business Insights
              </h1>
              <p className="text-gray-600 mt-1">
                Intelligent recommendations and predictive analytics for your business
              </p>
            </div>
            <button
              onClick={fetchInsights}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Refresh Insights
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insight Type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Types</option>
                <option value="revenue">Revenue</option>
                <option value="customer">Customer</option>
                <option value="inventory">Inventory</option>
                <option value="marketing">Marketing</option>
                <option value="operational">Operational</option>
                <option value="financial">Financial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority Level
              </label>
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Insights Available</h3>
              <p className="text-gray-600">
                No AI insights match your current filters. Try adjusting your filter criteria.
              </p>
            </div>
          ) : (
            insights.map((insight) => (
              <div
                key={insight.id}
                className={`bg-white shadow rounded-lg border-l-4 border-l-4 p-6 ${getPriorityColor(insight.priority)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-3">{getTypeIcon(insight.type)}</span>
                      <div className="flex items-center">
                        {getPriorityIcon(insight.priority)}
                        <span className="ml-2 text-sm font-medium text-gray-600 capitalize">
                          {insight.priority} Priority
                        </span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {insight.title}
                    </h3>
                    
                    <p className="text-gray-700 mb-4">
                      {insight.description}
                    </p>
                    
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-gray-900 mb-2">Recommendation</h4>
                      <p className="text-gray-700">{insight.recommendation}</p>
                    </div>

                    {insight.actionItems && insight.actionItems.length > 0 && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Action Items</h4>
                        <ul className="list-disc list-inside space-y-1">
                          {insight.actionItems.map((item, index) => (
                            <li key={index} className="text-gray-700">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-4">
                        <span>Confidence: {insight.confidence}%</span>
                        <span>Impact: {insight.impact}</span>
                        {insight.estimatedValue && (
                          <span>Est. Value: ${insight.estimatedValue.toLocaleString()}</span>
                        )}
                      </div>
                      <span className="capitalize">{insight.type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

export default AIInsights
