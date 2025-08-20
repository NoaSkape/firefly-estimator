import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { useToast } from './ToastProvider'

export default function AnalyticsDashboard() {
  const { getToken } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [timeRange, setTimeRange] = useState('7d') // 7d, 30d, 90d

  useEffect(() => {
    loadAnalytics()
  }, [timeRange])

  async function loadAnalytics() {
    try {
      const token = await getToken()
      const res = await fetch(`/api/analytics/dashboard?range=${timeRange}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      
      if (res.ok) {
        const data = await res.json()
        setAnalytics(data)
      } else {
        addToast({
          type: 'error',
          title: 'Analytics Error',
          message: 'Unable to load analytics data.'
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to connect to analytics service.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8">
          <div className="text-gray-400">Loading analytics...</div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-8">
          <div className="text-gray-400">No analytics data available.</div>
        </div>
      </div>
    )
  }

  const { funnelData, conversions, sessions, topModels } = analytics

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="section-header">Analytics Dashboard</h1>
        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          className="px-3 py-2 border border-gray-700 bg-gray-800 text-gray-100 rounded-md"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <MetricCard 
          title="Total Sessions" 
          value={sessions.total} 
          change={sessions.change}
          format="number"
        />
        <MetricCard 
          title="Builds Started" 
          value={funnelData.buildsStarted} 
          change={funnelData.buildsStartedChange}
          format="number"
        />
        <MetricCard 
          title="Conversion Rate" 
          value={conversions.rate} 
          change={conversions.rateChange}
          format="percentage"
        />
        <MetricCard 
          title="Total Revenue" 
          value={conversions.revenue} 
          change={conversions.revenueChange}
          format="currency"
        />
      </div>

      {/* Funnel Visualization */}
      <div className="card mb-8">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Funnel Analysis</h2>
        <div className="space-y-4">
          {funnelData.steps.map((step, index) => (
            <div key={step.name} className="flex items-center">
              <div className="w-32 text-sm text-gray-300">{step.name}</div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-yellow-500 h-full transition-all duration-500"
                    style={{ width: `${step.percentage}%` }}
                  />
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="text-sm text-gray-100">{step.count}</div>
                <div className="text-xs text-gray-400">{step.percentage}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Models */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Top Models</h2>
          <div className="space-y-3">
            {topModels.map((model, index) => (
              <div key={model.slug} className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="w-6 h-6 bg-yellow-500 text-gray-900 text-xs rounded-full flex items-center justify-center mr-3">
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-sm text-gray-100">{model.name}</div>
                    <div className="text-xs text-gray-400">{model.slug}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-100">{model.views}</div>
                  <div className="text-xs text-gray-400">{model.conversionRate}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {analytics.recentActivity?.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm text-gray-100">{activity.description}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, change, format }) {
  const formatValue = (val) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val)
      case 'percentage':
        return `${val.toFixed(1)}%`
      case 'number':
        return new Intl.NumberFormat('en-US').format(val)
      default:
        return val
    }
  }

  return (
    <div className="card">
      <div className="text-sm text-gray-400 mb-1">{title}</div>
      <div className="text-2xl font-semibold text-gray-100 mb-1">
        {formatValue(value)}
      </div>
      {change !== undefined && (
        <div className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '↗' : '↘'} {Math.abs(change).toFixed(1)}%
        </div>
      )}
    </div>
  )
}
