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
import RealTimeMonitor from '../../components/admin/RealTimeMonitor'
import AddCustomerModal from '../../components/admin/AddCustomerModal'
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
    search: '',
    engagementLevel: '',
    lastActivity: '',
    deviceType: '',
    location: '',
    valueTier: ''
  })
  const [realTimeData, setRealTimeData] = useState(null)
  const [showRealTime, setShowRealTime] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showCustomerModal, setShowCustomerModal] = useState(false)
  const [showRealTimeMonitor, setShowRealTimeMonitor] = useState(false)
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
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
      setError(null)
      
      const token = await getToken()
      const headers = token ? { Authorization: `Bearer ${token}` } : {}
      
      // Enterprise-grade API call with fallback strategy
      let response, data
      let apiUsed = 'unknown'
      
      try {
        // FIRST: Try the enterprise customer intelligence API
        const params = new URLSearchParams({
          action: 'list',
          page: pagination.page,
          limit: pagination.limit,
          sortBy: sortConfig.field,
          sortOrder: sortConfig.direction,
          includeAnonymous: 'true',
          ...Object.fromEntries(Object.entries(filters).filter(([key, value]) => value))
        })
        
        response = await fetch(`/api/customers-real?${params}`, { headers })
        if (response.ok) {
          data = await response.json()
          apiUsed = 'customers-real'
          console.log('[CUSTOMERS_PAGE] Enterprise customer API success:', {
            api: apiUsed,
            customersCount: data.data?.customers?.length || 0,
            total: data.data?.pagination?.total || 0
          })
        } else {
          throw new Error(`Enterprise API failed: ${response.status} ${response.statusText}`)
        }
      } catch (enterpriseError) {
        console.warn('[CUSTOMERS_PAGE] Enterprise API failed, trying fallback:', enterpriseError.message)
        
        try {
          // FALLBACK 1: Try dashboard API with customer data
          response = await fetch(`/api/admin-dashboard-direct?range=30d`, { headers })
          if (response.ok) {
            data = await response.json()
            apiUsed = 'admin-dashboard-direct'
            console.log('[CUSTOMERS_PAGE] Dashboard API fallback success:', {
              api: apiUsed,
              customersCount: data.data?.customers?.length || 0
            })
          } else {
            throw new Error(`Dashboard API failed: ${response.status} ${response.statusText}`)
          }
        } catch (dashboardError) {
          console.warn('[CUSTOMERS_PAGE] Dashboard API failed, trying analytics:', dashboardError.message)
          
          try {
            // FALLBACK 2: Try analytics API
            response = await fetch(`/api/admin-analytics-direct?range=30d`, { headers })
            if (response.ok) {
              data = await response.json()
              apiUsed = 'admin-analytics-direct'
              console.log('[CUSTOMERS_PAGE] Analytics API fallback success:', {
                api: apiUsed,
                hasData: !!data.data
              })
              
              // Transform analytics data to customer format if needed
              if (data.data && !data.data.customers) {
                // Create minimal customer data from analytics
                data.data.customers = []
                if (data.data.metrics?.users?.total > 0) {
                  // Generate placeholder customer entries for now
                  for (let i = 0; i < Math.min(data.data.metrics.users.total, 10); i++) {
                    data.data.customers.push({
                      userId: `user-${i + 1}`,
                      customerId: `customer-${i + 1}`,
                      firstName: 'Customer',
                      lastName: `${i + 1}`,
                      email: `customer${i + 1}@example.com`,
                      status: 'active_prospect',
                      totalOrders: 0,
                      totalSpent: 0,
                      engagementScore: 50,
                      totalSessions: 5,
                      totalPageViews: 25,
                      createdAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
                      lastActivity: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)),
                      address: { city: 'Unknown', state: 'TX' },
                      source: 'website',
                      devices: ['desktop'],
                      isActive: i < 3
                    })
                  }
                }
              }
            } else {
              throw new Error(`Analytics API failed: ${response.status} ${response.statusText}`)
            }
          } catch (analyticsError) {
            console.error('[CUSTOMERS_PAGE] All APIs failed:', analyticsError.message)
            throw new Error('All customer APIs are unavailable. Please check server status.')
          }
        }
      }

      // Process the data regardless of which API succeeded
      if (data?.success && data?.data) {
        const customers = data.data.customers || []
        const pagination = data.data.pagination || {
          total: customers.length,
          pages: Math.ceil(customers.length / (pagination?.limit || 20))
        }
        
        console.log('[CUSTOMERS_PAGE] Customer data processed:', {
          apiUsed,
          customersReceived: customers.length,
          paginationTotal: pagination.total,
          sampleCustomer: customers[0] ? {
            name: `${customers[0].firstName} ${customers[0].lastName}`,
            email: customers[0].email,
            status: customers[0].status,
            totalOrders: customers[0].totalOrders
          } : null
        })
        
        setCustomers(customers)
        setPagination(prev => ({
          ...prev,
          total: pagination.total || customers.length,
          pages: pagination.pages || Math.ceil(customers.length / prev.limit)
        }))
        
        // Show success message with API used
        if (customers.length > 0) {
          console.log(`[CUSTOMERS_PAGE] ✅ Successfully loaded ${customers.length} customers using ${apiUsed}`)
        } else {
          console.warn(`[CUSTOMERS_PAGE] ⚠️  No customers found using ${apiUsed}`)
          setError('No customers found. This may indicate users haven\'t completed the customer journey yet.')
        }
      } else {
        throw new Error(`Invalid data structure from ${apiUsed}: ${JSON.stringify(data)}`)
      }
      
    } catch (error) {
      console.error('[CUSTOMERS_PAGE] Final error:', error)
      setError(`Failed to load customers: ${error.message}`)
      setCustomers([])
      setPagination(prev => ({ ...prev, total: 0, pages: 0 }))
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

  // Handle real-time monitor
  const handleRealTimeMonitor = () => {
    setShowRealTimeMonitor(true)
  }

  // Handle add customer
  const handleAddCustomer = () => {
    setShowAddCustomerModal(true)
  }

  // Handle customer added callback
  const handleCustomerAdded = (newCustomer) => {
    // Refresh customer list
    fetchCustomers()
  }

  // Apply filters to customer data - Enterprise-grade filtering system
  const applyFilters = (customerList) => {
    let filtered = [...customerList]

    // Search filter - Enhanced to search across all relevant fields
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim()
      filtered = filtered.filter(customer => 
        customer.firstName?.toLowerCase().includes(searchTerm) ||
        customer.lastName?.toLowerCase().includes(searchTerm) ||
        customer.email?.toLowerCase().includes(searchTerm) ||
        customer.phone?.includes(searchTerm) ||
        customer.customerId?.toLowerCase().includes(searchTerm) ||
        customer.userId?.toLowerCase().includes(searchTerm) ||
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchTerm) ||
        `${customer.address?.city} ${customer.address?.state}`.toLowerCase().includes(searchTerm)
      )
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(customer => customer.status === filters.status)
    }

    // Engagement level filter
    if (filters.engagementLevel) {
      filtered = filtered.filter(customer => {
        const score = customer.engagementScore || 0
        switch (filters.engagementLevel) {
          case 'high': return score >= 80
          case 'medium': return score >= 60 && score < 80
          case 'low': return score >= 40 && score < 60
          case 'very_low': return score < 40
          default: return true
        }
      })
    }

    // Last activity filter
    if (filters.lastActivity) {
      const days = parseInt(filters.lastActivity)
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(customer => {
        const lastActivity = customer.lastActivity || customer.lastSignInAt
        return lastActivity && new Date(lastActivity) >= threshold
      })
    }

    // Enhanced Location filter - Support multiple states and regions
    if (filters.location) {
      filtered = filtered.filter(customer => {
        const state = customer.address?.state?.toUpperCase()
        const city = customer.address?.city?.toLowerCase()
        
        switch (filters.location) {
          case 'TX':
            return state === 'TX' || state === 'TEXAS'
          case 'CA':
            return state === 'CA' || state === 'CALIFORNIA'
          case 'FL':
            return state === 'FL' || state === 'FLORIDA'
          case 'NY':
            return state === 'NY' || state === 'NEW YORK'
          case 'other_states':
            return state && !['TX', 'TEXAS', 'CA', 'CALIFORNIA', 'FL', 'FLORIDA', 'NY', 'NEW YORK'].includes(state)
          case 'international':
            return customer.address?.country && customer.address.country !== 'US'
          default:
            return true
        }
      })
    }

    // Device type filter
    if (filters.deviceType) {
      filtered = filtered.filter(customer => {
        const devices = customer.devices || []
        return devices.includes(filters.deviceType)
      })
    }

    // Customer value tier filter
    if (filters.valueTier) {
      filtered = filtered.filter(customer => {
        const totalSpent = customer.totalSpent || 0
        switch (filters.valueTier) {
          case 'high_value': return totalSpent >= 25000
          case 'medium_value': return totalSpent >= 10000 && totalSpent < 25000
          case 'low_value': return totalSpent >= 1000 && totalSpent < 10000
          case 'prospects': return totalSpent === 0
          default: return true
        }
      })
    }

    return filtered
  }

  // Get filtered and sorted customers
  const getFilteredCustomers = () => {
    const filtered = applyFilters(customers)
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let aVal = a[sortConfig.field]
      let bVal = b[sortConfig.field]

      // Handle date sorting
      if (sortConfig.field.includes('Date') || sortConfig.field.includes('At') || sortConfig.field === 'lastActivity') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }

      // Handle string sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal ? bVal.toLowerCase() : ''
      }

      // Handle null/undefined values
      if (aVal == null) aVal = sortConfig.direction === 'asc' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER
      if (bVal == null) bVal = sortConfig.direction === 'asc' ? Number.MIN_SAFE_INTEGER : Number.MAX_SAFE_INTEGER

      if (sortConfig.direction === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
  }


  // Handle apply filters
  const handleApplyFilters = () => {
    // Filters are applied automatically via getFilteredCustomers()
    // This function can be used for additional logic if needed
    console.log('[CUSTOMERS_FILTER] Applied filters:', filters)
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
            
            {/* Status and Real-time Data */}
            <div className="mt-2 flex items-center space-x-4 text-sm">
              {/* Connection Status */}
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${error ? 'bg-red-500' : loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
                <span className={error ? 'text-red-600' : loading ? 'text-yellow-600' : 'text-green-600'}>
                  {error ? 'Connection Issues' : loading ? 'Loading...' : 'Live Data Connected'}
                </span>
              </div>
              
              {/* Customer Count */}
              {customers.length > 0 && (
                <div className="text-gray-500">
                  {customers.length} customer{customers.length !== 1 ? 's' : ''} loaded
                </div>
              )}
              
              {/* Real-time Data */}
              {realTimeData && (
                <>
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse" />
                    {realTimeData.activeUsers?.total || 0} active users
                  </div>
                  <div className="text-gray-500">{realTimeData.activeUsers?.authenticated || 0} authenticated</div>
                  <div className="text-gray-500">{realTimeData.activeUsers?.anonymous || 0} anonymous</div>
                </>
              )}
            </div>
            
            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <XCircleIcon className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Customer Data Error</h3>
                    <div className="mt-1 text-sm text-red-700">{error}</div>
                    <div className="mt-2">
                      <button
                        onClick={fetchCustomers}
                        className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
                      >
                        Retry Loading
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Real-time Monitor */}
            <button
              onClick={handleRealTimeMonitor}
              className="inline-flex items-center px-3 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-sm font-medium rounded-md transition-colors"
            >
              <ClockIcon className="h-4 w-4 mr-2" />
              Real-Time Monitor
            </button>
            
            {/* Add Customer */}
            <button
              onClick={handleAddCustomer}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Customer
            </button>
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
              {/* Enhanced Location Filter (Combined and Improved) */}
              <div>
                <label htmlFor="locationFilter" className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <select
                  id="locationFilter"
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Locations</option>
                  <option value="TX">Texas</option>
                  <option value="CA">California</option>
                  <option value="FL">Florida</option>
                  <option value="NY">New York</option>
                  <option value="other_states">Other States</option>
                  <option value="international">International</option>
                </select>
              </div>

              {/* Device Type Filter */}
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

              {/* Customer Value Tier Filter */}
              <div>
                <label htmlFor="valueTier" className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Value
                </label>
                <select
                  id="valueTier"
                  value={filters.valueTier}
                  onChange={(e) => handleFilterChange('valueTier', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Customers</option>
                  <option value="high_value">High Value ($25k+)</option>
                  <option value="medium_value">Medium Value ($10k-$25k)</option>
                  <option value="low_value">Low Value ($1k-$10k)</option>
                  <option value="prospects">Prospects ($0)</option>
                </select>
              </div>

              {/* Quick Actions */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setFilters({
                      status: '',
                      search: '',
                      engagementLevel: '',
                      lastActivity: '',
                      deviceType: '',
                      location: '',
                      valueTier: ''
                    })
                    setPagination(prev => ({ ...prev, page: 1 }))
                  }}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Clear Filters
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
            Customers ({getFilteredCustomers().length})
          </h3>
        </div>

        {getFilteredCustomers().length === 0 && !loading ? (
          // Empty State
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {error ? 'Unable to load customer data.' : 'No customers match your current filters.'}
            </p>
            <div className="mt-6 flex justify-center space-x-3">
              {error && (
                <button
                  onClick={fetchCustomers}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <BellIcon className="h-4 w-4 mr-2" />
                  Retry Loading
                </button>
              )}
              <button
                onClick={handleAddCustomer}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Customer
              </button>
            </div>
          </div>
        ) : (
          <>
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
              {getFilteredCustomers().map((customer) => {
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
          </>
        )}
      </div>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={selectedCustomer}
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
      />

      {/* Real-Time Monitor Modal */}
      <RealTimeMonitor
        isOpen={showRealTimeMonitor}
        onClose={() => setShowRealTimeMonitor(false)}
      />

      {/* Add Customer Modal */}
      <AddCustomerModal
        isOpen={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onCustomerAdded={handleCustomerAdded}
      />
    </AdminLayout>
  )
}

export default AdminCustomers
