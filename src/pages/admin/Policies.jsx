import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import AdminPolicyEditor from '../../components/AdminPolicyEditor'

export default function AdminPolicies() {
  const { getToken } = useAuth()
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingPolicy, setEditingPolicy] = useState(null)

  useEffect(() => {
    loadPolicies()
  }, [])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const token = await getToken()
      const response = await fetch('/api/admin/policies', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setPolicies(data)
      } else {
        setError('Failed to load policies')
      }
    } catch (err) {
      console.error('Failed to load policies:', err)
      setError('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  const handleEditPolicy = (policy) => {
    setEditingPolicy(policy)
  }

  const handleSavePolicy = (updatedPolicy) => {
    setPolicies(policies.map(p => p.id === updatedPolicy.id ? updatedPolicy : p))
    setEditingPolicy(null)
  }

  const handleCancelEdit = () => {
    setEditingPolicy(null)
  }

  const getPolicyDisplayName = (id) => {
    switch (id) {
      case 'privacy-policy':
        return 'Privacy Policy'
      case 'terms-conditions':
        return 'Terms & Conditions'
      case 'other-policies':
        return 'Other Policies'
      default:
        return id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  if (editingPolicy) {
    return (
      <AdminPolicyEditor
        policyId={editingPolicy.id}
        title={`Edit ${getPolicyDisplayName(editingPolicy.id)}`}
        onSave={handleSavePolicy}
        onCancel={handleCancelEdit}
      />
    )
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-300 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
            <div className="h-20 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Policy Management</h1>
        <p className="text-gray-600 mt-2">
          Manage website policies and terms. Changes are reflected immediately on the public pages.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <div className="grid gap-6">
        {policies.map((policy) => (
          <div key={policy.id} className="bg-white rounded-lg shadow-md border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {policy.title || getPolicyDisplayName(policy.id)}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {policy.content ? 
                      `${policy.content.substring(0, 200)}${policy.content.length > 200 ? '...' : ''}` :
                      'No content available'
                    }
                  </p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>
                      Last updated: {policy.lastUpdated ? new Date(policy.lastUpdated).toLocaleDateString() : 'Never'}
                    </span>
                    {policy.updatedBy && (
                      <span>
                        By: {policy.updatedBy}
                      </span>
                    )}
                  </div>
                </div>
                <div className="ml-6">
                  <button
                    onClick={() => handleEditPolicy(policy)}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Edit Policy
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {policies.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">No policies found.</p>
            <button
              onClick={loadPolicies}
              className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>Policy changes are immediately visible to all website visitors</li>
                <li>Use Markdown formatting for better readability</li>
                <li>Review changes carefully before saving</li>
                <li>Consider legal review for significant policy changes</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
