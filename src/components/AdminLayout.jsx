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
  XMarkIcon
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
      name: 'Drafts',
      href: '/admin/drafts',
      icon: DocumentTextIcon,
      permission: 'models:view' // Use same permission as models for now
    },
    {
      name: 'Models',
      href: '/admin/models',
      icon: CubeIcon,
      permission: 'models:view'
    },
    {
      name: 'Orders',
      href: '/admin/orders',
      icon: ShoppingCartIcon,
      permission: 'orders:view'
    },
    {
      name: 'Customers',
      href: '/admin/customers',
      icon: UsersIcon,
      permission: 'customers:view'
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: ChartBarIcon,
      permission: 'financial:reports'
    },
    {
      name: 'Advanced Reporting',
      href: '/admin/reports',
      icon: DocumentTextIcon,
      permission: 'financial:reports'
    },
    {
      name: 'Financial',
      href: '/admin/financial',
      icon: CurrencyDollarIcon,
      permission: 'financial:view'
    },
    {
      name: 'Delivery',
      href: '/admin/delivery',
      icon: TruckIcon,
      permission: 'orders:view'
    },
    {
      name: 'Documents',
      href: '/admin/documents',
      icon: DocumentTextIcon,
      permission: 'orders:view'
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
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        
        const response = await fetch('/api/admin/me', { headers })
        if (response.ok) {
          const data = await response.json()
          setUserInfo(data.data)
        } else {
          console.error('Failed to fetch user info:', response.status, response.statusText)
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
          className="fixed inset-0 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center">
            <img 
              src="/logo/firefly-logo.png" 
              alt="Firefly Logo" 
              className="h-8 w-auto"
            />
            <span className="ml-3 text-lg font-semibold text-gray-900">Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-200
                    ${isActive 
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon 
                    className={`
                      mr-3 h-5 w-5 transition-colors duration-200
                      ${isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}
                    `}
                  />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* User info at bottom */}
        {userInfo && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {userInfo.firstName} {userInfo.lastName}
                </p>
                <p className="text-xs text-gray-500 capitalize">
                  {userInfo.role?.replace('_', ' ')}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="ml-2 p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200"
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

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            {/* Page title */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {getCurrentPageName()}
              </h1>
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md relative">
                <BellIcon className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                )}
              </button>

              {/* User menu */}
              <div className="relative">
                <button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <img
                    className="h-8 w-8 rounded-full"
                    src={user?.imageUrl || '/logo/firefly-logo.png'}
                    alt="User avatar"
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
