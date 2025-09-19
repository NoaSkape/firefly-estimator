// Admin Layout Component
// Provides consistent navigation, sidebar, and responsive design for the admin panel

import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  HomeIcon, 
  CubeIcon, 
  ShoppingCartIcon, 
  UsersIcon, 
  ChartBarIcon, 
  CogIcon,
  DocumentTextIcon,
  TruckIcon,
  CurrencyDollarIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  LightBulbIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  CloudArrowUpIcon,
  ChartPieIcon,
  WrenchScrewdriverIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { useUser, useAuth } from '@clerk/clerk-react'

const AdminLayout = ({ children, title = 'Admin Panel' }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userInfo, setUserInfo] = useState(null)
  const [notifications, setNotifications] = useState([])
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useUser()
  const { getToken } = useAuth()

  // Navigation items with permissions
  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HomeIcon,
      permission: 'financial:view'
    },
    {
      name: 'AI Insights',
      href: '/admin/ai-insights',
      icon: LightBulbIcon,
      permission: 'financial:view'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: ChartBarIcon,
      permission: 'financial:reports'
    },
    {
      name: 'Advanced Reports',
      href: '/admin/reports',
      icon: ChartPieIcon,
      permission: 'financial:reports'
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: ShoppingCartIcon,
      permission: 'orders:view'
    },
    {
      name: 'Financial',
      href: '/admin/financial',
      icon: CurrencyDollarIcon,
      permission: 'financial:view'
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: UsersIcon,
      permission: 'customers:view'
    },
    {
      name: 'Models',
      href: '/admin/models',
      icon: CubeIcon,
      permission: 'models:view'
    },
    {
      name: 'Content',
      href: '/admin/content',
      icon: DocumentTextIcon,
      permission: 'content:view'
    },
    {
      name: 'Notifications',
      href: '/admin/notifications',
      icon: BellIcon,
      permission: 'notifications:view'
    },
    {
      name: 'Integrations',
      href: '/admin/integrations',
      icon: CloudArrowUpIcon,
      permission: 'integrations:view'
    },
    {
      name: 'Security & Audit',
      href: '/admin/security',
      icon: ShieldCheckIcon,
      permission: 'security:view'
    },
    {
      name: 'Workflows',
      href: '/admin/workflows',
      icon: WrenchScrewdriverIcon,
      permission: 'workflows:view'
    },
    {
      name: 'Monitoring',
      href: '/admin/monitoring',
      icon: EyeIcon,
      permission: 'monitoring:view'
    },
    {
      name: 'Data Export',
      href: '/admin/export',
      icon: CpuChipIcon,
      permission: 'export:view'
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: CogIcon,
      permission: 'settings:view'
    }
  ]

  // Get user info and permissions
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const token = await getToken()
        if (!token) {
          console.warn('No token available for admin user info')
          return
        }
        
        const response = await fetch('/api/admin/me', { 
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserInfo(data.data)
          } else {
            console.error('Failed to fetch user info:', data.error)
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('Failed to fetch user info:', response.status, errorData.error || response.statusText)
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      }
    }

    if (user) {
      fetchUserInfo()
    }
  }, [user, getToken])

  // Check if user has permission for a navigation item
  const hasPermission = (permission) => {
    if (!userInfo?.permissions) return false
    return userInfo.permissions.includes(permission)
  }

  // Filter navigation items based on permissions
  const filteredNavigation = navigationItems.filter(item => hasPermission(item.permission))

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  // Get current page name
  const getCurrentPageName = () => {
    const currentItem = navigationItems.find(item => item.href === location.pathname)
    return currentItem ? currentItem.name : title
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Admin Breadcrumb Bar - Positioned below main header */}
      <div className="sticky top-16 left-0 right-0 z-20 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800 shadow-sm" style={{ height: '3rem' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
          <div className="flex items-center justify-between h-full">
            <div className="flex items-center space-x-3">
              <div className="flex items-center text-blue-100">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Administration Panel</span>
              </div>
              <div className="text-blue-200 text-sm">•</div>
              <span className="text-white text-sm font-medium">{getCurrentPageName()}</span>
            </div>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-blue-100 hover:text-white hover:bg-blue-800"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - positioned below breadcrumb bar */}
      <div className={`
        fixed left-0 z-30 w-64 bg-white shadow-xl border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
      style={{
        top: 'calc(4rem + 3rem)', // 4rem (header) + 3rem (breadcrumb bar)
        bottom: '0'
      }}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center min-w-0">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h2 className="text-sm font-semibold text-gray-900 truncate">Admin Panel</h2>
              <p className="text-xs text-gray-500 truncate">Management Dashboard</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation - Scrollable with sections */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Core Admin Section */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Core</h3>
              <div className="space-y-1">
                {filteredNavigation.slice(0, 4).map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon 
                        className={`
                          mr-3 h-5 w-5 transition-colors duration-200 flex-shrink-0
                          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
                        `}
                      />
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-blue-500 text-blue-100' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Business Management Section */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Business</h3>
              <div className="space-y-1">
                {filteredNavigation.slice(4, 8).map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon 
                        className={`
                          mr-3 h-5 w-5 transition-colors duration-200 flex-shrink-0
                          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
                        `}
                      />
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-blue-500 text-blue-100' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* System & Tools Section */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">System</h3>
              <div className="space-y-1">
                {filteredNavigation.slice(8).map((item) => {
                  const isActive = location.pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative
                        ${isActive 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon 
                        className={`
                          mr-3 h-5 w-5 transition-colors duration-200 flex-shrink-0
                          ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
                        `}
                      />
                      <span className="truncate">{item.name}</span>
                      {item.badge && (
                        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive ? 'bg-blue-500 text-blue-100' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </nav>

        {/* User info at bottom */}
        {userInfo && (
          <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <img
                  className="h-8 w-8 rounded-full border-2 border-gray-300"
                  src={user?.imageUrl || '/logo/firefly-logo.png'}
                  alt="User avatar"
                />
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userInfo.firstName} {userInfo.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize truncate">
                  {userInfo.role?.replace('_', ' ')} • Admin
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 flex-shrink-0 transition-colors"
                title="Sign out"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      <div className="lg:pl-64" style={{ paddingTop: 'calc(4rem + 3rem)' }}>
        {/* Page content with proper spacing */}
        <main className="min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Page header */}
            <div className="mb-8">
              <div className="border-b border-gray-200 pb-6">
                <h1 className="text-3xl font-bold text-gray-900">
                  {getCurrentPageName()}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Manage and monitor your {getCurrentPageName().toLowerCase()} from this centralized dashboard.
                </p>
              </div>
            </div>
            
            {/* Main content */}
            <div className="space-y-6">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
