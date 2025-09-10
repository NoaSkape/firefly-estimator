// Enhanced Admin Dashboard Component
// Provides real-time metrics, charts, and actionable insights for the admin panel

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  CubeIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from './AdminLayout'

const AdminDashboard = () => {
  const { getToken } = useAuth()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeRange, setTimeRange] = useState('7d') // 7d, 30d, 90d

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const token = await getToken()
        if (!token) {
          throw new Error('Authentication required')
        }
        
        const response = await fetch(`/api/admin/dashboard?range=${timeRange}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        const data = await response.json()
        if (data.success) {
          setDashboardData(data.data)
        } else {
          throw new Error(data.error || 'Failed to fetch dashboard data')
        }
      } catch (error) {
        console.error('Dashboard fetch error:', error)
        setError(error.message)
        // Set fallback data to prevent UI breaking
        setDashboardData({
          metrics: {
            totalUsers: 0,
            newUsers: 0,
            totalOrders: 0,
            totalRevenue: 0,
            activeBuilds: 0
          },
          growth: {
            userGrowth: 0,
            revenueGrowth: 0
          }
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [timeRange, getToken])

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

  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Dashboard">
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
      <AdminLayout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading dashboard
              </h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Time range selector */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">Time Range:</span>
          {['7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Orders */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCartIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(dashboardData?.metrics?.totalOrders || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link 
                to="/admin/orders" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View all orders
              </Link>
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(dashboardData?.metrics?.pendingOrders || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link 
                to="/admin/orders?status=pending" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View pending
              </Link>
            </div>
          </div>
        </div>

        {/* Total Customers */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Customers
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatNumber(dashboardData?.metrics?.totalCustomers || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link 
                to="/admin/customers" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View all customers
              </Link>
            </div>
          </div>
        </div>

        {/* Revenue Pipeline */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Revenue Pipeline
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(dashboardData?.metrics?.revenuePipeline || 0)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-5 py-3">
            <div className="text-sm">
              <Link 
                to="/admin/financial" 
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                View financials
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Orders */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
          </div>
          <div className="p-6">
            {dashboardData?.recentActivity?.orders?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity.orders.slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full ${
                        order.status === 'completed' ? 'bg-green-400' :
                        order.status === 'production' ? 'bg-blue-400' :
                        order.status === 'pending' ? 'bg-yellow-400' :
                        'bg-gray-400'
                      }`} />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {order.orderId}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.customerInfo?.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent orders</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link 
                to="/admin/orders" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all orders →
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Customers */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Customers</h3>
          </div>
          <div className="p-6">
            {dashboardData?.recentActivity?.customers?.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentActivity.customers.slice(0, 5).map((customer) => (
                  <div key={customer._id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {customer.firstName?.[0]}{customer.lastName?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {customer.status}
                      </p>
                      <p className="text-sm text-gray-500">
                        {customer.totalOrders || 0} orders
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No recent customers</p>
            )}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link 
                to="/admin/customers" 
                className="text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all customers →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/admin/models/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <CubeIcon className="h-6 w-6 text-blue-500 mr-3" />
              <span className="text-sm font-medium text-gray-900">Add Model</span>
            </Link>
            
            <Link
              to="/admin/orders/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ShoppingCartIcon className="h-6 w-6 text-green-500 mr-3" />
              <span className="text-sm font-medium text-gray-900">Create Order</span>
            </Link>
            
            <Link
              to="/admin/customers/new"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <UsersIcon className="h-6 w-6 text-purple-500 mr-3" />
              <span className="text-sm font-medium text-gray-900">Add Customer</span>
            </Link>
            
            <Link
              to="/admin/analytics"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <TrendingUpIcon className="h-6 w-6 text-orange-500 mr-3" />
              <span className="text-sm font-medium text-gray-900">View Reports</span>
            </Link>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminDashboard
