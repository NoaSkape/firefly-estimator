import React, { useState } from 'react'
import { 
  BoltIcon,
  DocumentTextIcon,
  PhotoIcon,
  ListBulletIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  TrashIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'

const CONTENT_SECTIONS = {
  'intro': {
    label: 'Introduction',
    description: 'Hook readers with an engaging opening',
    icon: DocumentTextIcon,
    template: 'Are you considering the freedom of tiny home living? In this post, we\'ll explore [TOPIC] and how it can transform your lifestyle.',
    placeholder: 'Write an engaging introduction that hooks readers...'
  },
  'benefits': {
    label: 'Key Benefits',
    description: 'List the main advantages',
    icon: ListBulletIcon,
    template: 'Here are the top benefits of [TOPIC]:\n\n• [Benefit 1]\n• [Benefit 2]\n• [Benefit 3]',
    placeholder: 'List the key benefits with bullet points...'
  },
  'story': {
    label: 'Personal Story',
    description: 'Share a real experience',
    icon: ChatBubbleLeftRightIcon,
    template: 'Let me share a story about [TOPIC]. [DESCRIBE EXPERIENCE] This experience taught us [LESSON].',
    placeholder: 'Share a personal story or customer experience...'
  },
  'tips': {
    label: 'Pro Tips',
    description: 'Share expert advice',
    icon: BoltIcon,
    template: 'Here are some pro tips for [TOPIC]:\n\n1. [Tip 1]\n2. [Tip 2]\n3. [Tip 3]',
    placeholder: 'Share expert tips and advice...'
  },
  'comparison': {
    label: 'Comparison',
    description: 'Compare options or approaches',
    icon: DocumentDuplicateIcon,
    template: 'Let\'s compare [OPTION A] vs [OPTION B]:\n\n[OPTION A]:\n• [Pros]\n• [Cons]\n\n[OPTION B]:\n• [Pros]\n• [Cons]',
    placeholder: 'Compare different options or approaches...'
  },
  'conclusion': {
    label: 'Conclusion',
    description: 'Wrap up with a call to action',
    icon: DocumentTextIcon,
    template: '[TOPIC] offers incredible opportunities for [BENEFIT]. Ready to explore tiny home living? [CALL TO ACTION]',
    placeholder: 'Wrap up your post and include a call to action...'
  }
}

const TINY_HOME_TOPICS = [
  'Park Model Homes vs Traditional Housing',
  'Tiny Home Living in Texas',
  'Customizing Your Tiny Home Interior',
  'Tiny Home Financing Options',
  'Tiny Home Community Living',
  'Tiny Home Maintenance Tips',
  'Tiny Home Energy Efficiency',
  'Tiny Home Zoning and Regulations',
  'Tiny Home Design Trends',
  'Tiny Home Investment Potential'
]

export default function QuickContentCreator({ 
  onContentGenerated = () => {},
  className = ''
}) {
  const [selectedTopic, setSelectedTopic] = useState('')
  const [selectedSections, setSelectedSections] = useState([])
  const [customTopic, setCustomTopic] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const addSection = (sectionKey) => {
    if (!selectedSections.find(s => s.key === sectionKey)) {
      const section = CONTENT_SECTIONS[sectionKey]
      setSelectedSections([...selectedSections, {
        key: sectionKey,
        content: section.template,
        label: section.label
      }])
    }
  }

  const removeSection = (index) => {
    setSelectedSections(selectedSections.filter((_, i) => i !== index))
  }

  const updateSectionContent = (index, content) => {
    const newSections = [...selectedSections]
    newSections[index].content = content
    setSelectedSections(newSections)
  }

  const generateContent = () => {
    if (!selectedTopic && !customTopic) return
    
    setIsGenerating(true)
    
    // Simulate content generation
    setTimeout(() => {
      const finalTopic = customTopic || selectedTopic
      const generatedContent = {
        title: finalTopic,
        metaDescription: `Discover everything you need to know about ${finalTopic.toLowerCase()}. Expert insights, tips, and real stories from the tiny home community.`,
        content: selectedSections.map(section => section.content).join('\n\n'),
        tags: ['tiny homes', 'park model homes', 'tiny living', 'custom homes'],
        category: 'tiny home living',
        sections: selectedSections
      }
      
      onContentGenerated(generatedContent)
      setIsGenerating(false)
    }, 1500)
  }

  const quickStart = (topic) => {
    setSelectedTopic(topic)
    setCustomTopic('')
    // Auto-add common sections for this topic
    setSelectedSections([
      { key: 'intro', content: CONTENT_SECTIONS.intro.template, label: 'Introduction' },
      { key: 'benefits', content: CONTENT_SECTIONS.benefits.template, label: 'Key Benefits' },
      { key: 'tips', content: CONTENT_SECTIONS.tips.template, label: 'Pro Tips' },
      { key: 'conclusion', content: CONTENT_SECTIONS.conclusion.template, label: 'Conclusion' }
    ])
  }

  return (
    <div className={`quick-content-creator ${className}`}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <LightningBoltIcon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Quick Content Creator
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create high-quality blog posts in minutes with pre-built sections
          </p>
        </div>

        {/* Topic Selection */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Choose Your Topic
          </h4>
          
          {/* Quick Start Topics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {TINY_HOME_TOPICS.slice(0, 6).map((topic, index) => (
              <button
                key={index}
                onClick={() => quickStart(topic)}
                className="p-3 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="font-medium text-gray-900 dark:text-gray-100">{topic}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Click to quick start</div>
              </button>
            ))}
          </div>

          {/* Custom Topic */}
          <div className="flex gap-3">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="Or write your own topic..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() => setCustomTopic('')}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Section Selection */}
        <div className="mb-8">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Content Sections
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {Object.entries(CONTENT_SECTIONS).map(([key, section]) => {
              const IconComponent = section.icon
              const isSelected = selectedSections.find(s => s.key === key)
              
              return (
                <button
                  key={key}
                  onClick={() => isSelected ? null : addSection(key)}
                  disabled={isSelected}
                  className={`p-4 text-left border-2 rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 cursor-not-allowed'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <IconComponent className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {section.label}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {section.description}
                  </div>
                  {isSelected && (
                    <div className="text-xs text-blue-600 mt-2">✓ Added</div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Sections */}
        {selectedSections.length > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Customize Your Content
            </h4>
            
            <div className="space-y-4">
              {selectedSections.map((section, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100">
                      {section.label}
                    </h5>
                    <button
                      onClick={() => removeSection(index)}
                      className="p-1 text-red-400 hover:text-red-600"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea
                    value={section.content}
                    onChange={(e) => updateSectionContent(index, e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={CONTENT_SECTIONS[section.key].placeholder}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generate Button */}
        {selectedSections.length > 0 && (
          <div className="text-center">
            <button
              onClick={generateContent}
              disabled={isGenerating || (!selectedTopic && !customTopic)}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Generating Content...
                </>
              ) : (
                <>
                  <BoltIcon className="w-5 h-5" />
                  Generate Blog Post
                </>
              )}
            </button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              This will create a complete blog post structure you can further customize
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-2">
            🚀 Quick Content Tips
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
            <li>• <strong>Start with 3-4 sections</strong> for a balanced post (500-800 words)</li>
            <li>• <strong>Customize the templates</strong> with your specific examples and stories</li>
            <li>• <strong>Add your voice</strong> - make it personal and authentic</li>
            <li>• <strong>Include local references</strong> (Texas, specific cities) for better SEO</li>
            <li>• <strong>Use real photos</strong> of your tiny homes and projects</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
