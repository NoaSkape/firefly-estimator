import React from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { canEditModelsClient } from '../../lib/canEditModels'
import { Seo } from '../../components/Seo'

export default function AdminOverview() {
  const { user } = useUser()
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        const adminStatus = await canEditModelsClient(user)
        setIsAdmin(adminStatus)
      }
      setLoading(false)
    }
    checkAdminStatus()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking admin status...</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin panel.</p>
          <Link to="/" className="text-yellow-600 hover:text-yellow-500">
            Return to Home
          </Link>
        </div>
      </div>
    )
  }

  const adminFeatures = [
    {
      title: 'Dashboard',
      description: 'View key business metrics, user statistics, and recent activity',
      link: '/admin/dashboard',
      icon: '📊',
      features: [
        'Total users, builds, and orders',
        'Revenue and conversion metrics',
        'Recent activity feed',
        'Quick actions and shortcuts'
      ]
    },
    {
      title: 'Orders Management',
      description: 'Manage customer orders, track status, and process payments',
      link: '/admin/orders',
      icon: '📦',
      features: [
        'View all customer orders',
        'Update order status',
        'Process payments and refunds',
        'Export order data'
      ]
    },
    {
      title: 'Advanced Reporting',
      description: 'Generate detailed reports and analyze business performance',
      link: '/admin/reports',
      icon: '📈',
      features: [
        'Conversion funnel analysis',
        'Revenue trends and forecasting',
        'User activity reports',
        'Model performance metrics'
      ]
    },
    {
      title: 'Analytics Dashboard',
      description: 'Real-time analytics and user behavior insights',
      link: '/admin/analytics',
      icon: '🔍',
      features: [
        'Real-time user tracking',
        'Page view analytics',
        'User journey mapping',
        'Performance metrics'
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
                  <p className="text-2xl font-bold text-gray-900">Loading...</p>
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
                  <p className="text-2xl font-bold text-gray-900">Loading...</p>
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
                  <p className="text-2xl font-bold text-gray-900">Loading...</p>
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
                  <p className="text-2xl font-bold text-gray-900">Loading...</p>
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
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{feature.title}</h3>
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
                to="/admin/dashboard"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">📊</span>
                <span className="font-medium">View Dashboard</span>
              </Link>
              
              <Link
                to="/admin/orders"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">📦</span>
                <span className="font-medium">Manage Orders</span>
              </Link>
              
              <Link
                to="/admin/reports"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">📈</span>
                <span className="font-medium">Generate Reports</span>
              </Link>
              
              <Link
                to="/admin/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-2xl mr-3">🔍</span>
                <span className="font-medium">View Analytics</span>
              </Link>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-8 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-2">Need Help?</h3>
            <p className="text-blue-700 mb-4">
              The admin panel provides comprehensive tools to manage your Firefly Tiny Homes business. 
              Each section offers specific functionality to help you track performance, manage orders, 
              and analyze customer behavior.
            </p>
            <div className="flex flex-wrap gap-4">
              <a
                href="mailto:admin@fireflytinyhomes.com"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Contact Admin Support →
              </a>
              <Link
                to="/admin/dashboard"
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Start with Dashboard →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
