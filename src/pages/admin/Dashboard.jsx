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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600">Fail-safe overview of system status and key metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {['7d','30d','90d','1y'].map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-3 py-1 rounded text-sm ${range===r?'bg-blue-600 text-white':'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>{r}</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-800 rounded p-3">
          {error}
        </div>
      )}

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Section title="System Status" right={<span className={`text-xs px-2 py-1 rounded ${status?.ok? 'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-800'}`}>{status?.ok? 'Healthy':'Degraded'}</span>}>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Router layers: {Array.isArray(status?.layers) ? status.layers.length : 0}</li>
            <li>Admin auth bypass: {String(status?.env?.adminAuthDisabled === true || process.env?.VITE_DEBUG_ADMIN === 'true')}</li>
            <li>AI configured: {String(!!config?.ai?.configured)} {config?.ai?.model ? `(${config.ai.model})` : ''}</li>
            <li>Stripe mode: {config?.stripe?.mode || 'unset'} • Webhook: {String(!!config?.stripe?.webhookConfigured)}</li>
          </ul>
        </Section>

        <Section title="Key Metrics" right={<button className="text-sm text-blue-600" onClick={() => location.reload()}>Refresh</button>}>
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Users" value={metrics.users} to="/admin/analytics" />
            <StatCard label="Active Builds" value={metrics.builds} to="/admin/orders" />
            <StatCard label="Orders" value={metrics.orders} to="/admin/orders" />
            <StatCard label="Revenue" value={currency(metrics.revenue)} to="/admin/financial" />
          </div>
          {!data && (
            <div className="mt-3 text-xs text-gray-500">No metrics available yet. If the database is unreachable, the API supplies a safe fallback.</div>
          )}
        </Section>
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

