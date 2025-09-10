// Workflow Automation Admin Page
// Manages business process automation and workflow execution

import React, { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import AdminLayout from '../../components/AdminLayout'
import {
  WrenchScrewdriverIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

const Workflows = () => {
  const { getToken } = useAuth()
  const [workflows, setWorkflows] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [executingWorkflow, setExecutingWorkflow] = useState(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  useEffect(() => {
    fetchWorkflows()
    fetchTemplates()
  }, [])

  const fetchWorkflows = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch('/api/admin/workflows', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setWorkflows(data.data.workflows || [])
      } else {
        throw new Error(data.error || 'Failed to fetch workflows')
      }
    } catch (error) {
      console.error('Workflows fetch error:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    try {
      const token = await getToken()
      if (!token) return

      const response = await fetch('/api/admin/workflows/templates', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setTemplates(data.data || [])
        }
      }
    } catch (error) {
      console.error('Templates fetch error:', error)
    }
  }

  const executeWorkflow = async (workflowId) => {
    try {
      setExecutingWorkflow(workflowId)
      
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/admin/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          context: {
            executedBy: 'admin',
            executedAt: new Date().toISOString()
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        alert(`Workflow executed successfully!`)
        fetchWorkflows() // Refresh workflows to show updated execution count
      } else {
        throw new Error(data.error || 'Failed to execute workflow')
      }
    } catch (error) {
      console.error('Workflow execution error:', error)
      setError(error.message)
    } finally {
      setExecutingWorkflow(null)
    }
  }

  const createWorkflowFromTemplate = async (templateId) => {
    try {
      const token = await getToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const template = templates.find(t => t.id === templateId)
      if (!template) {
        throw new Error('Template not found')
      }

      const response = await fetch('/api/admin/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: template.name,
          description: template.description,
          trigger: template.trigger,
          steps: template.steps,
          isActive: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          fetchWorkflows() // Refresh workflows list
          setShowCreateModal(false)
        }
      }
    } catch (error) {
      console.error('Workflow creation error:', error)
      setError(error.message)
    }
  }

  const getStatusIcon = (isActive) => {
    return isActive ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-gray-400" />
    )
  }

  const getTriggerIcon = (triggerType) => {
    switch (triggerType) {
      case 'event':
        return <ArrowPathIcon className="h-4 w-4" />
      case 'schedule':
        return <ClockIcon className="h-4 w-4" />
      case 'manual':
        return <PlayIcon className="h-4 w-4" />
      case 'webhook':
        return <WrenchScrewdriverIcon className="h-4 w-4" />
      default:
        return <InformationCircleIcon className="h-4 w-4" />
    }
  }

  const getTriggerColor = (triggerType) => {
    switch (triggerType) {
      case 'event':
        return 'bg-blue-100 text-blue-800'
      case 'schedule':
        return 'bg-green-100 text-green-800'
      case 'manual':
        return 'bg-purple-100 text-purple-800'
      case 'webhook':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <AdminLayout title="Workflows">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout title="Workflows">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <WrenchScrewdriverIcon className="h-8 w-8 text-blue-500 mr-3" />
                Workflow Automation
              </h1>
              <p className="text-gray-600 mt-1">
                Automate business processes and workflows
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Workflow
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Workflows Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map((workflow) => (
            <div key={workflow._id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {workflow.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {workflow.description || 'No description'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTriggerColor(workflow.trigger?.type)}`}>
                      {workflow.trigger?.type}
                    </span>
                    {getStatusIcon(workflow.isActive)}
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Steps:</span>
                  <span>{workflow.steps?.length || 0}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Executions:</span>
                  <span>{workflow.executionCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Success Rate:</span>
                  <span>
                    {workflow.executionCount > 0 
                      ? Math.round((workflow.successCount / workflow.executionCount) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Last Run:</span>
                  <span>{workflow.lastExecutedAt ? new Date(workflow.lastExecutedAt).toLocaleDateString() : 'Never'}</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => executeWorkflow(workflow._id)}
                  disabled={executingWorkflow === workflow._id || !workflow.isActive}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm disabled:opacity-50"
                >
                  {executingWorkflow === workflow._id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <PlayIcon className="h-4 w-4 mr-1" />
                      Execute
                    </>
                  )}
                </button>
                <button
                  onClick={() => setSelectedWorkflow(workflow)}
                  className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center text-sm"
                >
                  <EyeIcon className="h-4 w-4" />
                </button>
                <button className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-sm">
                  <PencilIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Create Workflow Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create New Workflow</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Choose a Template</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                        onClick={() => createWorkflowFromTemplate(template.id)}
                      >
                        <h4 className="font-medium text-gray-900 mb-2">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        <div className="flex items-center justify-between">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTriggerColor(template.trigger?.type)}`}>
                            {template.trigger?.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {template.steps?.length || 0} steps
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Detail Modal */}
        {selectedWorkflow && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Workflow Details</h2>
                <button
                  onClick={() => setSelectedWorkflow(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircleIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Workflow Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.isActive ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Trigger:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.trigger?.type}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Steps:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.steps?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Workflow Steps</h3>
                  <div className="space-y-2">
                    {selectedWorkflow.steps?.map((step, index) => (
                      <div key={step.id} className="flex items-center space-x-3 p-2 bg-white rounded border">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{step.name}</p>
                          <p className="text-xs text-gray-600">Type: {step.type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">Execution Statistics</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Executions:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.executionCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Successful:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.successCount || 0}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Failed:</span>
                      <span className="ml-2 font-medium">{selectedWorkflow.errorCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {workflows.length === 0 && (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <WrenchScrewdriverIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Workflows</h3>
            <p className="text-gray-600 mb-4">
              Get started by creating your first workflow to automate business processes.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Workflow
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default Workflows
