import React, { useState } from 'react'
import { 
  BoltIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

export default function EnhancedAIGenerator({ 
  postData, 
  setPostData, 
  onContentGenerated,
  selectedTemplate = 'story-driven' 
}) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState('')
  const [error, setError] = useState(null)

  const templateDescriptions = {
    'story-driven': 'Narrative-focused content that captures attention with compelling stories',
    'educational': 'Structured learning content with clear explanations and actionable insights',
    'inspiration': 'Visual-heavy, motivational content that inspires and engages'
  }

  const generateContent = async () => {
    if (!postData.title) {
      setError('Please select a topic or enter a title first')
      return
    }

    setIsGenerating(true)
    setError(null)
    setGenerationProgress(0)

    try {
      // Stage 1: Analyzing topic and template
      setGenerationStage('Analyzing topic and template...')
      setGenerationProgress(15)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Stage 2: Researching competitor content
      setGenerationStage('Researching competitor content and best practices...')
      setGenerationProgress(30)
      
      const response = await fetch('/ai/generate-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(180000), // 3 minute timeout for full post generation
        body: JSON.stringify({
          topic: postData.title,
          template: selectedTemplate,
          excerpt: postData.excerpt,
          type: 'full-post',
          includeResearch: true,
          sources: [
            'fireflytinyhomes.com',
            'athens-park-models',
            'champion-park-models',
            'modern-park-models'
          ],
          seoOptimization: {
            location: 'Texas',
            industry: 'park-model-homes',
            targetKeywords: extractKeywords(postData.title)
          }
        })
      })

      // Stage 3: Generating sections
      setGenerationStage('Generating template-specific content sections...')
      setGenerationProgress(60)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate content' }))
        throw new Error(errorData.error || `HTTP ${response.status}: Content generation failed`)
      }

      const result = await response.json()
      
      // Stage 4: Optimizing content
      setGenerationStage('Optimizing content for SEO and readability...')
      setGenerationProgress(85)
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Stage 5: Finalizing
      setGenerationStage('Finalizing your blog post...')
      setGenerationProgress(100)

      // Update post data with generated content
      setPostData(prev => ({
        ...prev,
        content: result.content || '',
        metaDescription: result.metaDescription || '',
        tags: result.tags || [],
        category: result.category || 'Tiny Homes',
        slug: result.slug || generateSlug(postData.title),
        readTime: result.readTime || '5 min read',
        sections: result.sections || []
      }))

      onContentGenerated?.(result)
      
      console.log('[ENHANCED_AI_GEN] Content generated successfully:', result)
      
    } catch (error) {
      console.error('[ENHANCED_AI_GEN] Generation failed:', error)
      setError(error.message)
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
      setGenerationStage('')
    }
  }

  const extractKeywords = (title) => {
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an']
    return title
      .toLowerCase()
      .split(' ')
      .filter(word => word.length > 2 && !commonWords.includes(word))
      .slice(0, 5)
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BoltIcon className="w-5 h-5 text-blue-500" />
        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Generate Post with AI
        </h4>
      </div>

      {/* Template Info */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <DocumentTextIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-800 dark:text-blue-300">
            {selectedTemplate.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} Template
          </span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          {templateDescriptions[selectedTemplate]}
        </p>
      </div>

      {/* Current Topic Display */}
      {postData.title && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Selected Topic:</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">{postData.title}</p>
          {postData.excerpt && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{postData.excerpt}</p>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-400">
            <ExclamationTriangleIcon className="w-5 h-5" />
            <span className="font-medium">Generation Error</span>
          </div>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
        </div>
      )}

      {/* Generation Progress */}
      {isGenerating && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 text-blue-600 dark:text-blue-400">
              <ArrowPathIcon className="w-6 h-6 animate-spin" />
              <div>
                <p className="font-medium">Generating Your Blog Post</p>
                <p className="text-sm">{generationStage}</p>
              </div>
            </div>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${generationProgress}%` }}
            />
          </div>
          
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {generationProgress}% Complete
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={generateContent}
        disabled={isGenerating || !postData.title}
        className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
      >
        {isGenerating ? (
          <>
            <ArrowPathIcon className="w-5 h-5 animate-spin" />
            Generating Post...
          </>
        ) : (
          <>
            <BoltIcon className="w-6 h-6" />
            Generate Post with AI
          </>
        )}
      </button>

      {/* Features List */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
          This AI generation includes:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Competitor research and content analysis
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            SEO-optimized content for Texas market
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Template-specific sections and formatting
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Meta descriptions, tags, and categories
          </li>
          <li className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Brand-consistent voice and messaging
          </li>
        </ul>
      </div>
    </div>
  )
}
