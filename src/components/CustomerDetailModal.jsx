import React, { useState } from 'react'
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, UserCircleIcon, CreditCardIcon, BuildingOfficeIcon, ClockIcon } from '@heroicons/react/24/outline'

// Format utilities
const formatCurrency = (amount) => {
  if (amount == null || isNaN(amount)) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

const formatDate = (date) => {
  if (!date) return 'Unknown'
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatDateTime = (date) => {
  if (!date) return 'Unknown'
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function CustomerDetailModal({ customer, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('profile')

  if (!isOpen || !customer) return null

  const tabs = [
    { id: 'profile', name: 'Profile & Activity', icon: UserCircleIcon },
    { id: 'orders', name: 'Orders & Builds', icon: CreditCardIcon },
    { id: 'sessions', name: 'Session History', icon: ClockIcon },
    { id: 'journey', name: 'Journey Timeline', icon: BuildingOfficeIcon }
  ]

  const getStatusBadge = (status) => {
    const styles = {
      customer: 'bg-green-100 text-green-800',
      active_prospect: 'bg-blue-100 text-blue-800',
      inactive_customer: 'bg-yellow-100 text-yellow-800',
      inactive_prospect: 'bg-gray-100 text-gray-800'
    }
    const labels = {
      customer: 'Customer',
      active_prospect: 'Active Prospect',
      inactive_customer: 'Inactive Customer',
      inactive_prospect: 'Inactive Prospect'
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.inactive_prospect}`}>
        {labels[status] || status}
      </span>
    )
  }

  const getVerificationIcon = (verified) => {
    return verified ? (
      <CheckCircleIcon className="w-4 h-4 text-green-500" />
    ) : (
      <ExclamationCircleIcon className="w-4 h-4 text-yellow-500" />
    )
  }

  const renderProfileTab = () => (
    <div className="space-y-6">
      {/* Personal Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Full Name:</label>
            <p className="text-gray-900">{customer.profile.firstName} {customer.profile.lastName}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email:</label>
            <div className="flex items-center gap-2">
              <p className="text-gray-900">{customer.profile.email}</p>
              {getVerificationIcon(customer.profile.emailVerified)}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone:</label>
            <div className="flex items-center gap-2">
              <p className="text-gray-900">{customer.profile.phone || 'Not provided'}</p>
              {customer.profile.phone && getVerificationIcon(customer.profile.phoneVerified)}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Address:</label>
            <p className="text-gray-900">
              {customer.profile.address?.address ? 
                `${customer.profile.address.address}, ${customer.profile.address.city}, ${customer.profile.address.state} ${customer.profile.address.zip}` :
                'Unknown, Unknown'
              }
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Customer Since:</label>
            <p className="text-gray-900">{formatDate(customer.profile.createdAt)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Status:</label>
            <div className="mt-1">
              {getStatusBadge(customer.profile.status)}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Last Seen:</label>
            <p className="text-gray-900">{formatDateTime(customer.activity.lastSeen.timestamp)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Total Sessions:</label>
            <p className="text-gray-900">{customer.profile.insights?.totalSessions || 0}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Page Views:</label>
            <p className="text-gray-900">{customer.profile.insights?.totalPageViews || 0}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Engagement Score:</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${customer.profile.insights?.engagementScore || 0}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium">{customer.profile.insights?.engagementScore || 0}/100</span>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Customer Lifetime:</label>
            <p className="text-gray-900">{customer.business.lifetime?.days || 0} days</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        {customer.activity.recentActivity && customer.activity.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {customer.activity.recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${activity.type === 'order' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-500">{activity.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{formatDateTime(activity.timestamp)}</p>
                  {activity.value > 0 && (
                    <p className="text-sm font-medium text-green-600">{formatCurrency(activity.value)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent activity</p>
        )}
      </div>
    </div>
  )

  const renderOrdersTab = () => (
    <div className="space-y-6">
      {/* Business Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{customer.business.totalOrders || 0}</div>
          <div className="text-sm text-gray-500">Total Orders</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.business.totalValue || 0)}</div>
          <div className="text-sm text-gray-500">Total Value</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{customer.business.totalBuilds || 0}</div>
          <div className="text-sm text-gray-500">Total Builds</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{customer.business.activeBuilds || 0}</div>
          <div className="text-sm text-gray-500">Active Builds</div>
        </div>
      </div>

      {/* Orders (Step 8: Confirmed Orders) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Orders (Step 8)</h3>
          <div className="text-sm text-gray-500">Contract Signed & Payment Confirmed</div>
        </div>
        {customer.business.orders && customer.business.orders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customer.business.orders.map((order, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {order.orderId || order._id?.toString().slice(-8) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.model?.name || order.modelName || 'Unknown Model'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(order.totalAmount || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No confirmed orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              Orders appear here after Step 8 completion (contract signed & payment confirmed).
              <br />
              <span className="text-xs text-gray-400">Step 8 is currently under development.</span>
            </p>
          </div>
        )}
      </div>

      {/* Builds (Steps 1-7: Customization Process) */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Builds (Steps 1-7)</h3>
          <div className="text-sm text-gray-500">Customization & Contract Process</div>
        </div>
        {customer.business.builds && customer.business.builds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Build ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Step</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customer.business.builds.map((build, index) => {
                  const stepNames = {
                    1: 'Choose Home',
                    2: 'Customize',
                    3: 'Sign In',
                    4: 'Delivery Address',
                    5: 'Overview',
                    6: 'Payment Method',
                    7: 'Contract Signing',
                    8: 'Confirmation'
                  }
                  const currentStep = build.step || 1
                  const stepName = stepNames[currentStep] || 'Unknown'
                  
                  return (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {build._id?.toString().slice(-8) || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {build.modelName || 'Unknown Model'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <span className="font-medium">{currentStep}/8</span>
                          <span className="ml-2 text-gray-500">- {stepName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          currentStep === 8 ? 'bg-green-100 text-green-800' :
                          currentStep >= 7 ? 'bg-blue-100 text-blue-800' :
                          currentStep >= 4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {currentStep === 8 ? 'Ready to Order' :
                           currentStep >= 7 ? 'Contract Phase' :
                           currentStep >= 4 ? 'In Progress' : 'Getting Started'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(build.updatedAt || build.createdAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No builds found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Customer hasn't started the customization process yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )

  const renderSessionsTab = () => (
    <div className="space-y-6">
      {/* Session Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{customer.profile.insights?.totalSessions || 0}</div>
          <div className="text-sm text-gray-500">Total Sessions</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{customer.profile.insights?.totalPageViews || 0}</div>
          <div className="text-sm text-gray-500">Page Views</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{customer.profile.insights?.averageSessionDuration || 0}m</div>
          <div className="text-sm text-gray-500">Avg Session</div>
        </div>
      </div>

      {/* Session History */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Session History</h3>
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Session Tracking Coming Soon</h3>
          <p className="mt-1 text-sm text-gray-500">
            Real-time session tracking will be available in the next update. This will include detailed page views, 
            time spent, device information, and user behavior patterns.
          </p>
        </div>
      </div>

      {/* Device & Location Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Devices</h3>
          <div className="space-y-2">
            {customer.technical?.devices?.map((device, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-900 capitalize">{device}</span>
                <span className="text-xs text-gray-500">Primary</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Locations</h3>
          <div className="space-y-2">
            {customer.technical?.locations?.map((location, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-900">{location}</span>
                <span className="text-xs text-gray-500">Recent</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  const renderJourneyTab = () => {
    // Create journey timeline from all customer data
    const journeyEvents = []
    
    // Add account creation
    if (customer.profile.createdAt) {
      journeyEvents.push({
        type: 'account',
        title: 'Account Created',
        description: 'Customer signed up for an account',
        timestamp: customer.profile.createdAt,
        icon: UserCircleIcon,
        color: 'bg-blue-500'
      })
    }

    // Add orders
    if (customer.business.orders) {
      customer.business.orders.forEach(order => {
        journeyEvents.push({
          type: 'order',
          title: `Order ${order.status}`,
          description: `${order.model?.name || 'Unknown Model'} - ${formatCurrency(order.totalAmount || 0)}`,
          timestamp: order.createdAt,
          icon: CreditCardIcon,
          color: 'bg-green-500'
        })
      })
    }

    // Add builds
    if (customer.business.builds) {
      customer.business.builds.forEach(build => {
        journeyEvents.push({
          type: 'build',
          title: `Build ${build.status}`,
          description: `${build.modelName || 'Unknown Model'} customization`,
          timestamp: build.updatedAt || build.createdAt,
          icon: BuildingOfficeIcon,
          color: 'bg-purple-500'
        })
      })
    }

    // Sort by timestamp
    journeyEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return (
      <div className="space-y-6">
        {/* Journey Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Journey Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{customer.business.lifetime?.days || 0}</div>
              <div className="text-sm text-gray-500">Days Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{journeyEvents.length}</div>
              <div className="text-sm text-gray-500">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{customer.profile.insights?.engagementScore || 0}</div>
              <div className="text-sm text-gray-500">Engagement Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{customer.technical?.source || 'Website'}</div>
              <div className="text-sm text-gray-500">Source</div>
            </div>
          </div>
        </div>

        {/* Journey Timeline */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
          {journeyEvents.length > 0 ? (
            <div className="flow-root">
              <ul className="-mb-8">
                {journeyEvents.map((event, index) => (
                  <li key={index}>
                    <div className="relative pb-8">
                      {index !== journeyEvents.length - 1 && (
                        <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className={`${event.color} h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white`}>
                            <event.icon className="h-4 w-4 text-white" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{event.title}</p>
                            <p className="text-sm text-gray-500">{event.description}</p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time dateTime={event.timestamp}>{formatDateTime(event.timestamp)}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No journey events found</p>
          )}
        </div>
      </div>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab()
      case 'orders':
        return renderOrdersTab()
      case 'sessions':
        return renderSessionsTab()
      case 'journey':
        return renderJourneyTab()
      default:
        return renderProfileTab()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-4">
            {customer.profile.profileImageUrl ? (
              <img 
                src={customer.profile.profileImageUrl} 
                alt="Profile" 
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                <UserCircleIcon className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {customer.profile.firstName} {customer.profile.lastName}
              </h2>
              <p className="text-sm text-gray-500">{customer.profile.email}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{customer.business.totalOrders || 0}</div>
            <div className="text-sm text-gray-500">Total Orders</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(customer.business.totalValue || 0)}</div>
            <div className="text-sm text-gray-500">Total Value</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{customer.business.totalBuilds || 0}</div>
            <div className="text-sm text-gray-500">Total Builds</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{customer.profile.insights?.engagementScore || 0}</div>
            <div className="text-sm text-gray-500">Engagement Score</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 max-h-[60vh]">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            Customer ID: {customer.profile.userId}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
              Edit Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
