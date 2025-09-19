import React from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../../lib/canEditModels'
import { Seo } from '../../components/Seo'
import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'

export default function AdminOverview() {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const { getToken } = useAuth()
  const [settings, setSettings] = useState(null)
  const [saving, setSaving] = useState(false)
  const [dashboardData, setDashboardData] = useState(null)

  React.useEffect(() => {
    const checkAdminStatus = () => {
      if (user) {
        const adminStatus = canEditModelsClient(user)
        setIsAdmin(adminStatus)
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    }
    checkAdminStatus()
  }, [user])

  useEffect(() => {
    (async ()=>{
      try {
        const token = await getToken()
        const res = await fetch('/api/admin/settings', { headers: token?{ Authorization:`Bearer ${token}` }:{} })
        if (res.ok) {
          const payload = await res.json()
          setSettings(payload?.data || payload)
        }
      } catch {}
    })()
  }, [getToken])

  useEffect(() => {
    (async ()=>{
      try {
        const token = await getToken()
        // TEMPORARY: Use direct endpoint to bypass Express router issues
        const res = await fetch('/api/admin-dashboard-direct', { headers: token?{ Authorization:`Bearer ${token}` }:{} })
        if (res.ok) {
          const data = await res.json()
          setDashboardData(data.data)
        }
      } catch {}
    })()
  }, [getToken])

  async function save() {
    try {
      setSaving(true)
      const token = await getToken()
      await fetch('/api/admin/settings', { method:'PUT', headers: { 'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{}) }, body: JSON.stringify({
        pricing: settings?.pricing,
        factory: settings?.factory,
      }) })
    } catch {} finally { setSaving(false) }
  }

  function setPricingField(key, val) {
    setSettings(s => ({ ...s, pricing: { ...(s?.pricing||{}), [key]: val } }))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-white">Checking admin status...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-8">
          <h1 className="text-2xl font-bold text-yellow-500 mb-4">Access Denied</h1>
          <p className="text-white mb-4">You don't have permission to access the admin panel.</p>
          <Link to="/" className="bg-yellow-500 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!settings) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center bg-black bg-opacity-60 backdrop-blur-sm rounded-lg p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mx-auto mb-3"></div>
        <div className="text-white">Loading settings…</div>
      </div>
    </div>
  )

  const adminFeatures = [
    {
      title: 'AI Insights',
      description: 'AI-powered business recommendations and predictive analytics',
      link: '/admin/ai-insights',
      icon: '🤖',
      badge: 'NEW',
      features: [
        'AI-generated business insights',
        'Predictive revenue analytics',
        'Customer behavior analysis',
        'Automated recommendations'
      ]
    },
    {
      title: 'Advanced Reports',
      description: 'Custom report builder with templates and automation',
      link: '/admin/reports',
      icon: '📈',
      badge: 'NEW',
      features: [
        'Custom report builder',
        'Report templates library',
        'Scheduled reports',
        'Multiple export formats'
      ]
    },
    {
      title: 'Integration Hub',
      description: 'Manage third-party service integrations and API connections',
      link: '/admin/integrations',
      icon: '🔗',
      badge: 'NEW',
      features: [
        'Third-party integrations',
        'API connection testing',
        'Webhook management',
        'Integration templates'
      ]
    },
    {
      title: 'Security & Audit',
      description: 'Monitor security events, audit logs, and system access',
      link: '/admin/security',
      icon: '🛡️',
      badge: 'NEW',
      features: [
        'Security event monitoring',
        'Audit log viewer',
        'User activity tracking',
        'Security recommendations'
      ]
    },
    {
      title: 'Workflow Automation',
      description: 'Automate business processes with visual workflow builder',
      link: '/admin/workflows',
      icon: '⚙️',
      badge: 'NEW',
      features: [
        'Visual workflow builder',
        'Business process automation',
        'Event-driven triggers',
        'Workflow templates'
      ]
    },
    {
      title: 'Performance Monitoring',
      description: 'Monitor system health, performance metrics, and alerts',
      link: '/admin/monitoring',
      icon: '📊',
      badge: 'NEW',
      features: [
        'System health dashboard',
        'Performance metrics',
        'Real-time monitoring',
        'Alert management'
      ]
    },
    {
      title: 'Data Export & Backup',
      description: 'Advanced data export, backup, and recovery management',
      link: '/admin/export',
      icon: '💾',
      badge: 'NEW',
      features: [
        'Automated backup scheduling',
        'Data export templates',
        'Multiple export formats',
        'Backup verification'
      ]
    },
    {
      title: 'Content Management',
      description: 'Manage blog posts, policies, and website content',
      link: '/admin/content',
      icon: '📝',
      badge: 'NEW',
      features: [
        'Blog post editor',
        'Policy management',
        'Content scheduling',
        'SEO optimization'
      ]
    },
    {
      title: 'Notifications Center',
      description: 'Manage admin notifications, alerts, and system updates',
      link: '/admin/notifications',
      icon: '🔔',
      badge: 'NEW',
      features: [
        'Real-time notifications',
        'Alert management',
        'Notification filtering',
        'Custom notifications'
      ]
    }
  ]

  return (
    <>
      <Seo
        title="Admin Panel - Firefly Tiny Homes"
        description="Admin panel for managing Firefly Tiny Homes business operations"
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
                <p className="mt-2 text-gray-600">
                  Welcome back, {user?.firstName || 'Admin'}! Manage your business operations.
                </p>
              </div>
              <Link
                to="/"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                ← Back to Site
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <span className="text-2xl">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData?.metrics?.totalUsers || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <span className="text-2xl">🏠</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Builds</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData?.metrics?.activeBuilds || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <span className="text-2xl">📦</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboardData?.metrics?.totalOrders || 0}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <span className="text-2xl">💰</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">${(dashboardData?.metrics?.totalRevenue || 0).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {adminFeatures.map((feature) => (
              <div key={feature.title} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    <span className="text-3xl mr-4">{feature.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
                        {feature.badge && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                  
                  <ul className="space-y-2 mb-6">
                    {feature.features.map((item, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                  
                  <Link
                    to={feature.link}
                    className="inline-flex items-center px-4 py-2 bg-yellow-500 text-gray-900 font-medium rounded-lg hover:bg-yellow-400 transition-colors"
                  >
                    Access {feature.title}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-12 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                to="/admin/ai-insights"
                className="flex items-center p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl mr-3">🤖</span>
                <div className="flex flex-col">
                  <span className="font-medium">AI Insights</span>
                  <span className="text-xs text-blue-600">NEW</span>
                </div>
              </Link>
              
              <Link
                to="/admin/reports"
                className="flex items-center p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl mr-3">📈</span>
                <div className="flex flex-col">
                  <span className="font-medium">Advanced Reports</span>
                  <span className="text-xs text-blue-600">NEW</span>
                </div>
              </Link>
              
              <Link
                to="/admin/security"
                className="flex items-center p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl mr-3">🛡️</span>
                <div className="flex flex-col">
                  <span className="font-medium">Security & Audit</span>
                  <span className="text-xs text-blue-600">NEW</span>
                </div>
              </Link>
              
              <Link
                to="/admin/monitoring"
                className="flex items-center p-4 border border-blue-200 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <span className="text-2xl mr-3">📊</span>
                <div className="flex flex-col">
                  <span className="font-medium">Performance Monitor</span>
                  <span className="text-xs text-blue-600">NEW</span>
                </div>
              </Link>
              
              <Link
                to="/admin/workflows"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">⚙️</span>
                <span className="font-medium">Workflow Automation</span>
              </Link>
              
              <Link
                to="/admin/integrations"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">🔗</span>
                <span className="font-medium">Integration Hub</span>
              </Link>
              
              <Link
                to="/admin/content"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">📝</span>
                <span className="font-medium">Content Management</span>
              </Link>
              
              <Link
                to="/admin/notifications"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">🔔</span>
                <span className="font-medium">Notifications</span>
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-2">🚀 What's New in Your Admin Panel!</h3>
            <p className="text-blue-700 mb-4">
              Your admin panel has been enhanced with powerful new AI-driven features and enterprise-grade tools! 
              Explore AI Insights for business intelligence, Advanced Reports for data analysis, 
              Security & Audit for monitoring, and much more. Each tool is designed to help you 
              optimize operations and grow your tiny home business.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                to="/admin/ai-insights"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                🤖 Try AI Insights →
              </Link>
              <Link
                to="/admin/reports"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                📈 Generate Reports →
              </Link>
              <a
                href="mailto:office@fireflytinyhomes.com"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Contact Support →
              </a>
            </div>
          </div>

          {/* Pricing & Fees */}
          <div className="card mt-6">
            <h2 className="text-lg font-semibold text-gray-100">Pricing & Fees</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <label className="text-sm text-gray-300">Delivery rate per mile (USD)
                <input className="input-field" type="number" step="0.01" value={settings?.pricing?.delivery_rate_per_mile||''} onChange={e=>setPricingField('delivery_rate_per_mile', Number(e.target.value))} />
              </label>
              <label className="text-sm text-gray-300">Delivery minimum (USD)
                <input className="input-field" type="number" step="1" value={settings?.pricing?.delivery_minimum||''} onChange={e=>setPricingField('delivery_minimum', Number(e.target.value))} />
              </label>
              <label className="text-sm text-gray-300">Title fee (USD)
                <input className="input-field" type="number" step="1" value={settings?.pricing?.title_fee_default||''} onChange={e=>setPricingField('title_fee_default', Number(e.target.value))} />
              </label>
              <label className="text-sm text-gray-300">Setup fee (USD)
                <input className="input-field" type="number" step="1" value={settings?.pricing?.setup_fee_default||''} onChange={e=>setPricingField('setup_fee_default', Number(e.target.value))} />
              </label>
              <label className="text-sm text-gray-300 md:col-span-2">Factory address (origin)
                <input className="input-field" type="text" value={settings?.factory?.address||''} onChange={e=>setSettings(s => ({ ...s, factory: { ...(s?.factory||{}), address: e.target.value } }))} />
              </label>
            </div>
            <div className="mt-4">
              <button className="btn-primary" disabled={saving} onClick={save}>{saving?'Saving…':'Save Settings'}</button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
