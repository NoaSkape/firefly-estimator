import React, { useState, useEffect } from 'react'
import { 
  MagnifyingGlassIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

export default function SEOOptimizer({ 
  postData = {},
  className = ''
}) {
  const [seoScore, setSeoScore] = useState(0)
  const [seoIssues, setSeoIssues] = useState([])
  const [seoSuggestions, setSeoSuggestions] = useState([])

  // Calculate SEO score and identify issues
  useEffect(() => {
    const issues = []
    const suggestions = []
    let score = 100

    // Title optimization
    if (!postData.title || postData.title.length < 30) {
      issues.push('Title is too short (aim for 30-60 characters)')
      score -= 20
    } else if (postData.title.length > 60) {
      issues.push('Title is too long (aim for 30-60 characters)')
      score -= 10
    }

    if (postData.title && !postData.title.includes('tiny home') && !postData.title.includes('park model')) {
      suggestions.push('Consider including "tiny home" or "park model" in your title for better SEO')
    }

    // Meta description
    if (!postData.metaDescription || postData.metaDescription.length < 120) {
      issues.push('Meta description is too short (aim for 120-160 characters)')
      score -= 15
    } else if (postData.metaDescription.length > 160) {
      issues.push('Meta description is too long (aim for 120-160 characters)')
      score -= 10
    }

    // Content length
    if (!postData.content || postData.content.length < 300) {
      issues.push('Content is too short (aim for at least 300 words)')
      score -= 25
    } else if (postData.content.length > 2000) {
      suggestions.push('Content is quite long - consider breaking into sections with subheadings')
    }

    // Keywords
    if (!postData.tags || postData.tags.length === 0) {
      issues.push('No tags/keywords specified')
      score -= 15
    } else if (postData.tags.length < 3) {
      suggestions.push('Consider adding more tags (aim for 3-8 relevant keywords)')
    }

    // Featured image
    if (!postData.featuredImage) {
      issues.push('No featured image specified')
      score -= 10
    }

    // Category
    if (!postData.category) {
      issues.push('No category specified')
      score -= 5
    }

    // Reading time
    if (postData.content) {
      const wordCount = postData.content.split(' ').length
      const readingTime = Math.ceil(wordCount / 200)
      if (readingTime < 2) {
        suggestions.push('Content is very short - consider expanding for better engagement')
      } else if (readingTime > 10) {
        suggestions.push('Content is quite long - consider adding a table of contents')
      }
    }

    setSeoScore(Math.max(0, score))
    setSeoIssues(issues)
    setSeoSuggestions(suggestions)
  }, [postData])

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Work'
  }

  return (
    <div className={`seo-optimizer ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <MagnifyingGlassIcon className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            SEO Optimization
          </h3>
        </div>

        {/* SEO Score */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              SEO Score
            </span>
            <span className={`text-lg font-bold ${getScoreColor(seoScore)}`}>
              {seoScore}/100
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all duration-300 ${
                seoScore >= 80 ? 'bg-green-500' : 
                seoScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
              }`}
              style={{ width: `${seoScore}%` }}
            />
          </div>
          <p className={`text-sm font-medium mt-2 ${getScoreColor(seoScore)}`}>
            {getScoreLabel(seoScore)} - {seoScore >= 80 ? 'Great job!' : 'Keep improving!'}
          </p>
        </div>

        {/* Issues */}
        {seoIssues.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
              Issues to Fix
            </h4>
            <div className="space-y-2">
              {seoIssues.map((issue, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-red-700 dark:text-red-400">{issue}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {seoSuggestions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-500" />
              Suggestions for Improvement
            </h4>
            <div className="space-y-2">
              {seoSuggestions.map((suggestion, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <InformationCircleIcon className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-blue-700 dark:text-blue-400">{suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {postData.title ? postData.title.length : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Title Length</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {postData.metaDescription ? postData.metaDescription.length : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Meta Length</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {postData.content ? postData.content.split(' ').length : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Word Count</div>
          </div>
          
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {postData.tags ? postData.tags.length : 0}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Tags</div>
          </div>
        </div>

        {/* SEO Tips */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4" />
            SEO Tips for Tiny Home Content
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Include location-specific keywords (city, state)</li>
            <li>• Use long-tail keywords like "park model homes Texas"</li>
            <li>• Include relevant tiny home terminology</li>
            <li>• Add internal links to your product pages</li>
            <li>• Optimize images with descriptive alt text</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
