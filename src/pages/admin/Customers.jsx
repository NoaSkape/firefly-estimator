// Admin Customers Management Page
// Comprehensive customer lifecycle management with advanced features

import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  PencilIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  DeviceTabletIcon,
  GlobeAltIcon,
  ChartBarIcon,
  BellIcon,
  CheckCircleIcon,
  XCircleIcon,
  CubeIcon
} from '@heroicons/react/24/outline'
import AdminLayout from '../../components/AdminLayout'
import CustomerDetailModal from '../../components/CustomerDetailModal'
import { useAuth } from '@clerk/clerk-react'

const AdminCustomers = () => {
  const { getToken } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  })
  const [filters, setFilters] = useState({
    status: '',
    source: '',
    search: '',
    engagementLevel: '',
    lastActivity: '',
    deviceType: '',
    location: ''
  })
  const [realTimeData, setRealTimeData] = useState(null)
  const [showRealTime, setShowRealTime] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [sortConfig, setSortConfig] = useState({
    field: 'createdAt',
    direction: 'desc'
  })

  // Customer status colors and icons
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800', icon: UserIcon },
    inactive: { color: 'bg-red-100 text-red-800', icon: UserIcon },
    prospect: { color: 'bg-yellow-100 text-yellow-800', icon: UserIcon },
    customer: { color: 'bg-blue-100 text-blue-800', icon: UserIcon }
  }

  const sourceConfig = {
    website: { color: 'bg-blue-100 text-blue-800', label: 'Website' },
    referral: { color: 'bg-green-100 text-green-800', label: 'Referral' },
    advertising: { color: 'bg-purple-100 text-purple-800', label: 'Advertising' },
    'trade-show': { color: 'bg-orange-100 text-orange-800', label: 'Trade Show' }
  }

  // Fetch customers
  useEffect(() => {
    fetchCustomers()
  }, [pagination.page, pagination.limit, filters, sortConfig])

  // Load real-time data when enabled
  useEffect(() => {
    if (showRealTime) {
      loadRealTimeData()
      const interval = setInterval(loadRealTimeData, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [showRealTime])

  const loadRealTimeData = async () => {
    try {
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      const response = await fetch('/api/customers-enterprise?action=sessions', { headers })
      if (response.ok) {
        const data = await response.json()
        setRealTimeData(data.data)
      }
    } catch (error) {
      console.warn('Real-time data load failed:', error.message)
    }
  }

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        action: 'list',
        page: pagination.page,
        limit: pagination.limit,
        sortBy: sortConfig.field,
        sortOrder: sortConfig.direction,
        includeAnonymous: 'true',
        ...filters
      })

      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      // Use dashboard API which now includes real customer data
      const response = await fetch(`/api/admin-dashboard-direct?range=30d`, { headers })
      if (response.ok) {
        const data = await response.json()
        console.log('[CUSTOMERS_PAGE] Real customer data loaded:', data.data)
        
        // Use real customer data from API
        setCustomers(data.data.customers || [])
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination?.total || data.data.customers?.length || 0,
          pages: data.data.pagination?.pages || Math.ceil((data.data.customers?.length || 0) / prev.limit)
        }))
      } else {
        throw new Error('Failed to fetch real customer data')
      }
    } catch (error) {
      console.error('Fetch customers error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // Handle sorting
  const handleSort = (field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Handle pagination
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, page }))
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

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Get status badge
  const getStatusBadge = (status) => {
    const config = statusConfig[status] || statusConfig.prospect
    const Icon = config.icon
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status?.charAt(0).toUpperCase() + status?.slice(1)}
      </span>
    )
  }

  // Get source badge
  const getSourceBadge = (source) => {
    const config = sourceConfig[source] || sourceConfig.website
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    )
  }

  // Get engagement score badge
  const getEngagementBadge = (score) => {
    let color = 'bg-gray-100 text-gray-800'
    let label = 'Unknown'
    
    if (score >= 80) {
      color = 'bg-green-100 text-green-800'
      label = 'High'
    } else if (score >= 60) {
      color = 'bg-blue-100 text-blue-800'
      label = 'Medium'
    } else if (score >= 40) {
      color = 'bg-yellow-100 text-yellow-800'
      label = 'Low'
    } else {
      color = 'bg-red-100 text-red-800'
      label = 'Very Low'
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {label} ({score})
      </span>
    )
  }

  // Get device icon
  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile':
        return <DevicePhoneMobileIcon className="h-4 w-4 text-gray-400" />
      case 'tablet':
        return <DeviceTabletIcon className="h-4 w-4 text-gray-400" />
      case 'desktop':
      default:
        return <ComputerDesktopIcon className="h-4 w-4 text-gray-400" />
    }
  }

  // Get activity status
  const getActivityStatus = (lastActivity) => {
    if (!lastActivity) return { status: 'Never', color: 'text-gray-500' }
    
    const now = new Date()
    const lastActive = new Date(lastActivity)
    const diffHours = (now - lastActive) / (1000 * 60 * 60)
    
    if (diffHours < 1) return { status: 'Online', color: 'text-green-600' }
    if (diffHours < 24) return { status: 'Today', color: 'text-blue-600' }
    if (diffHours < 168) return { status: 'This Week', color: 'text-yellow-600' }
    if (diffHours < 720) return { status: 'This Month', color: 'text-orange-600' }
    return { status: 'Inactive', color: 'text-red-600' }
  }

  // Handle customer detail view
  const handleViewCustomer = async (customer) => {
    try {
      // Use the real customer data we already have with all the detailed information
      const enhancedCustomer = {
        profile: {
          userId: customer.userId,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
          profileImageUrl: customer.profileImageUrl,
          createdAt: customer.createdAt,
          lastSignInAt: customer.lastSignInAt,
          emailVerified: customer.emailVerified,
          phoneVerified: customer.phoneVerified,
          status: customer.status,
          isActive: customer.isActive,
          insights: {
            engagementScore: customer.engagementScore,
            totalSessions: customer.totalSessions,
            totalPageViews: customer.totalPageViews,
            averageSessionDuration: customer.averageSessionDuration
          }
        },
        activity: {
          recentActivity: customer.recentActivity || [],
          sessions: [], // Would come from session tracking
          websiteActivity: [],
          lastSeen: {
            timestamp: customer.lastActivity || customer.lastSignInAt
          }
        },
        business: {
          orders: customer.orders || [],
          builds: customer.builds || [],
          totalOrders: customer.totalOrders,
          totalBuilds: customer.totalBuilds,
          activeBuilds: customer.activeBuilds,
          totalValue: customer.totalSpent,
          lastOrderDate: customer.lastOrderDate,
          lastBuildDate: customer.lastBuildDate,
          lifetime: {
            days: customer.createdAt ? Math.floor((new Date() - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24)) : 0
          }
        },
        technical: {
          devices: customer.devices || ['desktop'],
          locations: customer.locations || ['Unknown'],
          source: customer.source || 'website'
        }
      }
      
      console.log('[CUSTOMER_DETAIL] Enhanced customer data:', enhancedCustomer)
      setSelectedCustomer(enhancedCustomer)
      setShowCustomerModal(true)
    } catch (error) {
      console.error('Failed to load customer details:', error)
    }
  }

  // Loading state
  if (loading && customers.length === 0) {
    return (
      <AdminLayout title="Customers">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Customers">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enterprise Customer Intelligence</h1>
            <p className="text-gray-600">Comprehensive customer tracking, behavior analytics, and engagement insights</p>
            {realTimeData && (
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                  {realTimeData.activeUsers?.total || 0} active users
                </div>
                <div>{realTimeData.activeUsers?.authenticated || 0} authenticated</div>
                <div>{realTimeData.activeUsers?.anonymous || 0} anonymous</div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Real-time Monitor Toggle */}
            <button
              onClick={() => setShowRealTime(!showRealTime)}
              className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md transition-colors ${
                showRealTime 
                  ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                  : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
              }`}
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Real-Time Monitor
            </button>
            
            <Link
              to="/admin/customers/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Customer
            </Link>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Filters & Search</h3>
        </div>
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Primary Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="search"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="Name, email, phone..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Status
                </label>
                <select
                  id="status"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Statuses</option>
                  <option value="customer">Customer (Has Orders)</option>
                  <option value="active_prospect">Active Prospect</option>
                  <option value="inactive_prospect">Inactive Prospect</option>
                  <option value="inactive_customer">Inactive Customer</option>
                </select>
              </div>

              {/* Engagement Level */}
              <div>
                <label htmlFor="engagementLevel" className="block text-sm font-medium text-gray-700 mb-1">
                  Engagement Level
                </label>
                <select
                  id="engagementLevel"
                  value={filters.engagementLevel}
                  onChange={(e) => handleFilterChange('engagementLevel', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Engagement Levels</option>
                  <option value="high">High (80+)</option>
                  <option value="medium">Medium (60-79)</option>
                  <option value="low">Low (40-59)</option>
                  <option value="very_low">Very Low (&lt;40)</option>
                </select>
              </div>

              {/* Last Activity */}
              <div>
                <label htmlFor="lastActivity" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Active
                </label>
                <select
                  id="lastActivity"
                  value={filters.lastActivity}
                  onChange={(e) => handleFilterChange('lastActivity', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Any Time</option>
                  <option value="1">Last 24 Hours</option>
                  <option value="7">Last Week</option>
                  <option value="30">Last Month</option>
                  <option value="90">Last 3 Months</option>
                </select>
              </div>
            </div>

            {/* Secondary Filters Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Source Filter */}
              <div>
                <label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
                  Acquisition Source
                </label>
                <select
                  id="source"
                  value={filters.source}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Sources</option>
                  <option value="website">Direct Website</option>
                  <option value="referral">Referral</option>
                  <option value="advertising">Paid Advertising</option>
                  <option value="social">Social Media</option>
                  <option value="email">Email Campaign</option>
                  <option value="trade-show">Trade Show</option>
                </select>
              </div>

              {/* Device Type */}
              <div>
                <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Device
                </label>
                <select
                  id="deviceType"
                  value={filters.deviceType}
                  onChange={(e) => handleFilterChange('deviceType', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Devices</option>
                  <option value="desktop">Desktop</option>
                  <option value="mobile">Mobile</option>
                  <option value="tablet">Tablet</option>
                </select>
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="location"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Locations</option>
                  <option value="TX">Texas</option>
                  <option value="CA">California</option>
                  <option value="FL">Florida</option>
                  <option value="NY">New York</option>
                  <option value="international">International</option>
                </select>
              </div>

              {/* Search Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <FunnelIcon className="h-4 w-4 mr-2" />
                  Apply Filters
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Customers ({pagination.total})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('customerId')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Customer ID
                    {sortConfig.field === 'customerId' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('firstName')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Customer
                    {sortConfig.field === 'firstName' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('email')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Contact
                    {sortConfig.field === 'email' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Status
                    {sortConfig.field === 'status' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('source')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Source
                    {sortConfig.field === 'source' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('totalOrders')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Orders
                    {sortConfig.field === 'totalOrders' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('totalSpent')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Total Spent
                    {sortConfig.field === 'totalSpent' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('engagementScore')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Engagement
                    {sortConfig.field === 'engagementScore' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('totalSessions')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Sessions
                    {sortConfig.field === 'totalSessions' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left">
                  <button
                    onClick={() => handleSort('lastActivity')}
                    className="group inline-flex items-center text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700"
                  >
                    Last Activity
                    {sortConfig.field === 'lastActivity' && (
                      sortConfig.direction === 'asc' ? <ArrowUpIcon className="ml-2 h-4 w-4" /> : <ArrowDownIcon className="ml-2 h-4 w-4" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.map((customer) => {
                const activityStatus = getActivityStatus(customer.lastActivity)
                return (
                  <tr key={customer.userId || customer._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{customer.customerId || customer.userId}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center relative">
                          <span className="text-sm font-medium text-gray-600">
                            {customer.firstName?.[0]}{customer.lastName?.[0]}
                          </span>
                          {/* Online indicator */}
                          {activityStatus.status === 'Online' && (
                            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="flex items-center">
                            <div className="text-sm font-medium text-gray-900">
                              {customer.firstName} {customer.lastName}
                            </div>
                            {customer.emailVerified && (
                              <CheckCircleIcon className="h-4 w-4 text-green-500 ml-2" title="Email Verified" />
                            )}
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <MapPinIcon className="h-3 w-3 mr-1" />
                            {customer.address?.city || 'Unknown'}, {customer.address?.state || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                        <div className="text-sm text-gray-900">{customer.email}</div>
                      </div>
                      {customer.phone && (
                        <div className="flex items-center space-x-2 mt-1">
                          <PhoneIcon className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-500">{customer.phone}</div>
                        </div>
                      )}
                      {customer.devices && customer.devices[0] && (
                        <div className="flex items-center space-x-2 mt-1">
                          {getDeviceIcon(customer.devices[0])}
                          <div className="text-xs text-gray-400 capitalize">{customer.devices[0]}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(customer.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getSourceBadge(customer.source)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <ShoppingCartIcon className="h-4 w-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900">
                          {customer.totalOrders || 0}
                        </div>
                      </div>
                      {customer.totalBuilds > 0 && (
                        <div className="flex items-center space-x-2 mt-1">
                          <CubeIcon className="h-4 w-4 text-gray-400" />
                          <div className="text-sm text-gray-500">{customer.totalBuilds} builds</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(customer.totalSpent || 0)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getEngagementBadge(customer.engagementScore || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{customer.totalSessions || 0}</div>
                      <div className="text-xs text-gray-500">
                        {customer.totalPageViews || 0} page views
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${activityStatus.color}`}>
                        {activityStatus.status}
                      </div>
                      {customer.lastActivity && (
                        <div className="text-xs text-gray-500">
                          {formatDate(customer.lastActivity)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Customer Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <Link
                          to={`/admin/customers/${customer.userId}/edit`}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit Customer"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="text-green-600 hover:text-green-900"
                          title="Customer Journey"
                        >
                          <ChartBarIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Previous
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
      />
    </AdminLayout>
  )
}

export default AdminCustomers
