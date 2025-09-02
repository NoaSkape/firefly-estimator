import React, { useState } from 'react'
import { 
  SparklesIcon, 
  ArrowPathIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'

export default function AITopicGenerator({ onTopicSelected, currentTitle, setPostData }) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedTopics, setGeneratedTopics] = useState([])
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [error, setError] = useState(null)

  const generateTopics = async () => {
    setIsGenerating(true)
    setError(null)
    
    try {
      console.log('[AI_TOPIC_GEN] Starting topic generation...')
      
      const response = await fetch('/api/ai/generate-topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sources: [
            'existing-blog-posts',
            'athens-park-models',
            'champion-park-models', 
            'modern-park-models',
            'fireflytinyhomes.com'
          ],
          count: 6,
          industry: 'park-model-homes',
          location: 'texas',
          avoidDuplicates: true,
          seoOptimized: true
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate topics' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Topic generation failed`)
      }

      const result = await response.json()
      console.log('[AI_TOPIC_GEN] Topics generated:', result)
      
      setGeneratedTopics(result.topics || [])
      
    } catch (error) {
      console.error('[AI_TOPIC_GEN] Generation failed:', error)
      setError(error.message)
      
      // Fallback topics if AI fails
      setGeneratedTopics([
        {
          title: "Why Texas Park Model Homes Are Perfect for Year-Round Living",
          description: "Explore the benefits of park model living in Texas climate",
          seoScore: 85,
          competition: "low"
        },
        {
          title: "Park Model vs Traditional Home: Complete Cost Comparison",
          description: "Compare total costs, maintenance, and value over time",
          seoScore: 92,
          competition: "medium"
        },
        {
          title: "Inside Look: Modern Park Model Interior Design Trends 2024",
          description: "Latest design trends making park models feel like luxury homes",
          seoScore: 88,
          competition: "low"
        },
        {
          title: "Park Model Communities in Texas: Your Complete Guide",
          description: "Find the best park model communities across Texas",
          seoScore: 90,
          competition: "medium"
        },
        {
          title: "Financing Your Park Model Home: Options and Strategies",
          description: "Complete guide to park model financing and loan options",
          seoScore: 86,
          competition: "low"
        },
        {
          title: "Park Model Maintenance: Seasonal Care Guide for Texas Owners",
          description: "Keep your park model in perfect condition year-round",
          seoScore: 84,
          competition: "low"
        }
      ])
    } finally {
      setIsGenerating(false)
    }
  }

  const selectTopic = (topic) => {
    setSelectedTopic(topic)
    setPostData(prev => ({
      ...prev,
      title: topic.title,
      excerpt: topic.description || `Discover everything about ${topic.title.toLowerCase()} and how it can enhance your park model home experience.`
    }))
    onTopicSelected?.(topic)
  }

  const getSEOBadgeColor = (score) => {
    if (score >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    if (score >= 80) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  const getCompetitionColor = (level) => {
    if (level === 'low') return 'text-green-600 dark:text-green-400'
    if (level === 'medium') return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LightBulbIcon className="w-5 h-5 text-yellow-500" />
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Choose Your Topic
          </h4>
        </div>
        
        <button
          onClick={generateTopics}
          disabled={isGenerating}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <>
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
              Researching...
            </>
          ) : (
            <>
              <SparklesIcon className="w-4 h-4" />
              Generate Topics
            </>
          )}
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Topic Generation Error</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
          <p className="text-xs text-red-500 dark:text-red-500 mt-2">
            Don't worry! You can still use the fallback topics below or enter your own topic manually.
          </p>
        </div>
      )}

      {/* Loading State */}
      {isGenerating && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-3 text-gray-600 dark:text-gray-400">
            <ArrowPathIcon className="w-6 h-6 animate-spin text-blue-500" />
            <div>
              <p className="font-medium">Researching competitor topics...</p>
              <p className="text-sm">Analyzing Athens, Champion, Modern Park Models & your website</p>
            </div>
          </div>
        </div>
      )}

      {/* Generated Topics */}
      {generatedTopics.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ✨ Fresh topics researched from competitor sites and optimized for SEO
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {generatedTopics.map((topic, index) => (
              <button
                key={index}
                onClick={() => selectTopic(topic)}
                className={`p-4 text-left border-2 rounded-lg transition-all duration-200 hover:shadow-md ${
                  selectedTopic?.title === topic.title
                    ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                    {topic.title}
                  </h5>
                  {selectedTopic?.title === topic.title && (
                    <CheckIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 ml-2" />
                  )}
                </div>
                
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {topic.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getSEOBadgeColor(topic.seoScore)}`}>
                      SEO: {topic.seoScore}%
                    </span>
                    <span className={`text-xs font-medium ${getCompetitionColor(topic.competition)}`}>
                      {topic.competition} competition
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Topic Input */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          Or enter your own topic:
        </label>
        <input
          type="text"
          value={currentTitle || ''}
          onChange={(e) => setPostData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Enter your custom blog post topic..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
      </div>
    </div>
  )
}
