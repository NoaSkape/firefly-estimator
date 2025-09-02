import React from 'react'
import { 
  CheckCircleIcon,
  InformationCircleIcon,
  AcademicCapIcon,
  ClipboardDocumentListIcon,
  LightBulbIcon,
  BookOpenIcon,
  ArrowRightIcon,
  StarIcon
} from '@heroicons/react/24/outline'

export default function EducationalTemplate({ 
  postData, 
  activeSections = [], 
  onSectionDelete, 
  isPreview = false,
  isEditing = false 
}) {
  
  // Helper function to check if section is active
  const hasSection = (sectionId) => activeSections.includes(sectionId)
  
  // Calculate reading time (rough estimate: 150 words per minute for educational content)
  const calculateReadingTime = (content) => {
    if (!content) return 0
    const wordCount = content.replace(/<[^>]*>/g, '').split(/\s+/).length
    return Math.ceil(wordCount / 150)
  }
  
  const readingTime = calculateReadingTime(postData.content)
  
  // Extract headings for table of contents
  const extractHeadings = (content) => {
    if (!content) return []
    const headingRegex = /<h[2-6][^>]*>(.*?)<\/h[2-6]>/g
    const headings = []
    let match
    while ((match = headingRegex.exec(content)) !== null) {
      headings.push({
        text: match[1].replace(/<[^>]*>/g, ''),
        level: parseInt(match[0].charAt(2)),
        id: match[1].toLowerCase().replace(/[^a-z0-9]+/g, '-')
      })
    }
    return headings
  }
  
  const headings = extractHeadings(postData.content)
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      {hasSection('hero') && (
        <div className="relative h-80 bg-gradient-to-br from-green-600 to-blue-700">
          {postData.featuredImage && (
            <img
              src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url}
              alt="Hero image"
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 h-full flex items-center justify-center">
            <div className="text-center text-white max-w-4xl px-6">
              <div className="flex items-center justify-center mb-4">
                <AcademicCapIcon className="w-12 h-12 mr-3" />
                <span className="text-lg font-medium">Educational Guide</span>
              </div>
              {hasSection('title') && (
                <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                  {postData.title || 'Your Educational Title'}
                </h1>
              )}
              {hasSection('excerpt') && postData.excerpt && (
                <p className="text-xl text-green-100 max-w-3xl mx-auto leading-relaxed">
                  {postData.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-3 space-y-8">
            
            {/* Title Section (if no hero) */}
            {!hasSection('hero') && hasSection('title') && (
              <div className="text-center mb-12">
                <div className="flex items-center justify-center mb-4">
                  <AcademicCapIcon className="w-10 h-10 text-green-600 mr-3" />
                  <span className="text-lg font-medium text-green-600">Educational Guide</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-6">
                  {postData.title || 'Your Educational Title'}
                </h1>
                {hasSection('excerpt') && postData.excerpt && (
                  <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
                    {postData.excerpt}
                  </p>
                )}
              </div>
            )}
            
            {/* Featured Image Section */}
            {hasSection('featuredImage') && postData.featuredImage && !hasSection('hero') && (
              <div className="relative">
                <img
                  src={typeof postData.featuredImage === 'string' ? postData.featuredImage : postData.featuredImage.url}
                  alt="Featured image"
                  className="w-full h-80 object-cover rounded-lg shadow-lg"
                />
              </div>
            )}
            
            {/* Learning Progress Bar */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Learning Progress
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {readingTime} min read
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{ width: '60%' }} />
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span>Getting Started</span>
                <span>In Progress</span>
                <span>Complete</span>
              </div>
            </div>
            
            {/* Content Section */}
            {hasSection('content') && (
              <div className="prose prose-lg max-w-none text-gray-700 dark:text-gray-300">
                <div dangerouslySetInnerHTML={{ __html: postData.content || '<p>Your educational content will appear here...</p>' }} />
              </div>
            )}
            
            {/* Quick Tips Section */}
            {hasSection('quickTips') && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
                <div className="flex items-center mb-4">
                  <LightBulbIcon className="w-6 h-6 text-yellow-500 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Quick Tips
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Take notes as you read through this guide
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Bookmark important sections for later reference
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Practice the concepts in real-world scenarios
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Share with others who might benefit
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Interactive Checklist */}
            {hasSection('checklist') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center mb-4">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-blue-500 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Action Checklist
                  </h3>
                </div>
                <div className="space-y-3">
                  {[
                    'Read through the complete guide',
                    'Take notes on key points',
                    'Identify areas for improvement',
                    'Create an action plan',
                    'Set specific goals',
                    'Track your progress',
                    'Review and adjust as needed'
                  ].map((item, index) => (
                    <label key={index} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox" className="w-5 h-5 text-green-600 rounded border-gray-300 focus:ring-green-500" />
                      <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            
            {/* Next Steps */}
            <div className="bg-gradient-to-r from-blue-500 to-green-600 rounded-lg p-8 text-center text-white">
              <h3 className="text-2xl font-bold mb-4">Ready to Apply What You've Learned?</h3>
              <p className="text-blue-100 mb-6">
                Take the next step in your tiny home journey with these actionable resources
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                  <BookOpenIcon className="w-5 h-5" />
                  Explore More Guides
                </button>
                <button className="border-2 border-white text-white px-6 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors flex items-center justify-center gap-2">
                  <ArrowRightIcon className="w-5 h-5" />
                  Get Started Today
                </button>
              </div>
            </div>
          </div>
          
          {/* Sidebar Column */}
          <div className="space-y-6">
            
            {/* Table of Contents */}
            {hasSection('tableOfContents') && headings.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Table of Contents</h4>
                <nav className="space-y-2">
                  {headings.map((heading, index) => (
                    <a
                      key={index}
                      href={`#${heading.id}`}
                      className={`block text-sm hover:text-green-600 dark:hover:text-green-400 transition-colors ${
                        heading.level === 2 ? 'font-medium text-gray-900 dark:text-gray-100' :
                        heading.level === 3 ? 'font-normal text-gray-700 dark:text-gray-300 ml-4' :
                        'font-normal text-gray-600 dark:text-gray-400 ml-8'
                      }`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </div>
            )}
            
            {/* Learning Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Learning Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Reading Time</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{readingTime} min</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Difficulty</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <StarIcon key={star} className={`w-4 h-4 ${star <= 3 ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Category</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {postData.category || 'Education'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Resources Section */}
            {hasSection('resources') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Resources</h4>
                <div className="space-y-3">
                  <a href="#" className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                      Related Guide: Tiny Home Basics
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">5 min read</p>
                  </a>
                  <a href="#" className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                      Video Tutorial: Step-by-Step
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">12 min video</p>
                  </a>
                  <a href="#" className="block p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                      Downloadable Checklist
                    </h5>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PDF format</p>
                  </a>
                </div>
              </div>
            )}
            
            {/* Related Posts */}
            {hasSection('relatedPosts') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Related Guides</h4>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-green-300 dark:bg-green-600 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <AcademicCapIcon className="w-8 h-8 text-green-700 dark:text-green-300" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        Tiny Home Financing Guide
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">8 min read</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                    <div className="w-16 h-16 bg-blue-300 dark:bg-blue-600 rounded-lg flex-shrink-0 flex items-center justify-center">
                      <AcademicCapIcon className="w-8 h-8 text-blue-700 dark:text-blue-300" />
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        Zoning Laws Explained
                      </h5>
                      <p className="text-xs text-gray-500 dark:text-gray-400">10 min read</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Study Tips */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-6 border border-green-200 dark:border-green-700">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Study Tips</h4>
              <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <p>• Read in a quiet environment</p>
                <p>• Take breaks every 20 minutes</p>
                <p>• Summarize key points</p>
                <p>• Apply concepts practically</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
