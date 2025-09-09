import React, { useState, useEffect } from 'react'
import { 
  BoltIcon,
  ClockIcon,
  CalendarIcon,
  PlayIcon,
  StopIcon,
  PlusIcon,
  TrashIcon,
  CogIcon,
  DocumentTextIcon,
  EyeIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import AIService from '../../services/ai/AIService'
import ContentScheduler from '../../services/ai/ContentScheduler'
import { useAuth } from '@clerk/clerk-react'

export default function AIContentManager() {
  const { getToken } = useAuth()
  const [isInitialized, setIsInitialized] = useState(false)
  const [schedulerStatus, setSchedulerStatus] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [customTopic, setCustomTopic] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('story')
  const [selectedSections, setSelectedSections] = useState([])
  const [generatedContent, setGeneratedContent] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [scheduleSettings, setScheduleSettings] = useState({
    frequency: 'weekly',
    dayOfWeek: 1,
    time: '09:00',
    autoPublish: false,
    requireApproval: true
  })
  const [configStatus, setConfigStatus] = useState(null)

  useEffect(() => {
    initializeAI()
  }, [])

  const initializeAI = async () => {
    try {
      const success = await ContentScheduler.initialize()
      if (success) {
        setIsInitialized(true)
        updateStatus()
      }
      // Fetch admin-only config status
      try {
        const token = await getToken()
        if (token) {
          const resp = await fetch('/api/admin/config-status', { headers: { Authorization: `Bearer ${token}` } })
          if (resp.ok) {
            const data = await resp.json()
            setConfigStatus(data)
          }
        }
      } catch (e) {
        console.warn('Config status fetch failed:', e?.message)
      }
    } catch (error) {
      console.error('Failed to initialize AI:', error)
    }
  }

  const updateStatus = () => {
    const status = ContentScheduler.getStatus()
    setSchedulerStatus(status)
    setScheduleSettings(status.schedule)
  }

  const startScheduler = () => {
    ContentScheduler.startScheduler()
    updateStatus()
  }

  const stopScheduler = () => {
    ContentScheduler.stopScheduler()
    updateStatus()
  }

  const updateSchedule = (newSettings) => {
    ContentScheduler.updateSchedule(newSettings)
    setScheduleSettings(newSettings)
    updateStatus()
  }

  const generateCustomContent = async () => {
    if (!customTopic.trim()) return
    
    setIsGenerating(true)
    try {
      const content = await ContentScheduler.generateCustomContent(
        customTopic,
        selectedTemplate,
        selectedSections
      )
      setGeneratedContent(content)
    } catch (error) {
      console.error('Custom content generation failed:', error)
      alert('Failed to generate content. Please check your AI API configuration.')
    } finally {
      setIsGenerating(false)
    }
  }

  const saveGeneratedContent = async () => {
    if (!generatedContent) return
    
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...generatedContent,
          status: 'draft'
        })
      })
      
      if (response.ok) {
        alert('AI-generated content saved successfully!')
        setGeneratedContent(null)
        setCustomTopic('')
      } else {
        throw new Error('Failed to save content')
      }
    } catch (error) {
      console.error('Failed to save content:', error)
      alert('Failed to save content. Please try again.')
    }
  }

  const getAuthToken = async () => {
    // This should be implemented based on your auth system
    return localStorage.getItem('authToken') || window.authToken
  }

  const addTopic = () => {
    const newTopic = prompt('Enter new topic:')
    if (newTopic && newTopic.trim()) {
      ContentScheduler.addTopics([newTopic.trim()])
      updateStatus()
    }
  }

  const removeTopic = (index) => {
    if (confirm('Are you sure you want to remove this topic?')) {
      ContentScheduler.removeTopic(index)
      updateStatus()
    }
  }

  const getDayName = (dayNumber) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return days[dayNumber]
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing AI Content Manager...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="ai-content-manager space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BoltIcon className="w-8 h-8 text-yellow-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                AI Content Manager
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Automate high-quality blog content generation
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <CogIcon className="w-5 h-5" />
            Settings
          </button>
        </div>
      </div>

      {/* Scheduler Status */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Automated Content Scheduler
          </h3>
          <div className="flex gap-2">
            <button
              onClick={startScheduler}
              disabled={schedulerStatus?.isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              Start
            </button>
            <button
              onClick={stopScheduler}
              disabled={!schedulerStatus?.isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <StopIcon className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Status</span>
            </div>
            <p className={`text-sm ${schedulerStatus?.isRunning ? 'text-green-600' : 'text-red-600'}`}>
              {schedulerStatus?.isRunning ? 'Running' : 'Stopped'}
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Next Run</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schedulerStatus?.nextScheduledRun ? 
                schedulerStatus.nextScheduledRun.toLocaleString() : 
                'Not scheduled'
              }
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DocumentTextIcon className="w-5 h-5 text-green-600" />
              <span className="font-medium">Topics</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {schedulerStatus?.totalTopics || 0} available
            </p>
          </div>
        </div>

        {schedulerStatus?.lastGenerated && (
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Last Generated</span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              "{schedulerStatus.lastGenerated.title}" - {new Date(schedulerStatus.lastGenerated.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Schedule Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Frequency</label>
              <select
                value={scheduleSettings.frequency}
                onChange={(e) => updateSchedule({ ...scheduleSettings, frequency: e.target.value })}
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="weekly">Weekly</option>
                <option value="bi-weekly">Bi-weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Day of Week</label>
              <select
                value={scheduleSettings.dayOfWeek}
                onChange={(e) => updateSchedule({ ...scheduleSettings, dayOfWeek: parseInt(e.target.value) })}
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <option key={day} value={day}>{getDayName(day)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input
                type="time"
                value={scheduleSettings.time}
                onChange={(e) => updateSchedule({ ...scheduleSettings, time: e.target.value })}
                className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scheduleSettings.autoPublish}
                  onChange={(e) => updateSchedule({ ...scheduleSettings, autoPublish: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Auto-publish</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scheduleSettings.requireApproval}
                  onChange={(e) => updateSchedule({ ...scheduleSettings, requireApproval: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Require approval</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Topic Management */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Topic Management
          </h3>
          <button
            onClick={addTopic}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Topic
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-64 overflow-y-auto">
          {ContentScheduler.topics.map((topic, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                {topic}
              </span>
              <button
                onClick={() => removeTopic(index)}
                className="p-1 text-red-400 hover:text-red-600"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Content Generation */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Generate Custom Content
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Topic</label>
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Enter your blog post topic..."
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-3 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="story">Story-Driven</option>
              <option value="educational">Educational</option>
              <option value="inspiration">Inspirational</option>
            </select>
          </div>

          <button
            onClick={generateCustomContent}
            disabled={!customTopic.trim() || isGenerating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Generating Content...
              </>
            ) : (
              <>
                <BoltIcon className="w-5 h-5" />
                Generate with AI
              </>
            )}
          </button>
        </div>

        {/* Generated Content Preview */}
        {generatedContent && (
          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800 dark:text-green-200">Content Generated Successfully!</span>
            </div>
            
            <div className="space-y-3">
              <div>
                <strong className="text-green-800 dark:text-green-200">Title:</strong>
                <p className="text-green-700 dark:text-green-300">{generatedContent.title}</p>
              </div>
              
              <div>
                <strong className="text-green-800 dark:text-green-200">Meta Description:</strong>
                <p className="text-green-700 dark:text-green-300">{generatedContent.metaDescription}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={saveGeneratedContent}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Save to Blog
                </button>
                <button
                  onClick={() => setGeneratedContent(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Configuration Status */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          AI Configuration Status
        </h3>
        
        {configStatus ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              {configStatus.ai?.configured ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              )}
              <span>AI Key: {configStatus.ai?.configured ? 'Configured' : 'Missing'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span>AI URL: {configStatus.ai?.apiUrl === 'custom' ? 'Custom' : 'Default'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span>Model: {configStatus.ai?.model || 'Default'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span>Stripe Mode: {configStatus.stripe?.mode}</span>
            </div>
            <div className="flex items-center gap-2">
              {configStatus.stripe?.webhookConfigured ? (
                <CheckIcon className="w-5 h-5 text-green-600" />
              ) : (
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
              )}
              <span>Webhook: {configStatus.stripe?.webhookConfigured ? 'Configured' : 'Missing'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckIcon className="w-5 h-5 text-green-600" />
              <span>Rate Limiter: {configStatus.rateLimiter?.mode}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading configuration…</div>
        )}
      </div>
    </div>
  )
}
