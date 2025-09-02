import React, { useState } from 'react'
import { BoltIcon, ArrowPathIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import AIService from '../../services/ai/AIService'

const QuickContentCreator = ({ onContentGenerated, postData, setPostData }) => {
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [customPrompts, setCustomPrompts] = useState({
    title: '',
    excerpt: '',
    introduction: '',
    keyBenefits: '',
    personalStory: '',
    proTips: '',
    comparison: '',
    conclusion: ''
  })

  const predefinedTopics = [
    'Park Model Homes vs Traditional Housing',
    'Tiny Home Living in Texas',
    'Customizing Your Tiny Home Interior',
    'Tiny Home Financing Options',
    'Tiny Home Community Living',
    'Tiny Home Maintenance Tips'
  ]

  const contentSections = [
    { key: 'introduction', label: 'Introduction', description: 'Hook readers with an engaging opening' },
    { key: 'keyBenefits', label: 'Key Benefits', description: 'List the main advantages' },
    { key: 'personalStory', label: 'Personal Story', description: 'Share a real experience' },
    { key: 'proTips', label: 'Pro Tips', description: 'Share expert advice' },
    { key: 'comparison', label: 'Comparison', description: 'Compare options or approaches' },
    { key: 'conclusion', label: 'Conclusion', description: 'Wrap up with a call to action' }
  ]

  const handleTopicClick = (topic) => {
    setPostData(prev => ({
      ...prev,
      title: topic,
      excerpt: `Discover everything about ${topic.toLowerCase()} and how it can transform your tiny home living experience.`
    }))
  }

  const handleCustomTopicChange = (e) => {
    const topic = e.target.value
    setPostData(prev => ({
      ...prev,
      title: topic,
      excerpt: topic ? `Learn about ${topic.toLowerCase()} and get expert insights for your tiny home journey.` : ''
    }))
  }

  const clearCustomTopic = () => {
    setPostData(prev => ({
      ...prev,
      title: '',
      excerpt: ''
    }))
    setCustomPrompts(prev => ({
      ...prev,
      title: '',
      excerpt: ''
    }))
  }

  const generateFullPost = async () => {
    if (!postData.title || !postData.excerpt) {
      alert('Please enter a title and excerpt first')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      // Initialize AI service
      const aiService = new AIService()
      await aiService.initialize()

      // Generate full post content
      const generatedContent = await aiService.generateBlogPost(
        postData.title,
        postData.template || 'story',
        contentSections.map(s => s.key)
      )

      // Update post data with generated content
      setPostData(prev => ({
        ...prev,
        content: generatedContent.content,
        metaDescription: generatedContent.metaDescription,
        tags: generatedContent.tags,
        category: generatedContent.category,
        slug: generatedContent.slug
      }))

      // Update custom prompts with generated content for easy regeneration
      setCustomPrompts(prev => ({
        ...prev,
        title: `Generate a compelling title for: ${postData.title}`,
        excerpt: `Write an engaging excerpt for: ${postData.title}`,
        introduction: 'Write an engaging introduction that hooks readers',
        keyBenefits: 'List the key benefits and advantages',
        personalStory: 'Share a relevant personal experience or customer story',
        proTips: 'Provide expert tips and advice',
        comparison: 'Compare different options or approaches',
        conclusion: 'Write a compelling conclusion with call-to-action'
      }))

      setGenerationProgress(100)
      onContentGenerated?.(generatedContent)
    } catch (error) {
      console.error('AI generation failed:', error)
      alert('Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const regenerateSection = async (sectionKey, customPrompt) => {
    if (!customPrompt.trim()) {
      alert('Please enter a custom prompt for this section')
      return
    }

    setIsGenerating(true)
    setGenerationProgress(0)

    try {
      const aiService = new AIService()
      await aiService.initialize()

      // Generate specific section content using the new method
      const sectionResponse = await aiService.generateSectionContent(
        postData.title,
        postData.template || 'story',
        sectionKey,
        customPrompt
      )

      // Update the main content with the new section
      setPostData(prev => {
        const currentContent = prev.content || ''
        
        // Create a more sophisticated content replacement
        const sectionMarker = `<!-- ${sectionKey.toUpperCase()} SECTION -->`
        const sectionStart = currentContent.indexOf(sectionMarker)
        
        if (sectionStart !== -1) {
          // Find the end of the current section (next marker or end of content)
          const nextMarkerIndex = currentContent.indexOf('<!--', sectionStart + 1)
          const sectionEnd = nextMarkerIndex !== -1 ? nextMarkerIndex : currentContent.length
          
          // Replace the existing section
          const beforeSection = currentContent.substring(0, sectionStart)
          const afterSection = currentContent.substring(sectionEnd)
          const newContent = beforeSection + sectionMarker + '\n' + sectionResponse.content + '\n' + afterSection
          
          return {
            ...prev,
            content: newContent.trim()
          }
        } else {
          // If no marker exists, append the new section
          return {
            ...prev,
            content: currentContent + `\n\n${sectionMarker}\n${sectionResponse.content}`
          }
        }
      })

      setGenerationProgress(100)
      
      // Show success message
      alert(`${contentSections.find(s => s.key === sectionKey)?.label} section regenerated successfully!`)
    } catch (error) {
      console.error('Section regeneration failed:', error)
      alert('Failed to regenerate section. Please try again.')
    } finally {
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const updateCustomPrompt = (sectionKey, value) => {
    setCustomPrompts(prev => ({
      ...prev,
      [sectionKey]: value
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <BoltIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
        <h3 className="text-xl font-semibold text-white mb-2">Quick Content Creator</h3>
        <p className="text-gray-300">Create high-quality blog posts in minutes with pre-built sections</p>
      </div>

      {/* Topic Selection */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Choose Your Topic</h4>
        
        {/* Predefined Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {predefinedTopics.map((topic, index) => (
            <button
              key={index}
              onClick={() => handleTopicClick(topic)}
              className="p-4 text-left bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 hover:border-blue-500 transition-all duration-200"
            >
              <div className="text-white font-medium">{topic}</div>
              <div className="text-sm text-gray-400 mt-1">Click to quick start</div>
            </button>
          ))}
        </div>

        {/* Custom Topic Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Or write your own topic..."
            value={postData.title || ''}
            onChange={handleCustomTopicChange}
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={clearCustomTopic}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors duration-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-4">
        <h4 className="text-lg font-medium text-white">Content Sections</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {contentSections.map((section) => (
            <div key={section.key} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h5 className="text-white font-medium">{section.label}</h5>
                  <p className="text-sm text-gray-400">{section.description}</p>
                </div>
              </div>
              
              {/* Custom Prompt Input */}
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder={`Custom prompt for ${section.label.toLowerCase()}...`}
                  value={customPrompts[section.key] || ''}
                  onChange={(e) => updateCustomPrompt(section.key, e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none text-sm"
                />
                
                <button
                  onClick={() => regenerateSection(section.key, customPrompts[section.key])}
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors duration-200"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  Regenerate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Content Tips */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium text-white">🚀 Quick Content Tips</h4>
        <ul className="space-y-2 text-sm text-gray-300">
          <li>• Start with 3-4 sections for a balanced post (500-800 words)</li>
          <li>• Customize the templates with your specific examples and stories</li>
          <li>• Add your voice - make it personal and authentic</li>
          <li>• Include local references (Texas, specific cities) for better SEO</li>
          <li>• Use real photos of your tiny homes and projects</li>
        </ul>
      </div>

      {/* Generate Full Post Button */}
      <div className="pt-4 border-t border-gray-700">
        <button
          onClick={generateFullPost}
          disabled={isGenerating || !postData.title || !postData.excerpt}
          className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Generating Post... {generationProgress}%
            </>
          ) : (
            <>
              <BoltIcon className="w-6 h-6" />
              Generate Post with AI
            </>
          )}
        </button>
        
        {isGenerating && (
          <div className="mt-3">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickContentCreator
