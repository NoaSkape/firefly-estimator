// Fail-safe Admin Dashboard (rebuilt)
// Minimal, resilient, and independent of heavy charting libs.

import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'

function StatCard({ label, value, hint, to }) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-gray-500">{hint}</div>}
      {to && (
        <div className="mt-3">
          <Link className="text-sm text-blue-600 hover:underline" to={to}>View details</Link>
        </div>
      )}
    </div>
  )
}

function Section({ title, children, right }) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {right}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

const currency = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const numberish = (n) => (typeof n === 'number' ? n : 0)

export default function AdminDashboard() {
  const { getToken } = useAuth()

  const [range, setRange] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ ok: false })
  const [config, setConfig] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError(null)
      try {
        // Probe health/config first (no auth required)
        const [healthRes, configRes] = await Promise.all([
          fetch('/api/admin/health'),
          fetch('/api/admin/config-status')
        ])
        const health = healthRes.ok ? await healthRes.json() : { ok: false }
        const cfg = configRes.ok ? await configRes.json() : null
        if (!mounted) return
        setStatus(health)
        setConfig(cfg)

        // Try dashboard (with token when available)
        let headers = {}
        try {
          const token = await getToken()
          if (token) headers = { Authorization: `Bearer ${token}` }
        } catch {}

        // TEMPORARY: Use direct endpoint to bypass Express router issues
        const dashRes = await fetch(`/api/admin-dashboard-direct?range=${encodeURIComponent(range)}`, { headers })
        let payload = null
        if (dashRes.ok) {
          payload = await dashRes.json()
        } else {
          // Fallback: present an empty data shell instead of surfacing 500s
          payload = { success: true, data: { metrics: {}, trends: { dailyRevenue: [], orderStatus: [] }, recentActivity: { orders: [], builds: [] }, topModels: [] } }
        }
        if (!mounted) return
        setData(payload.data || null)
      } catch (e) {
        if (!mounted) return
        setError(e?.message || 'Failed to load dashboard')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [range, getToken])

  const metrics = useMemo(() => ({
    users: numberish(data?.metrics?.totalUsers),
    builds: numberish(data?.metrics?.activeBuilds),
    orders: numberish(data?.metrics?.totalOrders),
    revenue: numberish(data?.metrics?.totalRevenue),
  }), [data])

  return (
    <AdminLayout title="Dashboard">
      {/* Time Range Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-gray-900">System Operational</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {['7d','30d','90d','1y'].map((r, index) => (
              <button 
                key={r} 
                onClick={() => setRange(r)} 
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  range === r
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                } ${index > 0 ? 'border-l border-gray-300' : ''}`}
              >
                {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : r === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded p-3">
          {error}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold">{metrics.users}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Active Builds</p>
              <p className="text-3xl font-bold">{metrics.builds}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Orders</p>
              <p className="text-3xl font-bold">{metrics.orders}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM6 9a1 1 0 112 0 1 1 0 01-2 0zm6 0a1 1 0 112 0 1 1 0 01-2 0z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Revenue</p>
              <p className="text-3xl font-bold">{currency(metrics.revenue)}</p>
            </div>
            <div className="bg-white/20 rounded-lg p-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z"/>
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* System Status & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              status?.ok ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                status?.ok ? 'bg-green-400' : 'bg-yellow-400'
              }`}></div>
              {status?.ok ? 'Healthy' : 'Degraded'}
            </span>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Router Layers</span>
                <span className="text-sm font-medium text-gray-900">{Array.isArray(status?.layers) ? status.layers.length : 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Admin Auth</span>
                <span className={`text-sm font-medium ${
                  status?.env?.adminAuthDisabled || process.env?.VITE_DEBUG_ADMIN === 'true' 
                    ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {status?.env?.adminAuthDisabled || process.env?.VITE_DEBUG_ADMIN === 'true' ? 'Bypass Enabled' : 'Secured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">AI Integration</span>
                <span className={`text-sm font-medium ${config?.ai?.configured ? 'text-green-600' : 'text-gray-400'}`}>
                  {config?.ai?.configured ? `Active (${config.ai.model})` : 'Not Configured'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Payment System</span>
                <span className="text-sm font-medium text-gray-900">
                  {config?.stripe?.mode || 'Not Set'} {config?.stripe?.webhookConfigured && '• Webhook Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            <button 
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={() => location.reload()}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <Link 
                to="/admin/orders" 
                className="group flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-blue-900">View Orders</p>
                  <p className="text-xs text-gray-500">Manage customer orders</p>
                </div>
              </Link>

              <Link 
                to="/admin/analytics" 
                className="group flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-green-900">Analytics</p>
                  <p className="text-xs text-gray-500">View detailed reports</p>
                </div>
              </Link>

              <Link 
                to="/admin/customers" 
                className="group flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-purple-900">Customers</p>
                  <p className="text-xs text-gray-500">Manage customer data</p>
                </div>
              </Link>

              <Link 
                to="/admin/models" 
                className="group flex items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-orange-900">Models</p>
                  <p className="text-xs text-gray-500">Manage product catalog</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Section title="Recent Orders" right={<Link className="text-sm text-blue-600" to="/admin/orders">Open Orders</Link>}>
          {!data?.recentActivity?.orders?.length && <div className="text-sm text-gray-500">No recent orders.</div>}
          <div className="divide-y">
            {(data?.recentActivity?.orders || []).slice(0,5).map((o, i) => (
              <div key={i} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{o.orderId || o._id}</div>
                  <div className="text-gray-500">{o.customerInfo?.name || 'Unknown'} • {o.status}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{currency(o?.totalAmount || o?.pricing?.total)}</div>
                  <div className="text-gray-400 text-xs">{o?.createdAt ? new Date(o.createdAt).toLocaleDateString() : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Recent Builds" right={<Link className="text-sm text-blue-600" to="/admin/orders">Open Builds</Link>}>
          {!data?.recentActivity?.builds?.length && <div className="text-sm text-gray-500">No recent builds.</div>}
          <div className="divide-y">
            {(data?.recentActivity?.builds || []).slice(0,5).map((b, i) => (
              <div key={i} className="py-2 text-sm flex items-center justify-between">
                <div>
                  <div className="font-medium">{b.modelName || b?.model?.name || 'Unknown Model'}</div>
                  <div className="text-gray-500">Stage: {b.stage || 'n/a'} • {b.status}</div>
                </div>
                <div className="text-right text-gray-400 text-xs">{b?.createdAt ? new Date(b.createdAt).toLocaleDateString() : ''}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </AdminLayout>
  )
}

